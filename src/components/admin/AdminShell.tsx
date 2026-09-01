'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Users, CreditCard, Activity, Settings, Shield, LogOut, CalendarClock
} from 'lucide-react';

const TABS = [
  { href: '/admin', icon: LayoutDashboard, labelKey: 'adm.overview', exact: true },
  { href: '/admin/businesses', icon: Building2, labelKey: 'adm.businesses' },
  { href: '/admin/users', icon: Users, labelKey: 'adm.users' },
  { href: '/admin/accounts', icon: CalendarClock, labelKey: 'adm.accounts.title' },
  { href: '/admin/plans', icon: CreditCard, labelKey: 'adm.plans' },
  { href: '/admin/activity', icon: Activity, labelKey: 'adm.activity' },
  { href: '/admin/settings', icon: Settings, labelKey: 'adm.settings' }
];

export default function AdminShell({ name, email, children }: { name: string; email: string; children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-100 bg-white px-4 py-5 lg:flex lg:flex-col" dir="ltr">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-white">
            <Shield className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-slate-800">Wassil</p>
            <p className="text-[11px] text-slate-400">{t('adm.title')}</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            return (
              <Link
                key={tb.href}
                href={tb.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition',
                  isActive(tb.href, tb.exact) ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(tb.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 font-bold text-white">
              {(name || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{name}</p>
              <p className="truncate text-[11px] text-slate-500">{email}</p>
            </div>
          </div>
          <Link href="/api/auth/signout" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-500">
            <LogOut className="h-3 w-3" /> {t('common.back')}
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-6 lg:px-10">
        {/* mobile header */}
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white">
              <Shield className="h-4 w-4" />
            </span>
            <span className="font-extrabold text-slate-800">Wassil · Admin</span>
          </div>
          <select
            value={pathname}
            onChange={(e) => (window.location.href = e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
          >
            {TABS.map((tb) => (
              <option key={tb.href} value={tb.href}>{t(tb.labelKey)}</option>
            ))}
          </select>
        </div>
        {children}
      </main>
    </div>
  );
}