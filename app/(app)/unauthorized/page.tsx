import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from 'next-intl/server';

export default async function UnauthorizedPage() {
  const t = await getTranslations('errors');
  
  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <ShieldAlert className="h-16 w-16 mx-auto mb-4 text-destructive" />
      <h1 className="text-4xl font-bold mb-4">{t('accessDenied')}</h1>
      <p className="text-xl text-muted-foreground mb-8">
        {t('accessDeniedMessage')}
      </p>
      <Link href="/tournaments">
        <Button>{t('returnToTournaments')}</Button>
      </Link>
    </div>
  );
}
