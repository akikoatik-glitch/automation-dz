import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { sendChannelMessage } from '@/lib/integrations/sender';
import { bumpUsage } from '@/lib/usage';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const inv = await prisma.invoice.findFirst({ where: { id: ctx.params.id, businessId: auth.ctx.businessId } });
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ invoice: inv });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const inv = await prisma.invoice.findFirst({ where: { id: ctx.params.id, businessId: auth.ctx.businessId } });
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.invoice.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;
  const action = req.nextUrl.searchParams.get('action');
  const inv = await prisma.invoice.findFirst({ where: { id: ctx.params.id, businessId } });
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (action === 'pay') {
    const updated = await prisma.invoice.update({
      where: { id: ctx.params.id },
      data: { status: 'paid', paidAt: new Date() }
    });
    const customer = inv.customerId
      ? await prisma.customer.update({ where: { id: inv.customerId }, data: { status: 'client' } })
      : null;
    await logActivity({
      businessId,
      kind: 'invoice.paid',
      entityType: 'invoice',
      entityId: inv.id,
      summary: `Facture ${inv.number} payée (${inv.amount} DZD)`
    });
    return NextResponse.json({ invoice: updated, customer });
  }

  if (action === 'cancel') {
    const updated = await prisma.invoice.update({ where: { id: ctx.params.id }, data: { status: 'cancelled' } });
    return NextResponse.json({ invoice: updated });
  }

  if (action === 'remind') {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const phone = inv.phone || (inv.customerId ? (await prisma.customer.findUnique({ where: { id: inv.customerId } }))?.phone : null);
    if (!phone) return NextResponse.json({ error: 'no_phone' }, { status: 400 });

    let message = `Salam ${inv.clientName}, rappel : votre facture ${inv.number} de ${inv.amount} DZD ${inv.dueDate ? `arrive à échéance le ${new Intl.DateTimeFormat('fr-DZ', { day: 'numeric', month: 'long' }).format(inv.dueDate)}` : 'est en attente'}. Merci !`;
    const res = await sendChannelMessage(business, 'whatsapp', phone, message);
    if (res.ok) await bumpUsage(businessId, 'messages');
    await prisma.invoice.update({
      where: { id: ctx.params.id },
      data: { reminderCount: { increment: 1 } }
    });
    await logActivity({
      businessId,
      kind: 'invoice.reminded',
      entityType: 'invoice',
      entityId: inv.id,
      summary: `Relance envoyée pour ${inv.number}`,
      meta: { channel: 'whatsapp', ok: res.ok, reason: res.reason }
    });
    return NextResponse.json({ sent: res.ok, reason: res.reason, message });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}