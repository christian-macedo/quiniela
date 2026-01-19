import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PasskeyCredentialSummary } from "@/types/webauthn";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to view passkeys" },
        { status: 401 }
      );
    }

    // Fetch user's credentials
    const { data: credentials, error } = await supabase
      .from("webauthn_credentials")
      .select("id, credential_id, credential_name, device_type, last_used_at, created_at, transports, backed_up")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to summary format
    const summaries: PasskeyCredentialSummary[] = (credentials || []).map((cred) => ({
      id: cred.id,
      credentialId: cred.credential_id,
      credentialName: cred.credential_name,
      deviceType: cred.device_type,
      lastUsedAt: cred.last_used_at,
      createdAt: cred.created_at,
      transports: cred.transports,
      backedUp: cred.backed_up,
    }));

    return NextResponse.json({ passkeys: summaries });
  } catch (error) {
    console.error("Error listing passkeys:", error);
    return NextResponse.json(
      { error: "Failed to list passkeys" },
      { status: 500 }
    );
  }
}
