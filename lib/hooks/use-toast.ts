"use client";

import { toast as sonnerToast } from "sonner";
import { useTranslations } from "next-intl";

export function useLocalizedToast() {
  const t = useTranslations("toast");

  return {
    success: (messageKey: string, values?: Record<string, string | number>) => {
      sonnerToast.success(t(messageKey, values));
    },
    error: (messageKey: string, values?: Record<string, string | number>) => {
      sonnerToast.error(t(messageKey, values));
    },
    warning: (messageKey: string, values?: Record<string, string | number>) => {
      sonnerToast.warning(t(messageKey, values));
    },
    info: (messageKey: string, values?: Record<string, string | number>) => {
      sonnerToast.info(t(messageKey, values));
    },
    // For raw messages (e.g., API error messages that are already localized or dynamic)
    raw: sonnerToast,
  };
}
