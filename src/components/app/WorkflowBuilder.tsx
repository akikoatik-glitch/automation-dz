'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NODE_META } from '@/lib/engine/types';
import { Button, Input, Select, Modal, Field } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  ArrowLeft, Save, Play, Plus, Trash2, Check, Flag, Send, Sparkles as SparklesIcon,
  Bell, UserPlus, UserCog, CheckSquare, Calendar, CalendarDays, AlarmClock, Webhook, Clock, GitFork, Workflow,
  Bot, MessageCircle, Users, RefreshCw, Zap, Wand2, X
} from 'lucide-react';

type Node = { id: string; kind: string; label?: string; config: Record<string, unknown> };
type TriggerShape = {
  type: string;
  channels: string[];
  keywords: string[];
  formSlug?: string;
  dateField?: string;
  serviceField?: string;
  reminderDays: number;
  schedule?: string;
  sourceTag?: string;
};

const TRIGGER_OPTIONS = [
  { value: 'MESSAGE_RECEIVED', label: 'auto.trigger.message' },
  { value: 'FORM_SUBMITTED', label: 'auto.trigger.form' },
  { value: 'APPOINTMENT_CREATED', label: 'auto.trigger.appointment' },
  { value: 'APPOINTMENT_REMINDER', label: 'auto.trigger.reminder' },
  { value: 'CUSTOMER_CREATED', label: 'auto.trigger.customer' },
  { value: 'SCHEDULE', label: 'auto.trigger.schedule' },
  { value: 'WEBHOOK', label: 'auto.trigger.webhook' },
  { value: 'MANUAL', label: 'auto.trigger.manual' }
];

const CHANNELS = ['whatsapp', 'facebook', 'instagram', 'telegram', 'form', 'manual', 'all'];

const ICON_MAP: Record<string, React.ReactNode> = {
  send: <Send className="h-4 w-4" />,
  sparkles: <SparklesIcon className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
  userPlus: <UserPlus className="h-4 w-4" />,
  userCog: <UserCog className="h-4 w-4" />,
  checkSquare: <CheckSquare className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  alarmClock: <AlarmClock className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
  gitFork: <GitFork className="h-4 w-4" />,
  flag: <Flag className="h-4 w-4" />
};

const uid = () => 'n_' + Math.random().toString(36).slice(2, 10);

function defaultNode(kind: string): Node {
  return { id: uid(), kind, label: undefined, config: { ...(NODE_META[kind]?.defaultConfig ?? {}) } };
}

