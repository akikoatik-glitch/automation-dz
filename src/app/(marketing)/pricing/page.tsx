import { prisma } from '@/lib/db';
import { getServerLocale, serverT } from '@/lib/i18n/server';
import { Reveal } from '@/components/Reveal';
import Link from 'next/link';
import { Check, ArrowRight, Zap, Star, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const locale = getServerLocale();
  const t = serverT(locale);
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sort: 'asc' }
  });

  const limitLabels: Record<string, string> = {
    customers: 'usage.customers',
    automations: 'usage.automations',
    messages: 'usage.messages',
    users: 'usage.users'
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
            <Zap className="h-3 w-3" />
            {t('landing.section.pricing')}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-800">
            {t('landing.section.pricing')}
          </h1>
          <p className="mt-3 text-slate-500">
            {t('landing.testimonial.line')}
          </p>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p, i) => {
          const limits = JSON.parse(p.limits || '{}');
          const features = JSON.parse(p.features || '[]');
          const featured = i === 1;
          const enterprise = i === 3;
          return (
            <Reveal key={p.id} delay={i * 100}>
              <div
                className={`card premium-card relative flex h-full flex-col p-6 ${
                  featured ? 'gradient-border shadow-glow' : ''
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-4 py-1 text-xs font-bold text-white flex items-center gap-1">
                    <Star className="h-3 w-3" /> {t('tpl.featured')}
                  </span>
                )}
                <h2 className="text-lg font-extrabold text-slate-800">
                  {locale === 'ar' && p.nameAr ? p.nameAr : p.name}
                </h2>
                <div className="mt-3 flex items-end gap-1">
                  {enterprise && p.priceDzd === 0 ? (
                    <span className="text-3xl font-extrabold text-slate-800">{t('plan.custom')}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-slate-800">
                        {p.priceDzd === 0 ? '0' : new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ').format(p.priceDzd)}
                      </span>
                      <span className="pb-1 text-sm font-medium text-slate-400">
                        {p.priceDzd === 0 ? t('plan.perMonth') : 'DZD' + t('plan.month')}
                      </span>
                    </>
                  )}
                </div>

                <div className="my-5 h-px bg-slate-100" />

                <ul className="flex-1 space-y-2.5">
                  {features.map((f: string, fi: number) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      {f}
                    </li>
                  ))}
                  {!enterprise &&
                    Object.entries(limits).map(([k, v]) => {
                      if (k === 'ai') return null;
                      const label = limitLabels[k];
                      if (!label) return null;
                      return (
                        <li key={k} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                          {Number(v) <= 0 ? t('plan.unlimited') : `${v} ${t(label)}`}
                        </li>
                      );
                    })}
                </ul>

                <Link
                  href="/register"
                  className={featured ? 'btn btn-primary btn-premium mt-6 w-full' : 'btn btn-secondary mt-6 w-full'}
                >
                  {t('plan.choose')}
                  <ArrowRight className="h-4 w-4 rtl-flip" />
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal>
        <div className="card mt-8 flex flex-col items-center justify-between gap-3 p-6 text-center sm:flex-row sm:text-start">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{t('plan.custom')}</h3>
              <p className="text-sm text-slate-500">{t('adm.revenuePlaceholder')}</p>
            </div>
          </div>
          <Link href="/register" className="btn btn-secondary">
            {t('landing.cta')}
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
