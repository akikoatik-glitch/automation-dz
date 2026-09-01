import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ingestMessage } from '@/lib/engine/trigger';

// Optional Telegram webhook inbound (primary path is cron long-polling for
// local/dev setups). We identify the owning business by asking each enabled
// bot's getChat — only the matching token answers ok:true for that chat.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const message = body.message as { chat?: { id?: number }; from?: { first_name?: string }; text?: string } | undefined;
  if (!message?.text) return NextResponse.json({ status: 'ok', handled: 0 });
  const chatId = String(message.chat?.id ?? '');
  if (!chatId || message.text.startsWith('/')) {
    return NextResponse.json({ status: 'ok', handled: 0 });
  }

  const integrations = await prisma.integration.findMany({
    where: { type: 'telegram', enabled: true }
  });

  for (const it of integrations) {
    let cfg: Record<string, unknown> = {};
    try {
      cfg = it.config ? JSON.parse(it.config) : {};
    } catch {}
    const token = String(cfg.token || '');
    if (!token) continue;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: Number(chatId) })
      });
      const data = (await res.json()) as { ok?: boolean };
      if (data.ok !== true) continue; // not this bot's chat

      await ingestMessage({
        businessId: it.businessId,
        channel: 'telegram',
        externalId: chatId,
        senderName: message.from?.first_name || 'Client',
        senderPhone: chatId,
        content: message.text,
        sourceTag: 'telegram'
      });
      return NextResponse.json({ status: 'ok', handled: 1 });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ status: 'ok', handled: 0 });
}