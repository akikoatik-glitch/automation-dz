import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { getLimits } from '@/lib/usage';
import { sanitizeNodes } from '@/lib/engine/types';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const limits = await getLimits(businessId);
  if (limits.automations > 0) {
    const count = await prisma.automation.count({ where: { businessId } });
    if (count >= limits.automations)
      return NextResponse.json({ error: 'limit_exceeded' }, { status: 429 });
  }

  const tpl = await prisma.template.findUnique({ where: { id: ctx.params.id } });
  if (!tpl) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || tpl.name || 'Nouvelle automatisation').trim();

  const automation = await prisma.automation.create({
    data: {
      businessId,
      name,
      description: tpl.description ? `${tpl.description}`.slice(0, 500) : null,
      industry: tpl.industry,
      triggerType: tpl.triggerType,
      triggerConfig: tpl.triggerConfig,
      nodes: JSON.stringify(sanitizeNodes(JSON.parse(tpl.nodes))),
      enabled: !!body.enableNow
    }
  });

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'automation.created',
    entityType: 'automation',
    entityId: automation.id,
    summary: `Automatisation « ${automation.name} » créée depuis un modèle`
  });

  return NextResponse.json({ automation }, { status: 201 });
}