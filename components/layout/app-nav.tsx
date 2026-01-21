"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/profile/user-nav";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";
import { User } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface AppNavProps {
  user: User | null;
}

export function AppNav({ user }: AppNavProps) {
  const t = useTranslations('common');
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
          {t('appName')}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-4 items-center">
          <LanguageSwitcher />
          <Link href="/tournaments">
            <Button variant="ghost">{t('navigation.tournaments')}</Button>
          </Link>
          {user?.is_admin && (
            <>
              <Link href="/tournaments/manage">
                <Button variant="ghost">{t('navigation.manageTournaments')}</Button>
              </Link>
              <Link href="/teams">
                <Button variant="ghost">{t('navigation.manageTeams')}</Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="ghost">{t('navigation.userManagement')}</Button>
              </Link>
            </>
          )}
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
