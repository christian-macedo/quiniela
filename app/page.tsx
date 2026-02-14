import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Target, Users, Trophy } from "lucide-react";

export default async function Home() {
  const t = await getTranslations('home');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, redirect to tournaments
  if (user) {
    redirect("/tournaments");
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background: radial spotlight + dot texture from globals */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <div className="backdrop-blur-sm bg-background/50 rounded-lg p-1">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Content */}
      <div className="relative text-center space-y-8 p-8 max-w-2xl mx-auto animate-fade-in">
        <h1 className="font-display text-7xl md:text-8xl font-bold uppercase tracking-tighter">
          {t('title')}
        </h1>
        <p className="text-xl md:text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          {t('subtitle')}
        </p>
        <p className="text-muted-foreground max-w-md mx-auto text-lg">
          {t('description')}
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-sunken border border-border text-sm font-medium">
            <Target className="h-4 w-4 text-primary" />
            {t('features.predict')}
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-sunken border border-border text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            {t('features.compete')}
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-sunken border border-border text-sm font-medium">
            <Trophy className="h-4 w-4 text-primary" />
            {t('features.leaderboard')}
          </span>
        </div>

        {/* CTAs */}
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              {t('getStarted')}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 transition-all duration-200 hover:scale-105">
              {t('login')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
