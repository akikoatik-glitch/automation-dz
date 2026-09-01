import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getServerLocale, serverT } from '@/lib/i18n/server';
import { Reveal } from '@/components/Reveal';
import { HeroVisual } from '@/components/marketing/HeroVisual';
import { Faq } from '@/components/marketing/Faq';
import {
  MessageCircle,
  Zap,
  CalendarDays,
  Languages,
  BellRing,
  LayoutDashboard,
  ArrowRight,
  Stethoscope,
  Sparkles,
  Utensils,
  Home,
  ShoppingBag,
  Building2,
  Layers,
  Check,
  Clock,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Store,
  Bot,
  Users,
  TrendingUp,
  Shield,
  Star
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const locale = getServerLocale();
  const t = serverT(locale);

  const industries = [
    { icon: <Stethoscope className="h-6 w-6" />, key: 'clinic', gradient: 'from-emerald-400 to-teal-600' },
    { icon: <Sparkles className="h-6 w-6" />, key: 'salon', gradient: 'from-pink-400 to-rose-600' },
    { icon: <Utensils className="h-6 w-6" />, key: 'restaurant', gradient: 'from-amber-400 to-orange-600' },
    { icon: <Home className="h-6 w-6" />, key: 'estate', gradient: 'from-violet-400 to-purple-600' },
    { icon: <ShoppingBag className="h-6 w-6" />, key: 'ecommerce', gradient: 'from-blue-400 to-indigo-600' },
    { icon: <Dumbbell className="h-6 w-6" />, key: 'gym', gradient: 'from-red-400 to-rose-600' },
    { icon: <GraduationCap className="h-6 w-6" />, key: 'training', gradient: 'from-cyan-400 to-blue-600' },
    { icon: <Briefcase className="h-6 w-6" />, key: 'agency', gradient: 'from-slate-400 to-zinc-600' },
    { icon: <Store className="h-6 w-6" />, key: 'other', gradient: 'from-teal-400 to-emerald-600' }
  ];

  const automations = [
    { icon: <Bot className="h-6 w-6" />, key: 'customerAssistant', gradient: 'from-emerald-400 to-brand-600' },
    { icon: <CalendarDays className="h-6 w-6" />, key: 'appointmentReminder', gradient: 'from-amber-400 to-orange-500' },
    { icon: <Users className="h-6 w-6" />, key: 'leadFollowup', gradient: 'from-blue-400 to-indigo-500' },
    { icon: <Star className="h-6 w-6" />, key: 'reviewRequest', gradient: 'from-violet-400 to-purple-500' }
  ];

  const faqs = [
    { q: t('faq1_q'), a: t('faq1_a') },
    { q: t('faq2_q'), a: t('faq2_a') },
    { q: t('faq3_q'), a: t('faq3_a') },
    { q: t('faq4_q'), a: t('faq4_a') }
  ];

  return (
    <main>
      {/* ================= HERO ================= */}
      <section className="hero-grid relative overflow-hidden bg-night-900">
        <div className="absolute inset-0 bg-hero-mesh" />
        <div className="absolute inset-0 hero-grid mask-fade-b opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-emerald-300">
                <span className="pulse-dot" />
                {t('landing.hero.eyebrow')}
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                {t('landing.hero.title1')}
                <br />
                <span className="text-gradient">{t('landing.hero.title2')}</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                {t('landing.hero.subtitle')}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className="btn btn-primary btn-premium px-8 py-3.5 text-base shadow-glow">
                  {t('landing.hero.cta')}
                </Link>
                <Link href="#how" className="btn border border-white/15 bg-white/5 px-6 py-3.5 text-base text-white hover:bg-white/10">
                  {t('landing.hero.cta2')}
                  <ArrowRight className="h-4 w-4 rtl-flip" />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-6">
                {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-slate-300">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative animate-fade-up" style={{ animationDelay: '150ms' }}>
              <div className="absolute -inset-10 rounded-[3rem] bg-brand-500/10 blur-3xl" />
              <div className="relative">
                <HeroVisual />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
              {t('landing.how.title')}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              {t('landing.how.subtitle')}
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { icon: <MessageCircle className="h-6 w-6" />, step: '1', titleKey: 'landing.how1.title', descKey: 'landing.how1.desc', color: 'from-brand-400 to-brand-600' },
            { icon: <Zap className="h-6 w-6" />, step: '2', titleKey: 'landing.how2.title', descKey: 'landing.how2.desc', color: 'from-accent-400 to-accent-600' },
            { icon: <TrendingUp className="h-6 w-6" />, step: '3', titleKey: 'landing.how3.title', descKey: 'landing.how3.desc', color: 'from-sky-400 to-blue-600' }
          ].map((s, i) => (
            <Reveal key={i} delay={i * 150}>
              <div className="card premium-card group p-8 text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white shadow-lg`}>
                  {s.icon}
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {s.step}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">{t(s.titleKey)}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{t(s.descKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= INDUSTRIES ================= */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
                {t('landing.industries.title')}
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
                {t('landing.industries.subtitle')}
              </h2>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind, i) => (
              <Reveal key={ind.key} delay={(i % 3) * 100}>
                <div className="card premium-card group p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${ind.gradient} text-white shadow-md`}>
                    {ind.icon}
                  </div>
                  <h3 className="mt-4 font-bold text-slate-800">{t(`landing.industry.${ind.key}`)}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{t(`landing.industry.${ind.key}Desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= AUTOMATIONS SHOWCASE ================= */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
              <Zap className="h-3 w-3" />
              {t('landing.automation.title')}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              {t('landing.automation.subtitle')}
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {automations.map((a, i) => (
            <Reveal key={a.key} delay={i * 120}>
              <div className="card premium-card group p-6">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-md`}>
                    {a.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800">{t(`landing.auto.${a.key}`)}</h3>
                      <div className="auto-toggle active" />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">{t(`landing.auto.${a.key}Desc`)}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={400}>
          <div className="mt-8 text-center">
            <Link href="/register" className="btn btn-primary btn-premium px-8 py-3 text-base shadow-glow">
              {t('landing.cta')}
              <ArrowRight className="h-4 w-4 rtl-flip" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ================= DARK SECTION - FEATURES ================= */}
      <section className="relative overflow-hidden bg-night-900 py-20">
        <div className="absolute inset-0 bg-hero-mesh" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t('landing.section.features')}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <MessageCircle className="h-5 w-5" />, title: t('landing.feature1.title'), desc: t('landing.feature1.desc'), color: '#17a77f' },
              { icon: <Zap className="h-5 w-5" />, title: t('landing.feature2.title'), desc: t('landing.feature2.desc'), color: '#8b5cf6' },
              { icon: <Languages className="h-5 w-5" />, title: t('landing.feature3.title'), desc: t('landing.feature3.desc'), color: '#0ea5e9' },
              { icon: <Layers className="h-5 w-5" />, title: t('landing.feature4.title'), desc: t('landing.feature4.desc'), color: '#f59e0b' },
              { icon: <BellRing className="h-5 w-5" />, title: t('landing.feature5.title'), desc: t('landing.feature5.desc'), color: '#f97316' },
              { icon: <LayoutDashboard className="h-5 w-5" />, title: t('landing.feature6.title'), desc: t('landing.feature6.desc'), color: '#10b981' }
            ].map((f, i) => (
              <Reveal key={i} delay={(i % 3) * 100}>
                <div className="glass-dark group rounded-2xl p-6 transition hover:-translate-y-1 hover:bg-white/10">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color}cc)` }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-bold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA SECTION ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-white py-20">
        <div className="absolute inset-0 hero-grid opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl">
              {t('landing.cta.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              {t('landing.cta.subtitle')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/register" className="btn btn-primary btn-premium px-8 py-3.5 text-base shadow-glow">
                {t('landing.cta.button')}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              {[t('landing.hero.trust1'), t('landing.hero.trust2'), t('landing.hero.trust3')].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-brand-500" />
                  {s}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <h3 className="text-center text-2xl font-extrabold text-slate-800">
            {t('landing.faq')}
          </h3>
          <Faq items={faqs} />
        </Reveal>
      </section>
    </main>
  );
}
