// Stub forwarder. Real parsing runs in the Next.js Node route because pdf-parse
// is Node-only. Kept so future cron triggers / webhooks have a target to call.
//
// Required Supabase function secrets:
//   INTERNAL_BASE_URL          — origin of the deployed Next.js app
//   INTERNAL_PROCESSING_SECRET — same value as in the Next.js app

// Deno globals are provided by the Supabase Edge runtime at execution time.
type DenoLike = { env: { get(k: string): string | undefined }; serve: (h: (req: Request) => Promise<Response> | Response) => void };
const Deno = (globalThis as { Deno?: DenoLike }).Deno as DenoLike;

const env = (key: string): string | undefined => Deno?.env.get(key);

interface InvokePayload {
  contract_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  let payload: InvokePayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!payload.contract_id) {
    return new Response("contract_id required", { status: 400 });
  }

  const baseUrl = env("INTERNAL_BASE_URL");
  const secret = env("INTERNAL_PROCESSING_SECRET");
  if (!baseUrl || !secret) {
    return new Response("function not configured", { status: 500 });
  }

  const upstream = await fetch(`${baseUrl}/api/contracts/${payload.contract_id}/process`, {
    method: "POST",
    headers: { "x-internal-secret": secret },
  });

  return new Response(await upstream.text(), { status: upstream.status });
});
