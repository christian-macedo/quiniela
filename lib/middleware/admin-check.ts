import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Middleware to check admin permissions in API routes
 * Returns error response if not admin, otherwise returns null
 *
 * @returns NextResponse with error (401/403) if not authorized, null if admin
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const adminError = await checkAdminPermission();
 *   if (adminError) return adminError;
 *
 *   // ... rest of handler
 * }
 * ```
 */
export async function checkAdminPermission(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  return null; // Admin check passed
}
