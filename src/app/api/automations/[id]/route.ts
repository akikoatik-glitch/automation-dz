import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { sanitizeNodes, TriggerContext } from '@/lib/engine/types';
import { runAutomation } from '@/lib/engine/runner';
import { normalizeTrigger } from '@/lib/engine/normalize';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;
  const auto = await prisma.automation.findFirst({
    where: { id: ctx.params.id, businessId },
    include: { _count: { select: { runs: true } } }
  });
  if (!auto) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let trigger = null;
  try {
    trigger = auto.triggerConfig ? JSON.parse(auto.triggerConfig) : { type: auto.triggerType };
  } catch {
    trigger = { type: auto.triggerType };
  }
  return NextResponse.json({ automation: { ...auto, trigger } });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const existing = await prisma.automation.findFirst({ where: { id: ctx.params.id, businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.automation.delete({ where: { id: ctx.params.id } });
  await prisma.workflowRun.deleteMany({ where: { automationId: ctx.params.id } });
  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'automation.deleted',
    summary: `Automatisation « ${existing.name} » supprimée`
  });
  return NextResponse.json({ ok: true });
}

// POST with ?action=toggle|save|run
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const existing = await prisma.automation.findFirst({ where: { id: ctx.params.id, businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const action = req.nextUrl.searchParams.get('action');
  const body = await req.json().catch(() => ({}));

  if (action === 'toggle') {
    const enabled = !!body.enabled;
    const updated = await prisma.automation.update({ where: { id: ctx.params.id }, data: { enabled } });
    await logActivity({
      businessId,
      userId: userId === 'apikey' ? null : userId,
      kind: 'automation.updated',
      entityType: 'automation',
      entityId: updated.id,
      summary: `Automatisation « ${updated.name} » ${enabled ? 'activée' : 'désactivée'}`
    });
    return NextResponse.json({ automation: updated });
  }

  if (action === 'save') {
    const name = String(body.name || existing.name).trim() || existing.name;
    const trigger = normalizeTrigger(body.trigger !== undefined ? body.trigger : existing.triggerConfig);
    const nodes = sanitizeNodes(body.nodes !== undefined ? body.nodes : existing.nodes);
    const updated = await prisma.automation.update({
      where: { id: ctx.params.id },
      data: {
        name,
        description: body.description !== undefined ? String(body.description).slice(0, 500) : existing.description,
        triggerType: trigger.type,
        triggerConfig: JSON.stringify(trigger),
        nodes: JSON.stringify(nodes),
        enabled: body.enabled !== undefined ? !!body.enabled : existing.enabled,
        updatedAt: new Date()
      }
    });
    await logActivity({
      businessId,
      userId: userId === 'apikey' ? null : userId,
      kind: 'automation.updated',
      entityType: 'automation',
      entityId: updated.id,
      summary: `Automatisation « ${name} » mise à jour`
    });
    return NextResponse.json({ automation: updated });
  }

  if (action === 'run') {
    const cid = String(body.cid || body.conversationId || '');
    let trigger = null;
    try {
      trigger = existing.triggerConfig ? JSON.parse(existing.triggerConfig) : null;
    } catch {
      trigger = null;
    }

    const base: TriggerContext = {
      businessId,
      businessName: '',
      businessSlug: '',
      triggerType: existing.triggerType as TriggerContext['triggerType'],
      timestamp: new Date(),
      channel: body.channel ? String(body.channel) : 'whatsapp',
      sendMessage: false
    };
    if (trigger?.sourceTag) base.sourceTag = String(trigger.sourceTag);

    if (existing.triggerType === 'MANUAL' || body.mode === 'manual') {
      base.channel = 'manual';
      base.messageText = String(body.content || 'Runtime de test');
      if (cid) base.conversationId = cid;
    } else if (existing.triggerType === 'WEBHOOK') {
      base.channel = 'webhook';
      base.external = body.payload || {};
      base.messageText = JSON.stringify(body.payload || {});
    } else {
      base.messageText = String(body.content || 'Message de test');
      if (cid) base.conversationId = cid;
    }

    const result = await runAutomation(existing.id, businessId, base, { recordRun: false });
    return NextResponse.json({ result });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}