import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const status = req.nextUrl.searchParams.get('status') || '';

  const where: Prisma.AppointmentWhereInput = { businessId };
  if (status && status !== 'all') where.status = status;
  if (from || to) {
    where.startsAt = {};
    if (from) where.startsAt.gte = new Date(from);
    if (to) where.startsAt.lte = new Date(to);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startsAt: 'asc' },
    take: 300,
    include: { customer: { select: { id: true, name: true, phone: true } } }
  });
  return NextResponse.json({ appointments });
}

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const name = String(body.clientName || body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'invalid', message: 'clientName required' }, { status: 400 });
  if (!body.startsAt) return NextResponse.json({ error: 'invalid', message: 'startsAt required' }, { status: 400 });

  const startsAt = new Date(String(body.startsAt));
  if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: 'invalid', message: 'bad startsAt' }, { status: 400 });

  // Create/find customer
  let customerId: string | null = body.customerId || null;
  if (!customerId) {
    let customer = body.phone
      ? await prisma.customer.findFirst({
          where: { businessId, phone: { contains: String(body.phone).replace(/\D/g, '').slice(-9) } }
        })
      : null;
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId,
          name,
          phone: body.phone ? String(body.phone) : null,
          email: body.email ? String(body.email) : null,
          source: 'appointments',
          status: 'contacted',
          lastContactAt: new Date()
        }
      });
    }
    customerId = customer.id;
  }

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      customerId,
      clientName: name,
      phone: body.phone ? String(body.phone) : null,
      service: body.service ? String(body.service) : null,
      startsAt,
      endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
      status: body.status || 'booked',
      notes: body.notes ? String(body.notes) : null,
      source: 'manual'
    }
  });

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'appointment.created',
    entityType: 'appointment',
    entityId: appointment.id,
    summary: `Rendez-vous créé pour ${name}`,
    meta: { service: appointment.service, startsAt: appointment.startsAt.toISOString() }
  });

  return NextResponse.json({ appointment }, { status: 201 });
}