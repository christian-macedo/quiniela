import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Check if authenticated user is deactivated
 * Returns error response if deactivated, null if active
 *
 * Usage in API routes:
 * ```typescript
 * const statusError = await checkUserActive();
 * if (statusError) return statusError;
 * ```
 */
export async function checkUserActive(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userProfile } = await supabase
    .from("users")
    .select("status")
    .eq("id", user.id)
    .single();

  if (userProfile?.status === 'deactivated') {
    await supabase.auth.signOut();

    return NextResponse.json(
      { error: "Account deactivated. Please contact an administrator." },
      { status: 403 }
    );
  }

  return null;
}
