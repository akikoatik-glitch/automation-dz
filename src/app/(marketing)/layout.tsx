import { MarketingNav } from '@/components/marketing/MarketingNav';
import { getServerLocale, serverT } from '@/lib/i18n/server';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const dynamic = 'force-dynamic';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  const t = serverT(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">{t('landing.footer.what')}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span>🇩🇿</span>
                <span>Made in Algeria</span>
                <span className="text-slate-300">·</span>
                <span>العربية · Français · English</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Product</h4>
              <div className="mt-3 space-y-2 text-sm">
                <Link href="/#how" className="block text-slate-500 hover:text-brand-600">{t('landing.how.title')}</Link>
                <Link href="/#features" className="block text-slate-500 hover:text-brand-600">{t('landing.nav.features')}</Link>
                <Link href="/pricing" className="block text-slate-500 hover:text-brand-600">{t('landing.nav.pricing')}</Link>
                <Link href="/#templates" className="block text-slate-500 hover:text-brand-600">{t('landing.nav.templates')}</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Account</h4>
              <div className="mt-3 space-y-2 text-sm">
                <Link href="/login" className="block text-slate-500 hover:text-brand-600">{t('landing.nav.login')}</Link>
                <Link href="/register" className="block text-slate-500 hover:text-brand-600">{t('landing.nav.start')}</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Wassil — {t('brand.tagline')}
          </div>
        </div>
      </footer>
    </div>
  );
}
