"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { AdminUserView, UserStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, UserCheck, UserX } from "lucide-react";
import { formatLocalDate } from "@/lib/utils/date";
import { getPublicUserDisplay, maskEmail } from "@/lib/utils/privacy";

interface UserWithStats extends AdminUserView {
  is_admin: boolean;
  status: UserStatus;
  stats: {
    prediction_count: number;
    tournament_count: number;
    total_points: number;
  };
}

interface UserManagementListProps {
  initialUsers: UserWithStats[];
}

export function UserManagementList({ initialUsers }: UserManagementListProps) {
  const t = useTranslations("admin");
  const toast = useFeatureToast("admin");

  const [users, setUsers] = useState<UserWithStats[]>(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "deactivated">("all");

  const filteredUsers = users.filter((user) => {
    if (filterStatus === "all") return true;
    return user.status === filterStatus;
  });

  async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to update permissions");

      // Update local state
      const updatedUser = users.find((u) => u.id === userId);
      const userName = updatedUser ? getPublicUserDisplay(updatedUser) : t("users.anonymous");

      setUsers(users.map((u) => (u.id === userId ? { ...u, is_admin: !currentStatus } : u)));

      // Show success toast
      if (!currentStatus) {
        toast.success("success.adminGranted", { name: userName });
      } else {
        toast.success("success.adminRevoked", { name: userName });
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("error.failedToUpdatePermissions");
    } finally {
      setLoading(null);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    setLoading(userId);
    try {
      const newStatus = currentStatus === "active" ? "deactivated" : "active";

      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      const foundUser = users.find((u) => u.id === userId);
      const userName = foundUser ? getPublicUserDisplay(foundUser) : t("users.anonymous");

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, status: newStatus as "active" | "deactivated" } : u
        )
      );

      const messageKey =
        newStatus === "deactivated" ? "success.userDeactivated" : "success.userActivated";
      toast.success(messageKey, { name: userName });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("error.failedToUpdateStatus");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-4 flex gap-2">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          {t("users.all")}
        </Button>
        <Button
          variant={filterStatus === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("active")}
        >
          {t("users.active")}
        </Button>
        <Button
          variant={filterStatus === "deactivated" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("deactivated")}
        >
          {t("users.deactivated")}
        </Button>
      </div>
      {filteredUsers.map((user) => (
        <div
          key={user.id}
          className="border rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <p className="font-medium">{getPublicUserDisplay(user)}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {maskEmail(user.email)}
                <Badge variant="outline" className="text-xs ml-1">
                  {t("users.adminView")}
                </Badge>
              </p>
            </div>
            <div>
              {user.is_admin ? (
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {t("users.admin")}
                </Badge>
              ) : (
                <Badge variant="outline">{t("users.user")}</Badge>
              )}
              {user.status === "deactivated" && (
                <Badge variant="destructive" className="ml-2">
                  {t("users.deactivated")}
                </Badge>
              )}
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t("users.tournaments")}</p>
              <p className="font-medium">{user.stats.tournament_count}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t("users.predictions")}</p>
              <p className="font-medium">{user.stats.prediction_count}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t("users.totalPoints")}</p>
              <p className="font-medium">{user.stats.total_points}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t("users.joined")}</p>
              <p className="font-medium">{formatLocalDate(user.created_at)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAdminStatus(user.id, user.is_admin)}
              disabled={loading === user.id}
            >
              {user.is_admin ? (
                <>
                  <ShieldOff className="h-4 w-4 mr-1" />
                  {t("users.revokeAdmin")}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-1" />
                  {t("users.grantAdmin")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleUserStatus(user.id, user.status)}
              disabled={loading === user.id}
            >
              {user.status === "active" ? (
                <>
                  <UserX className="h-4 w-4 mr-1" />
                  {t("users.deactivate")}
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-1" />
                  {t("users.activate")}
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
