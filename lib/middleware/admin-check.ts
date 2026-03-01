import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/admin";

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
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
  }

  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  return null; // Admin check passed
}
