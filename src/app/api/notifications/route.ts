import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get('limit') || 10);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50)
  });
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });

  return NextResponse.json({ notifications, unread });
}

export async function PATCH() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}