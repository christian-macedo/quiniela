"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2 } from "lucide-react";
import { authenticateWithPasskey, isPasskeySupported } from "@/lib/webauthn/client";
import { useTranslations } from 'next-intl';

interface PasskeyLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Component for logging in with a passkey
 *
 * Includes email input and passkey authentication button
 */
export function PasskeyLoginButton({
  onSuccess,
  onError,
  className,
}: PasskeyLoginButtonProps) {
  const t = useTranslations('auth.passkeys');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if passkeys are supported
  const passkeySupported = isPasskeySupported();

  const handleAuthenticate = async () => {
    if (!email) {
      setError(t('enterEmailFirst'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authenticateWithPasskey(email);

      if (result.success) {
        // Session created, redirect to app
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/tournaments");
          router.refresh();
        }
      } else {
        // Handle error
        const errorMessage = result.error || t('authFailed');
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
      <div className={className}>
        <p className="text-sm text-muted-foreground text-center">
          {t('notSupported')}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="passkey-email">{tCommon('labels.emailAddress')}</Label>
        <Input
          id="passkey-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAuthenticate();
            }
          }}
          disabled={isLoading}
          autoComplete="email webauthn"
        />
      </div>

      <Button
        onClick={handleAuthenticate}
        disabled={isLoading || !email}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tCommon('status.authenticating')}
          </>
        ) : (
          <>
            <Fingerprint className="mr-2 h-4 w-4" />
            {t('signInWithPasskey')}
          </>
        )}
      </Button>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('biometricHint')}
      </p>
    </div>
  );
}
