import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const adminError = await checkAdminPermission();
    if (adminError) return adminError;

    const supabase = await createClient();
    const body = await request.json();
    const { name, short_name, country_code, logo_url } = body;

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name,
        short_name,
        country_code,
        logo_url,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
