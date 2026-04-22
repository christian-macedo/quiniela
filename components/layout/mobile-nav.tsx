"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Menu, X, Trophy, Settings, Users, Shield, UserCircle, LogOut } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { User } from "@/types/database";

interface MobileNavProps {
  user: User | null;
  onSignOut: () => void;
}

export function MobileNav({ user, onSignOut }: MobileNavProps) {
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => {
    setIsOpen(false);
    hamburgerRef.current?.focus();
  };

  // Move focus to first nav link when menu opens
  useEffect(() => {
    if (isOpen) {
      firstLinkRef.current?.focus();
    }
  }, [isOpen]);

  // Scroll lock, focus trap, and Escape handler — active only while menu is open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const mainContent = document.getElementById("main-content");
    if (mainContent) mainContent.setAttribute("inert", "");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        hamburgerRef.current?.focus();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      mainContent?.removeAttribute("inert");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        ref={hamburgerRef}
        onClick={isOpen ? closeMenu : openMenu}
        className="md:hidden p-2"
        aria-label={isOpen ? t("navigation.closeMenu") : t("navigation.openMenu")}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        id="mobile-nav-menu"
        ref={dialogRef}
        role="dialog"
        aria-label={t("navigation.mobileMenu")}
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-72 bg-background/95 backdrop-blur-xl border-l z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-display font-bold uppercase tracking-tight">{t("appName")}</span>
            <button onClick={closeMenu} aria-label={t("navigation.closeMenu")}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto">
            <div className="flex flex-col p-4 space-y-1">
              <div className="mb-3">
                <LanguageSwitcher />
              </div>

              <Link href="/tournaments" onClick={closeMenu} ref={firstLinkRef}>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  {t("navigation.tournaments")}
                </Button>
              </Link>

              {user?.is_admin && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Shield className="h-3 w-3" aria-hidden="true" />
                      {t("navigation.admin")}
                    </div>
                  </div>
                  <Link href="/tournaments/manage" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start gap-3 pl-8">
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      {t("navigation.manageTournaments")}
                    </Button>
                  </Link>
                  <Link href="/teams" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start gap-3 pl-8">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {t("navigation.manageTeams")}
                    </Button>
                  </Link>
                  <Link href="/admin/users" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start gap-3 pl-8">
                      <UserCircle className="h-4 w-4" aria-hidden="true" />
                      {t("navigation.userManagement")}
                    </Button>
                  </Link>
                </>
              )}

              {user && (
                <>
                  <div className="border-t my-3" />
                  <Link href="/profile" onClick={closeMenu}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <UserCircle className="h-4 w-4" aria-hidden="true" />
                      {t("navigation.account")}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                    onClick={() => {
                      closeMenu();
                      onSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t("navigation.signOut")}
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
