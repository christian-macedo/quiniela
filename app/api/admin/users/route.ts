import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/middleware/admin-check";

export async function GET() {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  try {
    const supabase = await createClient();

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersError) throw usersError;

    // Get activity stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        // Count predictions
        const { count: predictionCount } = await supabase
          .from("predictions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Get tournament participation from rankings view
        const { data: rankings } = await supabase
          .from("tournament_rankings")
          .select("tournament_id, total_points")
          .eq("user_id", user.id);

        const tournamentCount = rankings?.length || 0;
        const totalPoints = rankings?.reduce((sum, r) => sum + r.total_points, 0) || 0;

        return {
          ...user,
          stats: {
            prediction_count: predictionCount || 0,
            tournament_count: tournamentCount,
            total_points: totalPoints,
          },
        };
      })
    );

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
