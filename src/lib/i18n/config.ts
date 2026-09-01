export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية'
};

export function isLocale(v: string | null | undefined): v is Locale {
  return v === 'fr' || v === 'en' || v === 'ar';
}

export function dirFor(locale: string): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function fontFor(locale: string): string {
  return locale === 'ar' ? 'Tajawal, Cairo, sans-serif' : 'Inter, system-ui, sans-serif';
}