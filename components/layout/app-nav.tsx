"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/profile/user-nav";
import { MobileNav } from "./mobile-nav";
import { User } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface AppNavProps {
  user: User | null;
}

export function AppNav({ user }: AppNavProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/tournaments" className="text-2xl font-bold">
          Quiniela
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-4 items-center">
          <Link href="/tournaments">
            <Button variant="ghost">Tournaments</Button>
          </Link>
          {user?.is_admin && (
            <>
              <Link href="/tournaments/manage">
                <Button variant="ghost">Manage Tournaments</Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="ghost">User Management</Button>
              </Link>
            </>
          )}
          <Link href="/teams">
            <Button variant="ghost">Teams</Button>
          </Link>
          {user && <UserNav user={user} />}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          {user && <UserNav user={user} />}
          <MobileNav user={user} onSignOut={handleSignOut} />
        </div>
      </div>
    </nav>
  );
}
