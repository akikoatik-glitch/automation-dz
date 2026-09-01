import { NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET() {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const since = new Date();
  since.setMonth(since.getMonth() - 1);

  const [
    businesses, users, activeBusinesses, messages, automations, runs, appointments, subscriptions, plans
  ] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.business.count({ where: { status: 'active' } }),
    prisma.message.count(),
    prisma.automation.count(),
    prisma.workflowRun.count(),
    prisma.appointment.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.plan.findMany({ include: { businesses: { where: { status: { not: 'suspended' } } } }, orderBy: { sort: 'asc' } })
  ]);

  const revenue = plans.reduce((sum, p) => sum + p.priceDzd * p.businesses.length, 0);

  const days: { label: string; count: number }[] = [];
  const startOfWindow = new Date();
  startOfWindow.setDate(startOfWindow.getDate() - 13);
  startOfWindow.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfWindow);
    d.setDate(startOfWindow.getDate() + i);
    days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
  }
  const recentMessages = await prisma.message.findMany({
    where: { createdAt: { gte: startOfWindow } },
    select: { createdAt: true }
  });
  for (const m of recentMessages) {
    const day = days.find((d) => {
      const [dd, mm] = d.label.split('/').map(Number);
      return m.createdAt.getDate() === dd && m.createdAt.getMonth() + 1 === mm;
    });
    if (day) day.count++;
  }

  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    include: { plan: true, business: { select: { id: true, name: true, slug: true } } },
    take: 10,
    orderBy: { startedAt: 'desc' }
  });

  return NextResponse.json({
    counts: { businesses, activeBusinesses, users, messages, automations, runs, appointments, subscriptions },
    revenue,
    subscriptionBreakdown: plans.map((p) => ({ id: p.id, name: p.name, priceDzd: p.priceDzd, businesses: p.businesses.length })),
    activeSubs,
    daily: days
  });
}
