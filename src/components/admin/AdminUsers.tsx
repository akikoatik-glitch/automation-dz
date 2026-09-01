'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Badge } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { Search, User, Shield, Ban, CheckCircle2, Building2 } from 'lucide-react';

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  lang: string;
  active: boolean;
  createdAt: string;
  memberships: { business: { id: string; name: string } }[];
};

export default function AdminUsers() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [q, setQ] = React.useState('');
  const [list, setList] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setList(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function action(u: AdminUser, field: 'role' | 'active') {
    const value =
      field === 'role' ? (u.role === 'super' ? 'user' : 'super')
      : !u.active;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field === 'role' ? { id: u.id, role: value } : { id: u.id, active: value })
    });
    if (res.ok) {
      push({ tone: 'success', title: 'Mis à jour' });
      load();
    } else {
      push({ tone: 'error', title: t('common.error') });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.users')}</h1>
          <p className="mt-1 text-sm text-slate-500">Tous les comptes de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adm.users.search')} className="w-56" />
          <Button onClick={load}><Search className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-semibold">{t('common.name')}</th>
                <th className="px-5 py-3 font-semibold">Workplaces</th>
                <th className="px-5 py-3 font-semibold">Langue</th>
                <th className="px-5 py-3 font-semibold">Rôle</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
                <th className="px-5 py-3 text-end font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">{t('common.loading')}</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">{t('common.noResults')}</td></tr>
              )}
              {!loading && list.map((u) => (
                <tr key={u.id} className="transition hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                        {(u.name || u.email).slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-700">{u.name || '—'}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.memberships.length === 0 && <span className="text-xs text-slate-400">—</span>}
                      {u.memberships.map((m) => (
                        <span key={m.business.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                          <Building2 className="h-3 w-3" /> {m.business.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 uppercase">{u.lang}</td>
                  <td className="px-5 py-3">
                    <Badge tone={u.role === 'super' ? 'violet' : 'blue'}>
                      {u.role === 'super' ? 'Admin plateforme' : 'Utilisateur'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={u.active ? 'green' : 'red'}>{u.active ? 'Actif' : 'Désactivé'}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => action(u, 'role')}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition',
                          u.role === 'super'
                            ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            : 'border-violet-200 text-violet-600 hover:bg-violet-50'
                        )}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {u.role === 'super' ? 'Retirer admin' : t('adm.users.super')}
                      </button>
                      <button
                        onClick={() => action(u, 'active')}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition',
                          u.active
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        )}
                      >
                        {u.active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {u.active ? t('adm.users.deactivate') : t('adm.users.activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
