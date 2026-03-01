import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

