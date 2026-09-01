'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Modal } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import {
  AlarmClock, MessageSquare, Workflow, Calendar, UserPlus, Webhook, LayoutList, Sparkles, ArrowRight
} from 'lucide-react';

type Tpl = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  industry: string | null;
  featured: boolean;
  icon: string | null;
  triggerType: string;
  _count?: { uses: number };
};

const ICONS: Record<string, React.ReactNode> = {
  alarmClock: <AlarmClock className="h-5 w-5" />,
  message: <MessageSquare className="h-5 w-5" />,
  messageReply: <MessageSquare className="h-5 w-5" />,
  workout: <Workflow className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  userPlus: <UserPlus className="h-5 w-5" />,
  webhook: <Webhook className="h-5 w-5" />,
  form: <LayoutList className="h-5 w-5" />
};

const INDUSTRIES = ['clinic', 'salon', 'restaurant', 'estate', 'ecommerce', 'service'];

const TRIGGER_KEY: Record<string, string> = {
  MESSAGE_RECEIVED: 'message',
  FORM_SUBMITTED: 'form',
  APPOINTMENT_CREATED: 'appointment',
  APPOINTMENT_REMINDER: 'reminder',
  CUSTOMER_CREATED: 'customer',
  SCHEDULE: 'schedule',
  WEBHOOK: 'webhook',
  MANUAL: 'manual'
};

export default function TemplatesPage() {
  const { t } = useLocale();
  const { push } = useToast();
  const [templates, setTemplates] = React.useState<Tpl[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string>('all');
  const [useId, setUseId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) setTemplates((await res.json()).templates ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const doUse = async () => {
    if (!useId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${useId}/use`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message && data.message !== 'limit_exceeded' ? data.message : t('auto.limit') });
        setUseId(null);
        return;
      }
      push({ tone: 'success', title: `${data.automation.name} — ${t('tpl.used')}` });
      setUseId(null);
      window.setTimeout(() => {
        window.location.href = `/app/automations/builder?id=${data.automation.id}`;
      }, 600);
    } finally {
      setBusy(false);
    }
  };

  const list = templates.filter((x) => filter === 'all' || x.industry === filter);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('tpl.title')}
        subtitle={t('tpl.subtitle')}
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter('all')} className={cn('pill transition', filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100')}>
          {t('tpl.all')}
        </button>
        {INDUSTRIES.map((i) => (
          <button
            key={i}
            onClick={() => setFilter(i)}
            className={cn('pill transition', filter === i ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100')}
          >
            {t(`tpl.byIndustry.${i}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-slate-400">{t('common.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((tpl) => (
            <div key={tpl.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
              {tpl.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                  {t('tpl.featured')}
                </span>
              )}
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-md">
                {ICONS[tpl.icon || ''] || <Workflow className="h-5 w-5" />}
              </span>
              <h3 className="font-extrabold text-slate-800">{tpl.name}</h3>
              <p className="mt-1 min-h-[40px] flex-1 text-sm leading-snug text-slate-500">{tpl.description}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <LayoutList className="h-3.5 w-3.5" />
                {t(`auto.trigger.${TRIGGER_KEY[tpl.triggerType] ?? 'message'}`)}
              </span>
              <Button size="sm" className="mt-4 w-full" onClick={() => setUseId(tpl.id)}>
                {t('tpl.use')} <ArrowRight className="h-4 w-4 rtl-flip" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!useId} onClose={() => setUseId(null)} title={t('tpl.use')}>
        <p className="text-sm text-slate-500">{t('tpl.useConfirm')}</p>
        <p className="mt-1 text-xs text-slate-400">{t('tpl.useHint')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setUseId(null)}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={doUse} disabled={busy}>{busy ? t('common.saving') : t('tpl.use')}</Button>
        </div>
      </Modal>
    </div>
  );
}