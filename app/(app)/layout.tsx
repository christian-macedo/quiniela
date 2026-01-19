import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/profile/user-nav";

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
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/tournaments" className="text-2xl font-bold">
            Quiniela
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/tournaments">
              <Button variant="ghost">Tournaments</Button>
            </Link>
            <Link href="/tournaments/manage">
              <Button variant="ghost">Manage Tournaments</Button>
            </Link>
            <Link href="/teams">
              <Button variant="ghost">Teams</Button>
            </Link>
            {userProfile && <UserNav user={userProfile} />}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
