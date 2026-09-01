import { prisma } from './db';

// Increment a usage counter for the current month.
export async function bumpUsage(businessId: string, metric: string, by = 1) {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    await prisma.usageRecord.upsert({
      where: {
        businessId_period_metric: { businessId, period, metric }
      },
      create: { businessId, period, metric, value: by },
      update: { value: { increment: by } }
    });
    return true;
  } catch (e) {
    console.error('usage bump failed', e);
    return false;
  }
}

export async function getUsage(businessId: string) {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rows = await prisma.usageRecord.findMany({
    where: { businessId, period }
  });
  const map: Record<string, number> = {};
  for (const r of rows) map[r.metric] = r.value;
  return map;
}

export type PlanLimits = {
  customers: number;
  automations: number;
  messages: number;
  users: number;
  ai: boolean;
};

const defaultLimits: PlanLimits = {
  customers: 500,
  automations: 5,
  messages: 1000,
  users: 1,
  ai: false
};

// Resolve effective limits: plan defaults + business overrides.
export async function getLimits(businessId: string): Promise<PlanLimits> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { plan: true }
  });
  const merged: PlanLimits = { ...defaultLimits };
  if (business?.plan?.limits) {
    try {
      Object.assign(merged, JSON.parse(business.plan.limits));
    } catch {}
  }
  if (business?.limits) {
    try {
      Object.assign(merged, JSON.parse(business.limits));
    } catch {}
  }
  return merged;
}

export async function checkLimit(
  businessId: string,
  metric: keyof PlanLimits,
  current: number,
  label: string
): Promise<string | null> {
  const limits = await getLimits(businessId);
  const max = limits[metric];
  if (typeof max !== 'number' || max <= 0) return null; // unlimited
  if (current >= max) {
    return `limit_reached:${label}`;
  }
  return null;
}