"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /**
   * Canonical parent route to navigate to when there is no in-app history to
   * return to (deep link, page refresh, or external entry).
   */
  fallbackHref: string;
  /** Optional override label. Defaults to the shared `common:actions.back` string. */
  label?: string;
}

/**
 * History-aware back button. Returns the user to wherever they actually came
 * from (`router.back()`) when an in-app history entry exists, and otherwise
 * falls back to the canonical parent route so deep links never dead-end.
 */
export function BackButton({ fallbackHref, label }: BackButtonProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  function handleClick() {
    // Next.js stores an incrementing `idx` on the history state. `idx > 0`
    // means there is a previous in-app entry to return to; `idx === 0` (or
    // undefined) means this was the first entry in the session.
    const idx =
      typeof window !== "undefined"
        ? (window.history.state as { idx?: number } | null)?.idx
        : undefined;

    if (typeof idx === "number" && idx > 0) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label ?? tCommon("actions.back")}
    </Button>
  );
}
