import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { businessId, lang } = await req.json().catch(() => ({}));

  // verify membership
  if (businessId) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, businessId }
    });
    if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      currentBusinessId: businessId
        ? businessId
        : undefined,
      ...(lang ? { lang } : {})
    }
  });

  return NextResponse.json({ ok: true });
}