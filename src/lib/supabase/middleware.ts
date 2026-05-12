import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

const PROTECTED_PREFIX = "/dashboard";
const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password"]);

export async function updateSession(request: NextRequest) {
  if (request.headers.get("authorization")) {
    return NextResponse.next({ request });
  }

  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith(PROTECTED_PREFIX);
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return copyCookies(response, NextResponse.redirect(redirectUrl));
  }

  if (isAuthPage && user) {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
