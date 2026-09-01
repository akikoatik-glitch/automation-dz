import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const page = Number(req.nextUrl.searchParams.get('page') || 1);
  const per = 40;

  const where = q
    ? { OR: [{ summary: { contains: q } }, { kind: { contains: q } }] }
    : {};
  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * per,
      take: per,
      include: {
        business: { select: { name: true, slug: true } },
        user: { select: { name: true, email: true } }
      }
    }),
    prisma.activityLog.count({ where })
  ]);
  return NextResponse.json({ activities, total, page, per });
}