export default function WorkflowBuilder() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const { push } = useToast();

  const id = params.get('id');
  const [loading, setLoading] = React.useState(Boolean(id && id !== 'new'));
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [trigger, setTrigger] = React.useState<TriggerShape>({
    type: 'MESSAGE_RECEIVED',
    channels: ['whatsapp'],
    keywords: [],
    reminderDays: 1
  });
  const [nodes, setNodes] = React.useState<Node[]>([defaultNode('TRIGGER'), defaultNode('REPLY'), defaultNode('END')]);
  const [selected, setSelected] = React.useState<string | null>(nodes[0].id);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);
  const [testMsg, setTestMsg] = React.useState('');
  const [result, setResult] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [keywordDraft, setKeywordDraft] = React.useState('');
  const [mode, setMode] = React.useState<'simple' | 'advanced'>('simple');
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [copilotApplied, setCopilotApplied] = React.useState(false);

  React.useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/automations/${id}`);
        if (res.ok) {
          const data = await res.json();
          const a = data.automation;
          setName(a.name || '');
          setDescription(a.description || '');
          const tr = a.trigger || {};
          setTrigger({
            type: a.triggerType || 'MESSAGE_RECEIVED',
            channels: Array.isArray(tr.channels) ? tr.channels : ['whatsapp'],
            keywords: Array.isArray(tr.keywords) ? tr.keywords : [],
            formSlug: tr.formSlug,
            dateField: tr.dateField,
            serviceField: tr.serviceField,
            reminderDays: Number(tr.reminderDays || 1),
            schedule: tr.schedule,
            sourceTag: tr.sourceTag
          });
          let ns: Node[] = [];
          try {
            ns = JSON.parse(a.nodes) || [];
          } catch {}
          if (ns.length) {
            setNodes(ns);
            setSelected(ns[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function addNodesOf(kind: string) {
    const node = defaultNode(kind);
    const insertAt = nodes.length - 1 >= 0 ? nodes.length - 1 : nodes.length;
    setNodes((prev) => {
      const copy = [...prev];
      copy.splice(insertAt, 0, node);
      return copy;
    });
    setSelected(node.id);
  }

  function removeNode(nodeId: string) {
    if (nodeId === nodes[0]?.id) return; // keep TRIGGER head
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== nodeId);
      // ensure chain terminates with an END node
      if (next[next.length - 1]?.kind !== 'END') next.push(defaultNode('END'));
      return next;
    });
    setSelected(null);
  }

  function updateNodeConfig(nodeId: string, patch: Record<string, unknown>) {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, config: { ...n.config, ...patch } } : n)));
  }

  function updateTriggerPatch(patch: Partial<TriggerShape>) {
    setTrigger((prev) => ({ ...prev, ...patch }));
  }

  async function save(enable = false) {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { name, description, trigger, nodes, enabled: enable };
      const url = id && id !== 'new' ? `/api/automations/${id}?action=save` : '/api/automations';
      const method = id && id !== 'new' ? 'POST' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.message || t('common.error') });
        return;
      }
      if (!id || id === 'new') {
        router.replace(`/app/automations/builder?id=${data.automation.id}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    if (!id || id === 'new') {
      push({ tone: 'error', title: t('common.save') + ' !' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/automations/${id}?action=run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: testMsg || 'Salam, est-ce disponible ?', channel: 'whatsapp' })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setResult(
          (data.result.steps ?? [])
            .map((s: { kind?: string; status?: string; detail?: string }) => `${s.kind} → ${s.status}${s.detail ? ` (${s.detail})` : ''}`)
            .join('\n')
        );
      } else {
        setResult(data.message || 'error');
      }
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>;
  }

  const palette = Object.entries(NODE_META).filter(([k]) => k !== 'TRIGGER' && k !== 'END');
  const selectedNode = nodes.find((n) => n.id === selected);

  const isNew = !id || id === 'new';

  return (
    <div className="space-y-4">
      {isNew && (
        <div className="card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-bold text-slate-800">
              <SparklesIcon className="h-4 w-4 text-brand-500" />
              {t('builder.notTechnical')}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{t('builder.notTechnicalDesc')}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/app/templates" className="btn btn-secondary !py-2 !text-xs">
              {t('auto.fromTemplate')}
            </Link>
            <Link href="/app/ai" className="btn btn-primary btn-premium !py-2 !text-xs">
              <SparklesIcon className="h-3.5 w-3.5" /> {t('builder.askAi')}
            </Link>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/app/automations" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-brand-600">
            <ArrowLeft className="h-4 w-4 rtl-flip" />
          </Link>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auto.namePlaceholder')}
              className="w-full bg-transparent text-lg font-extrabold text-slate-800 outline-none placeholder:font-semibold placeholder:text-slate-300 lg:w-80"
            />
            <p className="text-xs text-slate-400">{t('builder.flow')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setMode('simple')}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', mode === 'simple' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:text-slate-700')}
            >
              {t('sm.simpleMode')}
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', mode === 'advanced' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-700')}
            >
              <span className="inline-flex items-center gap-1.5">
                {t('sm.advancedMode')}
              </span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> {t('builder.saved')}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setTestOpen(true)} disabled={!id || id === 'new'}>
            <Play className="h-3.5 w-3.5" /> {t('auto.testRun')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCopilotOpen(true)}>
            <SparklesIcon className="h-3.5 w-3.5" /> {t('builder.copilot')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => save(false)} disabled={saving || !name.trim()}>
            <Save className="h-3.5 w-3.5" /> {saving ? t('common.saving') : t('common.save')}
          </Button>
          <Button size="sm" onClick={() => save(true)} disabled={saving || !name.trim()}>
            <Workflow className="h-3.5 w-3.5" /> {t('builder.publish')}
          </Button>
        </div>
      </div>

      {mode === 'simple' ? (
        <SimpleBuilderView
          name={name}
          description={description}
          trigger={trigger}
          nodes={nodes}
          onChangeName={setName}
          onChangeDescription={setDescription}
          onEditAdvanced={() => setMode('advanced')}
          onOpenCopilot={() => setCopilotOpen(true)}
        />
      ) : (
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Trigger + palette */}
        <div className="space-y-4">
          {/* Trigger */}
          <div className="card p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{t('builder.triggerNode')}</p>
            <Field label={t('builder.triggerType')}>
              <Select value={trigger.type} onChange={(e) => updateTriggerPatch({ type: e.target.value })}>
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.label)}</option>
                ))}
              </Select>
            </Field>

            {(trigger.type === 'MESSAGE_RECEIVED' || trigger.type === 'CUSTOMER_CREATED') && (
              <div className="mt-3">
                <p className="label">{t('auto.triggerConfig.channels')}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => {
                        const has = trigger.channels.includes(ch);
                        updateTriggerPatch({
                          channels: ch === 'all' ? ['all'] : has ? trigger.channels.filter((c) => c !== ch) : [...trigger.channels.filter((c) => c !== 'all'), ch]
                        });
                      }}
                      className={cn(
                        'pill transition',
                        trigger.channels.includes(ch) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">{t('auto.triggerConfig.channelHint')}</p>
              </div>
            )}

            {trigger.type === 'MESSAGE_RECEIVED' && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1.5">
                  <Input
                    value={keywordDraft}
                    onChange={(e) => setKeywordDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && keywordDraft.trim()) {
                        updateTriggerPatch({ keywords: [...trigger.keywords, keywordDraft.trim()] });
                        setKeywordDraft('');
                      }
                    }}
                    placeholder={t('auto.triggerConfig.keywords')}
                    className="!py-1.5 !text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (keywordDraft.trim()) {
                        updateTriggerPatch({ keywords: [...trigger.keywords, keywordDraft.trim()] });
                        setKeywordDraft('');
                      }
                    }}
                  >
                    +{/* add */}
                  </Button>
                </div>
                {trigger.keywords.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600">
                    {k}
                    <button onClick={() => updateTriggerPatch({ keywords: trigger.keywords.filter((x) => x !== k) })}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {trigger.type === 'FORM_SUBMITTED' && (
              <div className="mt-3 space-y-2">
                <Field label={t('auto.triggerConfig.form')}>
                  <Input value={trigger.formSlug || ''} onChange={(e) => updateTriggerPatch({ formSlug: e.target.value })} placeholder="slug du formulaire (ou laisser vide)" />
                </Field>
                <Field label={t('builder.field')}>
                  <Input value={trigger.dateField || ''} onChange={(e) => updateTriggerPatch({ dateField: e.target.value })} placeholder="date" />
                </Field>
              </div>
            )}

            {trigger.type === 'APPOINTMENT_REMINDER' && (
              <div className="mt-3">
                <Field label={t('auto.triggerConfig.daysBefore')}>
                  <Input type="number" min={0} value={trigger.reminderDays} onChange={(e) => updateTriggerPatch({ reminderDays: Number(e.target.value) })} />
                </Field>
              </div>
            )}

            {trigger.type === 'SCHEDULE' && (
              <div className="mt-3">
                <Field label={t('auto.triggerConfig.schedule')}>
                  <Input value={trigger.schedule || ''} onChange={(e) => updateTriggerPatch({ schedule: e.target.value })} placeholder="*/15 * * * *" />
                </Field>
              </div>
            )}

            {trigger.type === 'WEBHOOK' && (
              <div className="mt-3">
                <Field label="Source tag">
                  <Input value={trigger.sourceTag || ''} onChange={(e) => updateTriggerPatch({ sourceTag: e.target.value })} placeholder="webhook" />
                </Field>
              </div>
            )}
          </div>

          {/* Palette */}
          <div className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t('builder.palette')}</p>
            <div className="space-y-1">
              {palette.map(([kind, meta]) => (
                <button
                  key={kind}
                  onClick={() => addNodesOf(kind)}
                  className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 text-start text-sm text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: meta.color }}>
                    {ICON_MAP[meta.icon] || <Workflow className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t(meta.labelKey)}</span>
                    <span className="block truncate text-[11px] text-slate-400">{t(meta.descKey)}</span>
                  </span>
                  <Plus className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="space-y-3">
          <div className="relative mx-auto max-w-2xl">
            {nodes.map((n, idx) => {
              const meta = NODE_META[n.kind];
              const isSelected = selected === n.id;
              const isFirst = idx === 0;
              const isEnd = n.kind === 'END';
              return (
                <div key={n.id}>
                  <div
                    className={cn(
                      'group relative rounded-2xl border bg-white shadow-sm transition-all',
                      isSelected ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300',
                      isEnd && 'border-dashed border-slate-300 bg-slate-50/50'
                    )}
                    onClick={() => setSelected(n.id)}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: meta?.color || '#64748b' }}>
                        {ICON_MAP[meta?.icon || ''] || <Workflow className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-bold text-slate-700">
                          <span className="text-[10px] font-bold text-slate-300">#{idx + 1}</span>
                          {t(meta?.labelKey || n.kind)}
                          {isEnd && <Flag className="h-3.5 w-3.5 text-slate-400" />}
                        </span>
                        <span className="block truncate text-xs text-slate-400">{t(meta?.descKey || '')}</span>
                      </span>
                      {!isFirst && !isEnd && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNode(n.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {isSelected && (
                      <div className="border-t border-slate-100 p-3.5">
                        <NodeConfig node={n} tKey={t} onChange={(patch) => updateNodeConfig(n.id, patch)} />
                      </div>
                    )}
                  </div>

                  {/* connector */}
                  {idx < nodes.length - 1 && (
                    <div className="relative mx-auto h-7 w-0.5 bg-gradient-to-b from-slate-300 to-brand-200">
                      <span className="absolute -left-[3px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-300" />
                    </div>
                  )}
                </div>
              );
            })}

            <p className="mt-3 text-center text-[11px] text-slate-400">{t('builder.variableHint')}</p>
          </div>
        </div>
      </div>
      )}

      {/* AI Copilot dialog */}
      {copilotOpen && (
        <CopilotPanel
          current={{ name, description, triggerType: trigger.type, triggerConfig: trigger, nodes }}
          onClose={() => setCopilotOpen(false)}
          onApply={(a) => {
            setName(a.name || name);
            setDescription(a.description || description);
            if (a.nodes && a.nodes.length) {
              setNodes([...a.nodes, defaultNode('END')]);
              setSelected(a.nodes[0].id);
            }
            if (a.triggerType) updateTriggerPatch({ type: a.triggerType });
            setCopilotApplied(true);
          }}
        />
      )}

      {/* Test modal */}
      <Modal open={testOpen} onClose={() => setTestOpen(false)} title={t('auto.testRun')}>
        <div className="space-y-3">
          <textarea className="input min-h-[90px]" placeholder="Salam, est-ce disponible ?" value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
          <Button onClick={runTest} disabled={testing} className="w-full">
            {testing ? t('common.testing') : t('common.run')}
          </Button>
          {result && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600">{result}</pre>
            </div>
          )}
          <p className="text-[11px] text-slate-400">{t('auto.disabledNote')} — {t('builder.node.replyDesc')}.</p>
        </div>
      </Modal>
    </div>
  );
}

