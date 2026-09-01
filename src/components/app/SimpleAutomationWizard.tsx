'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  ArrowLeft, ArrowRight, Sparkles, MessageCircle, CalendarDays, UserPlus, Flame,
  ShoppingCart, Mail, Bell, ThumbsUp, Star, DollarSign, Plus, Check, Zap,
  Bot, Users, ShieldCheck, Wand2, RefreshCw, Play
} from 'lucide-react';

type Category = {
  id: string;
  icon: React.ElementType;
  gradient: string;
  titleKey: string;
  descKey: string;
  suggestions: string[];
};

const CATEGORIES: Category[] = [
  {
    id: 'messages', icon: MessageCircle, gradient: 'from-emerald-400 to-teal-600',
    titleKey: 'sm.messages', descKey: 'sm.messagesDesc',
    suggestions: ['sm.sug.autoReply', 'sm.sug.saveThenNotify', 'sm.sug.answerQuestions']
  },
  {
    id: 'appointments', icon: CalendarDays, gradient: 'from-amber-400 to-orange-500',
    titleKey: 'sm.appointments', descKey: 'sm.appointmentsDesc',
    suggestions: ['sm.sug.remindAppt', 'sm.sug.noShow', 'sm.sug.bookAppt']
  },
  {
    id: 'customers', icon: UserPlus, gradient: 'from-blue-400 to-indigo-500',
    titleKey: 'sm.customers', descKey: 'sm.customersDesc',
    suggestions: ['sm.sug.welcome', 'sm.sug.captureForm', 'sm.sug.leadNotify']
  },
  {
    id: 'leads', icon: Flame, gradient: 'from-rose-400 to-red-500',
    titleKey: 'sm.leads', descKey: 'sm.leadsDesc',
    suggestions: ['sm.sug.leadFollowup', 'sm.sug.priceLead', 'sm.sug.qualifyLead']
  },
  {
    id: 'orders', icon: ShoppingCart, gradient: 'from-violet-400 to-purple-600',
    titleKey: 'sm.orders', descKey: 'sm.ordersDesc',
    suggestions: ['sm.sug.orderConfirm', 'sm.sug.orderNotify', 'sm.sug.deliveryUpdate']
  },
  {
    id: 'emails', icon: Mail, gradient: 'from-sky-400 to-blue-600',
    titleKey: 'sm.emails', descKey: 'sm.emailsDesc',
    suggestions: ['sm.sug.emailWelcome', 'sm.sug.emailFollowup', 'sm.sug.emailNotify']
  },
  {
    id: 'reminders', icon: Bell, gradient: 'from-teal-400 to-emerald-600',
    titleKey: 'sm.reminders', descKey: 'sm.remindersDesc',
    suggestions: ['sm.sug.remindAppt', 'sm.sug.remindPayment', 'sm.sug.remindGeneral']
  },
  {
    id: 'social', icon: ThumbsUp, gradient: 'from-fuchsia-400 to-pink-600',
    titleKey: 'sm.social', descKey: 'sm.socialDesc',
    suggestions: ['sm.sug.socialReply', 'sm.sug.socialLead', 'sm.sug.socialPromo']
  },
  {
    id: 'reviews', icon: Star, gradient: 'from-yellow-400 to-amber-600',
    titleKey: 'sm.reviews', descKey: 'sm.reviewsDesc',
    suggestions: ['sm.sug.reviewRequest', 'sm.sug.thankReview', 'sm.sug.reviewNotify']
  },
  {
    id: 'sales', icon: DollarSign, gradient: 'from-green-400 to-emerald-600',
    titleKey: 'sm.sales', descKey: 'sm.salesDesc',
    suggestions: ['sm.sug.weeklyReport', 'sm.sug.paymentReminder', 'sm.sug.topLeads']
  },
  {
    id: 'other', icon: Plus, gradient: 'from-slate-400 to-zinc-600',
    titleKey: 'sm.other', descKey: 'sm.otherDesc',
    suggestions: []
  }
];

