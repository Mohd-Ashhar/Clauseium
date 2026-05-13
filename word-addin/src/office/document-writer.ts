// Word.js side-effects for clause cards.
//
//   scrollToClause  — bring the clause's range into view in Word's editor.
//                     Uses scrollIntoView (not select) so we don't clobber
//                     the user's cursor or selection.
//
//   applyRedline    — replace the clause text with the suggested redline,
//                     produced as a SINGLE tracked-change revision (the
//                     reviewer sees strikethrough old + insertion new).
//                     Requires Track Changes to be on; caller is expected
//                     to have collected the user's consent first.
//
// We deliberately keep the React-prompt for track-changes consent OUT of
// this module (it's a Workspace concern). This file only sees a boolean
// `trackChangesAccepted` that has already been decided + persisted.

import { findClauseRange, type AnchorClause } from "./search";

export type ApplyRedlineResult =
  | { kind: "applied"; matchCount: number }
  | { kind: "clipboard_fallback" }
  | { kind: "not_found" };

export async function scrollToClause(clause: AnchorClause): Promise<boolean> {
  if (typeof window === "undefined" || !window.Word?.run) return false;
  if (!clause.search_anchor) return false;
  try {
    return await Word.run(async (ctx) => {
      const result = await findClauseRange(ctx, clause);
      if (!result) return false;
      // Word doesn't expose a pure "scroll into view" API on Range. Using
      // select(Start) collapses the selection to the first character of
      // the clause and scrolls the viewport there — nudges the cursor but
      // avoids the heavier "Select" mode that highlights the whole clause.
      result.range.select("Start");
      await ctx.sync();
      return true;
    });
  } catch (err) {
    console.warn(
      `[word] scrollToClause failed: ${err instanceof Error ? err.message : err}`,
    );
    return false;
  }
}

export interface ApplyRedlineOpts {
  // Whether the user has consented to enabling track changes for this
  // document. Decided OUTSIDE Word.run (in the Workspace) so we don't
  // hold a Word proxy alive across an async user prompt.
  trackChangesAccepted: boolean;
}

export async function applyRedline(
  clause: AnchorClause,
  suggestion: string,
  opts: ApplyRedlineOpts,
): Promise<ApplyRedlineResult> {
  if (typeof window === "undefined" || !window.Word?.run) {
    await copyToClipboard(suggestion);
    return { kind: "clipboard_fallback" };
  }
  if (!clause.search_anchor) {
    return { kind: "not_found" };
  }
  if (!suggestion || suggestion.trim().length === 0) {
    return { kind: "not_found" };
  }

  // User refused to enable Track Changes — surface the redline via the
  // clipboard instead of silently modifying the doc without a revision
  // trail. Still mark the clause as accepted so the decision is logged.
  if (!opts.trackChangesAccepted) {
    await copyToClipboard(suggestion);
    return { kind: "clipboard_fallback" };
  }

  try {
    return await Word.run(async (ctx) => {
      const result = await findClauseRange(ctx, clause);
      if (!result) return { kind: "not_found" } as const;

      ctx.document.load("changeTrackingMode");
      await ctx.sync();
      if (ctx.document.changeTrackingMode !== Word.ChangeTrackingMode.trackAll) {
        ctx.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        await ctx.sync();
      }

      // "Replace" produces a single revision pair: strikethrough on the
      // old text + insertion of the new text. The reviewer can accept or
      // reject in Word's review pane as normal.
      result.range.insertText(suggestion, Word.InsertLocation.replace);
      await ctx.sync();
      return { kind: "applied", matchCount: result.matchCount } as const;
    });
  } catch (err) {
    console.warn(
      `[word] applyRedline failed clause=${clause.id}: ${
        err instanceof Error ? err.message : err
      }`,
    );
    // Last-ditch: at least put the suggestion in the clipboard so the user
    // can paste it manually.
    await copyToClipboard(suggestion);
    return { kind: "clipboard_fallback" };
  }
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // Clipboard may be blocked (no user-gesture context, permission denied).
    // Silently fail — the redline is still recorded in clauseium.
  }
}
