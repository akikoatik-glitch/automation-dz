'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Button, Spinner } from '@/components/ui';
import {
  Stethoscope,
  Sparkles,
  Utensils,
  Home,
  ShoppingBag,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Store,
  MessageCircle,
  Facebook,
  Instagram,
  Send,
  Mail,
  Phone,
  Globe,
  Bot,
  CalendarDays,
  Users,
  Bell,
  Star,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap
} from 'lucide-react';

const industries = [
  { id: 'clinic', icon: Stethoscope, gradient: 'from-emerald-400 to-teal-600', labelKey: 'landing.industry.clinic' },
  { id: 'salon', icon: Sparkles, gradient: 'from-pink-400 to-rose-600', labelKey: 'landing.industry.salon' },
  { id: 'restaurant', icon: Utensils, gradient: 'from-amber-400 to-orange-600', labelKey: 'landing.industry.restaurant' },
  { id: 'estate', icon: Home, gradient: 'from-violet-400 to-purple-600', labelKey: 'landing.industry.estate' },
  { id: 'ecommerce', icon: ShoppingBag, gradient: 'from-blue-400 to-indigo-600', labelKey: 'landing.industry.ecommerce' },
  { id: 'gym', icon: Dumbbell, gradient: 'from-red-400 to-rose-600', labelKey: 'landing.industry.gym' },
  { id: 'training', icon: GraduationCap, gradient: 'from-cyan-400 to-blue-600', labelKey: 'landing.industry.training' },
  { id: 'agency', icon: Briefcase, gradient: 'from-slate-400 to-zinc-600', labelKey: 'landing.industry.agency' },
  { id: 'other', icon: Store, gradient: 'from-teal-400 to-emerald-600', labelKey: 'landing.industry.other' }
];

const channels = [
  { id: 'whatsapp', icon: MessageCircle, gradient: 'from-green-400 to-green-600', label: 'WhatsApp' },
  { id: 'facebook', icon: Facebook, gradient: 'from-blue-400 to-blue-600', label: 'Facebook' },
  { id: 'instagram', icon: Instagram, gradient: 'from-pink-400 to-purple-600', label: 'Instagram' },
  { id: 'telegram', icon: Send, gradient: 'from-sky-400 to-blue-500', label: 'Telegram' },
  { id: 'email', icon: Mail, gradient: 'from-amber-400 to-orange-500', label: 'Email' },
  { id: 'phone', icon: Phone, gradient: 'from-slate-400 to-slate-600', label: 'Phone' },
  { id: 'website', icon: Globe, gradient: 'from-indigo-400 to-violet-500', label: 'Website' }
];

const automationSuggestions: Record<string, { id: string; icon: React.ElementType; labelKey: string; descKey: string; gradient: string }[]> = {
  clinic: [
    { id: 'customer_assistant', icon: Bot, labelKey: 'landing.auto.customerAssistant', descKey: 'landing.auto.customerAssistantDesc', gradient: 'from-emerald-400 to-brand-600' },
    { id: 'appointment_reminder', icon: CalendarDays, labelKey: 'landing.auto.appointmentReminder', descKey: 'landing.auto.appointmentReminderDesc', gradient: 'from-amber-400 to-orange-500' },
    { id: 'lead_followup', icon: Users, labelKey: 'landing.auto.leadFollowup', descKey: 'landing.auto.leadFollowupDesc', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'review_request', icon: Star, labelKey: 'landing.auto.reviewRequest', descKey: 'landing.auto.reviewRequestDesc', gradient: 'from-violet-400 to-purple-500' }
  ],
  salon: [
    { id: 'customer_assistant', icon: Bot, labelKey: 'landing.auto.customerAssistant', descKey: 'landing.auto.customerAssistantDesc', gradient: 'from-emerald-400 to-brand-600' },
    { id: 'appointment_reminder', icon: CalendarDays, labelKey: 'landing.auto.appointmentReminder', descKey: 'landing.auto.appointmentReminderDesc', gradient: 'from-amber-400 to-orange-500' },
    { id: 'lead_followup', icon: Users, labelKey: 'landing.auto.leadFollowup', descKey: 'landing.auto.leadFollowupDesc', gradient: 'from-blue-400 to-indigo-500' }
  ],
  restaurant: [
    { id: 'customer_assistant', icon: Bot, labelKey: 'landing.auto.customerAssistant', descKey: 'landing.auto.customerAssistantDesc', gradient: 'from-emerald-400 to-brand-600' },
    { id: 'lead_followup', icon: Users, labelKey: 'landing.auto.leadFollowup', descKey: 'landing.auto.leadFollowupDesc', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'review_request', icon: Star, labelKey: 'landing.auto.reviewRequest', descKey: 'landing.auto.reviewRequestDesc', gradient: 'from-violet-400 to-purple-500' }
  ],
  estate: [
    { id: 'customer_assistant', icon: Bot, labelKey: 'landing.auto.customerAssistant', descKey: 'landing.auto.customerAssistantDesc', gradient: 'from-emerald-400 to-brand-600' },
    { id: 'lead_followup', icon: Users, labelKey: 'landing.auto.leadFollowup', descKey: 'landing.auto.leadFollowupDesc', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'review_request', icon: Star, labelKey: 'landing.auto.reviewRequest', descKey: 'landing.auto.reviewRequestDesc', gradient: 'from-violet-400 to-purple-500' }
  ],
  ecommerce: [
    { id: 'customer_assistant', icon: Bot, labelKey: 'landing.auto.customerAssistant', descKey: 'landing.auto.customerAssistantDesc', gradient: 'from-emerald-400 to-brand-600' },
    { id: 'lead_followup', icon: Users, labelKey: 'landing.auto.leadFollowup', descKey: 'landing.auto.leadFollowupDesc', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'review_request', icon: Star, labelKey: 'landing.auto.reviewRequest', descKey: 'landing.auto.reviewRequestDesc', gradient: 'from-violet-400 to-purple-500' }
  ],
  default: [
    { id: 'customer_assistant', icon: Bot, labelKey: 'landing.auto.customerAssistant', descKey: 'landing.auto.customerAssistantDesc', gradient: 'from-emerald-400 to-brand-600' },
    { id: 'appointment_reminder', icon: CalendarDays, labelKey: 'landing.auto.appointmentReminder', descKey: 'landing.auto.appointmentReminderDesc', gradient: 'from-amber-400 to-orange-500' },
    { id: 'lead_followup', icon: Users, labelKey: 'landing.auto.leadFollowup', descKey: 'landing.auto.leadFollowupDesc', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'review_request', icon: Star, labelKey: 'landing.auto.reviewRequest', descKey: 'landing.auto.reviewRequestDesc', gradient: 'from-violet-400 to-purple-500' }
  ]
};

