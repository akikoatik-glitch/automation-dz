import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { sendChannelMessage } from '@/lib/integrations/sender';
import { fireTrigger } from '@/lib/engine/trigger';
import { bumpUsage } from '@/lib/usage';
import { logActivity } from '@/lib/activity';

// List conversations for the inbox
export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const channel = req.nextUrl.searchParams.get('channel') || '';

  const where: Record<string, unknown> = { businessId };
  if (channel && channel !== 'all') where.channel = channel;
  if (q) where.OR = [{ title: { contains: q } }, { externalId: { contains: q } }];

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, status: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  return NextResponse.json({ conversations });
}

// Send an outbound message
export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || '').trim();
  if (!content) return NextResponse.json({ error: 'invalid', message: 'empty content' }, { status: 400 });

  const channel = String(body.channel || 'whatsapp');
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Resolve or create customer
  let customerId: string | null = body.customerId || null;
  if (!customerId && (body.customerName || body.phone)) {
    let customer = body.phone
      ? await prisma.customer.findFirst({
          where: { businessId, phone: { contains: String(body.phone).replace(/\D/g, '').slice(-9) } }
        })
      : null;
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId,
          name: String(body.customerName || 'Nouveau contact'),
          phone: body.phone ? String(body.phone) : null,
          email: body.email ? String(body.email) : null,
          source: channel,
          status: 'contacted',
          lastContactAt: new Date()
        }
      });
    }
    customerId = customer.id;
    await bumpUsage(businessId, 'customers');
  }

  // Resolve conversation
  let conversation = body.conversationId
    ? await prisma.conversation.findFirst({ where: { id: body.conversationId, businessId } })
    : null;
  if (!conversation && customerId) {
    conversation = await prisma.conversation.findFirst({
      where: { businessId, customerId, status: 'open' }
    });
  }
  if (!conversation) {
    const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
    conversation = await prisma.conversation.create({
      data: {
        businessId,
        channel,
        customerId: customer?.id ?? null,
        externalId: String(body.phone || '') || null,
        title: customer?.name ?? String(body.customerName || 'Nouveau contact'),
        status: 'open',
        lastMessageAt: new Date()
      }
    });
  }

  // Actually attempt delivery
  const res = await sendChannelMessage(business, channel, String(body.phone || ''), content);

  const message = await prisma.message.create({
    data: {
      businessId,
      conversationId: conversation.id,
      direction: 'out',
      sender: business.name,
      content,
      channel,
      status: res.ok ? 'sent' : 'failed',
      externalId: res.externalId || null,
      type: 'manual',
      metadata: res.ok ? null : JSON.stringify({ reason: res.reason })
    }
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), status: 'open' }
  });

  if (res.ok) await bumpUsage(businessId, 'messages');

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'message.sent',
    entityType: 'message',
    entityId: message.id,
    summary: `Message envoyé à ${conversation.title}`,
    meta: { channel, ok: res.ok, reason: res.reason }
  });

  return NextResponse.json({ message, conversation, sent: res.ok, reason: res.reason });
}