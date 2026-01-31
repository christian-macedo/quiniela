"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Tournament, TournamentStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TournamentEditFormProps {
  tournament: Tournament;
}

export function TournamentEditForm({ tournament }: TournamentEditFormProps) {
  const router = useRouter();
  const t = useTranslations('tournaments');
  const tCommon = useTranslations('common');
  const tMessages = useTranslations('messages');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: tournament.name,
    sport: tournament.sport,
    start_date: tournament.start_date.split("T")[0],
    end_date: tournament.end_date.split("T")[0],
    status: tournament.status,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          sport: formData.sport,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || tMessages('tournaments.updateFailed'));
      }

      toast.success(tMessages('tournaments.updateSuccess'));
      router.push(`/tournaments/manage/${tournament.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : tMessages('tournaments.updateFailed');
      toast.error(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || tMessages('tournaments.deleteFailed'));
      }

      toast.success(tMessages('tournaments.deleteSuccess'));
      router.push("/tournaments/manage");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : tMessages('tournaments.deleteFailed');
      toast.error(message);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('management.form.tournamentInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('management.form.tournamentName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t('management.form.tournamentNamePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport">{t('management.form.sport')}</Label>
            <Input
              id="sport"
              value={formData.sport}
              onChange={(e) =>
                setFormData({ ...formData, sport: e.target.value })
              }
              placeholder={t('management.form.sportPlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">{t('management.form.startDate')}</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">{t('management.form.endDate')}</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('management.form.status')}</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: TournamentStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('management.form.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">{t('status.upcoming')}</SelectItem>
                <SelectItem value="active">{t('status.active')}</SelectItem>
                <SelectItem value="completed">{t('status.completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('edit.deleteTournament')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('edit.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('edit.deleteConfirmDescription', { name: tournament.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                {tCommon('actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('edit.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
