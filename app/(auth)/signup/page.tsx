"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [screenName, setScreenName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          screen_name: screenName || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // User profile is created automatically by database trigger
      router.push("/tournaments");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background: same spotlight as landing */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

      <div className="absolute top-4 right-4 z-10">
        <div className="backdrop-blur-sm bg-background/50 rounded-lg p-1">
          <LanguageSwitcher />
        </div>
      </div>

      <Card className="w-full max-w-md relative animate-scale-in">
        <CardHeader>
          <CardTitle className="font-display text-3xl uppercase tracking-tight">
            {t("title")}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("emailLabel")}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="screenName" className="text-sm font-medium">
                {t("screenNameLabel")}
              </label>
              <Input
                id="screenName"
                type="text"
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                placeholder={t("screenNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("passwordLabel")}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("creatingAccount") : t("signUpButton")}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t("loginLink")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
