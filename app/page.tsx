import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('home');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, redirect to tournaments
  if (user) {
    redirect("/tournaments");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          {t('subtitle')}
        </p>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t('description')}
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/signup">
            <Button size="lg">{t('getStarted')}</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">{t('login')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
