import { useCallback, useEffect, useReducer, useRef } from "react";
import { getAnalysis } from "@addin/api/analysis";
import { lookupByHash } from "@addin/api/by-hash";
import { uploadContract } from "@addin/api/upload";
import { pollUntilReady } from "@addin/api/status";
import {
  DocumentReadError,
  readOpenDocument,
  type DocumentReadResult,
} from "@addin/office/document-reader";
import type { AnalysisResponse, ByHashResponse } from "@addin/types/contract";

// State machine driving the Workspace's auto-upload flow.
//
//   idle ─start()─▶ reading ─▶ checking_hash
//                                  │
//                          ┌───────┴────────┐
//                     200 │                │ 404
//                          ▼                ▼
//                     [existing]      consent_needed ─acceptConsent()─▶ uploading
//                          │                                                  │
//                          ▼                                                  ▼
//                     queued / processing ◄────────────────────────────────────┘
//                          │
//                          ▼
//                  fetching_analysis ─▶ ready
//
//   any ─error─▶ error ─retry()─▶ idle
//
// Side effects live inside `runFlow` (a single async function that walks
// the happy path and dispatches actions as it goes). The reducer itself
// is a pure switch.

const CONSENT_KEY = "clauseium.addin.consent.v1";

export type FlowKind =
  | "idle"
  | "reading"
  | "checking_hash"
  | "consent_needed"
  | "uploading"
  | "queued"
  | "processing"
  | "fetching_analysis"
  | "ready"
  | "error";

export interface FlowState {
  kind: FlowKind;
  // Populated as we progress through the flow.
  bytes: number | null;
  filename: string | null;
  contractId: string | null;
  analysis: AnalysisResponse | null;
  pendingBlob: Blob | null;
  errorCode: string | null;
  errorMessage: string | null;
  recoverable: boolean;
}

const INITIAL_STATE: FlowState = {
  kind: "idle",
  bytes: null,
  filename: null,
  contractId: null,
  analysis: null,
  pendingBlob: null,
  errorCode: null,
  errorMessage: null,
  recoverable: true,
};

type Action =
  | { type: "READING" }
  | { type: "DOCUMENT_READ"; doc: DocumentReadResult }
  | { type: "CHECKING_HASH" }
  | { type: "HASH_HIT"; hit: ByHashResponse }
  | { type: "NEED_CONSENT"; blob: Blob; filename: string; bytes: number }
  | { type: "UPLOADING"; blob: Blob; filename: string; bytes: number }
  | { type: "UPLOADED"; contractId: string }
  | {
      type: "STATUS_TICK";
      status: "queued" | "processing" | "ready" | "failed";
      contractId: string;
    }
  | { type: "FETCHING_ANALYSIS"; contractId: string }
  | { type: "READY"; contractId: string; analysis: AnalysisResponse }
  | { type: "ERROR"; code: string; message: string; recoverable: boolean }
  | { type: "RESET" };

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "READING":
      return { ...INITIAL_STATE, kind: "reading" };
    case "DOCUMENT_READ":
      return {
        ...state,
        bytes: action.doc.bytes,
        filename: action.doc.filename,
        pendingBlob: action.doc.blob,
      };
    case "CHECKING_HASH":
      return { ...state, kind: "checking_hash" };
    case "HASH_HIT":
      return {
        ...state,
        contractId: action.hit.contractId,
        pendingBlob: null, // no need to upload — release the blob
        kind:
          action.hit.status === "ready"
            ? "fetching_analysis"
            : action.hit.status === "failed"
              ? "error"
              : action.hit.status,
        errorCode: action.hit.status === "failed" ? "processing_failed" : null,
        errorMessage:
          action.hit.status === "failed"
            ? "The previous analysis run failed. Sign in to the web app to retry."
            : null,
      };
    case "NEED_CONSENT":
      return {
        ...state,
        kind: "consent_needed",
        pendingBlob: action.blob,
        filename: action.filename,
        bytes: action.bytes,
      };
    case "UPLOADING":
      return {
        ...state,
        kind: "uploading",
        pendingBlob: action.blob,
        filename: action.filename,
        bytes: action.bytes,
      };
    case "UPLOADED":
      return {
        ...state,
        kind: "queued",
        contractId: action.contractId,
        pendingBlob: null,
      };
    case "STATUS_TICK":
      if (action.status === "failed") {
        return {
          ...state,
          kind: "error",
          errorCode: "processing_failed",
          errorMessage: "The contract failed to process. Try again.",
          recoverable: true,
        };
      }
      if (action.status === "ready") {
        return { ...state, kind: "fetching_analysis" };
      }
      return { ...state, kind: action.status, contractId: action.contractId };
    case "FETCHING_ANALYSIS":
      return { ...state, kind: "fetching_analysis", contractId: action.contractId };
    case "READY":
      return {
        ...state,
        kind: "ready",
        contractId: action.contractId,
        analysis: action.analysis,
      };
    case "ERROR":
      return {
        ...state,
        kind: "error",
        errorCode: action.code,
        errorMessage: action.message,
        recoverable: action.recoverable,
        pendingBlob: null,
      };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

export interface ContractStore {
  state: FlowState;
  start: () => void;
  acceptConsent: () => void;
  declineConsent: () => void;
  retry: () => void;
  reset: () => void;
}

