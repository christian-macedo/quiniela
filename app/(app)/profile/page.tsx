"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { User } from "@/types/database";
import { uploadImage, generateImageFilename } from "@/lib/utils/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasskeyRegisterButton } from "@/components/auth/passkey/passkey-register-button";
import { PasskeyList } from "@/components/auth/passkey/passkey-list";
import { Fingerprint } from "lucide-react";

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tPasskeys = useTranslations('auth.passkeys');
  const tCommon = useTranslations('common');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [checkingPasskey, setCheckingPasskey] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const checkPasskeys = useCallback(async (userId: string) => {
    setCheckingPasskey(true);
    const { data } = await supabase
      .from("webauthn_credentials")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    setHasPasskey((data && data.length > 0) || false);
    setCheckingPasskey(false);
  }, [supabase]);

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    setUser(data);
    setLoading(false);

    // Check if user has passkeys
    checkPasskeys(authUser.id);
  }, [supabase, router, checkPasskeys]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function handleUpdate(screenName: string, avatarFile?: File) {
    if (!user) return;

    let avatarUrl = user.avatar_url;

    // Upload avatar if provided
    if (avatarFile) {
      const filename = generateImageFilename(user.id, avatarFile);
      const url = await uploadImage(avatarFile, "user-avatars", filename);
      if (url) {
        avatarUrl = url;
      }
    }

    const { error } = await supabase
      .from("users")
      .update({
        screen_name: screenName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (!error) {
      loadUser();
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{tCommon('status.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Editor */}
        <ProfileEditor user={user} onUpdate={handleUpdate} />

        {/* Passkey Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              {tPasskeys('title')}
            </CardTitle>
            <CardDescription>
              {tPasskeys('description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkingPasskey ? (
              <p className="text-sm text-muted-foreground">{tPasskeys('loadingPasskeys')}</p>
            ) : (
              <div className="space-y-4">
                {/* Benefits section - show if no passkeys */}
                {!hasPasskey && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      {tPasskeys('whyUse')}
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>{tPasskeys('benefits.secure')}</li>
                      <li>{tPasskeys('benefits.fast')}</li>
                      <li>{tPasskeys('benefits.crossDevice')}</li>
                      <li>{tPasskeys('benefits.noPassword')}</li>
                    </ul>
                  </div>
                )}

                {/* Passkey List */}
                {hasPasskey && (
                  <div>
                    <h4 className="font-medium mb-3">{tPasskeys('yourPasskeys')}</h4>
                    <PasskeyList
                      onPasskeysChange={() => {
                        checkPasskeys(user!.id);
                      }}
                    />
                  </div>
                )}

                {/* Add Passkey Button */}
                <div>
                  <PasskeyRegisterButton
                    onSuccess={() => {
                      checkPasskeys(user!.id);
                      router.refresh();
                    }}
                    variant={hasPasskey ? "outline" : "default"}
                  />
                  {hasPasskey && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {tPasskeys('addPasskey')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
