import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ingestMessage } from '@/lib/engine/trigger';

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    const integrations = await prisma.integration.findMany({ where: { type: 'whatsapp', enabled: true } });
    const ok = integrations.some((i) => {
      let cfg: Record<string, unknown> = {};
      try {
        cfg = i.config ? JSON.parse(i.config) : {};
      } catch {}
      return cfg.verifyToken === token || (process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_VERIFY_TOKEN === token);
    });
    if (ok && challenge) {
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

// POST — inbound WhatsApp messages
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  // Entry[] — each entry holds a phone_number_id in metadata
  const entries: Array<{ metadata?: { phone_number_id?: string }; changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }> }> =
    body.entry || [];

  let handled = 0;
  for (const entry of entries) {
    const phoneId = entry.metadata?.phone_number_id;
    if (!phoneId) continue;
    const integration = await prisma.integration.findFirst({
      where: { type: 'whatsapp', config: { contains: phoneId }, enabled: true }
    });
    if (!integration) continue;

    for (const change of entry.changes || []) {
      const messages = change.value?.messages || [];
      for (const m of messages) {
        if (!m) continue;
        const type = String(m.type || 'text');
        let text = '';
        if (type === 'text' && m.text && typeof (m.text as { body?: string }).body === 'string') {
          text = (m.text as { body: string }).body;
        }
        if (type === 'button' && m.button && typeof (m.button as { text?: string }).text === 'string') {
          text = (m.button as { text: string }).text;
        }
        if (type === 'interactive' && m.interactive) {
          const iv = m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } };
          text = iv.button_reply?.title || iv.list_reply?.title || '';
        }
        const phone = String(m.from || '');
        if (!phone || !text) continue;

        await ingestMessage({
          businessId: integration.businessId,
          channel: 'whatsapp',
          externalId: String(m.id || phone),
          senderName: String((m.profile as { name?: string } | undefined)?.name || 'Client'),
          senderPhone: phone,
          content: text,
          sourceTag: 'whatsapp'
        });
        handled++;
      }
    }
  }

  return NextResponse.json({ status: 'ok', handled });
}