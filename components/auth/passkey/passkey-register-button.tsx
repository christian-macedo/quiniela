"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2 } from "lucide-react";
import { registerPasskey, isPasskeySupported } from "@/lib/webauthn/client";

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
        const errorMessage = result.error || "Failed to register passkey";
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred";
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
        Passkeys Not Supported
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
            Setting Up Passkey...
          </>
        ) : (
          <>
            <Fingerprint className="mr-2 h-4 w-4" />
            Set Up Passkey
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
