"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Fingerprint, Shield, Zap, X } from "lucide-react";
import { PasskeyRegisterButton } from "./passkey-register-button";

interface PasskeyMigrationPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkip?: () => void;
  onSuccess?: () => void;
}

/**
 * Modal prompt encouraging users to set up passkeys
 *
 * Shows benefits of passkeys and guides users through setup.
 * Can be dismissed, but will show again on next login.
 */
export function PasskeyMigrationPrompt({
  open,
  onOpenChange,
  onSkip,
  onSuccess,
}: PasskeyMigrationPromptProps) {
  const router = useRouter();
  const [hasRegistered, setHasRegistered] = useState(false);

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onOpenChange(false);
  };

  const handleSuccess = () => {
    setHasRegistered(true);
    if (onSuccess) {
      onSuccess();
    }
    // Close after a brief delay to show success state
    setTimeout(() => {
      onOpenChange(false);
      router.refresh();
    }, 1500);
  };

  if (hasRegistered) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Passkey Set Up!</h2>
            <p className="text-muted-foreground">
              You can now sign in quickly and securely with your passkey.
            </p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="text-2xl">
              Switch to Passkeys
            </AlertDialogTitle>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Skip"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <AlertDialogDescription className="text-left space-y-4 pt-4">
            <p>
              Passkeys are the modern, secure way to sign in. No more passwords to remember!
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">More Secure</h4>
                  <p className="text-sm">
                    Passkeys can&apos;t be phished or stolen. They&apos;re protected by your device.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Faster Sign-In</h4>
                  <p className="text-sm">
                    Use Face ID, Touch ID, or your device PIN. No typing needed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Fingerprint className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Easy to Use</h4>
                  <p className="text-sm">
                    Works across all your devices that support biometric authentication.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <PasskeyRegisterButton
            onSuccess={handleSuccess}
            onError={(error) => console.error("Passkey registration error:", error)}
            variant="default"
            className="w-full"
          />

          <AlertDialogCancel asChild>
            <button onClick={handleSkip} className="w-full">
              Maybe Later
            </button>
          </AlertDialogCancel>

          <p className="text-xs text-muted-foreground text-center pt-2">
            You can always set up a passkey later from your profile settings.
          </p>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
