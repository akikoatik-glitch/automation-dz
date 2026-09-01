'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button, Modal, Field, Input, Select, Badge, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { Search, Plus, Users, Phone, Mail, MoreHorizontal, Trash2, MessageCircle, ChevronRight } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  tags: string | null;
  lastContactAt: string | null;
  createdAt: string;
  _count?: { conversations: number; appointments: number; invoices: number };
};

const STATUS_TONE: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  contacted: 'bg-slate-100 text-slate-600',
  qualified: 'bg-amber-50 text-amber-700',
  client: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-600'
};

export default function CustomersPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [showCreate, setShowCreate] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Customer | null>(null);
  const [form, setForm] = React.useState({ name: '', phone: '', email: '', notes: '' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}&status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        push({ tone: 'success', title: t('common.saved') });
        setShowCreate(false);
        setForm({ name: '', phone: '', email: '', notes: '' });
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    await fetch(`/api/customers/${toDelete.id}`, { method: 'DELETE' });
    push({ tone: 'success', title: t('common.done') });
    setToDelete(null);
    load();
  }

  function relTime(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale, { day: 'numeric', month: 'short' }).format(d);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('cust.title')}
        subtitle={t('cust.subtitle')}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> {t('cust.add')}
          </Button>
        }
      />

      <div className="card p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder={t('cust.searchPlaceholder')}
              className="input w-full !ps-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
            <option value="all">{t('common.all')}</option>
            <option value="new">{t('cust.status.new')}</option>
            <option value="contacted">{t('cust.status.contacted')}</option>
            <option value="qualified">{t('cust.status.qualified')}</option>
            <option value="client">{t('cust.status.client')}</option>
            <option value="lost">{t('cust.status.lost')}</option>
          </Select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && <p className="px-4 py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>}
        {!loading && customers.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">{t('cust.noCustomers')}</p>
          </div>
        )}
        {!loading && customers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 text-start">{t('common.name')}</th>
                  <th className="px-4 py-3 text-start">{t('common.status')}</th>
                  <th className="px-4 py-3 text-start">{t('cust.createdVia')}</th>
                  <th className="px-4 py-3 text-start">{t('cust.lastContact')}</th>
                  <th className="px-4 py-3 text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/app/customers/${c.id}`} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                          {c.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700">{c.name}</p>
                          <p className="flex items-center gap-2 text-xs text-slate-400">
                            {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                            {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('pill', STATUS_TONE[c.status] || STATUS_TONE.new)}>
                        {t(`cust.status.${c.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t(`cust.source.${c.source}`) ?? c.source}</td>
                    <td className="px-4 py-3 text-slate-400">{relTime(c.lastContactAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/app/customers/${c.id}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setToDelete(c)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link href={`/app/customers/${c.id}`} className="rounded-lg p-2 text-slate-400 hover:text-brand-600">
                          <ChevronRight className="h-4 w-4 rtl-flip" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('cust.newCustomer')}>
        <div className="space-y-3">
          <Field label={t('auth.name')}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('auth.name')} />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0550 00 00 00" />
          </Field>
          <Field label={t('common.email')}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@email.dz" />
          </Field>
          <Field label={t('common.notes')}>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button onClick={create} disabled={saving || !form.name.trim()}>
              {t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t('cust.deleteConfirm')}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}