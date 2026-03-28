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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const response = NextResponse.next();

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
