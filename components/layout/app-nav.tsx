"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import { UserNav } from "@/components/profile/user-nav";
import { MobileNav } from "./mobile-nav";
import { LanguageSwitcher } from "./language-switcher";
import { User } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Shield } from "lucide-react";

interface AppNavProps {
  user: User | null;
}

export function AppNav({ user }: AppNavProps) {
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/tournaments" className="font-display text-2xl font-bold uppercase tracking-tight">
          {t('appName')}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-1 items-center">
          <LanguageSwitcher />
          <Link
            href="/tournaments"
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive("/tournaments") && !pathname.includes("/manage")
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('navigation.tournaments')}
          </Link>
          {user?.is_admin && (
            <div className="flex items-center gap-1 ml-2 bg-muted/50 rounded-lg px-1 py-0.5">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <Link
                href="/tournaments/manage"
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive("/tournaments/manage")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t('navigation.manageTournaments')}
              </Link>
              <Link
                href="/teams"
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive("/teams")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t('navigation.manageTeams')}
              </Link>
              <Link
                href="/admin/users"
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive("/admin/users")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t('navigation.userManagement')}
              </Link>
            </div>
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
