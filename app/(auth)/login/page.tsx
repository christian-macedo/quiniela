"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PasskeyLoginButton } from "@/components/auth/passkey/passkey-login-button";
import { PasskeyMigrationPrompt } from "@/components/auth/passkey/passkey-migration-prompt";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Check if user has passkeys registered
      const { data: credentials } = await supabase
        .from("webauthn_credentials")
        .select("id")
        .eq("user_id", data.user?.id)
        .limit(1);

      if (!credentials || credentials.length === 0) {
        // Show migration prompt if no passkeys registered
        setShowMigrationPrompt(true);
      } else {
        // User already has passkeys, just redirect
        router.push("/tournaments");
        router.refresh();
      }
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
        <CardContent className="space-y-6">
          {/* Shared Email Field */}
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
              autoComplete="email"
            />
          </div>

          {/* Passkey Login Section */}
          <PasskeyLoginButton
            email={email}
            onSuccess={() => {
              router.push("/tournaments");
              router.refresh();
            }}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("orContinueWith")}</span>
            </div>
          </div>

          {/* Password Login Section */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  {t("passwordLabel")}
                </label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loggingIn") : t("loginButton")}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-primary hover:underline">
              {t("signUpLink")}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Migration Prompt Modal */}
      <PasskeyMigrationPrompt
        open={showMigrationPrompt}
        onOpenChange={setShowMigrationPrompt}
        onSkip={() => {
          router.push("/tournaments");
          router.refresh();
        }}
        onSuccess={() => {
          router.push("/tournaments");
          router.refresh();
        }}
      />
    </div>
  );
}
