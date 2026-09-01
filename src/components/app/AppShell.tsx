'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Badge } from '@/components/ui';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Workflow,
  CalendarDays,
  FileText,
  FormInput,
  Plug,
  Bot,
  BarChart3,
  Settings,
  ShieldCheck,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CheckCheck,
  Building2
} from 'lucide-react';

type Notif = { id: string; type: string; title: string; content?: string | null; link?: string | null; read: boolean; createdAt: string };

export function AppShell({
  businessName,
  planName,
  userName,
  userEmail,
  isSuper,
  initialUnread,
  children
}: {
  businessName: string;
  planName: string | null;
  userName: string;
  userEmail: string;
  isSuper: boolean;
  initialUnread: number;
  children: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState<Notif[]>([]);
  const [unread, setUnread] = React.useState(initialUnread);
  const [userMenu, setUserMenu] = React.useState(false);

  const nav = [
    { href: '/app', icon: <LayoutDashboard className="h-4.5 w-4.5 h-[18px] w-[18px]" />, label: t('nav.dashboard'), active: pathname === '/app' },
    { href: '/app/inbox', icon: <Inbox className="h-[18px] w-[18px]" />, label: t('nav.inbox'), active: pathname.startsWith('/app/inbox') },
    { href: '/app/customers', icon: <Users className="h-[18px] w-[18px]" />, label: t('nav.customers'), active: pathname.startsWith('/app/customers') },
    { href: '/app/automations', icon: <Workflow className="h-[18px] w-[18px]" />, label: t('nav.automations'), active: pathname.startsWith('/app/automations') && !pathname.includes('templates') },
    { href: '/app/appointments', icon: <CalendarDays className="h-[18px] w-[18px]" />, label: t('nav.appointments'), active: pathname.startsWith('/app/appointments') },
    { href: '/app/payments', icon: <FileText className="h-[18px] w-[18px]" />, label: t('nav.payments'), active: pathname.startsWith('/app/payments') },
    { href: '/app/forms', icon: <FormInput className="h-[18px] w-[18px]" />, label: t('nav.forms'), active: pathname.startsWith('/app/forms') },
    { href: '/app/integrations', icon: <Plug className="h-[18px] w-[18px]" />, label: t('nav.integrations'), active: pathname.startsWith('/app/integrations') },
    { href: '/app/ai', icon: <Bot className="h-[18px] w-[18px]" />, label: t('nav.ai'), active: pathname.startsWith('/app/ai') },
    { href: '/app/reports', icon: <BarChart3 className="h-[18px] w-[18px]" />, label: t('nav.reports'), active: pathname.startsWith('/app/reports') },
    { href: '/app/templates', icon: <Workflow className="h-[18px] w-[18px]" />, label: t('nav.templates'), active: pathname.includes('templates') },
    { href: '/app/settings', icon: <Settings className="h-[18px] w-[18px]" />, label: t('nav.settings'), active: pathname.startsWith('/app/settings') }
  ];

  async function loadNotifs() {
    const res = await fetch('/api/notifications?limit=10');
    if (res.ok) {
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    }
  }

  React.useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 45000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    loadNotifs();
  }

  const SidebarContent = (
    <>
      <div className="px-5 pb-5 pt-6">
        <Link href="/app">
          <Logo dark />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setMobileOpen(false)}
            className={cn('sidebar-link', n.active && 'sidebar-link-active')}
          >
            {n.icon}
            <span className="truncate">{n.label}</span>
            {n.href === '/app/inbox' && unread > 0 && (
              <span className="ms-auto rounded-full bg-brand-500/30 px-1.5 py-0.5 text-[10px] font-bold text-brand-200">
                {unread}
              </span>
            )}
          </Link>
        ))}
        {isSuper && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn('sidebar-link', pathname.startsWith('/admin') && 'sidebar-link-active')}
          >
            <ShieldCheck className="h-[18px] w-[18px]" />
            {t('nav.admin')}
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
            {planName ? planName.slice(0, 2).toUpperCase() : 'GR'}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-xs font-semibold text-white">
              <Building2 className="h-3 w-3 shrink-0 text-emerald-300" />
              <span className="truncate">{businessName}</span>
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {planName ? t(planName.toLowerCase().includes('starter') ? 'plan.starter' : 'set.plan') : '—'}
            </p>
          </div>
        </div>
        <LocaleSwitcher dark compact />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-night-900 lg:flex">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-night-900 shadow-2xl">
            <button className="absolute end-3 top-5 rounded-lg p-1 text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 glass border-b border-white/50 px-4">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="sm:hidden">
              <Link href="/app">
                <Logo size="sm" />
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300"
              >
                <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute end-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-up">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="text-sm font-bold text-slate-800">{t('notif.title')}</span>
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                        <CheckCheck className="h-3.5 w-3.5" />
                        {t('notif.markAll')}
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifs.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-slate-400">{t('notif.empty')}</p>
                      )}
                      {notifs.map((n) => (
                        <Link
                          key={n.id}
                          href={n.link || '/app'}
                          onClick={() => setNotifOpen(false)}
                          className={cn(
                            'flex gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50',
                            !n.read && 'bg-brand-50/40'
                          )}
                        >
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-200' : 'bg-brand-500')} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700">{n.title}</p>
                            {n.content && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.content}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:border-slate-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500 text-xs font-bold text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 sm:block">
                  {userName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                  <div className="absolute end-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-up">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
                      <p className="truncate text-xs text-slate-400">{userEmail}</p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/app/settings"
                        onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <Settings className="h-4 w-4" /> {t('nav.settings')}
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" /> {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>

        <footer className="px-4 pb-6 text-center text-xs text-slate-400">
          <span className="text-gradient font-semibold">Wassil</span> · {t('brand.tagline')}
        </footer>
      </div>
    </div>
  );
}