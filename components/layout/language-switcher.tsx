"use client";

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = (newLocale: string) => {
    setIsChanging(true);

    // Set cookie for locale preference
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Force a full page reload to apply the new locale
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={locale}
        onValueChange={handleLanguageChange}
        disabled={isChanging}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('selectLanguage')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">
            <span className="flex items-center gap-2">
              <span>🇺🇸</span>
              <span>{t('english')}</span>
            </span>
          </SelectItem>
          <SelectItem value="es">
            <span className="flex items-center gap-2">
              <span>🇪🇸</span>
              <span>{t('spanish')}</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
