'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useLocale } from '@/lib/i18n';

export function MarketingNav() {
  const { t } = useLocale();
  const [open, setOpen] = React.useState(false);
  const links = [
    { href: '/#features', label: t('landing.nav.features') },
    { href: '/#templates', label: t('landing.nav.templates') },
    { href: '/pricing', label: t('landing.nav.pricing') }
  ];

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          <Link href="/login" className="btn btn-ghost">
            {t('landing.nav.login')}
          </Link>
          <Link href="/register" className="btn btn-primary">
            {t('landing.nav.start')}
          </Link>
        </div>
        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 pt-2">
              <LocaleSwitcher />
              <Link href="/login" className="btn btn-secondary flex-1">
                {t('landing.nav.login')}
              </Link>
              <Link href="/register" className="btn btn-primary flex-1">
                {t('landing.nav.start')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}