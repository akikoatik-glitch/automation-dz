import { redirect } from 'next/navigation';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import AdminOverview from '@/components/admin/AdminOverview';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getSuperAdmin();
  if (!user) redirect('/login?next=/admin');

  const [
    businesses, users, messages, automations, runs, appointments, plans
  ] = await Promise.all([
    prisma.business.count(),
    prisma.user.count(),
    prisma.message.count(),
    prisma.automation.count(),
    prisma.workflowRun.count(),
    prisma.appointment.count(),
    prisma.plan.findMany({ orderBy: { sort: 'asc' } })
  ]);

  const activeBusinesses = await prisma.business.count({ where: { status: 'active' } });
  const subscriptions = await prisma.subscription.count({ where: { status: 'active' } });

  // Daily new-business activity over last 14 days
  const startOfWindow = new Date();
  startOfWindow.setDate(startOfWindow.getDate() - 13);
  startOfWindow.setHours(0, 0, 0, 0);
  const recentBusinesses = await prisma.business.findMany({
    where: { createdAt: { gte: startOfWindow } },
    select: { createdAt: true }
  });
  const daily: { label: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfWindow);
    d.setDate(startOfWindow.getDate() + i);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    daily.push({ label: key, count: 0 });
  }
  for (const b of recentBusinesses) {
    const key = `${b.createdAt.getDate()}/${b.createdAt.getMonth() + 1}`;
    const row = daily.find((d) => d.label === key);
    if (row) row.count++;
  }

  return (
    <AdminOverview
      counts={{ businesses, activeBusinesses, users, messages, automations, runs, appointments, subscriptions }}
      daily={daily}
      plans={plans.map((p) => ({ id: p.id, name: p.name, nameAr: p.nameAr, priceDzd: p.priceDzd, interval: p.interval, sort: p.sort }))}
    />
  );
}
