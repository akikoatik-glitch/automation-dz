import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getWorkspace } from '@/lib/workspace';
import { getServerLocale, serverT } from '@/lib/i18n/server';
import { getUsage, getLimits } from '@/lib/usage';
import { cn, money, relativeTime } from '@/lib/utils';
import {
  Users,
  MessageCircle,
  Workflow,
  CalendarDays,
  Inbox,
  FileText,
  Plus,
  ArrowRight,
  AlarmClock,
  Sparkles,
  Activity,
  Zap,
  UserPlus,
  Bot,
  Bell,
  Star,
  TrendingUp
} from 'lucide-react';
import { StatCard, EmptyState, Button } from '@/components/ui';
import { PageHeader } from '@/components/app/PageHeader';
import { MiniBarChart } from '@/components/app/MiniBarChart';
import { AutomationToggle } from '@/components/app/AutomationToggle';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const ws = await getWorkspace();
  const locale = getServerLocale();
  const t = serverT(locale);
  if (!ws) return null;

  const bizId = ws.businessId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customerCount,
    customersThisMonth,
    activeAutomations,
    upcomingAppointments,
    pendingInvoices,
    unreadConv,
    recentCustomers,
    recentRuns,
    last7dMessages,
    automations
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId: bizId } }),
    prisma.customer.count({ where: { businessId: bizId, createdAt: { gte: monthStart } } }),
    prisma.automation.count({ where: { businessId: bizId, enabled: true } }),
    prisma.appointment.findMany({
      where: { businessId: bizId, startsAt: { gte: now }, status: { in: ['booked', 'confirmed'] } },
      orderBy: { startsAt: 'asc' },
      take: 4,
      include: { customer: true }
    }),
    prisma.invoice.findMany({
      where: { businessId: bizId, status: { in: ['pending', 'overdue'] } },
      orderBy: { dueDate: 'asc' }
    }),
    prisma.conversation.aggregate({ where: { businessId: bizId }, _sum: { unreadCount: true } }),
    prisma.customer.findMany({ where: { businessId: bizId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.workflowRun.findMany({ where: { businessId: bizId }, orderBy: { startedAt: 'desc' }, take: 6 }),
    prisma.message.findMany({ where: { businessId: bizId, createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
    prisma.automation.findMany({
      where: { businessId: bizId },
      orderBy: [{ enabled: 'desc' }, { updatedAt: 'desc' }],
      take: 8
    })
  ]);

  const dailyCounts = Array.from({ length: 7 }, (_, di) => {
    const d = new Date(now.getTime() - (6 - di) * 86400000);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return {
      label: new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale, { weekday: 'short' }).format(d),
      count: last7dMessages.filter((m) => m.createdAt >= d && m.createdAt < next).length
    };
  });

  const usage = await getUsage(bizId);
  const limits = await getLimits(bizId);
  const messagesUsed = usage.messages ?? 0;
  const totalInvoices = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const unread = unreadConv._sum.unreadCount ?? 0;

  const activity = await prisma.activityLog.findMany({
    where: { businessId: bizId },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { user: { select: { name: true } } }
  });

  const industryEmoji: Record<string, string> = {
    clinic: '🦷',
    salon: '💇',
    restaurant: '🍕',
    estate: '🏠',
    ecommerce: '🛒',
    gym: '🏋️',
    training: '🎓',
    agency: '💼',
    other: '🏢'
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-hero-mesh opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{industryEmoji[ws.business.industry || 'other'] || '🏢'}</span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {t('dash.hello')}, {ws.user.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm text-white/80">
                {ws.business.name} · {t('dash.welcomeBack')}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-white/70 max-w-xl">
            {t('dash.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dash.customers')} value={customerCount} sub={`+${customersThisMonth} ${t('dash.newCustomers')}`} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label={t('dash.messages')} value={messagesUsed} sub={`${t('dash.messagesMonth')}`} icon={<MessageCircle className="h-5 w-5" />} tone="blue" />
        <StatCard label={t('dash.automations')} value={activeAutomations} sub={t('dash.automationsSub')} icon={<Workflow className="h-5 w-5" />} tone="violet" />
        <StatCard label={t('dash.pendingInvoices')} value={pendingInvoices.length} sub={money(totalInvoices, 'DZD', locale)} icon={<FileText className="h-5 w-5" />} tone={pendingInvoices.length ? 'amber' : 'green'} />
      </div>

      {/* AI Employee / Automation Toggles — THE KEY FEATURE */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <Bot className="h-5 w-5 text-brand-500" />
              {t('landing.automation.title')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{t('landing.automation.subtitle')}</p>
          </div>
          <Link href="/app/automations" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {automations.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-3 font-bold text-slate-700">{t('auto.empty')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('dash.noAutomations')}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/app/automations/create" className="btn btn-premium !text-xs">
                  <Zap className="h-3.5 w-3.5" /> {t('auto.createSimple')}
                </Link>
                <Link href="/app/templates" className="btn btn-secondary !text-xs">
                  {t('auto.fromTemplate')}
                </Link>
              </div>
            </div>
          ) : (
            automations.map((auto) => (
              <AutomationToggle
                key={auto.id}
                id={auto.id}
                name={auto.name}
                description={auto.description}
                enabled={auto.enabled}
                runCount={auto.runCount}
                triggerType={auto.triggerType}
                locale={locale}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Messages chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">{t('rep.messagesChart')}</h3>
              <p className="text-xs text-slate-400">7 {t('dash.today').toLowerCase()}s</p>
            </div>
            <TrendingUp className="h-4 w-4 text-brand-400" />
          </div>
          <MiniBarChart data={dailyCounts} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app/inbox" className="btn btn-ghost btn-sm !px-3 !py-1.5 !text-xs">
              <Inbox className="h-3.5 w-3.5" /> {t('dash.viewInbox')} {unread > 0 && <span className="rounded-full bg-brand-500 text-white px-1.5">{unread}</span>}
            </Link>
            <Link href="/app/automations" className="btn btn-ghost btn-sm !px-3 !py-1.5 !text-xs">
              <Workflow className="h-3.5 w-3.5" /> {t('dash.viewAutomations')}
            </Link>
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-800">{t('dash.upcomingTitle')}</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingAppointments.length === 0 && (
              <p className="px-5 py-8 text-sm text-slate-400">{t('appt.noAppointments')}</p>
            )}
            {upcomingAppointments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{a.clientName}</p>
                  <p className="truncate text-xs text-slate-400">{a.service || '—'}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale, { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(a.startsAt)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <Link href="/app/appointments" className="btn btn-ghost w-full !py-2 !text-xs">
              {t('common.viewAll')} <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
            </Link>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">{t('dash.usageTitle')}</h3>
            <p className="text-xs text-slate-400">
              {messagesUsed} / {limits.messages <= 0 ? t('plan.unlimited') : limits.messages} {t('dash.usageOf')}
            </p>
          </div>
          <Link href="/pricing" className="btn btn-secondary !py-1.5 !px-3 !text-xs">
            {t('usage.upgrade')}
          </Link>
        </div>
        <UsageBar current={messagesUsed} max={limits.messages} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <Activity className="h-4 w-4 text-brand-500" /> {t('dash.recentActivity')}
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {activity.length === 0 && <p className="px-5 py-8 text-sm text-slate-400">{t('dash.emptyActivity')}</p>}
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                <p className="min-w-0 flex-1 truncate text-sm text-slate-600">{a.summary}</p>
                <span className="shrink-0 text-xs text-slate-400">{relativeTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
          {recentRuns.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('rep.automationRuns')}
              </p>
              <div className="space-y-1.5">
                {recentRuns.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs text-slate-500">
                    <AlarmClock className="h-3.5 w-3.5 text-violet-400" />
                    <span className="truncate">{r.trigger}</span>
                    <span className="ms-auto shrink-0 text-slate-400">{relativeTime(r.startedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* New customers */}
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{t('dash.recentCustomers')}</h3>
            <Link href="/app/customers" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentCustomers.length === 0 && <p className="px-5 py-8 text-sm text-slate-400">{t('dash.noCustomers')}</p>}
            {recentCustomers.map((c) => (
              <Link key={c.id} href={`/app/customers/${c.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{c.name}</p>
                  <p className="truncate text-xs text-slate-400">{c.source}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{relativeTime(c.createdAt)}</span>
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <Link href="/app/customers/new" className="btn btn-ghost w-full !py-2 !text-xs">
              <UserPlus className="h-3.5 w-3.5" /> {t('dash.addCustomer')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageBar({ current, max }: { current: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((current / max) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn('h-full rounded-full transition-all', pct >= 85 ? 'bg-gradient-to-r from-orange-400 to-red-400' : 'bg-gradient-to-r from-brand-400 to-brand-600')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
