"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2 } from "lucide-react";
import { registerPasskey, isPasskeySupported } from "@/lib/webauthn/client";
import { useTranslations } from 'next-intl';

interface PasskeyRegisterButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  credentialName?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * Button component for registering a new passkey
 *
 * Usage:
 * ```tsx
 * <PasskeyRegisterButton onSuccess={() => console.log("Passkey registered!")} />
 * ```
 */
export function PasskeyRegisterButton({
  onSuccess,
  onError,
  credentialName,
  variant = "default",
  size = "default",
  className,
}: PasskeyRegisterButtonProps) {
  const t = useTranslations('auth.passkeys');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if passkeys are supported
  const passkeySupported = isPasskeySupported();

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await registerPasskey(credentialName);

      if (result.success) {
        // Success!
        if (onSuccess) {
          onSuccess();
        } else {
          // Refresh the page to show updated state
          router.refresh();
        }
      } else {
        // Handle error
        const errorMessage = result.error || t('registerFailed');
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch {
      const errorMessage = t('unexpectedError');
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!passkeySupported) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <Fingerprint className="mr-2 h-4 w-4" />
        {t('notSupportedShort')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleRegister}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('settingUp')}
          </>
        ) : (
          <>
            <Fingerprint className="mr-2 h-4 w-4" />
            {t('setUpPasskey')}
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
