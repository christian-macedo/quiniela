import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/utils/admin";
import { TournamentEditForm } from "@/components/tournaments/management/tournament-edit-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface TournamentEditPageProps {
  params: Promise<{ tournamentId: string }>;
}

export default async function TournamentEditPage({ params }: TournamentEditPageProps) {
  const t = await getTranslations("tournaments.management");
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await requireAdmin();
  } catch {
    redirect("/unauthorized");
  }

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error || !tournament) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/tournaments/manage/${tournamentId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToTournament")}
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("edit.title")}</h1>
          <p className="text-muted-foreground">{t("edit.subtitle")}</p>
        </div>

        <TournamentEditForm tournament={tournament} />
      </div>
    </div>
  );
}
