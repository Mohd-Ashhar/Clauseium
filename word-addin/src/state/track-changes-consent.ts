// One-time decision: should Clauseium toggle Track Changes on when the
// user accepts a redline? Stored in localStorage so we don't re-prompt
// on the same machine. Office.context.document.settings would scope per
// document — not what we want; the user's preference is a per-machine
// reviewer choice.
//
// Values:
//   "accepted"        → enable Track Changes + apply redline as revision
//   "clipboard_only"  → don't toggle Track Changes; copy redline text to
//                       clipboard instead. The clause-action still flips
//                       to "accepted" server-side so audit trail records
//                       the decision.

const KEY = "clauseium.addin.track-changes-consent.v1";

export type TrackChangesConsent = "accepted" | "clipboard_only" | null;

export function loadTrackChangesConsent(): TrackChangesConsent {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "accepted" || raw === "clipboard_only") return raw;
    return null;
  } catch {
    return null;
  }
}

export function saveTrackChangesConsent(
  value: Exclude<TrackChangesConsent, null>,
): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // ignore — caller will just re-prompt next time
  }
}

export function clearTrackChangesConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
