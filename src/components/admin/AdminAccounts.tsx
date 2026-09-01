'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Badge, Modal, Select, Field, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  Search, Building2, User, Hourglass, CheckCircle2, Ban,
  Clock, CalendarPlus, PlusCircle, PlayCircle, PauseCircle, Wallet
} from 'lucide-react';

type Account = {
  id: string;
  name: string;
  slug: string;
  email: string;
  ownerName: string;
  industry: string | null;
  status: string;
  planStatus: string;
  trialEndsAt: string | null;
  planName: string | null;
  customers: number;
  members: number;
  createdAt: string;
};

type Mode = 'all' | 'trial' | 'paid' | 'expired';

const DURATIONS = [
  { label: '1 heure', hours: 1 },
  { label: '1 jour', hours: 24 },
  { label: '7 jours', hours: 24 * 7 },
  { label: '1 mois (30j)', hours: 24 * 30 },
  { label: '2 mois (60j)', hours: 24 * 60 },
  { label: '3 mois (90j)', hours: 24 * 90 },
  { label: '6 mois (180j)', hours: 24 * 180 },
  { label: '1 an (365j)', hours: 24 * 365 }
];

export default function AdminAccounts() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<Mode>('all');
  const [list, setList] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<Account | null>(null);
  const [suspendTarget, setSuspendTarget] = React.useState<Account | null>(null);

  const [editMode, setEditMode] = React.useState<'trial' | 'paid'>('trial');
  const [duration, setDuration] = React.useState(24 * 30);
  const [saving, setSaving] = React.useState(false);

  const now = Date.now();

  async function load(preserveQ = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (preserveQ && q) params.set('q', q);
      params.set('mode', filter);
      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setList(data.accounts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function openEdit(a: Account) {
    setEditing(a);
    setEditMode(a.planStatus === 'trial' && !isExpired(a) ? 'trial' : 'trial');
    setDuration(24 * 30);
  }

  function isExpired(a: Account) {
    return !!a.trialEndsAt && new Date(a.trialEndsAt).getTime() < now;
  }

  function modeOf(a: Account): Mode {
    if (isExpired(a)) return 'expired';
    if (a.planStatus === 'trial') return 'trial';
    return 'paid';
  }

  async function apply() {
    if (!editing) return;
    setSaving(true);
    try {
      const durationDays = editMode === 'paid' ? duration / 24 : 0;
      const durationHours = editMode === 'trial' ? duration : 0;
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, action: editMode, durationHours, durationDays })
      });
      if (res.ok) {
        push({ tone: 'success', title: editMode === 'trial' ? 'Essai gratuit activé' : 'Compte activé (payant)' });
        setEditing(null);
        load(true);
      } else {
        push({ tone: 'error', title: t('common.error') });
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend(a: Account) {
    const nextStatus = a.status === 'suspended' ? 'active' : 'suspended';
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, action: nextStatus === 'suspended' ? 'suspend' : 'activate' })
    });
    if (res.ok) {
      push({ tone: 'success', title: nextStatus === 'suspended' ? 'Compte suspendu' : 'Compte réactivé' });
      setSuspendTarget(null);
      load(true);
    } else {
      push({ tone: 'error', title: t('common.error') });
    }
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR') : '—';

  const counts = list.reduce(
    (acc, a) => {
      acc[modeOf(a)]++;
      return acc;
    },
    { all: list.length, trial: 0, paid: 0, expired: 0 } as Record<Mode, number>
  );

  const FILTERS: { key: Mode; labelKey: string; icon: React.ElementType }[] = [
    { key: 'all', labelKey: 'adm.accounts.all', icon: Building2 },
    { key: 'trial', labelKey: 'adm.accounts.trial', icon: Hourglass },
    { key: 'paid', labelKey: 'adm.accounts.paid', icon: Wallet },
    { key: 'expired', labelKey: 'adm.accounts.expired', icon: Ban }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.accounts.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adm.accounts.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adm.business.search')} className="w-56" />
          <Button onClick={() => load(false)}><Search className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                filter === f.key ? 'border-slate-900 bg-slate-900 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(f.labelKey)}
              <span className={cn('rounded-full px-1.5 text-[10px]', filter === f.key ? 'bg-white/20' : 'bg-slate-100')}>{counts[f.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">{t('adm.accounts.owner')}</th>
                <th className="px-5 py-3 font-semibold">Entreprise</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Mode</th>
                <th className="px-5 py-3 font-semibold">Expiration</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
                <th className="px-5 py-3 font-semibold">Créé</th>
                <th className="px-5 py-3 text-end font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">{t('common.loading')}</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">{t('common.noResults')}</td></tr>
              )}
              {!loading && list.map((a) => {
                const m = modeOf(a);
                const exp = isExpired(a);
                return (
                  <tr key={a.id} className="transition hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><User className="h-4 w-4" /></span>
                        <div>
                          <p className="font-semibold text-slate-700">{a.ownerName || '—'}</p>
                          <p className="text-xs text-slate-400">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-700">{a.name}</p>
                      <p className="text-xs text-slate-400">/{a.slug}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="violet">{a.planName || 'Aucun plan'}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={m === 'trial' ? 'amber' : m === 'paid' ? 'green' : 'red'}>
                        {m === 'trial' ? 'Essai' : m === 'paid' ? 'Payant' : 'Expiré'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {a.trialEndsAt ? (
                        <div>
                          <p className="text-xs font-medium text-slate-600">{fmtDate(a.trialEndsAt)}</p>
                          {!exp && (
                            <p className="text-[10px] text-slate-400">
                              {Math.ceil((new Date(a.trialEndsAt).getTime() - now) / (24 * 3600 * 1000))} j
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={a.status === 'active' ? 'green' : 'red'}>
                        {a.status === 'active' ? 'Actif' : 'Suspendu'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{fmtDate(a.createdAt)}</td>
                    <td className="px-5 py-3 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(a)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" /> {t('adm.accounts.set')}
                        </button>
                        <button
                          onClick={() => setSuspendTarget(a)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition',
                            a.status === 'suspended'
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border-red-200 text-red-500 hover:bg-red-50'
                          )}
                        >
                          {a.status === 'suspended' ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                          {a.status === 'suspended' ? t('adm.business.unsuspend') : t('adm.business.suspend')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('adm.accounts.setTitle')}>
        {editing && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-bold text-slate-800">{editing.name}</p>
              <p className="text-xs text-slate-500">{editing.email}</p>
            </div>

            <div>
              <p className="label">{t('adm.accounts.type')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditMode('trial')}
                  className={cn('rounded-xl border p-3 text-start transition', editMode === 'trial' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white')}
                >
                  <span className="flex items-center gap-2 font-bold text-slate-700"><Hourglass className="h-4 w-4 text-brand-500" /> {t('adm.accounts.freeTrial')}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{t('adm.accounts.freeTrialDesc')}</span>
                </button>
                <button
                  onClick={() => setEditMode('paid')}
                  className={cn('rounded-xl border p-3 text-start transition', editMode === 'paid' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white')}
                >
                  <span className="flex items-center gap-2 font-bold text-slate-700"><Wallet className="h-4 w-4 text-emerald-500" /> {t('adm.accounts.paidPlan')}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{t('adm.accounts.paidPlanDesc')}</span>
                </button>
              </div>
            </div>

            <Field label={t('adm.accounts.duration')}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DURATIONS.map((d) => (
                  <button
                    key={d.hours}
                    onClick={() => setDuration(d.hours)}
                    className={cn('rounded-lg border px-2 py-2 text-xs font-semibold transition', duration === d.hours ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex gap-2 pt-1">
              <Button onClick={apply} disabled={saving} className="flex-1">
                {saving ? t('common.saving') : (editMode === 'trial' ? t('adm.accounts.activateTrial') : t('adm.accounts.activatePaid'))}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">{t('adm.accounts.hint')}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => suspendTarget && toggleSuspend(suspendTarget)}
        title={suspendTarget?.status === 'suspended' ? 'Réactiver ce compte ?' : 'Suspendre ce compte ?'}
        description={suspendTarget?.status === 'suspended' ? 'Le workspace redevient accessible.' : 'Le client ne pourra plus accéder à son workspace.'}
        confirmLabel={suspendTarget?.status === 'suspended' ? t('adm.business.unsuspend') : t('adm.business.suspend')}
        tone={suspendTarget?.status === 'suspended' ? 'primary' : 'danger'}
      />
    </div>
  );
}
