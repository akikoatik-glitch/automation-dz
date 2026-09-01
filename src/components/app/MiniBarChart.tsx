'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function MiniBarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="group relative flex flex-1 flex-col items-center gap-1.5">
          <div className="absolute -top-7 z-10 hidden rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-white group-hover:block">
            {d.count}
          </div>
          <div
            className={cn(
              'w-full rounded-t-lg transition-all duration-500',
              d.count === 0 ? 'h-1.5 bg-slate-200' : 'bg-gradient-to-t from-brand-600 to-brand-400'
            )}
            style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
          />
<span className="text-[10px] font-medium text-slate-400">
              {d.label}
            </span>
        </div>
      ))}
    </div>
  );
}