const CATEGORY_MAP: Record<string, string[]> = {
  messages: ['message', 'répond', 'reply', 'contacte', 'يبرسل', 'يرسل', 'واتساب', 'whatsapp', 'ird', 'جاو', 'رسالة', 'contactera', 'سرايا'],
  appointments: ['rendez', 'rdv', 'موعد', 'réservation', 'booking', 'appointment', 'قعدة', 'حجز'],
  customers: ['client', 'customer', 'عميل', 'زبون', 'enregistre', 'save', 'سجل', 'welcome', 'مرحب', 'nouveau'],
  leads: ['lead', 'prospect', 'relance', 'follow', 'متابعة', 'بروسبيكت', 'intéressé', 'مهتم', 'follow-up', 'relancer'],
  orders: ['commande', 'order', 'طلب', 'شراء', 'delivery', 'livraison', 'توصيل'],
  emails: ['email', 'mail', 'بريد', 'الإيميل'],
  reminders: ['rappel', 'remind', 'تذكير', 'ذكّر', 'نبه', 'فكرني', 'rappeler'],
  social: ['instagram', 'facebook', 'tik', 'social', 'انستغرام', 'فيسبوك', 'page'],
  reviews: ['avis', 'review', 'تقييم', 'avert', 'note', 'مشاعر', 'رضا'],
  sales: ['vente', 'sale', 'بيع', 'chiffre', 'revenue', 'paiement', 'payment', 'دفع', 'facture'],
  other: []
};

type GenNode = { id: string; kind: string; label?: string; config: Record<string, unknown> };
type GeneratedAutomation = {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  nodes: GenNode[];
};

function guessCategory(desc: string): string {
  const low = desc.toLowerCase();
  for (const [cat, keys] of Object.entries(CATEGORY_MAP)) {
    if (keys.some((k) => low.includes(k))) return cat;
  }
  return 'messages';
}

