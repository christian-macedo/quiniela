import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUTC } from "@/lib/utils/date";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { match_id, predicted_home_score, predicted_away_score } = body;

    // Check if prediction already exists
    const { data: existing } = await supabase
      .from("predictions")
      .select("id")
      .eq("user_id", user.id)
      .eq("match_id", match_id)
      .single();

    if (existing) {
      // Update existing prediction
      const { data, error } = await supabase
        .from("predictions")
        .update({
          predicted_home_score,
          predicted_away_score,
          updated_at: getCurrentUTC(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Create new prediction
      const { data, error } = await supabase
        .from("predictions")
        .insert({
          user_id: user.id,
          match_id,
          predicted_home_score,
          predicted_away_score,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Error creating/updating prediction:", error);
    return NextResponse.json(
      { error: "Failed to save prediction" },
      { status: 500 }
    );
  }
}