export default function OnboardingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [selectedIndustry, setSelectedIndustry] = React.useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = React.useState<string[]>([]);
  const [selectedAutomations, setSelectedAutomations] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const totalSteps = 3;

  function toggleChannel(id: string) {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleAutomation(id: string) {
    setSelectedAutomations((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function getAutomations() {
    return automationSuggestions[selectedIndustry || 'default'] || automationSuggestions.default;
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          channels: selectedChannels,
          automations: selectedAutomations
        })
      });
    } catch {
      // Continue even if settings update fails
    }
    router.push('/app');
    router.refresh();
  }

  const progress = (step / totalSteps) * 100;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-night-900 px-4 py-10">
      <div className="absolute inset-0 bg-hero-mesh" />
      <div className="absolute inset-0 hero-grid opacity-30" />

      <div className="relative w-full max-w-2xl animate-fade-up">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between px-1">
          <Logo dark size="lg" />
          <LocaleSwitcher dark />
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{t('onboard.step')} {step} / {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`step-dot ${s === step ? 'active' : s < step ? 'done' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="glass-dark rounded-3xl p-8 shadow-2xl min-h-[420px]">
          {/* Step 1: Industry */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-extrabold text-white">{t('onboard.chooseIndustry')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('onboard.subtitle')}</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {industries.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = selectedIndustry === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => setSelectedIndustry(ind.id)}
                      className={`industry-card rounded-2xl border p-4 text-center transition-all ${
                        isSelected
                          ? 'border-brand-400 bg-white/10 shadow-glow'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${ind.gradient} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-white">
                        {t(ind.labelKey) === ind.labelKey ? ind.id : t(ind.labelKey)}
                      </p>
                      {isSelected && (
                        <div className="mt-2">
                          <Check className="mx-auto h-4 w-4 text-brand-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Channels */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-extrabold text-white">{t('onboard.chooseChannels')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('onboard.subtitle')}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {channels.map((ch) => {
                  const Icon = ch.icon;
                  const isSelected = selectedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`industry-card rounded-2xl border p-4 text-center transition-all ${
                        isSelected
                          ? 'border-brand-400 bg-white/10 shadow-glow'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${ch.gradient} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-white">{ch.label}</p>
                      {isSelected && (
                        <div className="mt-1.5">
                          <Check className="mx-auto h-4 w-4 text-brand-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Automations */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-extrabold text-white">{t('onboard.chooseAutomations')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('onboard.subtitle')}</p>
              <div className="mt-6 space-y-3">
                {getAutomations().map((auto) => {
                  const Icon = auto.icon;
                  const isSelected = selectedAutomations.includes(auto.id);
                  return (
                    <button
                      key={auto.id}
                      onClick={() => toggleAutomation(auto.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-brand-400 bg-white/10 shadow-glow'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${auto.gradient} text-white`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white">{t(auto.labelKey)}</p>
                          <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{t(auto.descKey)}</p>
                        </div>
                        <div className={`auto-toggle shrink-0 ${isSelected ? 'active' : ''}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 rtl-flip" />
              {t('onboard.back')}
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedIndustry}
              className="px-6"
            >
              {t('onboard.next')}
              <ArrowRight className="h-4 w-4 rtl-flip" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={loading}
              className="btn-premium px-8"
            >
              {loading ? <Spinner /> : (
                <>
                  <Zap className="h-4 w-4" />
                  {t('onboard.activate')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
