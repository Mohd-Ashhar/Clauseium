// Office host diagnostics — packaged into telemetry payloads and shown
// in the footer so support can quickly tell whether a bug is Word Online
// vs. Word Desktop. Office.context.diagnostics is populated synchronously
// after Office.onReady fires.

export interface HostDiagnostics {
  host: string;
  platform: string;
  version: string;
}

export function getHostDiagnostics(): HostDiagnostics {
  if (typeof window === "undefined" || !window.Office?.context?.diagnostics) {
    return { host: "unknown", platform: "unknown", version: "0.0.0" };
  }
  const d = Office.context.diagnostics;
  // d.host and d.platform are string-valued enums; coerce so the diagnostics
  // payload is portable across telemetry sinks that expect plain strings.
  return {
    host: d.host ? String(d.host) : "unknown",
    platform: d.platform ? String(d.platform) : "unknown",
    version: d.version ?? "0.0.0",
  };
}
