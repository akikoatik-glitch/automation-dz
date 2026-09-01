import { prisma } from '../db';
import { runAutomation } from './runner';
import { TriggerContext, TriggerType, TriggerConfig } from './types';

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function matchesTrigger(
  triggerType: TriggerType,
  cfg: TriggerConfig | null,
  ctx: TriggerContext
): boolean {
  // channel filter
  if (cfg?.channels && cfg.channels.length > 0 && !cfg.channels.includes('all')) {
    const ch = ctx.channel || 'web';
    if (!cfg.channels.includes(ch)) return false;
  }
  // keyword filter
  if (cfg?.keywords && cfg.keywords.length > 0) {
    const m = (ctx.messageText || ctx.fields?.message || '').toLowerCase();
    if (!cfg.keywords.some((k) => m.includes(k.toLowerCase()))) return false;
  }
  // form slug filter
  if (triggerType === 'FORM_SUBMITTED' && cfg?.formSlug && cfg.formSlug !== 'any') {
    if (ctx.formSlug !== cfg.formSlug) return false;
  }
  return true;
}

// Fire a trigger event: runs every enabled matching automation.
export async function fireTrigger(
  businessId: string,
  triggerType: TriggerType,
  ctx: Omit<TriggerContext, 'triggerType' | 'timestamp' | 'businessId' | 'businessName' | 'businessSlug'>,
  opts?: { singleAutomationId?: string; force?: boolean }
): Promise<number> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.status !== 'active') return 0;

  const full: TriggerContext = {
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    triggerType,
    timestamp: new Date(),
    ...ctx
  };

  const automations = opts?.singleAutomationId
    ? await prisma.automation.findMany({
        where: { id: opts.singleAutomationId, businessId }
      })
    : await prisma.automation.findMany({
        where: { businessId, triggerType, enabled: true }
      });

  let ran = 0;
  for (const a of automations) {
    const cfg = parseJson<TriggerConfig>(a.triggerConfig);
    if (!opts?.force && !a.enabled) continue;
    if (!opts?.force && !matchesTrigger(triggerType, cfg, full)) continue;
    try {
      await runAutomation(a.id, businessId, full, { recordRun: true });
      ran++;
    } catch (e) {
      console.error('workflow failed', a.id, e);
    }
  }
  return ran;
}

// Handle incoming message: upsert customer+conversation, then fire triggers.
export async function ingestMessage(params: {
  businessId: string;
  channel: string;
  externalId?: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  content: string;
  sourceTag?: string;
}) {
  const { businessId, channel, externalId, senderName, senderPhone, senderEmail, content, sourceTag } = params;

  // Upsert customer by phone / external id
  let customer = null;
  if (senderPhone) {
    const suffix = senderPhone.replace(/\D/g, '').slice(-9);
    customer = await prisma.customer.findFirst({
      where: { businessId, phone: { contains: suffix } }
    });
  }
  if (!customer && externalId) {
    customer = await prisma.customer.findFirst({
      where: { businessId, phone: { contains: externalId.replace(/\D/g, '').slice(-9) } }
    });
  }
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId,
        name: senderName || senderPhone || 'Nouveau contact',
        phone: senderPhone || null,
        email: senderEmail || null,
        source: channel,
        status: 'new',
        tags: JSON.stringify([sourceTag || channel].filter(Boolean)),
        lastContactAt: new Date(),
        notes: content ? content.slice(0, 200) : null
      }
    });
    if (channel !== 'manual' && channel !== 'web') {
      // Notify owners about a fresh lead
      const owners = await prisma.membership.findMany({
        where: { businessId, role: 'OWNER' }
      });
      for (const o of owners.slice(0, 3)) {
        await prisma.notification.create({
          data: {
            businessId,
            userId: o.userId,
            type: 'lead',
            title: `${senderName || 'Nouveau client'} via ${channel}`,
            content: info(content, 160),
            link: '/app/inbox'
          }
        });
      }
    }
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastContactAt: new Date(), status: customer.status === 'new' ? customer.status : customer.status }
    });
  }

  // Conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      businessId,
      channel,
      OR: externalId
        ? [{ externalId: { equals: externalId } }, { customerId: customer.id }]
        : [{ customerId: customer.id }]
    }
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        businessId,
        channel,
        externalId: externalId || senderPhone || null,
        customerId: customer.id,
        title: customer.name,
        unreadCount: 1,
        status: 'open',
        lastMessageAt: new Date()
      }
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { unreadCount: { increment: 1 }, status: 'open', lastMessageAt: new Date() }
    });
  }

  await prisma.message.create({
    data: {
      businessId,
      conversationId: conversation.id,
      direction: 'in',
      sender: senderName || null,
      content,
      channel,
      status: 'sent'
    }
  });

  await fireTrigger(businessId, 'MESSAGE_RECEIVED', {
    channel,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone || senderPhone || undefined,
    customerEmail: customer.email || senderEmail || undefined,
    messageText: content,
    sourceTag
  });

  return { customer, conversation };
}

function info(s: string, n: number) {
  const c = (s || '').trim();
  return c.length > n ? c.slice(0, n - 3) + '…' : c;
}