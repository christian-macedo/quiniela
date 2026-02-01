"use client";

import { toast as sonnerToast } from "sonner";
import { useTranslations } from "next-intl";

/**
 * Feature-scoped toast notifications with automatic fallback to common messages.
 *
 * @param namespace - Feature namespace (e.g., 'teams', 'matches', 'tournaments')
 *
 * @example
 * const toast = useFeatureToast('teams');
 * toast.success('success.created'); // Uses teams.messages.success.created
 * toast.error('error.failedToUpdate'); // Uses teams.messages.error.failedToUpdate
 * toast.success('common:success.saved'); // Explicit common namespace
 */
export function useFeatureToast(namespace?: string) {
  // Feature-specific translations
  const tFeature = namespace ? useTranslations(`${namespace}.messages`) : null;
  // Common fallback translations
  const tCommon = useTranslations("common.messages");
  // Status translations for loading states
  const tStatus = useTranslations("common.status");

  const showToast = (
    type: "success" | "error" | "warning" | "info",
    messageKey: string,
    values?: Record<string, string | number>
  ) => {
    let translatedMessage: string;

    // Check if key explicitly requests common namespace (e.g., "common:success.saved")
    if (messageKey.startsWith("common:")) {
      const commonKey = messageKey.replace("common:", "");
      translatedMessage = tCommon(commonKey, values);
    } else {
      // Try feature-specific first, fall back to common
      try {
        translatedMessage = tFeature
          ? tFeature(messageKey, values)
          : tCommon(messageKey, values);
      } catch {
        // Fallback to common if feature key doesn't exist
        translatedMessage = tCommon(messageKey, values);
      }
    }

    sonnerToast[type](translatedMessage);
  };

  const promiseToast = <T,>(
    promise: Promise<T> | (() => Promise<T>),
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    values?: Record<string, string | number>
  ) => {
    // Translate loading message (supports status:*, common:*, or feature keys)
    const loadingMsg = messages.loading.startsWith("status:")
      ? tStatus(messages.loading.replace("status:", ""), values)
      : messages.loading.startsWith("common:")
      ? tCommon(messages.loading.replace("common:", ""), values)
      : tFeature
      ? tFeature(messages.loading, values)
      : tCommon(messages.loading, values);

    // Translate success message
    const successMsg = messages.success.startsWith("common:")
      ? tCommon(messages.success.replace("common:", ""), values)
      : tFeature
      ? tFeature(messages.success, values)
      : tCommon(messages.success, values);

    // Translate error message
    const errorMsg = messages.error.startsWith("common:")
      ? tCommon(messages.error.replace("common:", ""), values)
      : tFeature
      ? tFeature(messages.error, values)
      : tCommon(messages.error, values);

    return sonnerToast.promise(promise, {
      loading: loadingMsg,
      success: successMsg,
      error: errorMsg,
    });
  };

  return {
    success: (messageKey: string, values?: Record<string, string | number>) =>
      showToast("success", messageKey, values),
    error: (messageKey: string, values?: Record<string, string | number>) =>
      showToast("error", messageKey, values),
    warning: (messageKey: string, values?: Record<string, string | number>) =>
      showToast("warning", messageKey, values),
    info: (messageKey: string, values?: Record<string, string | number>) =>
      showToast("info", messageKey, values),
    promise: promiseToast,
  };
}
