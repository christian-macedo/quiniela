import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET all users who have made predictions for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const supabase = await createClient();

    // Get users from tournament rankings
    const { data: rankings, error: rankingsError } = await supabase
      .from("tournament_rankings")
      .select("user_id, total_points, rank")
      .eq("tournament_id", tournamentId)
      .order("rank", { ascending: true });

    if (rankingsError) throw rankingsError;

    // Also get users who have made predictions but might not be in rankings yet
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId);

    const matchIds = matches?.map(m => m.id) || [];
    const rankedUserIds = rankings?.map(r => r.user_id) || [];
    const allUserIds = [...rankedUserIds];
    
    if (matchIds.length > 0) {
      const { data: predictions } = await supabase
        .from("predictions")
        .select("user_id")
        .in("match_id", matchIds);

      // Get unique user IDs from predictions not in rankings
      (predictions || []).forEach(p => {
        if (!allUserIds.includes(p.user_id)) {
          allUserIds.push(p.user_id);
        }
      });
    }

    // Fetch user details
    type ParticipantUser = { id: string; email: string; screen_name: string | null; avatar_url: string | null };
    const usersMap: Record<string, ParticipantUser> = {};
    
    if (allUserIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, screen_name, avatar_url")
        .in("id", allUserIds);
      
      (users || []).forEach(u => {
        usersMap[u.id] = u as ParticipantUser;
      });
    }

    // Combine and format response
    const rankedUsers = rankings?.map(r => ({
      user: usersMap[r.user_id] || null,
      total_points: r.total_points,
      rank: r.rank,
    })) || [];

    const unrankedUsers = allUserIds
      .filter(id => !rankedUserIds.includes(id))
      .map(id => ({
        user: usersMap[id] || null,
        total_points: 0,
        rank: null,
      }));

    return NextResponse.json([...rankedUsers, ...unrankedUsers]);
  } catch (error) {
    console.error("Error fetching tournament participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament participants" },
      { status: 500 }
    );
  }
}
