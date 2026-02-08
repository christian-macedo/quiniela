"use client";

import { useTranslations } from "next-intl";
import { toast as sonnerToast } from "sonner";

/**
 * Feature-scoped toast hook
 *
 * Wraps sonner toast with automatic i18n translation support.
 * Translations are automatically looked up based on the feature namespace.
 *
 * @param feature - The feature namespace for translations (e.g., "profile", "predictions")
 * @returns Toast methods with automatic translation
 *
 * @example
 * ```tsx
 * const toast = useFeatureToast("profile");
 *
 * // Uses translation key: profile.success.screenNameSet
 * toast.success("success.screenNameSet");
 *
 * // Uses translation key: profile.error.failedToSetScreenName
 * toast.error("error.failedToSetScreenName");
 *
 * // Or pass a plain string for non-translated messages
 * toast.info("Debug message");
 * ```
 */
export function useFeatureToast(feature: string) {
  const t = useTranslations(feature);

  return {
    success: (messageKey: string) => {
      // Try to translate, fallback to the key itself
      const message = tryTranslate(t, messageKey);
      sonnerToast.success(message);
    },
    error: (messageKey: string) => {
      const message = tryTranslate(t, messageKey);
      sonnerToast.error(message);
    },
    info: (messageKey: string) => {
      const message = tryTranslate(t, messageKey);
      sonnerToast.info(message);
    },
    warning: (messageKey: string) => {
      const message = tryTranslate(t, messageKey);
      sonnerToast.warning(message);
    },
  };
}

/**
 * Helper to safely translate a key, falling back to the key itself if not found
 */
function tryTranslate(t: ReturnType<typeof useTranslations>, key: string): string {
  try {
    return t(key);
  } catch {
    // If translation fails, return the key itself
    return key;
  }
}
