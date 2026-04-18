import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/app-nav";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Fetch full user profile if authenticated
  let userProfile = null;
  if (authUser) {
    const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).single();

    // If user profile doesn't exist, create it
    if (error && error.code === "PGRST116") {
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: authUser.id,
          email: authUser.email!,
          screen_name: authUser.user_metadata?.screen_name || null,
        })
        .select()
        .single();
      userProfile = newProfile;
    } else {
      userProfile = data;
    }

    // Defense-in-depth: also checked at the edge in lib/supabase/middleware.ts
    // (which fires before this layout renders). This check is a fallback for
    // routes not covered by the middleware or for direct server component renders.
    if (userProfile?.status === "deactivated") {
      await supabase.auth.signOut();
      redirect("/login?error=account_deactivated");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border focus:rounded-md focus:text-sm"
      >
        Skip to content
      </a>
      <AppNav user={userProfile} />
      <main id="main-content">{children}</main>
    </div>
  );
}
