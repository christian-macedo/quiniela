import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase admin client with service role permissions.
 *
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * for specific server-side operations that require elevated permissions:
 * - Creating user sessions after passkey authentication
 *
 * NEVER expose this client to the browser or use in client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
