import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TeamEditForm } from "@/components/teams/management/team-edit-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface TeamEditPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamEditPage({ params }: TeamEditPageProps) {
  const t = await getTranslations("teams");
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: team, error } = await supabase.from("teams").select("*").eq("id", teamId).single();

  if (error || !team) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/teams/${teamId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToTeam")}
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("edit.title")}</h1>
          <p className="text-muted-foreground">{t("edit.subtitle")}</p>
        </div>

        <TeamEditForm team={team} />
      </div>
    </div>
  );
}
