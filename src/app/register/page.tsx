'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Field, Input, Button, Select, Spinner } from '@/components/ui';

const industries = [
  'clinic', 'salon', 'restaurant', 'estate', 'ecommerce', 'service', 'other'
];

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    businessName: '',
    industry: 'service'
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        businessName: form.businessName,
        industry: form.industry
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(t(data.error === 'email_taken' ? 'auth.emailTaken' : 'common.error'));
      setLoading(false);
      return;
    }

    await signIn('credentials', {
      redirect: false,
      email: form.email,
      password: form.password
    });
    router.push('/app/onboarding');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-night-900 px-4 py-10">
      <div className="absolute inset-0 bg-hero-mesh" />
      <div className="absolute inset-0 hero-grid opacity-40" />

      <div className="relative w-full max-w-lg animate-fade-up">
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/">
            <Logo dark size="lg" />
          </Link>
          <LocaleSwitcher dark />
        </div>

        <div className="glass-dark rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold text-white">{t('auth.registerCta')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('brand.tagline')}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('auth.name')}>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder-slate-400"
                />
              </Field>
              <Field label={t('auth.businessName')}>
                <Input
                  required
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder-slate-400"
                />
              </Field>
            </div>
            <Field label={t('auth.email')}>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder-slate-400"
              />
            </Field>
            <Field label={t('auth.industry')}>
              <Select
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                className="border-white/10 bg-white/5 text-white"
              >
                {industries.map((i) => (
                  <option key={i} value={i} className="text-slate-800">
                    {t(`tpl.byIndustry.${i}`) === `tpl.byIndustry.${i}` ? i : t(`tpl.byIndustry.${i}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('auth.password')} hint="8+">
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder-slate-400"
                />
              </Field>
              <Field label={t('auth.passwordConfirm')}>
                <Input
                  type="password"
                  required
                  value={form.passwordConfirm}
                  onChange={(e) => set('passwordConfirm', e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder-slate-400"
                />
              </Field>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : t('auth.register')}
            </Button>
            <p className="text-center text-xs text-slate-400">{t('auth.creatingWorkspace')}</p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {t('auth.haveAccount')}{' '}
            <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}