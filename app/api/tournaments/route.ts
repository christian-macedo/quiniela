import { createClient } from "@/lib/supabase/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: tournaments, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  try {
    const supabase = await createClient();

    const body = await request.json();
    const { name, sport, start_date, end_date, status, scoring_rules } = body;

    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        name,
        sport,
        start_date,
        end_date,
        status: status || "upcoming",
        scoring_rules,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }
}
