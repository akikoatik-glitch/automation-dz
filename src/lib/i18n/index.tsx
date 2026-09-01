'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { en } from './en';
import { fr } from './fr';
import { ar } from './ar';
import { dirFor, fontFor, isLocale, Locale, defaultLocale } from './config';

const dicts: Record<string, Record<string, string>> = { en, fr, ar };

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

type LocaleCtx = {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  fontFamily: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: string) => void;
};

const LocaleContext = createContext<LocaleCtx>({
  locale: defaultLocale,
  dir: 'ltr',
  fontFamily: '',
  t: (k) => k,
  setLocale: () => {}
});

export function LocaleProvider({
  initialLocale,
  children
}: {
  initialLocale: string;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(isLocale(initialLocale) ? initialLocale : defaultLocale);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dicts[locale] ?? dicts.en;
      return interpolate(dict[key] ?? en[key] ?? key, vars);
    },
    [locale]
  );

  const setLocale = useCallback((l: string) => {
    const next = isLocale(l) ? l : defaultLocale;
    setLocaleState(next);
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = dirFor(next);
    document.documentElement.style.fontFamily = fontFor(next);
    // keep server-rendered layouts in sync
    window.location.reload();
  }, []);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      dir: dirFor(locale),
      fontFamily: fontFor(locale),
      t,
      setLocale
    }),
    [locale, t, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleCtx {
  return useContext(LocaleContext);
}