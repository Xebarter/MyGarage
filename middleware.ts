import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { userHasAdminAccess } from "@/lib/auth-admin-shared";

const protectedPrefixes = ["/buyer", "/vendor", "/services"];
const adminPrefix = "/admin";

/**
 * Browser (Flutter web) clients on localhost:<random port> call the API cross-origin.
 * Without ACAO headers the fetch fails and the app surfaces a generic offline message.
 */
function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname === "www.mygarage.ug" || hostname === "mygarage.ug") return true;
    // Private LAN hosts (Flutter web on desktop IP, etc.)
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function applyCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  if (origin && isAllowedCorsOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Accept, X-Requested-With",
    );
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.append("Vary", "Origin");
  }
  return response;
}

function isProtectedPath(pathname: string) {
  // Book and pay for roadside / help services without signing in.
  if (pathname === "/buyer/services" || pathname.startsWith("/buyer/services/")) {
    return false;
  }
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isVerificationBypassPath(pathname: string) {
  return (
    pathname === "/vendor/pending" ||
    pathname.startsWith("/vendor/pending/") ||
    pathname === "/services/pending" ||
    pathname.startsWith("/services/pending/")
  );
}

/** Routes that never need session lookup or role redirects in middleware (unless OAuth `code` is present). */
function canSkipAuthMiddleware(pathname: string, hasOAuthCode: boolean): boolean {
  if (hasOAuthCode) return false;

  if (pathname.startsWith("/api/")) return true;

  if (pathname === "/") return true;

  if (pathname.startsWith("/products")) return true;

  if (pathname.startsWith("/category/")) return true;

  if (pathname.startsWith("/auth")) return true;

  if (pathname.startsWith("/payments/")) return true;

  const exactPublic = new Set([
    "/cart",
    "/checkout",
    "/order-confirmation",
    "/contact-us",
    "/faq",
    "/privacy-policy",
    "/refund-policy",
    "/terms-and-conditions",
    "/vendor-login",
    "/manifest.webmanifest",
  ]);
  if (exactPublic.has(pathname)) return true;

  // Book services without signing in (same exception as isProtectedPath).
  if (pathname === "/buyer/services" || pathname.startsWith("/buyer/services/")) return true;

  // Not listed in protectedPrefixes today; keep parity and avoid Supabase on full dashboard tree.
  if (pathname === "/buyer-dashboard" || pathname.startsWith("/buyer-dashboard/")) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authCode = request.nextUrl.searchParams.get("code");

  // Flutter web (and other browser clients) need CORS on every /api response + preflight.
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return applyCors(request, new NextResponse(null, { status: 204 }));
    }
    return applyCors(request, NextResponse.next());
  }

  if (canSkipAuthMiddleware(pathname, Boolean(authCode))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (!error) {
      const clean = request.nextUrl.clone();
      clean.searchParams.delete("code");
      const redirectResponse = NextResponse.redirect(clean);
      const forwarded = response.headers.getSetCookie?.() ?? [];
      for (const cookieHeader of forwarded) {
        redirectResponse.headers.append("Set-Cookie", cookieHeader);
      }
      return redirectResponse;
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminPath = pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`);

  const isAdminUser = userHasAdminAccess(user);

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", `${pathname}${search}`);

    if (pathname.startsWith("/vendor")) {
      redirectUrl.searchParams.set("role", "vendor");
    } else if (pathname.startsWith("/services")) {
      redirectUrl.searchParams.set("role", "services");
    } else {
      redirectUrl.searchParams.set("role", "buyer");
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (!user && isAdminPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    redirectUrl.searchParams.set("role", "admin");
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdminPath && !isAdminUser) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("role", "admin");
    redirectUrl.searchParams.set("next", "/admin");
    redirectUrl.searchParams.set("error", "admin_required");
    return NextResponse.redirect(redirectUrl);
  }

  // Vendor + service-provider dashboards require admin verification.
  if (user && !isVerificationBypassPath(pathname)) {
    const isVendorPath = pathname === "/vendor" || pathname.startsWith("/vendor/");
    const isServicesPath = pathname === "/services" || pathname.startsWith("/services/");

    if (isVendorPath || isServicesPath) {
      const { data: vendorRow, error: vendorLookupError } = await supabase
        .from("vendors")
        .select("id, vendor_verified, services_verified")
        .eq("id", user.id)
        .maybeSingle();

      // If the profile row doesn't exist yet (e.g. user signed up as buyer first),
      // send them through the portal auth entry which bootstraps the profile.
      if (vendorLookupError || !vendorRow?.id) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/auth";
        redirectUrl.searchParams.set("next", `${pathname}${search}`);
        redirectUrl.searchParams.set("role", isVendorPath ? "vendor" : "services");
        return NextResponse.redirect(redirectUrl);
      }

      if (isVendorPath && !vendorRow.vendor_verified) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/vendor/pending";
        return NextResponse.redirect(redirectUrl);
      }

      if (isServicesPath && !vendorRow.services_verified) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/services/pending";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
