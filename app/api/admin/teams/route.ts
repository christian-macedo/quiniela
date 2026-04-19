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

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length > 100) {
      return NextResponse.json(
        { error: "name is required and must be a string of 1-100 characters" },
        { status: 400 }
      );
    }

    const trimmedShortName = typeof short_name === "string" ? short_name.trim() : "";
    if (!trimmedShortName || trimmedShortName.length > 10) {
      return NextResponse.json(
        { error: "short_name is required and must be a string of 1-10 characters" },
        { status: 400 }
      );
    }

    if (!country_code || typeof country_code !== "string" || !/^[A-Za-z]{2}$/.test(country_code)) {
      return NextResponse.json(
        { error: "country_code must be a 2-letter ISO code (e.g. BR, US)" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: trimmedName,
        short_name: trimmedShortName,
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
