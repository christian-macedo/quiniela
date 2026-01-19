import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamCreateForm } from "@/components/teams/management/team-create-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewTeamPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/teams">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </Link>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Add New Team</h1>
          <p className="text-muted-foreground">
            Create a new team to add to tournaments
          </p>
        </div>
        
        <TeamCreateForm />
      </div>
    </div>
  );
}
