import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fireTrigger } from '@/lib/engine/trigger';
import { bumpUsage } from '@/lib/usage';

// Public form submission — no auth. Resolves business by slug then form by slug.
export async function POST(req: NextRequest, ctx: { params: { businessSlug: string; formSlug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: ctx.params.businessSlug }
  });
  if (!business || business.status !== 'active') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const form = await prisma.webForm.findFirst({
    where: { businessId: business.id, slug: ctx.params.formSlug }
  });
  if (!form || !form.enabled) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const values = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

  let name = str(values.name || values.fullName || values.nom);
  const phone = str(values.phone || values.tel || values.whatsapp);
  const email = str(values.email);
  const message = str(values.message || values.msg || values.comment || [...Object.values(values)].join(' '));

  if (!name) name = phone || 'Nouveau client';
  if (!name) return NextResponse.json({ error: 'invalid', message: 'name or phone required' }, { status: 400 });

  // Upsert customer
  let customer = null;
  if (phone) {
    customer = await prisma.customer.findFirst({
      where: { businessId: business.id, phone: { contains: phone.replace(/\D/g, '').slice(-9) } }
    });
  }
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name,
        phone: phone || null,
        email: email || null,
        source: 'form',
        status: 'new',
        tags: JSON.stringify(['form']),
        customFields: JSON.stringify(values),
        lastContactAt: new Date(),
        notes: message ? message.slice(0, 300) : null
      }
    });
    await bumpUsage(business.id, 'customers');
  } else {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        customFields: JSON.stringify(values),
        lastContactAt: new Date(),
        notes: message ? message.slice(0, 300) : customer.notes
      }
    });
  }

  // Conversation + message (type form)
  let conversation = await prisma.conversation.findFirst({
    where: { businessId: business.id, customerId: customer.id, channel: 'form' }
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        channel: 'form',
        title: customer.name,
        externalId: form.id,
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
      businessId: business.id,
      conversationId: conversation.id,
      direction: 'in',
      sender: customer.name,
      content: message || `Nouvelle soumission du formulaire « ${form.name} »`,
      channel: 'form',
      status: 'sent',
      type: 'form'
    }
  });

  await prisma.webForm.update({
    where: { id: form.id },
    data: { submitCount: { increment: 1 } }
  });

  // Fire FORM_SUBMITTED automations
  await fireTrigger(business.id, 'FORM_SUBMITTED', {
    channel: 'form',
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone || phone || undefined,
    customerEmail: customer.email || email || undefined,
    formSlug: form.slug,
    fields: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, str(v)]))
  });

  return NextResponse.json({ ok: true, submitted: true, redirectUrl: null });
}