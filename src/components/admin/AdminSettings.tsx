'use client';

import * as React from 'react';
import { useLocale } from '@/lib/i18n';
import { Button, Input, Field, Toggle, Badge } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { Save, Globe, Building2, KeyRound } from 'lucide-react';

type Settings = Record<string, unknown>;

export default function AdminSettings() {
  const { t } = useLocale();
  const { push } = useToast();
  const [settings, setSettings] = React.useState<Settings>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings ?? {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        push({ tone: 'success', title: t('adm.setting.saved') });
      } else {
        push({ tone: 'error', title: t('common.error') });
      }
    } finally {
      setSaving(false);
    }
  }

  const get = (k: string, fallback = '') => (settings[k] as string) ?? fallback;
  const set = (k: string, v: unknown) => setSettings((prev) => ({ ...prev, [k]: v }));

  const defaultLang = get('defaultLang', 'fr');
  const platformName = get('platformName', 'Wassil');
  const showAi = settings['showAi'] !== false;
  const allowRegistrations = settings['allowRegistrations'] !== false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{t('adm.settings')}</h1>
          <p className="mt-1 text-sm text-slate-500">Configuration globale de la plateforme</p>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          <Save className="h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">{t('common.loading')}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Globe className="h-4 w-4 text-brand-500" />
              <h3 className="font-bold text-slate-800">Général</h3>
            </div>
            <Field label={t('adm.setting.platformName')}>
              <Input value={platformName} onChange={(e) => set('platformName', e.target.value)} />
            </Field>
            <Field label={t('adm.setting.defaultLang')} hint="Langue par défaut pour les nouveaux comptes">
              <select className="input" value={defaultLang} onChange={(e) => set('defaultLang', e.target.value)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Assistant IA</p>
                <p className="text-xs text-slate-400">Activer l'assistant IA pour les utilisateurs</p>
              </div>
              <Toggle checked={showAi} onChange={(v) => set('showAi', v)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Inscriptions</p>
                <p className="text-xs text-slate-400">Autoriser la création de nouveaux comptes</p>
              </div>
              <Toggle checked={allowRegistrations} onChange={(v) => set('allowRegistrations', v)} />
            </div>
          </div>

          <div className="card space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="h-4 w-4 text-accent-500" />
              <h3 className="font-bold text-slate-800">Informations</h3>
            </div>
            <div className="space-y-2 text-sm">
              <InfoRow label="Entreprises" value={String(settings['businessCount'] ?? '—')} />
              <InfoRow label="Version" value="1.0.0" />
            </div>
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-sm text-brand-700">
              Les identifiants d'intégration (WhatsApp, Telegram, SMTP, IA) sont gérés par des variables d'environnement côté serveur, jamais exposés dans l'interface d'administration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
      <span className="text-slate-500">{label}</span>
      <Badge tone="slate">{value}</Badge>
    </div>
  );
}
