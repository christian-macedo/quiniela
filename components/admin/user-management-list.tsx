"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { User } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff } from "lucide-react";
import { formatLocalDate } from "@/lib/utils/date";

interface UserWithStats extends User {
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
  const t = useTranslations('admin');
  const toast = useFeatureToast('admin');

  const [users, setUsers] = useState<UserWithStats[]>(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);

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
      const updatedUser = users.find(u => u.id === userId);
      const userName = updatedUser?.screen_name || updatedUser?.email || t('users.anonymous');

      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !currentStatus } : u
      ));

      // Show success toast
      if (!currentStatus) {
        toast.success('success.adminGranted', { name: userName });
      } else {
        toast.success('success.adminRevoked', { name: userName });
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error('error.failedToUpdatePermissions');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="border rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <p className="font-medium">{user.screen_name || t('users.anonymous')}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div>
              {user.is_admin ? (
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {t('users.admin')}
                </Badge>
              ) : (
                <Badge variant="outline">{t('users.user')}</Badge>
              )}
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t('users.tournaments')}</p>
              <p className="font-medium">{user.stats.tournament_count}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t('users.predictions')}</p>
              <p className="font-medium">{user.stats.prediction_count}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t('users.totalPoints')}</p>
              <p className="font-medium">{user.stats.total_points}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{t('users.joined')}</p>
              <p className="font-medium">{formatLocalDate(user.created_at)}</p>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAdminStatus(user.id, user.is_admin)}
              disabled={loading === user.id}
            >
              {user.is_admin ? (
                <>
                  <ShieldOff className="h-4 w-4 mr-1" />
                  {t('users.revokeAdmin')}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-1" />
                  {t('users.grantAdmin')}
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
