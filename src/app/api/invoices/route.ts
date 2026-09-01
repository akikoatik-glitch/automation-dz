import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const status = req.nextUrl.searchParams.get('status') || '';
  const where: Record<string, unknown> = { businessId };
  if (status && status !== 'all') where.status = status;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { customer: { select: { id: true, name: true } } }
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const clientName = String(body.clientName || '').trim();
  const amount = Number(body.amount);
  if (!clientName || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'invalid', message: 'clientName + amount required' }, { status: 400 });
  }

  let customerId: string | null = body.customerId || null;
  if (!customerId && body.phone) {
    const existing = await prisma.customer.findFirst({
      where: { businessId, phone: { contains: String(body.phone).replace(/\D/g, '').slice(-9) } }
    });
    customerId = existing?.id || null;
  }

  const count = await prisma.invoice.count({ where: { businessId } });
  const invoice = await prisma.invoice.create({
    data: {
      businessId,
      customerId,
      number: body.number ? String(body.number) : `INV-${String(count + 1).padStart(4, '0')}`,
      clientName,
      phone: body.phone ? String(body.phone) : null,
      amount,
      currency: body.currency || 'DZD',
      status: body.status || 'pending',
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
      notes: body.notes ? String(body.notes) : null
    }
  });

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'invoice.created',
    entityType: 'invoice',
    entityId: invoice.id,
    summary: `Facture ${invoice.number} créée pour ${clientName}`,
    meta: { amount }
  });

  return NextResponse.json({ invoice }, { status: 201 });
}