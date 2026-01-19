"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2 } from "lucide-react";
import { authenticateWithPasskey, isPasskeySupported } from "@/lib/webauthn/client";

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
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if passkeys are supported
  const passkeySupported = isPasskeySupported();

  const handleAuthenticate = async () => {
    if (!email) {
      setError("Please enter your email address");
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
        const errorMessage = result.error || "Failed to authenticate with passkey";
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
      <div className={className}>
        <p className="text-sm text-muted-foreground text-center">
          Passkeys are not supported in your browser. Please use email and password to log in.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="passkey-email">Email Address</Label>
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
            Authenticating...
          </>
        ) : (
          <>
            <Fingerprint className="mr-2 h-4 w-4" />
            Sign In with Passkey
          </>
        )}
      </Button>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        You&apos;ll use your device&apos;s biometric authentication or security key to sign in.
      </p>
    </div>
  );
}
