'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Select, Modal, Field, Badge, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import { CalendarPlus, CalendarCheck, CalendarX2, Trash2, AlarmClock, ArrowRight } from 'lucide-react';

type Appt = {
  id: string;
  clientName: string;
  service: string | null;
  startsAt: string;
  status: string;
  notes: string | null;
  phone: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
};

const STATUSES = ['booked', 'confirmed', 'done', 'no_show', 'cancelled'];

const STATUS_STYLES: Record<string, string> = {
  booked: 'bg-slate-100 text-slate-500',
  confirmed: 'bg-emerald-50 text-emerald-600',
  done: 'bg-brand-50 text-brand-600',
  no_show: 'bg-red-50 text-red-600',
  cancelled: 'bg-slate-100 text-slate-400'
};

export default function AppointmentsPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [list, setList] = React.useState<Appt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  });
  const [status, setStatus] = React.useState('all');
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    clientName: '', phone: '', service: '', startsAt: '', status: 'booked', notes: ''
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const base = `/api/appointments?status=${status}`;
      const url = date ? `${base}&from=${encodeURIComponent(date + 'T00:00:00')}&to=${encodeURIComponent(date + 'T23:59:59')}` : base;
      const res = await fetch(url);
      if (res.ok) setList(((await res.json()).appointments ?? []) as Appt[]);
    } finally {
      setLoading(false);
    }
  }, [date, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!form.clientName.trim() || !form.startsAt) return;
    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message || t('common.error') });
        return;
      }
      push({ tone: 'success', title: t('common.saved') });
      setOpen(false);
      setForm({ clientName: '', phone: '', service: '', startsAt: '', status: 'booked', notes: '' });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, st: string) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: st })
    });
    if (res.ok) void load();
  };

  const remind = async (a: Appt) => {
    const res = await fetch(`/api/appointments/${a.id}?action=remind`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    push(res.ok ? { tone: 'success', title: t('appt.reminded') } : { tone: 'error', title: data.message || t('common.error') });
  };

  const remove = async () => {
    if (!deleteId) return;
    await fetch(`/api/appointments/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    void load();
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('appt.title')} subtitle={t('appt.subtitle')} icon={<CalendarCheck className="h-5 w-5" />}>
        <Button onClick={() => setOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> {t('appt.add')}
        </Button>
      </PageHeader>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label={t('appt.calendar')}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('appt.status')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`appt.${s}`)}</option>
            ))}
          </Select>
        </Field>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">{t('appt.noAppointments')}</div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {list.map((a) => {
              const when = new Date(a.startsAt);
              const today = new Date();
              const isToday = when.toDateString() === today.toDateString();
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-slate-50/60">
                  <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="text-sm font-extrabold leading-none">{when.getDate()}</span>
                    <span className="text-[10px] uppercase">{when.toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR', { month: 'short' })}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">
                      {a.clientName}
                      {a.phone && <span className="ml-2 font-normal text-slate-400 ltr">· {a.phone}</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {when.toLocaleTimeString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {a.service && <> · {a.service}</>}
                    </p>
                  </div>
                  <Badge className={STATUS_STYLES[a.status] ?? STATUS_STYLES.booked}>{t(`appt.${a.status}`)}</Badge>
                  {a.status === 'booked' && isToday && (
                    <Button variant="secondary" size="sm" onClick={() => updateStatus(a.id, 'confirmed')}>
                      <ArrowRight className="h-3.5 w-3.5 rtl-flip" /> {t('appt.confirmed')}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remind(a)} disabled={!a.phone}>
                    <AlarmClock className="h-3.5 w-3.5" /> {t('appt.remind')}
                  </Button>
                  {['booked', 'confirmed'].includes(a.status) && (
                    <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, 'done')}>{t('appt.done')}</Button>
                  )}
                  {['booked', 'confirmed'].includes(a.status) && (
                    <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, a.status === 'booked' ? 'no_show' : 'cancelled')}>
                      <CalendarX2 className="h-3.5 w-3.5" /> {t(a.status === 'booked' ? 'appt.no_show' : 'appt.cancelled')}
                    </Button>
                  )}
                  <button onClick={() => setDeleteId(a.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('appt.add')}>
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
            <Field label={t('appt.service')}>
              <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            </Field>
            <Field label={t('appt.time')}>
              <Input dir="ltr" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </Field>
          </div>
          <Field label={t('appt.notes')}>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Button onClick={create} disabled={saving || !form.clientName || !form.startsAt} className="w-full">
            {saving ? t('common.saving') : t('appt.add')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title={t('appt.deleteConfirm')}
        onConfirm={remove}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}