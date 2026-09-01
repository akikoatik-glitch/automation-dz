'use client';

import * as React from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Field, Input, Button, Spinner } from '@/components/ui';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent, demo = false) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', {
      redirect: false,
      email: demo ? 'demo@wassil.dz' : email,
      password: demo ? 'Admin123!' : password
    });
    if (res?.error) {
      setError(t('auth.wrongCredentials'));
      setLoading(false);
      return;
    }
    // Super admin -> admin dashboard; everyone else -> app
    const sess = await getSession();
    router.push(sess?.user?.role === 'super' ? '/admin' : '/app');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-night-900 px-4">
      <div className="absolute inset-0 bg-hero-mesh" />
      <div className="absolute inset-0 hero-grid opacity-40" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/">
            <Logo dark size="lg" />
          </Link>
          <LocaleSwitcher dark />
        </div>

        <div className="glass-dark rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold text-white">{t('auth.loginCta')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('brand.tagline')}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label={t('auth.email')}>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-brand-400"
              />
            </Field>
            <Field label={t('auth.password')}>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-brand-400"
              />
            </Field>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : t('auth.login')}
            </Button>
          </form>

          <button
            onClick={(e) => submit(e, true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            {t('auth.demo')} — demo@wassil.dz
          </button>

          <p className="mt-6 text-center text-sm text-slate-400">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="font-semibold text-brand-400 hover:text-brand-300">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}