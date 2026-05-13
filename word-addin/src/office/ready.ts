// Promise wrapper around Office.onReady so the React entry point can
// `await` it before mounting. Office.onReady is the official signal that
// Office.context is fully initialized — touching Office.context APIs
// before this resolves yields stale or undefined values.
//
// We also export a `hostInfo` helper for components that need to branch
// on Office Online vs Desktop (e.g. file size caps, dialog quirks).

declare global {
  interface Window {
    Office?: typeof Office;
  }
}

export interface OfficeReadyInfo {
  host: Office.HostType | null;
  platform: Office.PlatformType | null;
  // True only when running inside a real Office host. When the task pane
  // URL is opened in a regular browser (e.g. for visual dev), Office.js
  // still loads but onReady resolves with host = null.
  isOfficeHost: boolean;
}

let cached: Promise<OfficeReadyInfo> | null = null;

// How long to wait for Office.onReady before assuming we're NOT in an
// Office host. Office Desktop usually fires onReady within a few hundred
// ms; outside Office (Safari, Pages), the callback may never fire. The
// timeout lets the non-Office-host explainer surface instead of leaving
// users staring at the loading skeleton forever.
const OFFICE_READY_TIMEOUT_MS = 1500;

export function officeReady(): Promise<OfficeReadyInfo> {
  if (cached) return cached;

  cached = new Promise((resolve) => {
    if (typeof window === "undefined" || !window.Office) {
      // Office.js script tag failed to load (CSP, network, etc.). Resolve
      // with host=null so the UI can still render — useful for dev when
      // hitting the task pane URL in a plain browser tab.
      resolve({ host: null, platform: null, isOfficeHost: false });
      return;
    }

    let settled = false;
    const finish = (info: OfficeReadyInfo) => {
      if (settled) return;
      settled = true;
      resolve(info);
    };

    const timer = window.setTimeout(() => {
      finish({ host: null, platform: null, isOfficeHost: false });
    }, OFFICE_READY_TIMEOUT_MS);

    Office.onReady((info) => {
      window.clearTimeout(timer);
      finish({
        host: info.host ?? null,
        platform: info.platform ?? null,
        isOfficeHost: info.host != null,
      });
    });
  });

  return cached;
}
