'use client';

import * as React from 'react';
import { CheckCircle2, Send } from 'lucide-react';

export type PublicField = { key: string; label: string; required: boolean; type: string; options: string[] };

export default function PublicForm({
  businessName,
  formName,
  description,
  slug,
  fields
}: {
  businessName: string;
  formName: string;
  description: string | null;
  slug: string;
  fields: PublicField[];
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [err, setErr] = React.useState('');

  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const inputType = (f: PublicField) => (f.type === 'textarea' ? 'textarea' : f.type === 'tel' ? 'tel' : f.type === 'select' ? 'select' : f.type || 'text');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const missing = fields.filter((f) => f.required && !(f.key ? values[f.key] : '').trim());
    if (missing.length) {
      setErr(missing.map((m) => m.label).join(', '));
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/public/form/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (res.ok) setDone(true);
      else setErr((await res.json().catch(() => ({}))).message || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-3xl bg-white p-10 text-center shadow-xl">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-slate-800">Merci !</h2>
        <p className="mt-2 text-sm text-slate-500">{formName} · {businessName}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
      <div className="bg-gradient-to-br from-brand-600 to-teal-600 px-6 py-5 text-white">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">{businessName}</p>
        <h1 className="mt-1 text-lg font-extrabold">{formName}</h1>
        {description && <p className="mt-1 text-sm text-white/80">{description}</p>}
      </div>
      <form onSubmit={submit} className="space-y-4 p-6">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              {f.label} {f.required && <span className="text-red-400">*</span>}
            </label>
            {inputType(f) === 'textarea' ? (
              <textarea
                className="input min-h-[90px]"
                value={values[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                required={f.required}
              />
            ) : inputType(f) === 'select' ? (
              <select className="input" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                dir={f.type === 'tel' ? 'ltr' : undefined}
                type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
                value={values[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        ))}

        {err && <p className="text-xs text-red-500">Merci de remplir : {err}</p>}

        <button
          type="submit"
          disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4 rtl-flip" /> {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
}