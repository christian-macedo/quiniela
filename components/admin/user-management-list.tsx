"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
import { User } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, UserX, UserCheck, Trash2, Eye, EyeOff } from "lucide-react";
import { formatLocalDate } from "@/lib/utils/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set());

  function toggleEmailVisibility(userId: string) {
    setVisibleEmails((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

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
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !currentStatus } : u
      ));

      // Show success toast
      if (!currentStatus) {
        toast.success('success.adminGranted');
      } else {
        toast.success('success.adminRevoked');
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error('error.failedToUpdatePermissions');
    } finally {
      setLoading(null);
    }
  }

  async function handleDeactivateUser(userId: string) {
    if (!confirm(t('users.confirmDeactivate'))) return;

    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to deactivate");
      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      alert(t('users.errorDeactivate'));
    } finally {
      setLoading(null);
    }
  }

  async function handleReactivateUser(userId: string) {
    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reactivate");
      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      alert(t('users.errorReactivate'));
    } finally {
      setLoading(null);
    }
  }

  async function handleHardDelete(userId: string) {
    if (!confirm(t('users.confirmHardDelete1'))) return;
    if (!confirm(t('users.confirmHardDelete2'))) return;

    setLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      alert(t('users.errorDelete'));
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
              <p className="font-medium">{user.screen_name || t('users.noScreenName')}</p>
              <div className="flex items-center gap-2">
                {visibleEmails.has(user.id) ? (
                  <>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEmailVisibility(user.id)}
                      className="h-6 w-6 p-0"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEmailVisibility(user.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('users.showEmail')}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {user.is_admin ? (
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {t('users.admin')}
                </Badge>
              ) : (
                <Badge variant="outline">{t('users.user')}</Badge>
              )}
              {user.deleted_at && (
                <Badge variant="destructive" className="gap-1">
                  <UserX className="h-3 w-3" />
                  {t('users.deactivated')}
                </Badge>
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
                  {t('users.revokeAdmin')}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-1" />
                  {t('users.grantAdmin')}
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={loading === user.id}>
                  ⋮
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.deleted_at ? (
                  <DropdownMenuItem onClick={() => handleReactivateUser(user.id)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    {t('users.reactivate')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleDeactivateUser(user.id)}>
                    <UserX className="h-4 w-4 mr-2" />
                    {t('users.deactivate')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleHardDelete(user.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('users.hardDelete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
