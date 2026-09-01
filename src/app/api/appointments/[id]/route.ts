import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { runAutomation } from '@/lib/engine/runner';
import { TriggerContext } from '@/lib/engine/types';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ap = await prisma.appointment.findFirst({ where: { id: ctx.params.id, businessId: auth.ctx.businessId } });
  if (!ap) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ appointment: ap });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const ap = await prisma.appointment.findFirst({ where: { id: ctx.params.id, businessId } });
  if (!ap) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (['booked', 'confirmed', 'done', 'no_show', 'cancelled'].includes(body.status)) data.status = body.status;
  if (body.service) data.service = String(body.service);
  if (body.clientName) data.clientName = String(body.clientName);
  if (body.phone) data.phone = String(body.phone);
  if (body.notes) data.notes = String(body.notes);
  if (body.startsAt && !Number.isNaN(new Date(String(body.startsAt)).getTime())) data.startsAt = new Date(String(body.startsAt));

  const updated = await prisma.appointment.update({ where: { id: ctx.params.id }, data });
  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'appointment.updated',
    entityType: 'appointment',
    entityId: updated.id,
    summary: `Rendez-vous ${updated.clientName} → ${body.status || 'modifié'}`
  });
  return NextResponse.json({ appointment: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ap = await prisma.appointment.findFirst({ where: { id: ctx.params.id, businessId: auth.ctx.businessId } });
  if (!ap) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.appointment.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}

// POST ?action=remind → run enabled APPOINTMENT_REMINDER automations now
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  if (req.nextUrl.searchParams.get('action') !== 'remind') {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  const ap = await prisma.appointment.findFirst({ where: { id: ctx.params.id, businessId } });
  if (!ap) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const automations = await prisma.automation.findMany({
    where: { businessId, triggerType: 'APPOINTMENT_REMINDER', enabled: true }
  });

  const results: Record<string, unknown>[] = [];
  for (const a of automations) {
    const base: TriggerContext = {
      businessId,
      businessName: business?.name || '',
      businessSlug: business?.slug || '',
      triggerType: 'APPOINTMENT_REMINDER',
      timestamp: new Date(),
      channel: 'whatsapp',
      customerId: ap.customerId || undefined,
      customerName: ap.clientName || '',
      customerPhone: ap.phone || '',
      appointment: {
        id: ap.id,
        clientName: ap.clientName,
        phone: ap.phone,
        service: ap.service,
        startsAt: ap.startsAt
      },
      sendMessage: false
    };
    const res = await runAutomation(a.id, businessId, base, { recordRun: true });
    results.push({ automation: a.name, status: res.status, steps: res.steps });
  }

  await prisma.appointment.update({ where: { id: ap.id }, data: { reminderSent: true } });
  return NextResponse.json({ results });
}