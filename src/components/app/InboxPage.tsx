'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  Search,
  Send,
  MessageCircle,
  Sparkles,
  Phone,
  Mail,
  RefreshCw,
  Inbox as InboxIcon,
  Check,
  X
} from 'lucide-react';

type ConvListItem = {
  id: string;
  channel: string;
  title: string | null;
  unreadCount: number;
  status: string;
  lastMessageAt: string | null;
  customer: { id: string; name: string; phone: string | null; status: string } | null;
  messages: Array<{ id: string; content: string; direction: string; createdAt: string }>;
};

type Msg = { id: string; direction: string; sender: string | null; content: string; channel?: string; status?: string; createdAt: string };

const CHANNEL_DOT: Record<string, string> = {
  whatsapp: 'bg-emerald-500',
  telegram: 'bg-sky-500',
  facebook: 'bg-blue-500',
  instagram: 'bg-pink-500',
  form: 'bg-violet-500',
  manual: 'bg-slate-400',
  web: 'bg-amber-500',
  webhook: 'bg-cyan-500'
};

function timeFmt(iso: string | null, locale: string) {
  if (!iso) return '';
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale, { hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return '';
  }
}

export default function InboxPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [convs, setConvs] = React.useState<ConvListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [thread, setThread] = React.useState<Msg[]>([]);
  const [convTitle, setConvTitle] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [suggesting, setSuggesting] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [mobileThread, setMobileThread] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setConvs(data.conversations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConv(id: string) {
    setSelected(id);
    setMobileThread(true);
    setThread([]);
    setSuggestion(null);
    const res = await fetch(`/api/messages/${id}`);
    if (res.ok) {
      const data = await res.json();
      setThread(data.messages ?? []);
      setConvTitle(data.conversation?.title ?? '');
      setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
      router.refresh();
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || !selected) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected, content })
      });
      const data = await res.json();
      if (res.ok) {
        setDraft('');
        setThread((prev) => [...prev, data.message]);
        if (!data.sent) {
          push({ tone: 'error', title: t('common.error'), desc: data.reason || t('int.notConfigured') });
        }
        load();
      } else {
        push({ tone: 'error', title: t('common.error'), desc: data.message || '' });
      }
    } finally {
      setSending(false);
    }
  }

  async function suggest() {
    const lastIn = [...thread].reverse().find((m) => m.direction === 'in');
    if (!lastIn) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incoming: lastIn.content })
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestion(data.text);
        setDraft(data.text);
      }
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('inbox.title')} subtitle={t('inbox.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="card overflow-hidden lg:h-[calc(100vh-220px)]">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                placeholder={t('inbox.searchPlaceholder')}
                className="input w-full !ps-9"
              />
            </div>
          </div>
          <div className="h-[calc(100%-57px)] overflow-y-auto">
            {loading && <p className="px-4 py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>}
            {!loading && convs.length === 0 && (
              <div className="px-4 py-10 text-center">
                <InboxIcon className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-500">{t('inbox.empty')}</p>
                <p className="mt-1 text-xs text-slate-400">{t('inbox.emptyDesc')}</p>
              </div>
            )}
            {convs.map((c) => (
              <button
                key={c.id}
                onClick={() => openConv(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-start transition hover:bg-slate-50',
                  selected === c.id && 'bg-brand-50/60'
                )}
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                  {(c.title || '?').slice(0, 1).toUpperCase()}
                  <span className={cn('absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white', CHANNEL_DOT[c.channel] || 'bg-slate-300')} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-700">{c.title || '—'}</p>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeFmt(c.lastMessageAt, locale)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-slate-400">
                      {c.messages[0] ? (c.messages[0].direction === 'out' ? `${t('inbox.out')}: ` : '') + c.messages[0].content : ''}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="flex h-4.5 min-w-4.5 h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="card overflow-hidden lg:h-[calc(100vh-220px)]">
          {!selected || !mobileThread ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                <MessageCircle className="h-7 w-7" />
              </div>
              <p className="mt-4 font-bold text-slate-700">{t('inbox.noThread')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('inbox.noThreadDesc')}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <button className="lg:hidden" onClick={() => setMobileThread(false)}>
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                  <div>
                    <p className="font-bold text-slate-800">{convTitle}</p>
                    <p className="text-xs text-slate-400">
                      {convs.find((c) => c.id === selected)?.channel}
                      {convs.find((c) => c.id === selected)?.customer?.phone && (
                        <> · {convs.find((c) => c.id === selected)?.customer?.phone}</>
                      )}
                    </p>
                  </div>
                </div>
                <button onClick={load} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="h-[calc(100vh-340px)] min-h-[240px] space-y-2 overflow-y-auto bg-slate-50/50 px-4 py-4">
                {thread.map((m) => (
                  <div key={m.id} className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                        m.direction === 'out' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={cn('mt-1 text-[10px]', m.direction === 'out' ? 'text-brand-200' : 'text-slate-400')}>
                        {m.status === 'failed' && (
                          <span className="me-1 inline-flex items-center gap-0.5 text-orange-400">
                            <X className="h-2.5 w-2.5" /> {t('common.error')}
                          </span>
                        )}
                        {timeFmt(m.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                ))}
                {thread.length === 0 && <p className="py-8 text-center text-sm text-slate-400">{t('common.empty')}</p>}
              </div>

              <div className="space-y-2 border-t border-slate-100 p-3">
                {suggestion && (
                  <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-brand-700">{t('inbox.suggestReply')}</p>
                      <p className="text-sm text-slate-600">{suggestion}</p>
                    </div>
                    <button onClick={() => setSuggestion(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={suggest} disabled={suggesting} className="shrink-0">
                    <Sparkles className="h-3.5 w-3.5" /> {t('inbox.suggestReply')}
                  </Button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t('inbox.writeMessage')}
                  rows={2}
                  className="input w-full resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">{t('inbox.replyAs')}</p>
                  <Button size="sm" onClick={send} disabled={sending || !draft.trim()}>
                    {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {t('common.send')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}