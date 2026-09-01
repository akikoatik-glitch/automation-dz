'use client';

import * as React from 'react';
import { MessageCircle, Instagram, Facebook, CalendarDays, Bell, Users, Zap } from 'lucide-react';

const nodes: {
  id: string;
  icon: React.ReactNode;
  label: string;
  style: React.CSSProperties;
  from: string;
  to: string;
  size?: number;
}[] = [
  {
    id: 'wa',
    icon: <MessageCircle className="h-5 w-5" />,
    label: 'WhatsApp',
    from: '#34d399',
    to: '#059669',
    style: { top: '12%', left: '8%' }
  },
  {
    id: 'fb',
    icon: <Facebook className="h-5 w-5" />,
    label: 'Facebook',
    from: '#38bdf8',
    to: '#4f46e5',
    style: { top: '52%', left: '0%' }
  },
  {
    id: 'ig',
    icon: <Instagram className="h-5 w-5" />,
    label: 'Instagram',
    from: '#e879f9',
    to: '#f43f5e',
    style: { top: '80%', left: '22%' }
  },
  {
    id: 'form',
    icon: <Zap className="h-5 w-5" />,
    label: 'Forms',
    from: '#fbbf24',
    to: '#f97316',
    style: { top: '6%', left: '58%' }
  },
  {
    id: 'core',
    icon: <Zap className="h-6 w-6" />,
    label: 'Wassil',
    from: '#0c8667',
    to: '#8b5cf6',
    size: 64,
    style: { top: '38%', left: '38%' }
  },
  {
    id: 'notif',
    icon: <Bell className="h-5 w-5" />,
    label: 'Team',
    from: '#a78bfa',
    to: '#7c3aed',
    style: { top: '14%', right: '4%' }
  },
  {
    id: 'cal',
    icon: <CalendarDays className="h-5 w-5" />,
    label: 'Appointments',
    from: '#2dd4bf',
    to: '#0891b2',
    style: { top: '58%', right: '2%' }
  },
  {
    id: 'people',
    icon: <Users className="h-5 w-5" />,
    label: 'CRM',
    from: '#f472b6',
    to: '#e11d48',
    style: { bottom: '2%', right: '20%' }
  }
];

const edges: [string, string][] = [
  ['wa', 'core'],
  ['fb', 'core'],
  ['ig', 'core'],
  ['form', 'core'],
  ['core', 'notif'],
  ['core', 'cal'],
  ['core', 'people']
];

const pulse = [
  { from: 'wa', delay: 0 },
  { from: 'fb', delay: 1.4 },
  { from: 'ig', delay: 2.8 },
  { from: 'form', delay: 1.9 },
  { from: 'core', delay: 3.6 }
];

export function HeroVisual() {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [coords, setCoords] = React.useState<Record<string, { x: number; y: number }>>({});

  React.useEffect(() => {
    const compute = () => {
      const wrap = svgRef.current?.closest('.hero-visual-wrap') as HTMLElement | null;
      if (!wrap) return;
      const w = wrap.offsetWidth;
      const h = wrap.offsetHeight;
      const pos: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        const el = wrap.querySelector(`[data-node="${n.id}"]`) as HTMLElement | null;
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const wr = wrap.getBoundingClientRect();
        pos[n.id] = { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 };
      }
      setCoords(pos);
    };
    compute();
    window.addEventListener('resize', compute);
    const t = setTimeout(compute, 300);
    return () => {
      window.removeEventListener('resize', compute);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="hero-visual-wrap relative aspect-[4/3] w-full select-none sm:aspect-[16/11]">
      <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full">
        {edges.map(([a, b]) => {
          const pa = coords[a];
          const pb = coords[b];
          if (!pa || !pb) return null;
          return (
            <line
              key={a + b}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="url(#edgeGrad)"
              strokeWidth={1.6}
              strokeDasharray="4 6"
              className="opacity-40"
            />
          );
        })}
        {pulse.map((p, i) => {
          const pa = coords[p.from];
          const pb = coords['core'];
          if (!pa || !pb) return null;
          return (
            <circle
              key={i}
              r={3.5}
              fill="#17a77f"
              style={{
                offsetPath: `path("M ${pa.x} ${pa.y} L ${pb.x} ${pb.y}")`,
                animation: `moveAlong ${2.2 + i * 0.4}s linear ${p.delay}s infinite`
              }}
            />
          );
        })}
        <defs>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17a77f" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <style>{`@keyframes moveAlong { to { offset-distance: 100%; } }`}</style>
      </svg>

      {nodes.map((n) => (
        <div
          key={n.id}
          data-node={n.id}
          className="absolute flex flex-col items-center gap-1.5"
          style={n.style}
        >
          <div
            className="flex items-center justify-center rounded-2xl text-white shadow-xl animate-float-y"
            style={{
              background: `linear-gradient(135deg, ${n.from} 0%, ${n.to} 100%)`,
              width: n.size ?? 48,
              height: n.size ?? 48,
              animationDelay: `${(n.id.charCodeAt(0) % 5) * 0.4}s`,
              fontSize: n.size ? 30 : 22
            }}
          >
            {n.icon}
          </div>
          <span className="rounded-full bg-slate-900/30 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            {n.label}
          </span>
        </div>
      ))}
    </div>
  );
}