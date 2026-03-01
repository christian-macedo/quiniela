import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { maskEmail } from "@/lib/utils/privacy";
import { AdminUserView, UserStatus } from "@/types/database";
import { UserManagementList } from "@/components/admin/user-management-list";

interface UserWithStats extends AdminUserView {
  is_admin: boolean;
  status: UserStatus;
  stats: {
    prediction_count: number;
    tournament_count: number;
    total_points: number;
  };
}

export default async function AdminUsersPage() {
  const t = await getTranslations("admin.users");
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  const usersWithStats: UserWithStats[] = await Promise.all(
    (users || []).map(async (user) => {
      const { count: predictionCount } = await supabase
        .from("predictions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { data: rankings } = await supabase
        .from("tournament_rankings")
        .select("tournament_id, total_points")
        .eq("user_id", user.id);

      const tournamentCount = rankings?.length || 0;
      const totalPoints = rankings?.reduce((sum, r) => sum + r.total_points, 0) || 0;

      return {
        ...user,
        email: maskEmail(user.email),
        stats: {
          prediction_count: predictionCount || 0,
          tournament_count: tournamentCount,
          total_points: totalPoints,
        },
      } as UserWithStats;
    })
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <UserManagementList initialUsers={usersWithStats} />
    </div>
  );
}
