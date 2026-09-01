import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { fireTrigger } from '@/lib/engine/trigger';

// Generic inbound webhook for WEBHOOK automations.
// Auth: workspace API key (Authorization: Bearer wsp_...) or session cookie.
export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

  const customerPhone = str(body.phone || body.customerPhone);
  let customerId: string | null = null;
  let customerName = str(body.name || body.customerName) || 'Contact webhook';

  if ((customerPhone || body.email) && !body.skipCreate) {
    let customer = customerPhone
      ? await prisma.customer.findFirst({
          where: { businessId, phone: { contains: customerPhone.replace(/\D/g, '').slice(-9) } }
        })
      : null;
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId,
          name: customerName,
          phone: customerPhone || null,
          email: body.email ? str(body.email) : null,
          source: 'webhook',
          status: 'new',
          tags: JSON.stringify(['webhook']),
          lastContactAt: new Date(),
          notes: body.message ? str(body.message).slice(0, 300) : null
        }
      });
    }
    customerId = customer.id;
    customerName = customer.name;
  }

  const ran = await fireTrigger(businessId, 'WEBHOOK', {
    channel: 'webhook',
    customerId: customerId || undefined,
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,
    customerEmail: body.email ? str(body.email) : undefined,
    messageText: body.message ? str(body.message) : JSON.stringify(body),
    external: body
  });

  return NextResponse.json({ ok: true, automations: ran });
}