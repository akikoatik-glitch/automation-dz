import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 30, 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [messages, customers, runs, conversations, invoices, appointments] = await Promise.all([
    prisma.message.findMany({ where: { businessId, createdAt: { gte: since } }, select: { createdAt: true, direction: true, channel: true } }),
    prisma.customer.findMany({ where: { businessId, createdAt: { gte: since } }, select: { createdAt: true, source: true } }),
    prisma.workflowRun.findMany({ where: { businessId, createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
    prisma.conversation.groupBy({ by: ['channel'], where: { businessId }, _count: { _all: true } }),
    prisma.invoice.findMany({ where: { businessId }, select: { amount: true, status: true, createdAt: true } }),
    prisma.appointment.findMany({ where: { businessId }, select: { status: true, createdAt: true } })
  ]);

  const series: Array<{ date: string; incoming: number; outgoing: number; customers: number; runs: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    series.push({ date: dayKey(d), incoming: 0, outgoing: 0, customers: 0, runs: 0 });
  }
  const byDay = new Map(series.map((s) => [s.date, s]));

  for (const m of messages) {
    const b = byDay.get(dayKey(m.createdAt));
    if (b) { if (m.direction === 'in') b.incoming++; else b.outgoing++; }
  }
  for (const c of customers) {
    const b = byDay.get(dayKey(c.createdAt));
    if (b) b.customers++;
  }
  for (const r of runs) {
    const b = byDay.get(dayKey(r.createdAt));
    if (b) b.runs++;
  }

  const byChannel: Record<string, number> = {};
  for (const c of conversations) byChannel[c.channel] = c._count._all;

  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  const pendingRevenue = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const paidRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    days,
    series,
    totals: {
      messages: messages.length,
      incoming: messages.filter((m) => m.direction === 'in').length,
      outgoing: messages.filter((m) => m.direction === 'out').length,
      customers: customers.length,
      totalCustomers: await prisma.customer.count({ where: { businessId } }),
      runs: runs.length,
      runsSuccess: runs.filter((r) => r.status === 'success').length,
      appointmentsThisMonth: await prisma.appointment.count({ where: { businessId, createdAt: { gte: month } } }),
      pendingRevenue,
      paidRevenue
    },
    byChannel
  });
}