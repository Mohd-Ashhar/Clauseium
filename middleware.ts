import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ALLOWED_ORIGINS = (process.env.ADDIN_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const CORS_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const CORS_HEADERS = "Authorization, Content-Type";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const isApi = pathname.startsWith("/api/");
  const isAllowedOrigin = !!origin && ALLOWED_ORIGINS.includes(origin);

  if (isApi && isAllowedOrigin && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const response = await updateSession(request);

  if (isApi && isAllowedOrigin) {
    for (const [name, value] of Object.entries(corsHeaders(origin))) {
      response.headers.set(name, value);
    }
  }

  return response;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
