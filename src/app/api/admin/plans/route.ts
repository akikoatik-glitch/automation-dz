import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET() {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const plans = await prisma.plan.findMany({ orderBy: { sort: 'asc' } });
  return NextResponse.json({ plans });
}

// POST â€” create or update a plan
export async function POST(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = {
    name: String(body.name || '').trim(),
    nameAr: body.nameAr ? String(body.nameAr) : null,
    priceDzd: Number(body.priceDzd) || 0,
    priceUsd: Number(body.priceUsd) || 0,
    interval: body.interval || 'month',
    limits: typeof body.limits === 'object' ? JSON.stringify(body.limits) : String(body.limits || '{}'),
    features: Array.isArray(body.features) ? JSON.stringify(body.features) : '[ ]',
    active: body.active !== false,
    sort: Number(body.sort) || 0
  };
  if (!data.name) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const plan = body.id
    ? await prisma.plan.update({ where: { id: String(body.id) }, data })
    : await prisma.plan.create({ data });
  return NextResponse.json({ plan });
}
