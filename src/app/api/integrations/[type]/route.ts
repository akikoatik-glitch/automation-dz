import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest, ctx: { params: { type: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const integration = await prisma.integration.findFirst({
    where: { businessId: auth.ctx.businessId, type: ctx.params.type }
  });
  return NextResponse.json({ integration });
}

// PUT { config } → save integration credentials (masked on read)
export async function PUT(req: NextRequest, ctx: { params: { type: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const type = ctx.params.type;

  const body = await req.json().catch(() => ({}));
  const config = (body.config && typeof body.config === 'object' ? body.config : {}) as Record<string, unknown>;
  const name = String(body.name || type);

  const integration = await prisma.integration.upsert({
    where: { businessId_type: { businessId, type } },
    create: { businessId, type, name, config: JSON.stringify(config), status: 'active', enabled: true },
    update: { name, config: JSON.stringify(config), status: 'active', enabled: true, lastTestedAt: null }
  });

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'integration.configured',
    entityType: 'integration',
    entityId: integration.id,
    summary: `Intégration ${type} configurée`
  });

  // Mask secrets in response
  const safe = maskConfig(config);
  return NextResponse.json({ integration: { ...integration, config: safe } });
}

// POST ?action=test → verify credentials without sending a message
export async function POST(req: NextRequest, ctx: { params: { type: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;
  const integration = await prisma.integration.findFirst({
    where: { businessId, type: ctx.params.type }
  });
  if (!integration?.config) return NextResponse.json({ error: 'not_configured' }, { status: 400 });

  const config = JSON.parse(integration.config) as Record<string, unknown>;
  let ok = false;
  let detail = 'not_tested';

  if (ctx.params.type === 'telegram' && config.token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.token}/getMe`);
      const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
      ok = data.ok === true;
      detail = ok ? `@${data.result?.username || 'ok'}` : 'unauthorized';
    } catch (e) {
      detail = 'network_error';
    }
  } else if (ctx.params.type === 'whatsapp') {
    ok = Boolean(config.accessToken && config.phoneNumberId);
    detail = ok ? 'config_valid' : 'missing_credentials';
  } else if (ctx.params.type === 'ai') {
    ok = Boolean(process.env.AI_API_KEY) || Boolean(config.apiKey);
    detail = ok ? 'platform_key' : 'no_key';
  } else {
    ok = Boolean(Object.keys(config).length > 0);
    detail = 'stored_config';
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastTestedAt: new Date(), status: ok ? 'active' : 'error' }
  });
  return NextResponse.json({ ok, detail });
}

function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (typeof v === 'string' && (v.length > 8) && /token|key|secret|password/i.test(k)) {
      out[k] = v.slice(0, 4) + '••••' + v.slice(-4);
    } else {
      out[k] = v;
    }
  }
  return out;
}