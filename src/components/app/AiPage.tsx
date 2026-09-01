'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { Button, Field } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import { Sparkles, Send, ArrowRight, Workflow, Bot } from 'lucide-react';

type Turn = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = ['ai.openSuggest1', 'ai.openSuggest2', 'ai.openSuggest3'];

export default function AiPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [desc, setDesc] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [finalName, setFinalName] = React.useState('');
  const [history, setHistory] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const generate = async () => {
    if (!desc.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, language: locale })
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message || t('common.error') });
        return;
      }
      const a = data.automation;
      const created = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: a.name,
          description: a.description,
          trigger: { type: a.triggerType, ...(a.triggerConfig || {}) },
          nodes: a.nodes,
          aiGenerated: true
        })
      });
      const data2 = await created.json();
      if (!created.ok) {
        push({ tone: 'error', title: data2.message || t('common.error') });
        return;
      }
      setFinalName(data2.automation.name);
      push({ tone: 'success', title: t('ai.generated') });
      setTimeout(() => {
        window.location.href = `/app/automations/builder?id=${data2.automation.id}`;
      }, 900);
    } finally {
      setGenerating(false);
    }
  };

  const send = async (content?: string) => {
    const msg = content ?? draft;
    if (!msg.trim() || sending) return;
    const next: Turn[] = [...history, { role: 'user', content: msg }];
    setHistory(next);
    setDraft('');
    setSending(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: next })
      });
      const data = await res.json();
      if (res.ok) setHistory((prev) => [...prev, { role: 'assistant', content: data.content }]);
      else push({ tone: 'error', title: t('common.error') });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')} />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Generator */}
        <section className="card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-extrabold text-slate-800">{t('ai.generator')}</h2>
              <p className="text-xs text-slate-400">{t('ai.generatorDesc')}</p>
            </div>
          </div>

          <textarea
            className="input mt-4 min-h-[120px] flex-1"
            placeholder={`${t('ai.generatorPlaceholder')}\n…`}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <span
                key={s}
                onClick={() => setDesc(t(s))}
                className="cursor-pointer rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-600 transition hover:bg-violet-100"
              >
                {t(s)}
              </span>
            ))}
          </div>
          <Button className="mt-4" onClick={generate} disabled={generating || !desc.trim()}>
            {generating ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {t('ai.generating')}</> : <>{t('ai.generate')} <ArrowRight className="h-4 w-4 rtl-flip" /></>}
          </Button>
          {finalName && (
            <p className="mt-3 text-xs text-emerald-600">
              <Workflow className="mr-1 inline h-3.5 w-3.5" />
              {finalName} — {t('ai.savedWorkflow')}
            </p>
          )}
        </section>

        {/* Assistant chat */}
        <section className="card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-extrabold text-slate-800">{t('ai.assistant')}</h2>
              <p className="text-xs text-slate-400">{t('ai.assistantDesc')}</p>
            </div>
          </div>

          <div className="mt-4 flex min-h-[240px] flex-1 flex-col gap-2 overflow-y-auto rounded-xl bg-slate-50/70 p-3">
            {history.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <Bot className="h-8 w-8 text-slate-200" />
                <p className="text-xs text-slate-400">{t('ai.chatPlaceholder')}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => void send(t(s))} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm transition hover:text-brand-600">
                      {t(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {history.map((h, i) => (
              <div key={i} className={h.role === 'user' ? 'self-end' : 'self-start'}>
                <p className={[
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                  h.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 shadow-sm'
                ].join(' ')}>
                  {h.content}
                </p>
              </div>
            ))}
            {sending && <p className="self-start text-xs text-slate-400">{t('ai.chatSending')}</p>}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Field className="flex-1">
              <input
                className="input"
                placeholder={t('ai.chatPlaceholder')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void send();
                }}
              />
            </Field>
            <Button variant="secondary" onClick={() => void send()} disabled={sending || !draft.trim()}>
              <Send className="h-4 w-4 rtl-flip" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}