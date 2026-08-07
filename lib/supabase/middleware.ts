import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Routes that do NOT get the deactivated-user check in middleware.
// API routes are excluded because a redirect would break JSON clients — those
// routes enforce deactivation individually via checkUserActive() middleware.
// All other app routes are covered automatically (deny-list, not allow-list).
const PUBLIC_ROUTE_PREFIX =
  /^\/(login|signup|forgot-password|update-password|auth|unauthorized|_next|favicon\.ico|api)(\/|$)/;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Block deactivated users at the edge before any page renders.
  // Inverted allow-list: skip only known public routes so new app routes are
  // covered automatically without needing to update this regex.
  if (user && !PUBLIC_ROUTE_PREFIX.test(request.nextUrl.pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("[middleware] status check failed", { userId: user.id });
    }

    if (profile?.status === "deactivated") {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "account_deactivated");
      // Copy auth-clearing cookies (with full options) from supabaseResponse into
      // the redirect so signOut() actually clears the session. Passing the full
      // cookie object preserves httpOnly, Secure, SameSite, etc.
      const redirectResponse = NextResponse.redirect(loginUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
