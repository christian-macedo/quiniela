import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check if the current authenticated user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: userProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return userProfile?.is_admin || false;
}

/**
 * Require admin permissions or throw error
 * Use in server components and API routes
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Get current user with full profile including admin status
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return userProfile;
}

/**
 * Admin function to update user admin status
 * Uses service role to bypass RLS policies
 */
export async function updateUserAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("users")
    .update({ is_admin: isAdmin })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Updates user account status (active/deactivated)
 *
 * Deactivated users:
 * - Cannot log in
 * - Cannot submit predictions
 * - Are excluded from rankings
 * - Preserve all historical data
 *
 * @param userId - User ID to update
 * @param status - New status ('active' or 'deactivated')
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'deactivated'
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("users")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (error) throw error;
}
