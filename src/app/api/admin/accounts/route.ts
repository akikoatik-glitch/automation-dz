import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

type Row = {
  id: string;
  name: string;
  slug: string;
  email: string;
  ownerName: string;
  industry: string | null;
  status: string;
  planStatus: string;
  trialEndsAt: string | null;
  planName: string | null;
  customers: number;
  members: number;
  createdAt: string;
};

export async function GET(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const mode = req.nextUrl.searchParams.get('mode')?.trim() || ''; // trial | paid | expired | all
  const now = new Date();

  const businesses = await prisma.business.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }] } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      plan: { select: { id: true, name: true } },
      members: {
        where: { role: 'OWNER' },
        select: { user: { select: { name: true, email: true } } },
        take: 1
      },
      _count: { select: { customers: true, members: true } }
    }
  });

  const accounts: Row[] = businesses
    .map((b) => {
      const owner = b.members[0]?.user;
      const isTrial = b.planStatus === 'trial';
      const expired = !!b.trialEndsAt && new Date(b.trialEndsAt).getTime() < now.getTime();
      let rowMode: string;
      if (expired) rowMode = 'expired';
      else if (isTrial) rowMode = 'trial';
      else rowMode = 'paid';
      if (mode !== 'all' && mode && rowMode !== mode) return null;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        email: owner?.email || '',
        ownerName: owner?.name || '',
        industry: b.industry,
        status: b.status,
        planStatus: b.planStatus,
        trialEndsAt: b.trialEndsAt ? b.trialEndsAt.toISOString() : null,
        planName: b.plan?.name || null,
        customers: b._count.customers,
        members: b._count.members,
        createdAt: b.createdAt.toISOString()
      };
    })
    .filter((r): r is Row => r !== null);

  return NextResponse.json({ accounts });
}

// POST { id, action, durationDays?, hours?, date? }
// action: 'trial' | 'paid' | 'extend' | 'suspend' | 'activate'
export async function POST(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const action = String(body.action || '');
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const now = new Date();
  let data: { status?: string; planStatus?: string; trialEndsAt?: Date | null } = {};

  if (action === 'trial') {
    const durationHours = Number(body.durationHours);
    const durationDays = Number(body.durationDays);
    let end = new Date(now);
    if (durationHours > 0) end = new Date(now.getTime() + durationHours * 3600 * 1000);
    if (durationDays > 0) end = new Date(now.getTime() + durationDays * 24 * 3600 * 1000);
    data = { status: 'active', planStatus: 'trial', trialEndsAt: end };
  } else if (action === 'paid') {
    const durationDays = Number(body.durationDays);
    let end: Date | null = null;
    if (durationDays > 0) end = new Date(now.getTime() + durationDays * 24 * 3600 * 1000);
    data = { status: 'active', planStatus: 'active', trialEndsAt: end };
  } else if (action === 'extend') {
    const base = business.trialEndsAt && new Date(business.trialEndsAt).getTime() > now.getTime()
      ? new Date(business.trialEndsAt)
      : now;
    const durationHours = Number(body.durationHours);
    const durationDays = Number(body.durationDays);
    let end = new Date(base);
    if (durationHours > 0) end = new Date(base.getTime() + durationHours * 3600 * 1000);
    if (durationDays > 0) end = new Date(base.getTime() + durationDays * 24 * 3600 * 1000);
    data = { status: 'active', planStatus: 'trial', trialEndsAt: end };
  } else if (action === 'suspend') {
    data = { status: 'suspended' };
  } else if (action === 'activate') {
    data = { status: 'active' };
  } else {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const updated = await prisma.business.update({ where: { id }, data });
  await logActivity({
    businessId: id,
    userId: user.id,
    kind: 'account.updated',
    summary: `Compte « ${business.name} » mis à jour (${action})`
  });

  return NextResponse.json({ ok: true, account: { ...updated, trialEndsAt: updated.trialEndsAt ? updated.trialEndsAt.toISOString() : null } });
}