export interface ContractStoreInput {
  getAccessToken: () => Promise<string | null>;
}

export function useContractStore({
  getAccessToken,
}: ContractStoreInput): ContractStore {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  // Latest pending blob is mirrored in a ref so acceptConsent() can pick it
  // up without depending on the latest render of `state` (which would
  // re-create the callback identity and re-fire useEffects).
  const blobRef = useRef<{ blob: Blob; filename: string } | null>(null);

  const requireToken = useCallback(async (): Promise<string> => {
    const t = await getAccessToken();
    if (!t) {
      const err = new Error("Your session expired. Sign in again.");
      // tag with a code so the error mapper can recognize it
      (err as Error & { code?: string }).code = "unauthorized";
      throw err;
    }
    return t;
  }, [getAccessToken]);

  const fetchAndFinish = useCallback(
    async (contractId: string) => {
      dispatch({ type: "FETCHING_ANALYSIS", contractId });
      const token = await requireToken();
      const analysis = await getAnalysis(contractId, token);
      dispatch({ type: "READY", contractId, analysis });
    },
    [requireToken],
  );

  const pollAndFinish = useCallback(
    async (contractId: string, signal: AbortSignal) => {
      const final = await pollUntilReady(contractId, getAccessToken, {
        signal,
        onTick: (s) => {
          if (s.status === "queued" || s.status === "processing") {
            dispatch({
              type: "STATUS_TICK",
              status: s.status,
              contractId,
            });
          }
        },
      });
      if (final.status === "failed") {
        dispatch({
          type: "ERROR",
          code: "processing_failed",
          message: final.error_message ?? "Contract failed to process.",
          recoverable: true,
        });
        return;
      }
      await fetchAndFinish(contractId);
    },
    [fetchAndFinish, getAccessToken],
  );

  const startUpload = useCallback(
    async (blob: Blob, filename: string, signal: AbortSignal) => {
      dispatch({
        type: "UPLOADING",
        blob,
        filename,
        bytes: blob.size,
      });
      const token = await requireToken();
      const { contractId } = await uploadContract({
        blob,
        filename,
        accessToken: token,
      });
      dispatch({ type: "UPLOADED", contractId });
      await pollAndFinish(contractId, signal);
    },
    [pollAndFinish, requireToken],
  );

  const runFlow = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      dispatch({ type: "READING" });
      const doc = await readOpenDocument();
      blobRef.current = { blob: doc.blob, filename: doc.filename };
      dispatch({ type: "DOCUMENT_READ", doc });

      dispatch({ type: "CHECKING_HASH" });
      const token = await requireToken();
      const existing = await lookupByHash(doc.sha256, token);

      if (existing) {
        dispatch({ type: "HASH_HIT", hit: existing });
        if (existing.status === "ready") {
          await fetchAndFinish(existing.contractId);
        } else if (existing.status === "queued" || existing.status === "processing") {
          await pollAndFinish(existing.contractId, controller.signal);
        }
        // failed status was already converted to an error by HASH_HIT
        return;
      }

      // New document — gate on DPDP consent
      if (!hasConsent()) {
        dispatch({
          type: "NEED_CONSENT",
          blob: doc.blob,
          filename: doc.filename,
          bytes: doc.bytes,
        });
        return; // Wait for acceptConsent() to be invoked
      }

      await startUpload(doc.blob, doc.filename, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      const info = mapError(err);
      dispatch({
        type: "ERROR",
        code: info.code,
        message: info.message,
        recoverable: info.recoverable,
      });
    }
  }, [fetchAndFinish, pollAndFinish, requireToken, startUpload]);

  const start = useCallback(() => {
    void runFlow();
  }, [runFlow]);

  const acceptConsent = useCallback(() => {
    const pending = blobRef.current;
    if (!pending) return;
    setConsent(true);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    void (async () => {
      try {
        await startUpload(pending.blob, pending.filename, controller.signal);
      } catch (err) {
        if (controller.signal.aborted) return;
        const info = mapError(err);
        dispatch({
          type: "ERROR",
          code: info.code,
          message: info.message,
          recoverable: info.recoverable,
        });
      }
    })();
  }, [startUpload]);

  const declineConsent = useCallback(() => {
    blobRef.current = null;
    dispatch({
      type: "ERROR",
      code: "consent_declined",
      message:
        "Analysis requires uploading the document. You can sign out and try again.",
      recoverable: false,
    });
  }, []);

  const retry = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "RESET" });
    void runFlow();
  }, [runFlow]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    blobRef.current = null;
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { state, start, acceptConsent, declineConsent, retry, reset };
}

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function setConsent(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(CONSENT_KEY, "1");
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore — fine if storage is unavailable, user re-confirms next time
  }
}

interface ErrorInfo {
  code: string;
  message: string;
  recoverable: boolean;
}

function mapError(err: unknown): ErrorInfo {
  if (err instanceof DocumentReadError) {
    return {
      code: err.code,
      message: err.message,
      recoverable: err.code === "document_unsaved" || err.code === "too_large",
    };
  }
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code ?? "unknown";
    return {
      code,
      message: err.message,
      recoverable: code !== "unauthorized",
    };
  }
  return {
    code: "unknown",
    message: "Something went wrong. Try again.",
    recoverable: true,
  };
}
