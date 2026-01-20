"use client";

import { useState } from "react";
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
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !currentStatus } : u
      ));
    } catch (error) {
      console.error("Error updating admin status:", error);
      alert("Failed to update admin status");
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
              <p className="font-medium">{user.screen_name || "Anonymous"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div>
              {user.is_admin ? (
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="outline">User</Badge>
              )}
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Tournaments</p>
              <p className="font-medium">{user.stats.tournament_count}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Predictions</p>
              <p className="font-medium">{user.stats.prediction_count}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Total Points</p>
              <p className="font-medium">{user.stats.total_points}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Joined</p>
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
                  Revoke Admin
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-1" />
                  Grant Admin
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
