'use client';

import { useLocale } from '@/lib/i18n';
import { localeNames, locales } from '@/lib/i18n/config';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-xl border p-1',
        dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
      )}
    >
      <Globe className={cn('h-3.5 w-3.5 rtl:ml-1 ltr:mr-1', dark ? 'text-slate-300' : 'text-slate-400')} />
      {!compact &&
        locales.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={cn(
              'rounded-lg px-2 py-1 text-xs font-semibold transition',
              locale === l
                ? dark
                  ? 'bg-white/15 text-white'
                  : 'bg-brand-50 text-brand-700'
                : dark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {l === 'ar' ? 'ع' : l === 'fr' ? 'FR' : 'EN'}
          </button>
        ))}
    </div>
  );
}