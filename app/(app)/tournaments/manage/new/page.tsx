import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TournamentCreateForm } from "@/components/tournaments/management/tournament-create-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewTournamentPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/tournaments/manage">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </Link>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Tournament</h1>
          <p className="text-muted-foreground">
            Set up a new tournament
          </p>
        </div>
        
        <TournamentCreateForm />
      </div>
    </div>
  );
}
