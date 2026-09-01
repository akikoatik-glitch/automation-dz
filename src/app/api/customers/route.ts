import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const search = req.nextUrl.searchParams.get('q')?.trim() || '';
  const status = req.nextUrl.searchParams.get('status') || '';
  const source = req.nextUrl.searchParams.get('source') || '';

  const where: Record<string, unknown> = { businessId };
  if (status && status !== 'all') where.status = status;
  if (source && source !== 'all') where.source = source;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { notes: { contains: search } }
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      _count: { select: { conversations: true, appointments: true, invoices: true } }
    }
  });

  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const customer = await prisma.customer.create({
    data: {
      businessId,
      name,
      phone: body.phone ? String(body.phone) : null,
      email: body.email ? String(body.email) : null,
      source: body.source || 'manual',
      status: body.status || 'new',
      tags: Array.isArray(body.tags) ? JSON.stringify(body.tags) : null,
      notes: body.notes ? String(body.notes) : null,
      lastContactAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId,
      userId: userId === 'apikey' ? null : userId,
      kind: 'customer.created',
      entityType: 'customer',
      entityId: customer.id,
      summary: `Client « ${name} » créé`
    }
  });

  return NextResponse.json({ customer }, { status: 201 });
}