export default function SimpleAutomationWizard() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { push } = useToast();

  const [step, setStep] = React.useState(1);
  const [category, setCategory] = React.useState<string | null>(null);
  const [desc, setDesc] = React.useState('');
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [offline, setOffline] = React.useState<boolean | null>(null);
  const [generated, setGenerated] = React.useState<GeneratedAutomation | null>(null);
  const [creating, setCreating] = React.useState(false);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  function pickCategory(cat: string) {
    setCategory(cat);
    setSuggestion(null);
    setDesc('');
    setStep(2);
  }

  function applySuggestion(s: string) {
    setSuggestion(s);
    setDesc(t(s));
  }

  async function generate() {
    if (!desc.trim() || generating) return;
    // Guess category if not chosen yet
    const resolvedCat = category ?? guessCategory(desc);
    setCategory(resolvedCat);
    setGenerating(true);
    setOffline(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, category: resolvedCat, language: locale })
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message || t('common.error') });
        return;
      }
      setGenerated(data.automation);
      setOffline(!!data.offline);
      setStep(3);
    } finally {
      setGenerating(false);
    }
  }

  async function createAndActivate(activate: boolean) {
    if (!generated || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generated.name,
          description: generated.description,
          trigger: { type: generated.triggerType, ...(generated.triggerConfig || {}) },
          nodes: generated.nodes,
          enabled: activate,
          aiGenerated: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message && data.message !== 'limit_exceeded' ? data.message : t('auto.limit') });
        return;
      }
      push({ tone: 'success', title: activate ? t('sm.activated') : t('sm.saved') });
      router.push('/app');
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function back() {
    if (step === 3 || step === 2) {
      setStep(step === 3 ? 2 : 1);
    }
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/app/automations" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4 rtl-flip" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">{t('sm.title')}</h1>
            <p className="text-xs text-slate-400">{t('sm.subtitle')}</p>
          </div>
        </div>
        <Link href="/app/automations/builder" className="hidden text-xs font-medium text-slate-400 hover:text-brand-600 sm:block">
          {t('sm.advancedMode')} →
        </Link>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{t('sm.step')} {step} / {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-all', s <= step ? 'bg-brand-500' : 'bg-slate-100')} />
          ))}
        </div>
      </div>

      {/* STEP 1: What do you want to automate? */}
      {step === 1 && (
        <div className="animate-fade-up">
          <h2 className="mb-1 text-2xl font-extrabold text-slate-800">{t('sm.whatAutomate')}</h2>
          <p className="mb-5 text-sm text-slate-500">{t('sm.whatAutomateHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => pickCategory(c.id)}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-start transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition group-hover:scale-110', c.gradient)}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-slate-800">{t(c.titleKey)}</span>
                    <span className="block truncate text-xs text-slate-400">{t(c.descKey)}</span>
                  </span>
                  <ArrowRight className="ms-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500 rtl-flip rtl:-translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: What should happen? */}
      {step === 2 && (
        <div className="animate-fade-up mx-auto max-w-2xl">
          <button onClick={back} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-4 w-4 rtl-flip" /> {t('sm.changeCategory')} ({category ? t(`sm.${category}`) : ''})
          </button>
          <h2 className="text-2xl font-extrabold text-slate-800">{t('sm.whatHappen')}</h2>
          <p className="mb-4 text-sm text-slate-500">{t('sm.whatHappenHint')}</p>

          <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <textarea
              autoFocus
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('sm.descPlaceholder')}
              className="w-full resize-none rounded-xl bg-transparent p-4 text-[15px] outline-none placeholder:text-slate-300"
              rows={4}
            />
            <div className="flex items-center justify-between border-t border-slate-100 p-2">
              <span className="px-2 text-[11px] text-slate-400">{desc.length > 240 ? `${desc.length}/240` : t('sm.darija')}</span>
              <Button size="sm" onClick={generate} disabled={!desc.trim() || generating} className="btn-premium">
                {generating ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('sm.generating')}</> : <><Sparkles className="h-4 w-4" /> {t('sm.buildAutomation')}</>}
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('sm.ideas')}</p>
            <div className="flex flex-wrap gap-2">
              {(CATEGORIES.find((c) => c.id === category)?.suggestions ?? []).map((s) => (
                <button
                  key={s}
                  onClick={() => applySuggestion(s)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition',
                    suggestion === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600'
                  )}
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div>

          {/* This is a real, working AI — explain honestly */}
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {t('sm.honestNote')}
          </p>
        </div>
      )}

      {/* STEP 3: Visual explanation + Activate */}
      {step === 3 && generated && (
        <div className="animate-fade-up mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg animate-float-3d">
              <Bot className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800">{t('sm.yourAutomation')}</h2>
            <p className="mt-1 text-sm text-slate-500">{generated.name}</p>
            {offline && (
              <p className="mx-auto mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
                {t('sm.offlineNote')}
              </p>
            )}
          </div>

          {/* Visual steps */}
          <div className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Wand2 className="h-4 w-4 text-brand-500" /> {t('sm.howItWorks')}
            </h3>
            <div className="space-y-0">
              {generated.nodes.filter((n) => n.kind !== 'END').map((n, i) => (
                <React.Fragment key={n.id}>
                  <StepRow index={i} kind={n.kind} label={n.label} config={n.config} />
                  {i < generated.nodes.filter((x) => x.kind !== 'END').length - 1 && (
                    <div className="relative mx-auto h-6 w-0.5 bg-gradient-to-b from-brand-400 to-brand-200">
                      <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand-400" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="btn-premium flex-1 !py-3" onClick={() => createAndActivate(true)} disabled={creating}>
              {creating ? <Spinner /> : <><Zap className="h-5 w-5" /> {t('sm.activate')}</>}
            </Button>
            <Button variant="secondary" className="flex-1 !py-3" onClick={() => createAndActivate(false)} disabled={creating}>
              <Play className="h-4 w-4" /> {t('sm.saveOnly')}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            <button onClick={back} className="hover:text-brand-600 underline-offset-2 hover:underline">{t('sm.backToEdit')}</button>
          </p>
        </div>
      )}

      {/* Bottom nav for step 1->2 is handled by clicking a category; step 2 has generate */}
      {step === 1 && (
        <div className="mt-6 flex justify-between">
          <div />
          <Link href="/app/automations/builder" className="text-xs font-medium text-slate-400 hover:text-brand-600 sm:hidden">
            {t('sm.advancedMode')} →
          </Link>
        </div>
      )}
    </div>
  );
}

function StepRow({ index, kind, label, config }: { index: number; kind: string; label?: string; config: Record<string, unknown> }) {
  const { t } = useLocale();
  // Heuristic text for each step kind - friendly, non-technical
  const friendly: Record<string, string> = {
    REPLY: 'sm.step.reply',
    AI_REPLY: 'sm.step.aiReply',
    NOTIFY: 'sm.step.notify',
    CREATE_CUSTOMER: 'sm.step.saveCustomer',
    UPDATE_CUSTOMER: 'sm.step.updateCustomer',
    CREATE_TASK: 'sm.step.task',
    CREATE_APPOINTMENT: 'sm.step.appointment',
    SCHEDULE_REMINDER: 'sm.step.reminder',
    DELAY: 'sm.step.wait',
    CONDITION: 'sm.step.condition',
    WEBHOOK_CALL: 'sm.step.webhook'
  };
  const icons: Record<string, React.ReactNode> = {
    TREPLY: <MessageCircle className="h-5 w-5" />,
    REPLY: <MessageCircle className="h-5 w-5" />,
    AI_REPLY: <Sparkles className="h-5 w-5" />,
    NOTIFY: <Bell className="h-5 w-5" />,
    CREATE_CUSTOMER: <UserPlus className="h-5 w-5" />,
    UPDATE_CUSTOMER: <Users className="h-5 w-5" />,
    CREATE_TASK: <Check className="h-5 w-5" />,
    CREATE_APPOINTMENT: <CalendarDays className="h-5 w-5" />,
    SCHEDULE_REMINDER: <Bell className="h-5 w-5" />,
    DELAY: <RefreshCw className="h-5 w-5" />,
    CONDITION: <Star className="h-5 w-5" />,
    WEBHOOK_CALL: <Mail className="h-5 w-5" />
  };
  const colors: Record<string, string> = {
    REPLY: 'from-emerald-400 to-teal-600',
    AI_REPLY: 'from-violet-400 to-purple-600',
    NOTIFY: 'from-amber-400 to-orange-500',
    CREATE_CUSTOMER: 'from-blue-400 to-indigo-500',
    UPDATE_CUSTOMER: 'from-sky-400 to-blue-600',
    CREATE_TASK: 'from-red-400 to-rose-500',
    CREATE_APPOINTMENT: 'from-cyan-400 to-teal-500',
    SCHEDULE_REMINDER: 'from-orange-400 to-amber-500',
    DELAY: 'from-slate-400 to-zinc-500',
    CONDITION: 'from-pink-400 to-rose-500',
    WEBHOOK_CALL: 'from-indigo-400 to-violet-500'
  };

  const friendlyKey = friendly[kind] || 'sm.step.auto';
  const icon = icons[kind] || <Sparkles className="h-5 w-5" />;
  const color = colors[kind] || 'from-brand-400 to-brand-600';

  // Try to extract a short human detail from config
  let detail = '';
  const text = config.text || config.prompt || config.title || '';
  if (typeof text === 'string' && text.length > 0) detail = text.length > 70 ? text.slice(0, 70) + '…' : text;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-slate-200 hover:shadow-sm">
      <span className="flex h-8 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-600">
        {index + 1}
      </span>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', color)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">{t(friendlyKey)}</p>
        {detail && <p className="truncate text-xs text-slate-400">{detail}</p>}
      </div>
    </div>
  );
}
