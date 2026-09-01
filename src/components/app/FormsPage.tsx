'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { Button, Input, Select, Toggle, Modal, Field, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import { ClipboardList, Plus, Trash2, Copy, ExternalLink, Check } from 'lucide-react';

type FieldDef = { key: string; label: string; required: boolean; type: string; options: string[] };
type Form = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fields: string;
  submitCount: number;
  enabled: boolean;
};

const FIELD_TYPES = ['text', 'tel', 'email', 'textarea', 'date', 'number', 'select'];

export default function FormsPage() {
  const { t } = useLocale();
  const { push } = useToast();
  const [forms, setForms] = React.useState<Form[]>([]);
  const [businessSlug, setBusinessSlug] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [fields, setFields] = React.useState<FieldDef[]>([
    { key: 'name', label: 'Nom complet', required: true, type: 'text', options: [] },
    { key: 'phone', label: 'Téléphone', required: true, type: 'tel', options: [] },
    { key: 'message', label: 'Votre message', required: false, type: 'textarea', options: [] }
  ]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/forms');
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms ?? []);
        setBusinessSlug(data.businessSlug ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const urlFor = (slug: string) => `${window.location.origin}/f/${businessSlug}/${slug}`;

  const copy = async (f: Form) => {
    try {
      await navigator.clipboard.writeText(urlFor(f.slug));
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      push({ tone: 'error', title: t('common.error') });
    }
  };

  const updateField = (i: number, patch: Partial<FieldDef>) => {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    const key = `f_${fields.length + 1}_${Math.random().toString(36).slice(2, 6)}`;
    setFields((prev) => [...prev, { key, label: 'Champ', required: false, type: 'text', options: [] }]);
  };

  const removeField = (i: number) => setFields((prev) => prev.filter((_, idx) => idx !== i));

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fields })
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message || t('common.error') });
        return;
      }
      push({ tone: 'success', title: t('form.created') });
      setOpen(false);
      setName('');
      setFields([
        { key: 'name', label: 'Nom complet', required: true, type: 'text', options: [] },
        { key: 'phone', label: 'Téléphone', required: true, type: 'tel', options: [] },
        { key: 'message', label: 'Votre message', required: false, type: 'textarea', options: [] }
      ]);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (f: Form) => {
    await fetch(`/api/forms/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !f.enabled })
    });
    void load();
  };

  const remove = async () => {
    if (!deleteId) return;
    await fetch(`/api/forms/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    void load();
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('form.title')} subtitle={t('form.subtitle')} icon={<ClipboardList className="h-5 w-5" />}>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t('form.add')}
        </Button>
      </PageHeader>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : forms.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-200" />
          <p className="mt-3 text-sm text-slate-400">{t('form.noForms')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {forms.map((f) => {
            let parsed: FieldDef[] = [];
            try {
              parsed = JSON.parse(f.fields) || [];
            } catch {}
            return (
              <div key={f.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-slate-800">{f.name}</h3>
                  <Toggle checked={f.enabled} onChange={() => toggle(f)} />
                </div>
                <p className="mt-1 text-xs text-slate-400">{parsed.length} {t('form.fields')} · {f.submitCount} {t('form.submissions')}</p>
                <p className="mt-2 truncate font-mono text-[11px] text-brand-600" dir="ltr">/f/{businessSlug}/{f.slug}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => copy(f)}>
                    {copiedId === f.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === f.id ? t('common.copied') : t('form.copyLink')}
                  </Button>
                  <a href={f.enabled ? urlFor(f.slug) : undefined} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost" disabled={!f.enabled}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <button onClick={() => setDeleteId(f.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('form.add')}>
        <div className="space-y-3">
          <Field label={t('form.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('form.fields')}</p>
              <Button variant="ghost" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5" /> {t('form.addField')}
              </Button>
            </div>
            {fields.map((f, i) => (
              <div key={f.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder={t('form.fieldLabel')} className="!py-1.5 !text-xs" />
                  <div className="flex items-center gap-1.5">
                    <Select value={f.type} onChange={(e) => updateField(i, { type: e.target.value })} className="flex-1 !py-1.5 !text-xs">
                      {FIELD_TYPES.map((t2) => (
                        <option key={t2} value={t2}>{t(`form.type.${t2}`)}</option>
                      ))}
                    </Select>
                    <button onClick={() => removeField(i)} className="rounded p-1 text-slate-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <label className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} className="accent-[var(--brand-600)]" />
                  {t('form.fieldRequired')}
                </label>
              </div>
            ))}
          </div>

          <Button onClick={create} disabled={saving || !name.trim()} className="w-full">
            {saving ? t('common.saving') : t('form.add')}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title={t('form.deleteConfirm')} onConfirm={remove} onClose={() => setDeleteId(null)} />
    </div>
  );
}