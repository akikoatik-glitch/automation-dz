'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bot, CalendarDays, Users, Star, Zap, Repeat, MessageCircle, FileText, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const triggerIcons: Record<string, React.ElementType> = {
  MESSAGE_RECEIVED: MessageCircle,
  FORM_SUBMITTED: FileText,
  APPOINTMENT_CREATED: CalendarDays,
  APPOINTMENT_REMINDER: Bell,
  CUSTOMER_CREATED: Users,
  WEBHOOK: Zap,
  SCHEDULE: Repeat,
  MANUAL: Zap
};

const triggerColors: Record<string, string> = {
  MESSAGE_RECEIVED: 'from-emerald-400 to-brand-600',
  FORM_SUBMITTED: 'from-amber-400 to-orange-500',
  APPOINTMENT_CREATED: 'from-blue-400 to-indigo-500',
  APPOINTMENT_REMINDER: 'from-violet-400 to-purple-500',
  CUSTOMER_CREATED: 'from-pink-400 to-rose-500',
  WEBHOOK: 'from-cyan-400 to-blue-500',
  SCHEDULE: 'from-slate-400 to-zinc-500',
  MANUAL: 'from-teal-400 to-emerald-500'
};

export function AutomationToggle({
  id,
  name,
  description,
  enabled,
  runCount,
  triggerType,
  locale
}: {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  runCount: number;
  triggerType: string;
  locale: string;
}) {
  const router = useRouter();
  const [isOn, setIsOn] = React.useState(enabled);
  const [loading, setLoading] = React.useState(false);

  const Icon = triggerIcons[triggerType] || Bot;
  const gradient = triggerColors[triggerType] || 'from-emerald-400 to-brand-600';

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !isOn })
      });
      if (res.ok) {
        setIsOn(!isOn);
        router.refresh();
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/50">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800 truncate">{name}</p>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
            isOn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-slate-400 truncate max-w-md">{description}</p>
        )}
        {runCount > 0 && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            {runCount} runs
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={cn('auto-toggle shrink-0', isOn && 'active')}
        aria-label={`Toggle ${name}`}
      />
    </div>
  );
}
