"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";
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
  const t = useTranslations('tournaments.management.edit');
  const tForm = useTranslations('tournaments.management.form');
  const tStatus = useTranslations('tournaments.status');
  const tCommon = useTranslations('common');
  const toast = useFeatureToast('tournaments');

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
        toast.error('error.failedToUpdate');
        return;
      }

      toast.success('success.updated');
      router.push(`/tournaments/manage/${tournament.id}`);
      router.refresh();
    } catch (err) {
      console.error("Error updating tournament:", err);
      toast.error('common:error.generic');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error('error.failedToDelete');
        setIsDeleting(false);
        return;
      }

      toast.success('success.deleted');
      router.push("/tournaments/manage");
      router.refresh();
    } catch (err) {
      console.error("Error deleting tournament:", err);
      toast.error('common:error.generic');
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>{tForm('tournamentInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{tForm('tournamentName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={tForm('tournamentNamePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sport">{tForm('sport')}</Label>
            <Input
              id="sport"
              value={formData.sport}
              onChange={(e) =>
                setFormData({ ...formData, sport: e.target.value })
              }
              placeholder={tForm('sportPlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">{tForm('startDate')}</Label>
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
              <Label htmlFor="end_date">{tForm('endDate')}</Label>
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
            <Label htmlFor="status">{tCommon('labels.status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: TournamentStatus) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={tForm('selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">{tStatus('upcoming')}</SelectItem>
                <SelectItem value="active">{tStatus('active')}</SelectItem>
                <SelectItem value="completed">{tStatus('completed')}</SelectItem>
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
              {t('deleteTournament')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteConfirmDescription', { name: tournament.name })}
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
          {t('saveChanges')}
        </Button>
      </div>
    </form>
  );
}
