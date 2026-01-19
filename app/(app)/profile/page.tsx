"use client";

import { useEffect, useState } from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [checkingPasskey, setCheckingPasskey] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
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
  }

  async function checkPasskeys(userId: string) {
    setCheckingPasskey(true);
    const { data } = await supabase
      .from("webauthn_credentials")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    setHasPasskey((data && data.length > 0) || false);
    setCheckingPasskey(false);
  }

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
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
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
              Passkey Authentication
            </CardTitle>
            <CardDescription>
              Use biometric authentication or a security key for secure, password-free sign-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkingPasskey ? (
              <p className="text-sm text-muted-foreground">Loading passkeys...</p>
            ) : (
              <div className="space-y-4">
                {/* Benefits section - show if no passkeys */}
                {!hasPasskey && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Why use passkeys?
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>More secure than passwords</li>
                      <li>Faster sign-in with biometrics</li>
                      <li>Works across all your devices</li>
                      <li>No passwords to remember or type</li>
                    </ul>
                  </div>
                )}

                {/* Passkey List */}
                {hasPasskey && (
                  <div>
                    <h4 className="font-medium mb-3">Your Passkeys</h4>
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
                      Add another passkey for a different device or browser
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
