import { createClient } from "@/lib/supabase/server";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  const { data: rankings } = await supabase
    .from("tournament_rankings")
    .select(`
      *,
      user:users(*)
    `)
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{tournament?.name}</h1>
          <p className="text-muted-foreground">Tournament Leaderboard</p>
        </div>
        <div className="flex gap-2">
        <Link href={`/${tournamentId}`}>
          <Button variant="outline">Back to Tournament</Button>
        </Link>
        </div>
      </div>
      <RankingsTable rankings={rankings || []} currentUserId={user?.id} tournamentId={tournamentId} />
    </div>
  );
}
