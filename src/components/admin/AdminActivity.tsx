'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { Button, Input } from '@/components/ui';
import { Loader2, Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

type LogRow = {
  id: string;
  kind: string;
  summary: string;
  createdAt: string;
  business: { name: string; slug: string } | null;
  user: { name: string | null; email: string | null } | null;
};

export default function AdminActivity() {
  const { t, locale } = useLocale();
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<LogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  async function load(p = page, query = q) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/activity?q=${encodeURIComponent(query)}&page=${p}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.activities ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const perPage = 40;
  const pages = Math.max(1, Math.ceil(total / perPage));

  function runSearch() {
    setPage(1);
    load(1, q);
  }

  function goPage(p: number) {
    if (p < 1 || p > pages) return;
    setPage(p);
    load(p, q);
  }

  const toneFor = (kind: string) => {
    if (kind.includes('create')) return 'bg-emerald-100 text-emerald-700';
    if (kind.includes('delete')) return 'bg-red-100 text-red-600';
    if (kind.includes('enable') || kind.includes('disable')) return 'bg-amber-100 text-amber-700';
    if (kind.includes('message') || kind.includes('receive')) return 'bg-sky-100 text-sky-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.activity')}</h1>
          <p className="mt-1 text-sm text-slate-500">Journal d'activité de toute la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="w-64" />
          <Button onClick={runSearch}><Search className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> {t('common.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-400">
            <Activity className="h-8 w-8" />
            <p className="text-sm">{t('common.noResults')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3 transition hover:bg-slate-50/50">
                <span className={`mt-1.5 inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneFor(r.kind)}`}>
                  {r.kind.split('.')[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{r.summary}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    {r.business && <span className="font-medium text-slate-500">{r.business.name}</span>}
                    {r.user?.name && <span>{r.user.name}</span>}
                    <span>
                      {new Date(r.createdAt).toLocaleString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR')}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} événements</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs">Page {page} / {pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => goPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
