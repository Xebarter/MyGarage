import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/buyer", "/vendor", "/services"];
const adminPrefix = "/admin";

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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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

  const authCode = request.nextUrl.searchParams.get("code");
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

  const appRole = String(user?.app_metadata?.role ?? "").toLowerCase();
  const appRoles = Array.isArray(user?.app_metadata?.roles)
    ? (user?.app_metadata?.roles as unknown[])
        .map((role) => String(role).toLowerCase())
    : [];
  const isAdminUser = appRole === "admin" || appRoles.includes("admin");

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
