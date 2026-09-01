import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { getLimits } from '@/lib/usage';
import { sanitizeNodes } from '@/lib/engine/types';
import { normalizeTrigger } from '@/lib/engine/normalize';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const automations = await prisma.automation.findMany({
    where: { businessId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { runs: true } } }
  });
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const limits = await getLimits(businessId);
  if (limits.automations > 0) {
    const count = await prisma.automation.count({ where: { businessId } });
    if (count >= limits.automations)
      return NextResponse.json({ error: 'limit_exceeded', message: 'Limite d’automatisations atteinte' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'invalid', message: 'name required' }, { status: 400 });

  const trigger = normalizeTrigger(body.trigger);
  const nodes = sanitizeNodes(body.nodes || []);

  const automation = await prisma.automation.create({
    data: {
      businessId,
      name,
      description: body.description ? String(body.description).slice(0, 500) : null,
      industry: body.industry ? String(body.industry) : null,
      triggerType: trigger.type,
      triggerConfig: JSON.stringify(trigger),
      nodes: JSON.stringify(nodes),
      enabled: !!body.enabled,
      aiGenerated: !!body.aiGenerated,
      createdById: userId === 'apikey' ? null : userId
    }
  });

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'automation.created',
    entityType: 'automation',
    entityId: automation.id,
    summary: `Automatisation « ${automation.name} » créée`
  });

  return NextResponse.json({ automation }, { status: 201 });
}