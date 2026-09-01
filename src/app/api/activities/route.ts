import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 50), 100);
  const activities = await prisma.activityLog.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true } } }
  });
  return NextResponse.json({ activities });
}