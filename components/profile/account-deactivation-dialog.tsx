"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, UserX } from "lucide-react";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

export function AccountDeactivationDialog() {
  const router = useRouter();
  const t = useTranslations("profile.deactivation");
  const tCommon = useTranslations("common");
  const toast = useFeatureToast('profile');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeactivate = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/account/deactivate", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to deactivate account");
      }

      toast.success("success.accountDeactivated");
      setIsOpen(false);

      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("error.failedToDeactivate");
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <UserX className="mr-2 h-4 w-4" />
          {t("buttonText")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-3">
            <p className="font-medium text-destructive">{t("consequences.title")}</p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>{t("consequences.hiddenProfile")}</li>
              <li>{t("consequences.noLeaderboards")}</li>
              <li>{t("consequences.cannotLogin")}</li>
              <li>{t("consequences.dataPreserved")}</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <p className="text-muted-foreground">{t("reactivationNote")}</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{tCommon("cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t("deactivating") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
