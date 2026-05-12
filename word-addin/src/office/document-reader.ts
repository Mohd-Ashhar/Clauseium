// Read the open Word document as a .docx Blob via Office.js, plus its SHA-256.
//
// Word add-ins can't open arbitrary files from disk — they only see the
// document the user has open in the host. getFileAsync(Compressed) streams
// the live document state back as the .docx (OOXML zip) bytes the user
// would get from File > Save As. We need:
//   - the Blob, to POST to /api/contracts/upload
//   - the SHA-256, to ask /api/contracts/by-hash whether we've already
//     reviewed this document and can skip re-uploading
//
// Notes / pitfalls handled:
//   - getFileAsync streams the file in slices (default 4 MB). We loop
//     through them and concatenate the Uint8Arrays.
//   - file.closeAsync() MUST be called on every code path or Office leaks
//     server-side handles for that document.
//   - Office.context.document.url is "" for unsaved documents on some
//     hosts; we surface a clear error so users know to save first.
//   - Bytes can be 0 if the doc is empty — caller should treat that as
//     an error rather than try to upload an empty .docx.
//   - 25 MB cap mirrors /src/lib/ingestion/schemas.ts uploadFormSchema.

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_BYTES = 25 * 1024 * 1024;
const SLICE_SIZE = 4 * 1024 * 1024;

export interface DocumentReadResult {
  blob: Blob;
  sha256: string;
  filename: string;
  bytes: number;
}

export class DocumentReadError extends Error {
  constructor(
    public readonly code:
      | "office_unavailable"
      | "document_unsaved"
      | "document_empty"
      | "too_large"
      | "read_failed"
      | "hash_failed",
    message: string,
  ) {
    super(message);
    this.name = "DocumentReadError";
  }
}

export async function readOpenDocument(): Promise<DocumentReadResult> {
  if (
    typeof window === "undefined" ||
    !window.Office?.context?.document?.getFileAsync
  ) {
    throw new DocumentReadError(
      "office_unavailable",
      "Open this in Microsoft Word to analyze the document.",
    );
  }

  const filename = deriveFilename(Office.context.document.url);

  const bytes = await readDocxBytes();
  if (bytes.byteLength === 0) {
    throw new DocumentReadError(
      "document_empty",
      "This document appears empty. Add content and try again.",
    );
  }
  if (bytes.byteLength > MAX_BYTES) {
    throw new DocumentReadError(
      "too_large",
      `Document is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB. Clauseium accepts up to 25 MB.`,
    );
  }

  const blob = new Blob([bytes as BlobPart], { type: DOCX_MIME });
  const sha256 = await sha256Hex(bytes);

  return { blob, sha256, filename, bytes: bytes.byteLength };
}

function readDocxBytes(): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    Office.context.document.getFileAsync(
      Office.FileType.Compressed,
      { sliceSize: SLICE_SIZE },
      (fileResult) => {
        if (fileResult.status !== Office.AsyncResultStatus.Succeeded) {
          // 5018 = document not saved on some Word builds. We can't read
          // the bytes reliably in that state.
          const code =
            fileResult.error?.code === 5018
              ? "document_unsaved"
              : "read_failed";
          reject(
            new DocumentReadError(
              code,
              fileResult.error?.message ??
                "Word could not provide the document bytes.",
            ),
          );
          return;
        }

        const file = fileResult.value;
        const sliceCount = file.sliceCount;
        const slices: Uint8Array[] = new Array(sliceCount);
        let received = 0;

        const finish = (err: DocumentReadError | null, result?: Uint8Array) => {
          file.closeAsync(() => {
            if (err) reject(err);
            else if (result) resolve(result);
          });
        };

        if (sliceCount === 0) {
          finish(null, new Uint8Array(0));
          return;
        }

        for (let i = 0; i < sliceCount; i++) {
          const index = i;
          file.getSliceAsync(index, (sliceResult) => {
            if (sliceResult.status !== Office.AsyncResultStatus.Succeeded) {
              finish(
                new DocumentReadError(
                  "read_failed",
                  sliceResult.error?.message ??
                    `Slice ${index} failed to load`,
                ),
              );
              return;
            }
            const data = sliceResult.value.data as unknown;
            slices[index] = toUint8Array(data);
            received += 1;
            if (received === sliceCount) {
              finish(null, concatChunks(slices));
            }
          });
        }
      },
    );
  });
}

function toUint8Array(data: unknown): Uint8Array {
  // Office.js returns slice data as either a base64 string (older builds)
  // or a typed array (modern builds). Normalize.
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data)) return Uint8Array.from(data);
  if (typeof data === "string") {
    // base64 fallback
    const binary = atob(data);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  if (data && typeof data === "object" && "byteLength" in data) {
    return new Uint8Array(data as ArrayBuffer);
  }
  throw new DocumentReadError(
    "read_failed",
    "Unrecognized slice data shape from Office.js",
  );
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new DocumentReadError(
      "hash_failed",
      "Web Crypto API unavailable in this Office build.",
    );
  }
  // Web Crypto digest accepts an ArrayBufferView or ArrayBuffer. Cast
  // through the typed-array generic to satisfy the TS 5.7 distinction
  // between ArrayBuffer and SharedArrayBuffer.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as BufferSource,
  );
  const view = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += (view[i] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}

function deriveFilename(url: string): string {
  if (!url) return "document.docx";
  // url is like "C:\\path\\file.docx" on Windows or
  // "https://contoso-my.sharepoint.com/.../File.docx" on OneDrive/SP.
  const lastSlash = Math.max(url.lastIndexOf("/"), url.lastIndexOf("\\"));
  const tail = lastSlash >= 0 ? url.slice(lastSlash + 1) : url;
  const cleaned = decodeURIComponent(tail).split("?")[0] ?? tail;
  return cleaned.length > 0 ? cleaned : "document.docx";
}
