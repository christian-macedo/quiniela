"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

interface ScreenNamePromptModalProps {
  userId: string;
  email: string;
}

/**
 * Screen Name Prompt Modal
 *
 * Displays a modal that users without a screen name must complete
 * before using the application. Cannot be dismissed until a screen
 * name is provided.
 */
export function ScreenNamePromptModal({ userId }: ScreenNamePromptModalProps) {
  const t = useTranslations("profile.screenNamePrompt");
  const toast = useFeatureToast("profile");
  const router = useRouter();
  const [screenName, setScreenName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!screenName.trim()) {
      toast.error("error.screenNameRequired");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({
          screen_name: screenName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("success.screenNameSet");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error setting screen name:", error);
      toast.error("error.failedToSetScreenName");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" hideClose>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="screenName">{t("label")}</Label>
              <Input
                id="screenName"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                placeholder={t("placeholder")}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {t("help")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !screenName.trim()}>
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
