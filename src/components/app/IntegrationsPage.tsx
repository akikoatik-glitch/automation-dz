'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Toggle, Modal, Field, Badge } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import {
  Plug, CheckCircle2, XCircle, Copy, Check, ShieldCheck, MessageCircle, Bot, Link as LinkIcon
} from 'lucide-react';

type Int = {
  type: string;
  label: string;
  icon: string;
  configured: boolean;
  enabled: boolean;
  status: string;
  id: string | null;
  config: Record<string, unknown>;
};

const CONFIG_FIELDS: Record<string, { key: string; label: string; secret: boolean }[]> = {
  whatsapp: [
    { key: 'accessToken', label: 'int.whatsappToken', secret: true },
    { key: 'phoneNumberId', label: 'int.whatsappPhoneId', secret: false },
    { key: 'verifyToken', label: 'int.whatsappVerify', secret: true }
  ],
  telegram: [{ key: 'token', label: 'int.telegramToken', secret: true }],
  ai: [{ key: 'apiKey', label: 'int.aiKey', secret: true }],
  email: [
    { key: 'host', label: 'int.emailHost', secret: false },
    { key: 'port', label: 'int.emailPort', secret: false },
    { key: 'user', label: 'int.emailUser', secret: false },
    { key: 'pass', label: 'int.emailPass', secret: true }
  ]
};

const DESC: Record<string, string> = {
  whatsapp: 'int.whatsappDesc',
  telegram: 'int.telegramDesc',
  facebook: 'int.fbDesc',
  instagram: 'int.igDesc',
  email: 'int.emailDesc',
  sms: 'int.smsDesc',
  ai: 'ai.offline'
};

const STEPS: Record<string, string> = {
  whatsapp: 'int.whatsappSteps',
  telegram: 'int.telegramSteps'
};

const ICON_CLASS: Record<string, string> = {
  whatsapp: 'bg-emerald-50 text-emerald-500',
  telegram: 'bg-sky-50 text-sky-500',
  facebook: 'bg-blue-50 text-blue-500',
  instagram: 'bg-pink-50 text-pink-500',
  email: 'bg-amber-50 text-amber-500',
  sms: 'bg-violet-50 text-violet-500',
  ai: 'bg-indigo-50 text-indigo-500'
};

export default function IntegrationsPage() {
  const { t } = useLocale();
  const { push } = useToast();
  const [list, setList] = React.useState<Int[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState<Int | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [copyId, setCopyId] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) setList((await res.json()).integrations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (i: Int) => {
    const res = await fetch('/api/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: i.type, enabled: !i.enabled })
    });
    if (!res.ok) push({ tone: 'error', title: t('common.error') });
    else void load();
  };

  const openConfig = (i: Int) => {
    setOpen(i);
    const init: Record<string, string> = {};
    for (const f of CONFIG_FIELDS[i.type] ?? []) {
      const v = i.config?.[f.key];
      init[f.key] = typeof v === 'string' && (v.startsWith('••') || /token|key|secret|pass/i.test(f.key)) && v.length > 4 ? '' : String(v ?? '');
    }
    setValues(init);
  };

  const save = async () => {
    if (!open) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/integrations/${open.type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: values, name: open.label })
      });
      if (!res.ok) {
        push({ tone: 'error', title: t('int.saveError') });
        return;
      }
      push({ tone: 'success', title: t('common.saved') });
      setOpen(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!open) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/integrations/${open.type}?action=test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      push(data.ok ? { tone: 'success', title: t('int.testSuccess') } : { tone: 'error', title: t('int.testFail') });
    } finally {
      setTesting(false);
    }
  };

  const webhookUrlFor = (i: Int) =>
    ((i.type === 'whatsapp' || i.type === 'telegram') && window.location.origin ? `${window.location.origin}/api/integrations/${i.type}/webhook` : null);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyId(id);
      setTimeout(() => setCopyId(''), 1600);
    } catch {
      push({ tone: 'error', title: t('common.error') });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('int.title')} subtitle={t('int.subtitle')} icon={<Plug className="h-5 w-5" />} />

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <div key={i.type} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', ICON_CLASS[i.type] ?? 'bg-slate-50 text-slate-500')}>
                  {i.type === 'ai' ? <Bot className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                </span>
                {i.configured ? (
                  <Badge className="bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {t('int.configured')}</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-400"><XCircle className="h-3 w-3" /> {t('int.notConfigured')}</Badge>
                )}
              </div>
              <h3 className="mt-3 font-extrabold text-slate-800">{i.label}</h3>
              <p className="mt-1 flex-1 text-sm leading-snug text-slate-500">{t(DESC[i.type] ?? `int.${i.type}Desc`)}</p>

              {webhookUrlFor(i) && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <LinkIcon className="h-3 w-3 shrink-0 text-slate-400" />
                  <code className="min-w-0 flex-1 truncate text-[10px] text-slate-500" dir="ltr">{webhookUrlFor(i)}</code>
                  <button onClick={() => copyText(webhookUrlFor(i)!, `wh_${i.type}`)} className="text-slate-400 transition hover:text-brand-600">
                    {copyId === `wh_${i.type}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs font-medium text-slate-400">{t('common.connected')}</span>
                  <Toggle checked={i.enabled && i.configured} onChange={() => toggle(i)} disabled={!i.configured} />
                </div>
                <div className="flex items-center gap-1.5">
                  {i.configured && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setOpen(i);
                      const init: Record<string, string> = {};
                      for (const f of CONFIG_FIELDS[i.type] ?? []) init[f.key] = '';
                      setValues(init);
                    }}>
                      <ShieldCheck className="h-3.5 w-3.5" /> {t('common.configure')}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => openConfig(i)}>
                    {t('common.configure')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={`${t('int.configTitle')} — ${open?.label ?? ''}`}>
        {open && (
          <div className="space-y-3">
            {CONFIG_FIELDS[open.type]?.length ? (
              CONFIG_FIELDS[open.type].map((f) => (
                <Field key={f.key} label={t(f.label)}>
                  <Input
                    dir="ltr"
                    type={f.secret ? 'password' : 'text'}
                    placeholder={f.secret && open.config?.[f.key] ? t('int.keySaved') : ''}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                </Field>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{t('int.comingSoon')}</p>
            )}

            {STEPS[open.type] && (
              <p className="rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">{t(STEPS[open.type])}</p>
            )}

            <div className="mt-2 flex items-center justify-end gap-2">
              {open.configured && (
                <Button variant="secondary" onClick={test} disabled={testing}>{testing ? t('common.testing') : t('common.test')}</Button>
              )}
              <Button onClick={save} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}