import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const CONFIG_PATH = "/configuration-error";

function isAuthRoute(pathname: string) {
  return pathname.startsWith("/auth") || pathname === "/auth/callback";
}

function redirectToConfig(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = CONFIG_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === CONFIG_PATH) {
    return NextResponse.next({ request });
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    if (isAuthRoute(pathname)) {
      return NextResponse.next({ request });
    }
    return redirectToConfig(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isAuthRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (user && pathname.startsWith("/auth/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (err) {
    console.error("[middleware] session update failed:", err);
    if (isAuthRoute(pathname)) {
      return NextResponse.next({ request });
    }
    return redirectToConfig(request);
  }
}
