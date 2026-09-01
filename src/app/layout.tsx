import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Providers } from '@/components/Providers';
import { dirFor, fontFor } from '@/lib/i18n/config';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wassil — Business automation, Algerian businesses',
  description:
    'Wassil connects WhatsApp, Facebook, Instagram and forms. Auto-replies, lead capture, appointment reminders and payment follow-ups — automatically.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = cookies().get('locale')?.value || 'fr';
  const dir = dirFor(locale);
  const font = fontFor(locale);

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: font }} className="min-h-screen">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}