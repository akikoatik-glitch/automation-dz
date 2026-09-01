'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Input, Select, Toggle, Modal, Field, Badge, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/app/PageHeader';
import {
  Settings as SettingsIcon, Building2, Users, KeyRound, CreditCard, Trash2, Plus, Copy, Check, Link as LinkIcon
} from 'lucide-react';

type Member = { id: string; role: string; user: { id: string; name: string; email: string; image: string | null } };
type ApiKey = { id: string; name: string; prefix: string; active: boolean; lastUsedAt: string | null; createdAt: string };
type Business = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  country: string;
  lang: string;
  status: string;
  plan: { id: string; code: string; name: string } | null;
  settings: Record<string, unknown>;
  limits: Record<string, unknown>;
};

const TABS = ['profile', 'members', 'api', 'plan'];

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const { push } = useToast();
  const [tab, setTab] = React.useState('profile');
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([]);
  const [me, setMe] = React.useState<{ id: string; name: string; email: string; lang: string; role: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [invite, setInvite] = React.useState({ email: '', name: '', role: 'MEMBER' });
  const [keyOpen, setKeyOpen] = React.useState(false);
  const [keyName, setKeyName] = React.useState('');
  const [newKey, setNewKey] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [removeKeyId, setRemoveKeyId] = React.useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setMembers(data.members ?? []);
        setApiKeys(data.apiKeys ?? []);
        setMe(data.me ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!business) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: business.name, industry: business.industry, lang: business.lang, settings: business.settings })
      });
      if (res.ok) {
        push({ tone: 'success', title: t('set.profileSaved') });
        void load();
      } else push({ tone: 'error', title: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  const inviteMember = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite)
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: data.error === 'already_member' ? t('set.alreadyMember') : t('common.error') });
        return;
      }
      push({ tone: 'success', title: t('set.memberAdded') });
      setInviteOpen(false);
      setInvite({ email: '', name: '', role: 'MEMBER' });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const createKey = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: keyName || 'API' }) });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: 'error', title: t('common.error') });
        return;
      }
      setNewKey(data.apiKey);
      setKeyName('');
      void load();
    } finally {
      setSaving(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const removeKey = async () => {
    if (!removeKeyId) return;
    await fetch(`/api/api-keys?id=${removeKeyId}`, { method: 'DELETE' });
    setRemoveKeyId(null);
    void load();
  };

  const removeMember = async () => {
    if (!removeMemberId) return;
    await fetch(`/api/settings/members?id=${removeMemberId}`, { method: 'DELETE' });
    setRemoveMemberId(null);
    void load();
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</p>;
  }

  const isAdmin = me?.role === 'OWNER' || me?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <PageHeader title={t('set.title')} subtitle={business?.name} icon={<SettingsIcon className="h-5 w-5" />} />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
              tab === tb ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'bg-white text-slate-500 hover:text-brand-600'
            )}
          >
            {tb === 'profile' && <Building2 className="h-4 w-4" />}
            {tb === 'members' && <Users className="h-4 w-4" />}
            {tb === 'api' && <KeyRound className="h-4 w-4" />}
            {tb === 'plan' && <CreditCard className="h-4 w-4" />}
            {t(`set.tab.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'profile' && business && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card space-y-3 p-5 lg:col-span-2">
            <h3 className="font-extrabold text-slate-800">{t('set.businessProfile')}</h3>
            <Field label={t('set.businessName')}>
              <Input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('set.industry')}>
                <Select value={business.industry ?? ''} onChange={(e) => setBusiness({ ...business, industry: e.target.value || null })}>
                  <option value="">—</option>
                  {['clinic', 'salon', 'restaurant', 'estate', 'ecommerce', 'service'].map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('set.defaultLang')}>
                <Select value={business.lang} onChange={(e) => setBusiness({ ...business, lang: e.target.value })}>
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </Select>
              </Field>
            </div>
            <Field label={t('common.notes')}>
              <Input
                value={String(business.settings?.about ?? '')}
                onChange={(e) => setBusiness({ ...business, settings: { ...business.settings, about: e.target.value } })}
              />
            </Field>
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving || !business.name.trim()}>{saving ? t('common.saving') : t('set.saveProfile')}</Button>
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <h3 className="font-extrabold text-slate-800">{t('set.plan')}</h3>
            <p className="text-sm text-slate-500">
              {business.plan?.name ?? t('set.noCurrentPlan')}
            </p>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <span className="text-slate-500">wassil.dz/{business.slug}</span>
              <Badge className="bg-emerald-50 text-emerald-600">{business.status}</Badge>
            </div>
            <Link href="/pricing" className="inline-flex text-xs font-semibold text-brand-600 hover:underline">
              {t('set.changePlan')} →
            </Link>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800">{t('set.members')}</h3>
            {isAdmin && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Plus className="h-4 w-4" /> {t('set.inviteMember')}
              </Button>
            )}
          </div>
          <p className="mb-4 text-xs text-slate-400">{t('set.memberRoleHint')}</p>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600">
                  {(m.user.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{m.user.name}</p>
                  <p className="truncate text-xs text-slate-400">{m.user.email}</p>
                </div>
                {m.user.id === me?.id && <Badge className="bg-slate-100 text-slate-400">{t('set.owner')}</Badge>}
                <Badge className={m.role === 'OWNER' ? 'bg-violet-50 text-violet-600' : m.role === 'ADMIN' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'}>
                  {t(`set.${m.role.toLowerCase()}`)}
                </Badge>
                {isAdmin && m.role !== 'OWNER' && (
                  <button onClick={() => setRemoveMemberId(m.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'api' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800">{t('set.apiKeys')}</h3>
              {isAdmin && (
                <Button size="sm" onClick={() => setKeyOpen(true)}>
                  <Plus className="h-4 w-4" /> {t('set.createKey')}
                </Button>
              )}
            </div>
            <p className="mb-4 text-xs text-slate-400">{t('set.apiKeysDesc')}</p>
            {apiKeys.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{t('common.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {apiKeys.map((k) => (
                  <li key={k.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
                    <KeyRound className="h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{k.name}</p>
                      <code className="font-mono text-[10px] text-slate-400" dir="ltr">{k.prefix}••••••••</code>
                    </div>
                    <Toggle checked={k.active} onChange={() => {}} disabled />
                    <button onClick={() => setRemoveKeyId(k.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h3 className="mt-1 font-extrabold text-slate-800">{t('set.webhooks')}</h3>
            <p className="mt-1 text-xs text-slate-400">{t('int.webhookDesc')}</p>
            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
              <LinkIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <code className="min-w-0 flex-1 truncate text-[11px] text-slate-500" dir="ltr">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/inbound` : '/api/webhooks/inbound'}
              </code>
              <button
                onClick={async () => {
                  try {
                    const text = `${window.location.origin}/api/webhooks/inbound`;
                    await navigator.clipboard.writeText(text);
                    push({ tone: 'success', title: t('common.copied') });
                  } catch {}
                }}
                className="text-slate-400 transition hover:text-brand-600"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              POST JSON → <code className="font-mono" dir="ltr">{'{ "type": "message_received", "channel": "webhook", "from": "+213…", "text": "…" }'}</code>
              <br />
              Auth : <code className="font-mono">Authorization: Bearer &lt;votre clé API&gt;</code>
            </p>
          </div>
        </div>
      )}

      {tab === 'plan' && (
        <div className="card p-5">
          <h3 className="font-extrabold text-slate-800">{t('set.plan')}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('set.planDesc')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge className="bg-brand-50 px-3 py-2 text-brand-700">{business?.plan?.name ?? t('set.noCurrentPlan')}</Badge>
            <Link href="/pricing">
              <Button variant="secondary" size="sm">{t('set.changePlan')}</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title={t('set.inviteMember')}>
        <div className="space-y-3">
          <Field label={t('set.memberName')}>
            <Input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          </Field>
          <Field label={t('set.memberEmail')}>
            <Input dir="ltr" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </Field>
          <Field label={t('set.memberRole')}>
            <Select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
              <option value="ADMIN">{t('set.admin')}</option>
              <option value="MEMBER">{t('set.member')}</option>
            </Select>
          </Field>
          <Button className="w-full" onClick={inviteMember} disabled={saving || !invite.email.trim()}>
            {saving ? t('common.saving') : t('set.inviteMember')}
          </Button>
        </div>
      </Modal>

      {/* Create key modal */}
      <Modal open={keyOpen} onClose={() => { setNewKey(''); setKeyOpen(false); }} title={t('set.createKey')}>
        <div className="space-y-3">
          {!newKey ? (
            <>
              <Field label={t('set.keyName')}>
                <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              </Field>
              <p className="text-xs text-slate-400">{t('set.keyUsage')}</p>
              <Button className="w-full" onClick={createKey} disabled={saving}>{saving ? t('common.saving') : t('set.createKey')}</Button>
            </>
          ) : (
            <>
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{t('set.keyCreated')}</p>
              <code className="block break-all rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700" dir="ltr">{newKey}</code>
              <Button className="w-full" onClick={copyKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('common.copied') : t('common.copy')}
              </Button>
              <p className="text-center text-[11px] text-slate-400">
                {t('set.webhooks')}: <code dir="ltr" className="font-mono">GET /api/messages · POST /api/messages · POST /api/webhooks/inbound</code>
              </p>
              <Button variant="ghost" className="w-full" onClick={() => { setNewKey(''); setKeyOpen(false); }}>{t('common.close')}</Button>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!removeKeyId} title={t('set.keyRemoveConfirm')} onConfirm={removeKey} onClose={() => setRemoveKeyId(null)} />
      <ConfirmDialog open={!!removeMemberId} title={t('set.memberRemoveConfirm')} onConfirm={removeMember} onClose={() => setRemoveMemberId(null)} />
    </div>
  );
}