function NodeConfig({ node, tKey, onChange }: { node: Node; tKey: (key: string) => string; onChange: (patch: Record<string, unknown>) => void }) {
  const conf = node.config ?? {};
  const set = (k: string, v: unknown) => onChange({ [k]: v });

  switch (node.kind) {
    case 'REPLY':
      return (
        <Field label={tKey('builder.msgText')}>
          <textarea
            className="input min-h-[80px]"
            value={String(conf.text ?? '')}
            onChange={(e) => set('text', e.target.value)}
          />
        </Field>
      );
    case 'AI_REPLY':
      return (
        <Field label={tKey('builder.msgText')}>
          <textarea className="input min-h-[70px]" value={String(conf.prompt ?? '')} onChange={(e) => set('prompt', e.target.value)} />
        </Field>
      );
    case 'NOTIFY':
      return (
        <div className="space-y-2">
          <Select value={String(conf.to ?? 'all')} onChange={(e) => set('to', e.target.value)}>
            <option value="all">{tKey('builder.notifyAll')}</option>
            <option value="owner">{tKey('builder.notifyOwner')}</option>
          </Select>
          <textarea className="input min-h-[70px]" value={String(conf.text ?? '')} onChange={(e) => set('text', e.target.value)} />
        </div>
      );
    case 'CREATE_CUSTOMER':
    case 'UPDATE_CUSTOMER':
      return (
        <Select value={String(conf.status ?? 'contacted')} onChange={(e) => set('status', e.target.value)}>
          {['new', 'contacted', 'qualified', 'client'].map((s) => (
            <option key={s} value={s}>Status: {s}</option>
          ))}
        </Select>
      );
    case 'CREATE_TASK':
      return (
        <Field label={tKey('builder.taskTitle')}>
          <Input value={String(conf.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
      );
    case 'CREATE_APPOINTMENT':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label={tKey('appt.service')}>
            <Input value={String(conf.service ?? '')} onChange={(e) => set('service', e.target.value)} />
          </Field>
          <Field label={tKey('builder.reminderAt')}>
            <Input type="number" min={1} value={String(conf.hoursFromNow ?? 24)} onChange={(e) => set('hoursFromNow', Number(e.target.value))} />
          </Field>
        </div>
      );
    case 'SCHEDULE_REMINDER':
      return (
        <div className="space-y-2">
          <Field label={`${tKey('builder.reminderAt')} (${tKey('builder.reminderUnit')})`}>
            <Input type="number" min={1} value={String(conf.hours ?? 24)} onChange={(e) => set('hours', Number(e.target.value))} />
          </Field>
          <textarea className="input min-h-[70px]" value={String(conf.text ?? '')} onChange={(e) => set('text', e.target.value)} />
        </div>
      );
    case 'WEBHOOK_CALL':
      return (
        <div className="space-y-2">
          <Field label="URL">
            <Input value={String(conf.url ?? '')} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Payload (JSON)">
            <textarea className="input min-h-[60px]" value={String(conf.payload ?? '')} onChange={(e) => set('payload', e.target.value)} />
          </Field>
        </div>
      );
    case 'DELAY':
      return (
        <Field label={tKey('builder.durationHours')}>
          <Input type="number" min={0} value={String(conf.hours ?? 24)} onChange={(e) => set('hours', Number(e.target.value))} />
        </Field>
      );
    case 'CONDITION':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label={tKey('builder.field')}>
            <Select value={String(conf.field ?? 'messageText')} onChange={(e) => set('field', e.target.value)}>
              <option value="messageText">message</option>
              <option value="customer_name">{tKey('cust.lastContact')}</option>
              <option value="fields.phone">phone</option>
            </Select>
          </Field>
          <Field label={tKey('builder.operator')}>
            <Select value={String(conf.op ?? 'contains')} onChange={(e) => set('op', e.target.value)}>
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              <option value="notEquals">notEquals</option>
              <option value="greaterThan">&gt;</option>
              <option value="lessThan">&lt;</option>
            </Select>
          </Field>
          <Field label={tKey('builder.value')} className="col-span-2">
            <Input value={String(conf.value ?? '')} onChange={(e) => set('value', e.target.value)} />
          </Field>
        </div>
      );
    default:
      return <p className="text-xs text-slate-400">{tKey('builder.selectNode')}</p>;
  }
}
// ---------------------------------------------------------------------------
// SIMPLE MODE � friendly, non-technical overview of the automation
// ---------------------------------------------------------------------------
function SimpleBuilderView({
  name, description, trigger, nodes, onChangeName, onChangeDescription, onEditAdvanced, onOpenCopilot
}: {
  name: string;
  description: string;
  trigger: TriggerShape;
  nodes: Node[];
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onEditAdvanced: () => void;
  onOpenCopilot: () => void;
}) {
  const { t } = useLocale();
  const actions = nodes.filter((n) => n.kind !== 'TRIGGER' && n.kind !== 'END');

  const friendlyTrigger: Record<string, string> = {
    MESSAGE_RECEIVED: 'sm.trig.message',
    FORM_SUBMITTED: 'sm.trig.form',
    APPOINTMENT_CREATED: 'sm.trig.appointment',
    APPOINTMENT_REMINDER: 'sm.trig.reminder',
    CUSTOMER_CREATED: 'sm.trig.customer',
    SCHEDULE: 'sm.trig.schedule',
    WEBHOOK: 'sm.trig.webhook',
    MANUAL: 'sm.trig.manual'
  };

  return (
    <div className="animate-fade-up">
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <label className="label">{t('sm.automationName')}</label>
            <input
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder={t('auto.namePlaceholder')}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-extrabold text-slate-800 outline-none focus:border-brand-400"
            />
            <label className="label">{t('sm.automationDesc')}</label>
            <textarea
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder={t('auto.descPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-brand-400"
              rows={2}
            />
          </div>

          {/* Visual steps */}
          <div className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
              <Wand2 className="h-5 w-5 text-brand-500" /> {t('sm.howItWorks')}
            </h3>
            <p className="mb-4 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <span className="text-lg">??</span> {t(friendlyTrigger[trigger.type] || 'sm.trig.message')}
            </p>
            <div>
              {actions.length === 0 && <p className="text-sm text-slate-400">{t('sm.noStepsYet')}</p>}
              {actions.map((n, i) => (
                <React.Fragment key={n.id}>
                  <SimpleStepRow kind={n.kind} config={n.config} />
                  {i < actions.length - 1 && (
                    <div className="relative mx-auto h-6 w-0.5 bg-gradient-to-b from-brand-300 to-brand-200">
                      <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand-400" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right: helpers */}
        <div className="space-y-4">
          <div className="card overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-800">{t('builder.copilot')}</h3>
                <p className="text-xs text-slate-400">{t('builder.copilotDesc')}</p>
              </div>
            </div>
            <button onClick={onOpenCopilot} className="btn btn-primary btn-premium mt-4 w-full !py-2.5 !text-sm">
              <SparklesIcon className="h-4 w-4" /> {t('sm.askAiToChange')}
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-bold text-slate-800">{t('sm.advancedTitle')}</h3>
            <p className="mb-4 text-sm text-slate-500">{t('sm.advancedDesc')}</p>
            <button onClick={onEditAdvanced} className="btn btn-secondary w-full !py-2.5 !text-sm">
              <Workflow className="h-4 w-4" /> {t('sm.openAdvanced')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleStepRow({ kind, config }: { kind: string; config: Record<string, unknown> }) {
  const { t } = useLocale();
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
    REPLY: <MessageCircle className="h-5 w-5" />,
    AI_REPLY: <SparklesIcon className="h-5 w-5" />,
    NOTIFY: <Bell className="h-5 w-5" />,
    CREATE_CUSTOMER: <UserPlus className="h-5 w-5" />,
    UPDATE_CUSTOMER: <Users className="h-5 w-5" />,
    CREATE_TASK: <Check className="h-5 w-5" />,
    CREATE_APPOINTMENT: <CalendarDays className="h-5 w-5" />,
    SCHEDULE_REMINDER: <Clock className="h-5 w-5" />,
    DELAY: <RefreshCw className="h-5 w-5" />,
    CONDITION: <GitFork className="h-5 w-5" />,
    WEBHOOK_CALL: <Webhook className="h-5 w-5" />
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
  let detail = '';
  const text = config.text || config.prompt || config.title || '';
  if (typeof text === 'string' && text.length) detail = text.length > 60 ? text.slice(0, 60) + '�' : text;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3.5">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', colors[kind] || 'from-brand-400 to-brand-600')}>
        {icons[kind] || <Zap className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">{t(friendly[kind] || 'sm.step.auto')}</p>
        {detail && <p className="truncate text-xs text-slate-400">{detail}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Copilot � create or modify the automation by chatting
// ---------------------------------------------------------------------------
type CopilotTurn = { role: 'user' | 'assistant'; content: string };
type CopilotAutomation = {
  name?: string;
  description?: string;
  triggerType?: string;
  triggerConfig?: Record<string, unknown>;
  nodes?: Array<{ id: string; kind: string; label?: string; config: Record<string, unknown> }>;
};

const COPILOT_SUGGESTIONS = ['copilot.sug1', 'copilot.sug2', 'copilot.sug3'];

function CopilotPanel({
  current,
  onClose,
  onApply
}: {
  current: { name: string; description: string; triggerType: string; triggerConfig: Record<string, unknown>; nodes: Node[] };
  onClose: () => void;
  onApply: (a: CopilotAutomation) => void;
}) {
  const { t } = useLocale();
  const [history, setHistory] = React.useState<CopilotTurn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ready: boolean; message?: string }>({ ready: false });
  const chatRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, busy]);

  const send = async (content?: string) => {
    const msg = content ?? draft;
    if (!msg.trim() || busy) return;
    const next: CopilotTurn[] = [...history, { role: 'user', content: msg }];
    setHistory(next);
    setDraft('');
    setBusy(true);
    setResult({ ready: false });
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: next,
          current: { name: current.name, description: current.description, triggerType: current.triggerType, triggerConfig: current.triggerConfig, nodes: current.nodes }
        })
      });
      const data = await res.json();
      if (res.ok && data.automation) {
        setHistory((prev) => [...prev, { role: 'assistant', content: data.message || t('copilot.ready') }]);
        setResult({ ready: true, message: data.message });
      } else if (res.ok) {
        setHistory((prev) => [...prev, { role: 'assistant', content: data.message || t('copilot.help') }]);
        setResult({ ready: false, message: data.message });
      } else {
        setHistory((prev) => [...prev, { role: 'assistant', content: t('common.error') }]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 end-0 flex h-[80vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl lg:bottom-6 lg:end-6 lg:h-[70vh] lg:rounded-3xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md animate-float-3d">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800">{t('builder.copilot')}</h3>
              <p className="text-xs text-slate-400">{t('builder.copilotDesc')}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg animate-float-3d">
                <SparklesIcon className="h-7 w-7" />
              </div>
              <p className="text-sm text-slate-500">{t('copilot.intro')}</p>
              <div className="mt-2 flex flex-col gap-2">
                {COPILOT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(t(s))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-start text-sm text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.map((h, i) => (
            <div key={i} className={h.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <p className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm',
                h.role === 'user' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-sm'
              )}>
                {h.content}
              </p>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
              {t('ai.generating')}
            </div>
          )}
        </div>

        {/* Apply banner */}
        {result.ready && (
          <div className="border-t border-brand-100 bg-brand-50 px-5 py-3">
            <p className="mb-2 text-xs font-medium text-brand-700">
              <span className="me-1">?</span>{result.message || t('copilot.ready')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (result.message) setHistory((prev) => [...prev, { role: 'assistant', content: t('copilot.applied') }]);
                  onClose();
                }}
                className="btn btn-primary btn-premium !py-2 !text-xs"
              >
                <Check className="h-3.5 w-3.5" /> {t('copilot.apply')}
              </button>
              <button
                onClick={() => setResult({ ready: false })}
                className="btn btn-ghost !py-2 !text-xs"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              placeholder={t('copilot.placeholder')}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <button onClick={() => void send()} disabled={busy || !draft.trim()} className="btn btn-primary !px-3">
              <Send className="h-4 w-4 rtl-flip" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
