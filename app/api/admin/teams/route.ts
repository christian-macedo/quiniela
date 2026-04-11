import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";

export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const adminError = await checkAdminPermission();
    if (adminError) return adminError;

    const supabase = await createClient();
    const body = await request.json();
    const { name, short_name, country_code, logo_url } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: "name is required and must be a string of 1-100 characters" },
        { status: 400 }
      );
    }

    if (
      !short_name ||
      typeof short_name !== "string" ||
      short_name.trim().length === 0 ||
      short_name.length > 10
    ) {
      return NextResponse.json(
        { error: "short_name is required and must be a string of 1-10 characters" },
        { status: 400 }
      );
    }

    if (
      !country_code ||
      typeof country_code !== "string" ||
      country_code.length !== 2
    ) {
      return NextResponse.json(
        { error: "country_code is required and must be a 2-character ISO code" },
        { status: 400 }
      );
    }

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
