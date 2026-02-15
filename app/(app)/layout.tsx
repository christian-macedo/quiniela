import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/app-nav";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // Fetch full user profile if authenticated
  let userProfile = null;
  if (authUser) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    // If user profile doesn't exist, create it
    if (error && error.code === 'PGRST116') {
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

    // Check if user is deactivated and sign them out
    if (userProfile?.status === 'deactivated') {
      await supabase.auth.signOut();
      redirect('/login?error=account_deactivated');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav user={userProfile} />
      {children}
    </div>
  );
}
