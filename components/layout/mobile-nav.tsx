"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { User } from "@/types/database";

interface MobileNavProps {
  user: User | null;
  onSignOut: () => void;
}

export function MobileNav({ user, onSignOut }: MobileNavProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-background border-l z-50 transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-semibold">{t('appName')}</span>
            <button onClick={closeMenu} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto">
            <div className="flex flex-col p-4 space-y-2">
              <div className="mb-2">
                <LanguageSwitcher />
              </div>

              <Link href="/tournaments" onClick={closeMenu}>
                <Button variant="ghost" className="w-full justify-start">
                  {t('navigation.tournaments')}
                </Button>
              </Link>

              {user?.is_admin && (
                <>
                  <Link href="/tournaments/manage" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      {t('navigation.manageTournaments')}
                    </Button>
                  </Link>
                  <Link href="/teams" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      {t('navigation.manageTeams')}
                    </Button>
                  </Link>
                  <Link href="/admin/users" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      {t('navigation.userManagement')}
                    </Button>
                  </Link>
                </>
              )}

              {user && (
                <>
                  <div className="border-t my-2" />
                  <Link href="/profile" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start">
                      {t('navigation.account')}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      closeMenu();
                      onSignOut();
                    }}
                  >
                    {t('navigation.signOut')}
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
