'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import { StatCard } from '@/components/ui';
import {
  Building2, Users, MessageSquare, Workflow, Zap, CalendarDays, CreditCard, ShieldAlert,
  ArrowUpRight, Activity, TrendingUp, Globe
} from 'lucide-react';

type PlanRow = { id: string; name: string; nameAr: string | null; priceDzd: number; interval: string; sort: number };

export default function AdminOverview({
  counts,
  daily,
  plans
}: {
  counts: {
    businesses: number;
    activeBusinesses: number;
    users: number;
    messages: number;
    automations: number;
    runs: number;
    appointments: number;
    subscriptions: number;
  };
  daily: { label: string; count: number }[];
  plans: PlanRow[];
}) {
  const { t } = useLocale();
  const max = Math.max(1, ...daily.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.overview')}</h1>
          <p className="mt-1 text-sm text-slate-500">Vue d'ensemble de la plateforme Wassil</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('adm.stat.businesses')} value={counts.businesses} sub={`${counts.activeBusinesses} actifs`} icon={<Building2 className="h-5 w-5" />} tone="brand" />
        <StatCard label={t('adm.stat.users')} value={counts.users} icon={<Users className="h-5 w-5" />} tone="violet" />
        <StatCard label={t('adm.stat.messages')} value={counts.messages} icon={<MessageSquare className="h-5 w-5" />} tone="blue" />
        <StatCard label={t('adm.stat.automations')} value={counts.automations} sub={`${counts.runs} exécutions`} icon={<Zap className="h-5 w-5" />} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Nouvelles entreprises</h3>
              <p className="text-xs text-slate-400">14 derniers jours</p>
            </div>
            <Activity className="h-4 w-4 text-brand-400" />
          </div>
          <div className="flex h-40 items-end gap-1.5">
            {daily.map((d, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-accent-400 transition-all group-hover:from-brand-600 group-hover:to-accent-500"
                  style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                />
                <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  {d.count}
                </div>
                <p className="mt-1 text-center text-[10px] text-slate-400 group-hover:text-slate-600">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-800">Abonnements</h3>
          </div>
          <div className="divide-y divide-slate-50">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-slate-500">Abonnements actifs</span>
              <span className="text-sm font-bold text-slate-800">{counts.subscriptions}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-slate-500">Rendez-vous (total)</span>
              <span className="text-sm font-bold text-slate-800">{counts.appointments}</span>
            </div>
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Offres</p>
              <div className="space-y-1.5">
                {plans.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{p.name}</span>
                    <span className="font-semibold text-slate-800">{p.priceDzd} DZD/mois</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/businesses" className="card group flex items-center gap-4 p-4 transition hover:shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Building2 className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{t('adm.businesses')}</p>
            <p className="text-xs text-slate-400">Gérer les espaces</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
        </Link>
        <Link href="/admin/users" className="card group flex items-center gap-4 p-4 transition hover:shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Users className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{t('adm.users')}</p>
            <p className="text-xs text-slate-400">Utilisateurs</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
        </Link>
        <Link href="/admin/plans" className="card group flex items-center gap-4 p-4 transition hover:shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><CreditCard className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{t('adm.plans')}</p>
            <p className="text-xs text-slate-400">Tarifs et limites</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
        </Link>
        <Link href="/admin/activity" className="card group flex items-center gap-4 p-4 transition hover:shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500"><ShieldAlert className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{t('adm.activity')}</p>
            <p className="text-xs text-slate-400">Journal système</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
        </Link>
      </div>
    </div>
  );
}
