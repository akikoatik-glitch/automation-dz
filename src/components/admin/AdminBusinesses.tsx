'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Badge, ConfirmDialog, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { Search, Building2, UserPlus, Users, PauseCircle, PlayCircle } from 'lucide-react';

type Business = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  status: string;
  planId: string | null;
  planStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
  plan: { id: string; name: string; priceDzd: number } | null;
  _count: { customers: number; members: number };
};

export default function AdminBusinesses() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [q, setQ] = React.useState('');
  const [list, setList] = React.useState<Business[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [suspendTarget, setSuspendTarget] = React.useState<Business | null>(null);

  async function load(preserveQ = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses${preserveQ && q ? `?q=${encodeURIComponent(q)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setList(data.businesses ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(b: Business) {
    const next = b.status === 'suspended' ? 'active' : 'suspended';
    const res = await fetch('/api/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, status: next })
    });
    if (res.ok) {
      push({ tone: 'success', title: next === 'suspended' ? 'Entreprise suspendue' : 'Entreprise réactivée' });
      setSuspendTarget(null);
      load(true);
    } else {
      push({ tone: 'error', title: t('common.error') });
    }
  }

  const search = () => load(false);

  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.businesses')}</h1>
          <p className="mt-1 text-sm text-slate-500">Toutes les entreprises / espaces de travail</p>
        </div>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adm.business.search')} className="w-56" />
          <Button onClick={search}><Search className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">{t('common.name')}</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Data</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
                <th className="px-5 py-3 font-semibold">Créé</th>
                <th className="px-5 py-3 text-end font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">{t('common.loading')}</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">{t('common.noResults')}</td></tr>
              )}
              {!loading && list.map((b) => (
                <tr key={b.id} className="transition hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Building2 className="h-4 w-4" /></span>
                      <div>
                        <p className="font-semibold text-slate-700">{b.name}</p>
                        <p className="text-xs text-slate-400">/{b.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{b.industry || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> {b._count.members}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {b._count.customers}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={b.plan ? 'violet' : 'slate'}>{b.plan?.name || 'Aucun plan'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={b.status === 'active' ? 'green' : 'red'}>
                      {b.status === 'active' ? 'Actif' : 'Suspendu'}
                    </Badge>
                    {b.planStatus === 'trial' && b.trialEndsAt && new Date(b.trialEndsAt).getTime() > now && (
                      <span className="ms-1.5 text-[10px] font-medium text-amber-600">essai</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-end">
                    <button
                      onClick={() => setSuspendTarget(b)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition',
                        b.status === 'suspended'
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-red-200 text-red-500 hover:bg-red-50'
                      )}
                    >
                      {b.status === 'suspended' ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                      {b.status === 'suspended' ? t('adm.business.unsuspend') : t('adm.business.suspend')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => suspendTarget && toggleStatus(suspendTarget)}
        title={suspendTarget?.status === 'suspended' ? 'Réactiver cette entreprise ?' : 'Suspendre cette entreprise ?'}
        description={suspendTarget?.status === 'suspended' ? 'Le workspace redevient accessible.' : 'Les membres ne pourront plus accéder à leurs données jusqu’à réactivation.'}
        confirmLabel={suspendTarget?.status === 'suspended' ? t('adm.business.unsuspend') : t('adm.business.suspend')}
        tone={suspendTarget?.status === 'suspended' ? 'primary' : 'danger'}
      />
    </div>
  );
}
