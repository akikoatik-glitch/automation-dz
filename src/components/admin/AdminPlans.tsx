'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Field, Badge, Modal, Toggle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { Plus, CreditCard, Pencil, Trash2, Save } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  nameAr: string | null;
  priceDzd: number;
  priceUsd: number;
  interval: string;
  limits: string;
  features: string;
  active: boolean;
  sort: number;
};

const DEFAULT_LIMITS = { customers: 100, messages: 200, automations: 5, users: 2, ai: false };

export default function AdminPlans() {
  const { t } = useLocale();
  const { push } = useToast();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [isNew, setIsNew] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<{
    id?: string;
    name: string;
    nameAr: string;
    priceDzd: string;
    priceUsd: string;
    interval: string;
    customers: string;
    messages: string;
    automations: string;
    users: string;
    ai: boolean;
    active: boolean;
    sort: string;
    features: string;
  }>({
    name: '', nameAr: '', priceDzd: '0', priceUsd: '0', interval: 'month',
    customers: '100', messages: '200', automations: '5', users: '2', ai: false, active: true, sort: '0', features: ''
  });

  async function load() {
    const res = await fetch('/api/admin/plans');
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans ?? []);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []);

  function parseLimits(l: string) {
    try {
      const o = JSON.parse(l);
      return {
        customers: String(o.customers ?? DEFAULT_LIMITS.customers),
        messages: String(o.messages ?? DEFAULT_LIMITS.messages),
        automations: String(o.automations ?? DEFAULT_LIMITS.automations),
        users: String(o.users ?? DEFAULT_LIMITS.users),
        ai: !!o.ai
      };
    } catch {
      return {
        customers: String(DEFAULT_LIMITS.customers),
        messages: String(DEFAULT_LIMITS.messages),
        automations: String(DEFAULT_LIMITS.automations),
        users: String(DEFAULT_LIMITS.users),
        ai: false
      };
    }
  }

  function parseFeatures(f: string) {
    try {
      const arr = JSON.parse(f);
      return Array.isArray(arr) ? arr.join(', ') : String(f);
    } catch {
      return String(f);
    }
  }

  function openNew() {
    setIsNew(true);
    setForm({
      name: '', nameAr: '', priceDzd: '0', priceUsd: '0', interval: 'month',
      customers: '100', messages: '200', automations: '5', users: '2', ai: false, active: true, sort: String(plans.length + 1), features: ''
    });
    setEditing({} as Plan);
  }

  function openEdit(p: Plan) {
    setIsNew(false);
    const l = parseLimits(p.limits);
    setForm({
      id: p.id, name: p.name, nameAr: p.nameAr || '', priceDzd: String(p.priceDzd), priceUsd: String(p.priceUsd),
      interval: p.interval, customers: l.customers, messages: l.messages, automations: l.automations, users: l.users,
      ai: l.ai, active: p.active, sort: String(p.sort), features: parseFeatures(p.features)
    });
    setEditing(p);
  }

  async function save() {
    if (!form.name.trim()) {
      push({ tone: 'error', title: 'Nom requis' });
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id,
        name: form.name,
        nameAr: form.nameAr,
        priceDzd: Number(form.priceDzd) || 0,
        priceUsd: Number(form.priceUsd) || 0,
        interval: form.interval,
        active: form.active,
        sort: Number(form.sort) || 0,
        limits: {
          customers: Number(form.customers) || 0,
          messages: Number(form.messages) || 0,
          automations: Number(form.automations) || 0,
          users: Number(form.users) || 0,
          ai: form.ai
        },
        features: form.features.split(',').map((s) => s.trim()).filter(Boolean)
      })
    });
    setSaving(false);
    if (res.ok) {
      push({ tone: 'success', title: isNew ? 'Plan créé' : 'Plan mis à jour' });
      setEditing(null);
      load();
    } else {
      push({ tone: 'error', title: t('common.error') });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.plans')}</h1>
          <p className="mt-1 text-sm text-slate-500">Offres, tarifs et limites</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> {t('adm.plan.new')}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && <p className="col-span-full py-12 text-center text-slate-400">{t('common.loading')}</p>}
        {!loading && plans.map((p) => {
          const l = parseLimits(p.limits);
          return (
            <div key={p.id} className="card group relative flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  {p.nameAr && <p className="text-xs text-slate-400" dir="rtl">{p.nameAr}</p>}
                </div>
                <Badge tone={p.active ? 'green' : 'slate'}>{p.active ? 'Actif' : 'Inactif'}</Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-slate-800">{p.priceDzd.toLocaleString()}</span>
                <span className="text-sm text-slate-400">DZD/mois</span>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row label="Clients" value={formatLimit(Number(l.customers))} />
                <Row label="Messages" value={formatLimit(Number(l.messages))} />
                <Row label="Automations" value={formatLimit(Number(l.automations))} />
                <Row label="Membres" value={formatLimit(Number(l.users))} />
                <Row label="IA" value={l.ai ? 'Incluse' : '—'} />
              </div>
              <button
                onClick={() => openEdit(p)}
                className="absolute end-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-brand-600 group-hover:opacity-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? t('adm.plan.new') : `Modifier — ${editing?.name ?? ''}`} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom (FR)"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Nom (AR)"><Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" /></Field>
          <Field label="Prix (DZD)"><Input type="number" value={form.priceDzd} onChange={(e) => setForm({ ...form, priceDzd: e.target.value })} /></Field>
          <Field label="Prix (USD)"><Input type="number" value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} /></Field>
          <Field label="Intervalle">
            <select className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
              <option value="month">Mensuel</option>
              <option value="year">Annuel</option>
              <option value="one_time">Unique</option>
            </select>
          </Field>
          <Field label="Ordre"><Input type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} /></Field>
          <Field label="Limite clients"><Input type="number" value={form.customers} onChange={(e) => setForm({ ...form, customers: e.target.value })} /></Field>
          <Field label="Limite messages"><Input type="number" value={form.messages} onChange={(e) => setForm({ ...form, messages: e.target.value })} /></Field>
          <Field label="Limite automations"><Input type="number" value={form.automations} onChange={(e) => setForm({ ...form, automations: e.target.value })} /></Field>
          <Field label="Limite membres"><Input type="number" value={form.users} onChange={(e) => setForm({ ...form, users: e.target.value })} /></Field>
          <Field label="Fonctionnalités (séparées par virgule)" hint={t('adm.plan.features')}>
            <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
          </Field>
          <div className="flex items-end gap-2 pb-1">
            <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Plan actif" />
            <Toggle checked={form.ai} onChange={(v) => setForm({ ...form, ai: v })} label="IA incluse" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}</Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function formatLimit(n: number) {
  if (n <= 0) return 'Illimité';
  return n.toLocaleString();
}
