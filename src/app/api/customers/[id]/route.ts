import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;
  const { id } = ctx.params;

  const customer = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!customer) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [conversations, appointments, invoices, messages] = await Promise.all([
    prisma.conversation.findMany({ where: { customerId: id }, orderBy: { updatedAt: 'desc' } }),
    prisma.appointment.findMany({ where: { customerId: id }, orderBy: { startsAt: 'desc' }, take: 20 }),
    prisma.invoice.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.message.findMany({
      where: { conversation: { customerId: id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { conversation: { select: { channel: true, title: true } } }
    })
  ]);

  return NextResponse.json({ customer, conversations, appointments, invoices, messages });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const { id } = ctx.params;

  const existing = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.phone === 'string') data.phone = body.phone || null;
  if (typeof body.email === 'string') data.email = body.email || null;
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.notes === 'string') data.notes = body.notes;
  if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : null;

  const customer = await prisma.customer.update({ where: { id }, data });
  await prisma.activityLog.create({
    data: {
      businessId,
      userId: userId === 'apikey' ? null : userId,
      kind: 'customer.updated',
      entityType: 'customer',
      entityId: customer.id,
      summary: `Client « ${customer.name} » mis à jour`
    }
  });
  return NextResponse.json({ customer });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const { id } = ctx.params;

  const existing = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.customer.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      businessId,
      userId: userId === 'apikey' ? null : userId,
      kind: 'customer.deleted',
      summary: `Client « ${existing.name} » supprimé`
    }
  });
  return NextResponse.json({ ok: true });
}