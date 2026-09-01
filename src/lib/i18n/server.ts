import { cookies } from 'next/headers';
import { en } from './en';
import { fr } from './fr';
import { ar } from './ar';
import { dirFor, fontFor, isLocale, Locale, defaultLocale } from './config';

const dicts: Record<string, Record<string, string>> = { en, fr, ar };

export function getServerLocale(): Locale {
  const cookie = cookies().get('locale')?.value;
  return isLocale(cookie) ? cookie : defaultLocale;
}

export function tr(locale: string, key: string): string {
  const dict = dicts[locale] ?? dicts.en;
  return dict[key] ?? en[key] ?? key;
}

export function dd(locale: string) {
  return {
    dir: dirFor(locale),
    fontFamily: fontFor(locale)
  };
}

// Small server-side variant of the translation dict (for plain keys).
export function serverT(locale: string) {
  return (key: string) => tr(locale, key);
}