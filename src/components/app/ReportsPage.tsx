'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { cn, money as fmt } from '@/lib/utils';
import PageHeader from '@/components/app/PageHeader';
import { BarChart3, MessageSquare, Users, Zap, TrendingUp, CreditCard, CalendarCheck } from 'lucide-react';

type Series = { date: string; incoming: number; outgoing: number; customers: number; runs: number };
type Report = {
  days: number;
  series: Series[];
  totals: {
    messages: number;
    incoming: number;
    outgoing: number;
    customers: number;
    totalCustomers: number;
    runs: number;
    runsSuccess: number;
    appointmentsThisMonth: number;
    pendingRevenue: number;
    paidRevenue: number;
  };
  byChannel: Record<string, number>;
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  form: 'Forms',
  webhook: 'Webhooks',
  manual: 'Manuel'
};

export default function ReportsPage() {
  const { t, locale } = useLocale();
  const [days, setDays] = React.useState(30);
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?days=${days}`);
        if (res.ok) setReport(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const maxV = Math.max(1, ...(report?.series ?? []).map((s) => Math.max(s.incoming, s.outgoing, s.customers)));
  const totalChannels = Math.max(1, Object.values(report?.byChannel ?? {}).reduce((a, b) => a + b, 0));
  const successRate = report && report.totals.runs > 0 ? Math.round((report.totals.runsSuccess / report.totals.runs) * 100) : 0;

  const stat = (icon: React.ReactNode, label: string, value: React.ReactNode, hint?: string) => (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        <p className="truncate text-lg font-extrabold text-slate-800">{value}</p>
        {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t('rep.title')} subtitle={t('rep.subtitle')} icon={<BarChart3 className="h-5 w-5" />}>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', days === d ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-brand-600')}
            >
              {t(`rep.period.${d}d`)}
            </button>
          ))}
        </div>
      </PageHeader>

      {loading || !report ? (
        <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {stat(<MessageSquare className="h-5 w-5" />, t('rep.messagesChart'), report.totals.messages, `${report.totals.incoming}↓ / ${report.totals.outgoing}↑`)}
            {stat(<Users className="h-5 w-5" />, t('rep.customersGrowth'), report.totals.totalCustomers, `+${report.totals.customers} · ${t('common.thisMonth')}`)}
            {stat(<Zap className="h-5 w-5" />, t('rep.automationRuns'), report.totals.runs, `${successRate}% ↗`)}
            {stat(<TrendingUp className="h-5 w-5" />, t('rep.conversion'), `${report.totals.outgoing}/${Math.max(1, report.totals.messages)}`, t('rep.avgResponse'))}
            {stat(<CalendarCheck className="h-5 w-5" />, t('rep.thisMonthAppts'), report.totals.appointmentsThisMonth, 'appointments')}
            {stat(<CreditCard className="h-5 w-5" />, t('rep.paidRevenue'), fmt(report.totals.paidRevenue, locale), t('pay.overdue'))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* messages + customers chart */}
            <div className="card p-5 lg:col-span-2">
              <p className="mb-3 text-sm font-bold text-slate-700">{t('rep.messagesChart')}</p>
              <div className="flex h-48 items-end gap-1">
                {report.series.map((s) => (
                  <div key={s.date} className="group relative flex-1">
                    <div className="flex h-48 items-end gap-0.5">
                      <div
                        className="w-1/2 rounded-t-sm bg-emerald-400/80 transition-all group-hover:bg-emerald-500"
                        style={{ height: `${Math.max(3, (s.incoming / maxV) * 100)}%` }}
                        title={`${s.date}: ${s.incoming}`}
                      />
                      <div
                        className="w-1/2 rounded-t-sm bg-brand-500/80 transition-all group-hover:bg-brand-600"
                        style={{ height: `${Math.max(3, (s.outgoing / maxV) * 100)}%` }}
                        title={`${s.date}: ${s.outgoing}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>{new Date(report.series[0]?.date).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR')}</span>
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> in</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-500" /> out</span>
                </span>
                <span>{new Date(report.series[report.series.length - 1]?.date).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR')}</span>
              </div>
            </div>

            {/* channels */}
            <div className="card p-5">
              <p className="mb-3 text-sm font-bold text-slate-700">{t('rep.topSources')}</p>
              {Object.entries(report.byChannel).length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">{t('rep.noData')}</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report.byChannel)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([ch, n]) => (
                      <div key={ch}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600">{CHANNEL_LABEL[ch] ?? ch}</span>
                          <span className="font-bold text-slate-800">{n}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-400" style={{ width: `${(n / totalChannels) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fmtMoney = (v: number, locale: string) =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : locale === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(v || 0);