"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

/**
 * Account Deletion Section Component
 *
 * Allows users to deactivate their own account (soft delete).
 * Displays a prominent warning card with confirmation dialog.
 */
export function AccountDeletionSection() {
  const t = useTranslations("profile.deletion");
  const toast = useFeatureToast("profile.messages");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeactivate() {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/profile/deactivate", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to deactivate");

      toast.success("success.accountDeactivated");
      router.push("/");
    } catch (error) {
      console.error("Deactivation error:", error);
      toast.error("error.failedToDeactivate");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {t("deactivateButton")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>{t("confirmDescription")}</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>{t("consequence1")}</li>
                  <li>{t("consequence2")}</li>
                  <li>{t("consequence3")}</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeactivate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("confirmButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
