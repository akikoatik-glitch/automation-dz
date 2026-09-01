'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Badge, Modal, Field, Input } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  ArrowLeft, Phone, Mail, CalendarDays, FileText, MessageCircle, Pencil, Send, ScrollText
} from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  tags: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Conv = { id: string; channel: string; title: string | null; lastMessageAt: string | null };
type Appt = { id: string; clientName: string; startsAt: string; service: string | null; status: string };
type Inv = { id: string; number: string; amount: number; status: string; dueDate: string | null };
type Msg = { id: string; direction: string; content: string; createdAt: string; channel: string };

const STATUS_TONE: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700',
  contacted: 'bg-slate-100 text-slate-600',
  qualified: 'bg-amber-50 text-amber-700',
  client: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-600'
};

function fmt(iso: string | null, locale: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLocale();
  const { push } = useToast();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [convs, setConvs] = React.useState<Conv[]>([]);
  const [appts, setAppts] = React.useState<Appt[]>([]);
  const [invs, setInvs] = React.useState<Inv[]>([]);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [msgOpen, setMsgOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', phone: '', email: '', notes: '', status: '' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setConvs(data.conversations ?? []);
        setAppts(data.appointments ?? []);
        setInvs(data.invoices ?? []);
        setMsgs(data.messages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openEdit() {
    if (!customer) return;
    setForm({ name: customer.name, phone: customer.phone || '', email: customer.email || '', notes: customer.notes || '', status: customer.status });
    setEditOpen(true);
  }

  async function save() {
    await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setEditOpen(false);
    push({ tone: 'success', title: t('common.saved') });
    load();
  }

  async function sendMsg() {
    if (!draft.trim() || !customer?.phone) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, phone: customer.phone, content: draft, channel: 'whatsapp' })
      });
      const data = await res.json();
      setMsgOpen(false);
      if (data.sent) push({ tone: 'success', title: t('common.saved') });
      else push({ tone: 'error', title: t('common.error'), desc: data.reason || t('int.notConfigured') });
      setDraft('');
      load();
    } finally {
      setSending(false);
    }
  }

  if (loading && !customer) {
    return <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>;
  }
  if (!customer) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-500">{t('err.notFound')}</p>
        <Link href="/app/customers" className="mt-3 inline-block text-brand-600">{t('common.back')}</Link>
      </div>
    );
  }

  let tags: string[] = [];
  try {
    tags = customer.tags ? JSON.parse(customer.tags) : [];
  } catch {}

  return (
    <div className="space-y-4">
      <Link href="/app/customers" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4 rtl-flip" /> {t('cust.title')}
      </Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white">
              {customer.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className={cn('pill', STATUS_TONE[customer.status])}>{t(`cust.status.${customer.status}`)}</span>
                <span className="pill bg-slate-100 text-slate-500">{t(`cust.source.${customer.source}`) ?? customer.source}</span>
                {tags.map((tag) => (
                  <Badge key={tag} tone="violet">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" /> {t('common.edit')}
            </Button>
            <Button size="sm" onClick={() => setMsgOpen(true)} disabled={!customer.phone}>
              <Send className="h-3.5 w-3.5" /> WhatsApp
            </Button>
          </div>
        </div>

        {(customer.phone || customer.email) && (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {customer.phone && (
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> <a href={`tel:${customer.phone}`} className="hover:text-brand-600" dir="ltr">{customer.phone}</a>
              </span>
            )}
            {customer.email && (
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> {customer.email}
              </span>
            )}
            <span className="text-xs text-slate-400">{t('dash.recentActivity')} : {fmt(customer.updatedAt, locale)}</span>
          </div>
        )}
        {customer.notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">{customer.notes}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Conversations */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-700">
              <MessageCircle className="h-4 w-4 text-brand-500" /> {t('cust.conversations')}
            </h3>
            {convs.length > 0 && (
              <Link href={`/app/inbox`} className="btn btn-ghost !py-1 !px-2.5 !text-xs">
                {t('inbox.title')}
              </Link>
            )}
          </div>
          <div className="max-h-64 divide-y divide-slate-50 overflow-y-auto">
            {convs.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">{t('cust.detail.none')}</p>}
            {convs.map((c) => (
              <Link key={c.id} href="/app/inbox" className="flex items-center justify-between px-5 py-3 transition hover:bg-slate-50/60">
                <div>
                  <p className="text-sm font-medium text-slate-700">{c.channel === 'whatsapp' ? 'WhatsApp' : c.channel}</p>
                  <p className="text-xs text-slate-400">{c.title} · {fmt(c.lastMessageAt, locale)}</p>
                </div>
                <ArrowLeft className="h-4 w-4 -rotate-45 text-slate-300 rtl:rotate-45" />
              </Link>
            ))}
          </div>
        </div>

        {/* Appointments */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-700">
              <CalendarDays className="h-4 w-4 text-amber-500" /> {t('cust.appointments')}
            </h3>
            <Link href="/app/appointments" className="btn btn-ghost !py-1 !px-2.5 !text-xs">{t('common.viewAll')}</Link>
          </div>
          <div className="max-h-64 divide-y divide-slate-50 overflow-y-auto">
            {appts.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">{t('appt.noAppointments')}</p>}
            {appts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{a.service || a.clientName}</p>
                  <p className="text-xs text-slate-400">{fmt(a.startsAt, locale)}</p>
                </div>
                <span className="pill bg-slate-100 text-slate-500">{t(`appt.${a.status}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-700">
              <FileText className="h-4 w-4 text-emerald-500" /> {t('cust.invoices')}
            </h3>
          </div>
          <div className="max-h-64 divide-y divide-slate-50 overflow-y-auto">
            {invs.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">{t('pay.noInvoices')}</p>}
            {invs.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">{i.number}</p>
                  <p className="text-xs text-slate-400">{fmt(i.dueDate, locale)}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-slate-700">{i.amount} DZD</p>
                  <span className="pill bg-slate-100 text-slate-500">{t(`pay.${i.status}`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message history */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-700">
              <ScrollText className="h-4 w-4 text-slate-400" /> {t('cust.activity')}
            </h3>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto p-4">
            {msgs.length === 0 && <p className="py-6 text-center text-sm text-slate-400">{t('cust.detail.none')}</p>}
            {msgs.map((m) => (
              <div key={m.id} className={cn('rounded-xl p-2.5 text-sm', m.direction === 'in' ? 'bg-slate-50' : 'bg-brand-50/50')}>
                <p className="text-slate-700">{m.content}</p>
                <p className="mt-1 text-[10px] text-slate-400">{m.direction === 'in' ? t('inbox.in') : t('inbox.out')} · {fmt(m.createdAt, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('cust.detail')}>
        <div className="space-y-3">
          <Field label={t('common.name')}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={t('common.email')}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('common.status')}>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['new', 'contacted', 'qualified', 'client', 'lost'].map((s) => (
                <option key={s} value={s}>{t(`cust.status.${s}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('common.notes')}>
            <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* WhatsApp send */}
      <Modal open={msgOpen} onClose={() => setMsgOpen(false)} title={t('cust.sendMessage')}>
        <div className="space-y-3">
          <Field label={t('common.phone')}>
            <Input value={customer.phone || ''} readOnly className="bg-slate-50" />
          </Field>
          <textarea
            className="input min-h-[90px]"
            placeholder={t('inbox.writeMessage')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMsgOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={sendMsg} disabled={sending || !draft.trim()}>
              {t('common.send')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}