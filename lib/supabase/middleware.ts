import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// App routes that require an active (non-deactivated) user session.
// Auth routes and public routes are excluded — they don't need a status check.
const APP_ROUTE_PREFIX = /^\/(tournaments|teams|admin|profile)/;

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
  // Only check app routes — no need to check auth/public pages.
  if (user && APP_ROUTE_PREFIX.test(request.nextUrl.pathname)) {
    const { data: profile } = await supabase
      .from("users")
      .select("status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "deactivated") {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "account_deactivated");
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}
