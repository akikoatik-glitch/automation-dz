'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-3">
      {items.map((f, i) => (
        <div key={i} className="card overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
          >
            <span className="font-semibold text-slate-800">{f.q}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform rtl:rotate-180',
                open === i && 'rotate-180 rtl:!rotate-0'
              )}
            />
          </button>
          <div
            className={cn(
              'px-5 text-sm leading-relaxed text-slate-500 transition-all',
              open === i ? 'max-h-96 pb-4' : 'max-h-0 overflow-hidden'
            )}
          >
            {f.a}
          </div>
        </div>
      ))}
    </div>
  );
}