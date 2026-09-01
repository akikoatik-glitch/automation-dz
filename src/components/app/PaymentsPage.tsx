'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Select, Modal, Field, Badge, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import { Plus, CheckCircle2, AlarmClock, Trash2, CreditCard, CircleDollarSign } from 'lucide-react';

type Inv = {
  id: string;
  number: string;
  clientName: string;
  phone: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  notes: string | null;
  customer: { id: string; name: string } | null;
};

const STATUSES = ['pending', 'overdue', 'paid', 'cancelled'];
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  overdue: 'bg-red-50 text-red-600',
  paid: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-slate-100 text-slate-400'
};

const fmtMoney = (v: number, cur: string, locale: string) =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR', {
    style: 'currency',
    currency: cur === 'EUR' ? 'EUR' : cur === 'USD' ? 'USD' : 'DZD',
    maximumFractionDigits: 0
  }).format(v || 0);

export default function PaymentsPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [list, setList] = React.useState<Inv[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState('all');
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ clientName: '', phone: '', amount: '', currency: 'DZD', dueDate: '', notes: '' });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices?status=${status}`);
      if (res.ok) setList(((await res.json()).invoices ?? []) as Inv[]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totals = React.useMemo(() => {
    const t = { pending: 0, overdue: 0, paid: 0 };
    for (const i of list) if (i.status in t) (t as Record<string, number>)[i.status] += i.amount;
    return t;
  }, [list]);

  const create = async () => {
    if (!form.clientName.trim() || !Number(form.amount)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: form.clientName, phone: form.phone || undefined, amount: Number(form.amount),
          currency: form.currency, dueDate: form.dueDate || undefined, notes: form.notes || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message || t('common.error') });
        return;
      }
      push({ tone: 'success', title: t('common.saved') });
      setOpen(false);
      setForm({ clientName: '', phone: '', amount: '', currency: 'DZD', dueDate: '', notes: '' });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (i: Inv) => {
    const res = await fetch(`/api/invoices/${i.id}?action=pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.ok) void load();
  };

  const remind = async (i: Inv) => {
    const res = await fetch(`/api/invoices/${i.id}?action=remind`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    push(res.ok ? { tone: 'success', title: t('pay.reminded') } : { tone: 'error', title: data.message || t('common.error') });
  };

  const remove = async () => {
    if (!deleteId) return;
    await fetch(`/api/invoices/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    void load();
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('pay.title')} subtitle={t('pay.subtitle')} icon={<CreditCard className="h-5 w-5" />}>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t('pay.add')}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-3">
        {(['pending', 'overdue', 'paid'] as const).map((s) => (
          <div key={s} className={cn('card flex items-center gap-3 p-4', s === 'overdue' && list.some((x) => x.status === 'overdue') && 'ring-1 ring-red-100')}>
            <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s === 'pending' && 'bg-amber-50 text-amber-500', s === 'overdue' && 'bg-red-50 text-red-500', s === 'paid' && 'bg-emerald-50 text-emerald-500')}>
              {s === 'paid' ? <CircleDollarSign className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-400">{t(`pay.${s}`)}</p>
              <p className="text-[10px] font-extrabold text-slate-800" dir="ltr">{fmtMoney(totals[s], form.currency, locale)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label={t('pay.number')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`pay.${s}`)}</option>
            ))}
          </Select>
        </Field>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">{t('pay.noInvoices')}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 text-start font-semibold">{t('pay.number')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('appt.client')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('pay.amount')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('pay.due')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('pay.status')}</th>
                <th className="px-4 py-3 text-end font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((i) => (
                <tr key={i.id} className="transition hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{i.number}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{i.clientName}</p>
                    {i.phone && <p className="text-xs text-slate-400 ltr">{i.phone}</p>}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800" dir="ltr">{fmtMoney(i.amount, i.currency, locale)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {i.dueDate
                      ? new Date(i.dueDate).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_STYLES[i.status] ?? STATUS_STYLES.pending}>{t(`pay.${i.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {i.status !== 'paid' && i.status !== 'cancelled' && (
                        <>
                          <button onClick={() => markPaid(i)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600" title={t('pay.markPaid')}>
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => remind(i)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600" title={t('pay.remind')}>
                            <AlarmClock className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => setDeleteId(i.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('pay.newInvoice')}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('appt.client')}>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('pay.amount')}>
              <Input dir="ltr" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={t('pay.currency')}>
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="DZD">DZD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
          </div>
          <Field label={t('pay.due')}>
            <Input dir="ltr" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label={t('pay.notes')}>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Button onClick={create} disabled={saving || !form.clientName || !Number(form.amount)} className="w-full">
            {saving ? t('common.saving') : t('pay.add')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title={t('pay.deleteConfirm')} onConfirm={remove} onClose={() => setDeleteId(null)} />
    </div>
  );
}