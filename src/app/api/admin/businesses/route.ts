import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const where = q
    ? { OR: [{ name: { contains: q } }, { slug: { contains: q } }, { id: { contains: q } }] }
    : {};

  const businesses = await prisma.business.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
plan: { select: { id: true, name: true, priceDzd: true } },
      _count: { select: { customers: true, members: true } }
    }
  });
  return NextResponse.json({ businesses });
}

// POST { id, status } â†’ suspend / activate
export async function POST(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  const status = String(body.status || '');
  if (!id || !['active', 'suspended'].includes(status)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const business = await prisma.business.update({ where: { id }, data: { status } });
  return NextResponse.json({ business });
}
