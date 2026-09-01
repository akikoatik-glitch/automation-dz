'use client';

import { SessionProvider } from 'next-auth/react';
import { LocaleProvider } from '@/lib/i18n';

export function Providers({
  initialLocale,
  children
}: {
  initialLocale: string;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </SessionProvider>
  );
}