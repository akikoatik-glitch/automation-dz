'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button, Toggle, ConfirmDialog, Modal, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { Workflow, Play, Trash2, Sparkles, PauseCircle, ChevronRight, AlarmClock } from 'lucide-react';

type Automation = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: string | null;
  enabled: boolean;
  runCount: number;
  lastRunAt: string | null;
  aiGenerated?: boolean;
  _count?: { runs: number };
};

const TRIGGER_LABEL: Record<string, string> = {
  MESSAGE_RECEIVED: 'auto.trigger.message',
  FORM_SUBMITTED: 'auto.trigger.form',
  APPOINTMENT_CREATED: 'auto.trigger.appointment',
  APPOINTMENT_REMINDER: 'auto.trigger.reminder',
  CUSTOMER_CREATED: 'auto.trigger.customer',
  SCHEDULE: 'auto.trigger.schedule',
  WEBHOOK: 'auto.trigger.webhook',
  MANUAL: 'auto.trigger.manual'
};

export default function AutomationsPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [autos, setAutos] = React.useState<Automation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toDelete, setToDelete] = React.useState<Automation | null>(null);
  const [testTarget, setTestTarget] = React.useState<Automation | null>(null);
  const [testConv, setTestConv] = React.useState('');
  const [testMsg, setTestMsg] = React.useState('');
  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/automations');
      if (res.ok) {
        const data = await res.json();
        setAutos(data.automations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function toggle(a: Automation, v: boolean) {
    const res = await fetch(`/api/automations/${a.id}?action=toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: v })
    });
    if (res.ok) {
      push({ tone: 'success', title: v ? t('auto.enabledNote') : t('auto.disabledNote') });
      load();
    }
  }

  async function remove() {
    if (!toDelete) return;
    await fetch(`/api/automations/${toDelete.id}`, { method: 'DELETE' });
    push({ tone: 'success', title: t('common.done') });
    setToDelete(null);
    load();
  }

  async function runTest() {
    if (!testTarget) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/automations/${testTarget.id}?action=run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: testConv || undefined, content: testMsg || 'Message de test', channel: 'whatsapp' })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        const steps = data.result.steps ?? [];
        setTestResult(
          steps.map((s: { kind?: string; status?: string; detail?: string }) => `• ${s.kind} → ${s.status}${s.detail ? ` (${s.detail})` : ''}`).join('\n') ||
            data.result.message
        );
      } else {
        setTestResult(data.error || 'error');
      }
    } finally {
      setTesting(false);
    }
  }

  function rel(iso: string | null) {
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
        title={t('auto.title')}
        subtitle={t('auto.subtitle')}
        actions={
          <div className="flex gap-2">
            <Link href="/app/automations/create" className="btn btn-primary btn-premium">
              <Sparkles className="h-4 w-4" /> {t('auto.createSimple')}
            </Link>
            <Link href="/app/automations/builder" className="btn btn-secondary">
              <Workflow className="h-4 w-4" /> {t('auto.advanced')}
            </Link>
          </div>
        }
      />

      {loading && <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>}

      {!loading && autos.length === 0 && (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            <Workflow className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('auto.empty')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{t('auto.emptyDesc')}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/app/automations/create" className="btn btn-primary btn-premium">{t('auto.createSimple')}</Link>
            <Link href="/app/templates" className="btn btn-secondary">{t('auto.fromTemplate')}</Link>
          </div>
        </div>
      )}

      {!loading && autos.length > 0 && (
        <div className="space-y-3">
          {autos.map((a) => (
            <div key={a.id} className="card group flex flex-wrap items-center gap-4 p-4">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', a.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                {a.enabled ? <Workflow className="h-5 w-5" /> : <PauseCircle className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/app/automations/builder?id=${a.id}`} className="truncate font-bold text-slate-800 hover:text-brand-600">
                    {a.name}
                  </Link>
                  {a.aiGenerated && <span className="pill bg-violet-50 text-violet-600">IA</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {t(TRIGGER_LABEL[a.triggerType] || a.triggerType)} · {a._count?.runs ?? a.runCount} {t('auto.runCount')}
                  {a.lastRunAt && <> · {t('auto.lastRun')} {rel(a.lastRunAt)}</>}
                </p>
              </div>

              <div className="hidden items-center gap-1 sm:flex">
                <Button variant="ghost" size="sm" onClick={() => { setTestTarget(a); setTestResult(null); setTestConv(''); setTestMsg(''); }}>
                  <Play className="h-3.5 w-3.5" /> {t('auto.testRun')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(a)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>

              <Toggle checked={a.enabled} onChange={(v) => toggle(a, v)} />

              <Link href={`/app/automations/builder?id=${a.id}`} className="hidden rounded-lg p-2 text-slate-300 transition group-hover:text-brand-500 lg:block">
                <ChevronRight className="h-5 w-5 rtl-flip" />
              </Link>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t('auto.deleteConfirm')}
        confirmLabel={t('common.delete')}
      />

      <Modal open={!!testTarget} onClose={() => setTestTarget(null)} title={`${t('auto.testRun')} — ${testTarget?.name ?? ''}`}>
        <div className="space-y-3">
          <Select value={testConv} onChange={(e) => setTestConv(e.target.value)}>
            <option value="">{t('auto.trigger.message')} (sans conversation)</option>
          </Select>
          <textarea
            className="input min-h-[80px]"
            placeholder="Message de test…"
            value={testMsg}
            onChange={(e) => setTestMsg(e.target.value)}
          />
          <Button onClick={runTest} disabled={testing} className="w-full">
            {testing ? t('common.testing') : t('common.run')}
          </Button>
          {testResult && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <AlarmClock className="h-3.5 w-3.5" /> {t('auto.testRunResult')}
              </p>
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600">{testResult}</pre>
            </div>
          )}
          <p className="text-[11px] text-slate-400">{t('builder.variableHint')}</p>
        </div>
      </Modal>
    </div>
  );
}