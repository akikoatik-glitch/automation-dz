import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

const CHANNEL_META = [
  { type: 'whatsapp', label: 'WhatsApp Business', icon: 'whatsapp', requires: ['accessToken', 'phoneNumberId'] },
  { type: 'facebook', label: 'Facebook Messenger', icon: 'facebook', requires: [] },
  { type: 'instagram', label: 'Instagram Direct', icon: 'instagram', requires: [] },
  { type: 'telegram', label: 'Telegram', icon: 'telegram', requires: ['token'] },
  { type: 'email', label: 'Email (SMTP)', icon: 'mail', requires: [] },
  { type: 'sms', label: 'SMS (Djezzy/Ooredoo)', icon: 'message', requires: [] },
  { type: 'ai', label: 'IA', icon: 'bot', requires: ['apiKey'] }
];

function parseConfig(s: string | null): Record<string, unknown> | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const rows = await prisma.integration.findMany({ where: { businessId } });
  const byType = new Map(rows.map((r) => [r.type, r]));

  const integrations = CHANNEL_META.map((m) => {
    const row = byType.get(m.type);
    const config = row ? parseConfig(row.config) ?? {} : {};
    const configured = m.requires.every((k) => Boolean(config[k])) || (m.type === 'ai' && Boolean(process.env.AI_API_KEY));
    return {
      type: m.type,
      label: m.label,
      icon: m.icon,
      configured,
      enabled: row?.enabled ?? false,
      status: row?.status ?? 'inactive',
      id: row?.id ?? null,
      config
    };
  });

  return NextResponse.json({ integrations });
}

export async function PATCH(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '');
  const enabled = !!body.enabled;
  const valid = CHANNEL_META.some((m) => m.type === type);
  if (!valid) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const integration = await prisma.integration.upsert({
    where: { businessId_type: { businessId, type } },
    create: {
      businessId,
      type,
      name: CHANNEL_META.find((m) => m.type === type)?.label || type,
      enabled,
      status: enabled ? 'active' : 'inactive'
    },
    update: { enabled, status: enabled ? 'active' : 'inactive' }
  });
  return NextResponse.json({ integration });
}