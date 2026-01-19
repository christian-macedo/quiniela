import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TeamEditForm } from "@/components/teams/management/team-edit-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TeamEditPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamEditPage({ params }: TeamEditPageProps) {
  const { teamId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: team, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error || !team) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/teams/${teamId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Edit Team</h1>
          <p className="text-muted-foreground">
            Update team information and logo
          </p>
        </div>
        
        <TeamEditForm team={team} />
      </div>
    </div>
  );
}
