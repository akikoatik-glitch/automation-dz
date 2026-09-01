import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
      : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { memberships: { include: { business: { select: { id: true, name: true } } } } }
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  if (body.role !== undefined) {
    const user = await prisma.user.update({ where: { id }, data: { role: body.role === 'super' ? 'super' : 'user' } });
    return NextResponse.json({ user });
  }
  if (body.active !== undefined) {
    const user = await prisma.user.update({ where: { id }, data: { active: !!body.active } });
    return NextResponse.json({ user });
  }
  return NextResponse.json({ error: 'invalid' }, { status: 400 });
}
