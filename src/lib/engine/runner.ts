import { prisma } from '../db';
import { sendChannelMessage } from '../integrations/sender';
import { classifyLead, suggestReply } from '../ai';
import { bumpUsage } from '../usage';
import {
  TriggerContext,
  TriggerConfig,
  WorkflowNode,
  StepResult,
  WorkflowResult,
  NodeKind
} from './types';

export function interpolateVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([\w.]+)\}\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

export function buildVars(ctx: TriggerContext): Record<string, string> {
  const fields = ctx.fields ?? {};
  const ap = ctx.appointment;
  const vars: Record<string, string> = {
    customer_name: ctx.customerName || 'cher client',
    business_name: ctx.businessName,
    phone: ctx.customerPhone || '',
    email: ctx.customerEmail || '',
    message: ctx.messageText || '',
    channel: ctx.channel || '',
    appointment_date: ap ? fmtDateTime(ap.startsAt) : '',
    service: ap?.service || '',
    form: ctx.formSlug || ''
  };
  for (const [k, v] of Object.entries(fields)) vars[`fields.${k}`] = v ?? '';
  return vars;
}

function fmtDateTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat('fr-DZ', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function getBiz(businessId: string) {
  return prisma.business.findUnique({ where: { id: businessId } });
}

// -------------------------------------------------------------------------
// Core runner: executes the node list against a trigger context. Honest about
// every send: unconfigured channels are reported as failed steps, never faked.
// -------------------------------------------------------------------------
export async function runAutomation(
  automationId: string,
  businessId: string,
  ctx: TriggerContext,
  options?: { startAtIndex?: number; recordRun?: boolean }
): Promise<WorkflowResult> {
  const startAt = options?.startAtIndex ?? 0;
  const recordRun = options?.recordRun ?? true;

  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation || automation.businessId !== businessId) {
    return { runId: '', status: 'error', steps: [], message: 'automation_not_found' };
  }

  const business = await getBiz(businessId);
  if (!business) return { runId: '', status: 'error', steps: [], message: 'business_not_found' };

  const steps: StepResult[] = [];
  const nodes: WorkflowNode[] = parseJson<WorkflowNode[]>(automation.nodes) ?? [];
  const vars = buildVars(ctx);
  // add noise word so steps ordering stays human readable in logs

  if (recordRun) {
    await prisma.automation.update({
      where: { id: automationId },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() }
    });
  }

  const run = recordRun
    ? await prisma.workflowRun.create({
        data: {
          automationId,
          businessId,
          trigger: automation.triggerType,
          triggerSnapshot: JSON.stringify({
            channel: ctx.channel,
            message: ctx.messageText,
            customer: ctx.customerName,
            phone: ctx.customerPhone,
            fields: ctx.fields
          }),
          status: 'success'
        }
      })
    : null;

  let skipNext = false;
  let overall: 'success' | 'partial' | 'error' = 'success';

  for (let i = startAt; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;

    if (node.kind === 'END') {
      steps.push({ nodeId: node.id, kind: 'END', status: 'ok', detail: 'end' });
      break;
    }

    if (skipNext) {
      skipNext = false;
      steps.push({ nodeId: node.id, kind: node.kind, status: 'skipped', detail: 'skipped_by_condition' });
      continue;
    }

    try {
      const step = await runNode(business.id, node, ctx, vars, automation.triggerType === 'MANUAL');
      steps.push(step);
      if (step.status === 'failed') overall = 'partial';

      // Condition gates the following node
      if (node.kind === 'CONDITION' && step.status === 'ok' && step.detail === 'false') {
        skipNext = true;
      }
      // Delay pauses the rest of the workflow
      if (node.kind === 'DELAY' && step.status === 'ok') {
        await scheduleContinuation(automationId, businessId, ctx, i + 1, node.config);
        break;
      }
    } catch (e) {
      overall = 'partial';
      steps.push({ nodeId: node.id, kind: node.kind, status: 'failed', detail: String(e) });
    }
  }

  if (recordRun && run) {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: overall, finishedAt: new Date(), steps: JSON.stringify(steps) }
    });
  }

  return {
    runId: run?.id ?? '',
    status: overall,
    steps,
    message: overall === 'success' ? 'ok' : 'partial'
  };
}

async function scheduleContinuation(
  automationId: string,
  businessId: string,
  ctx: TriggerContext,
  nextIndex: number,
  config: Record<string, unknown>
) {
  const hours = Number(config.hours || 0);
  if (!hours || hours <= 0) return;
  await prisma.job.create({
    data: {
      businessId,
      type: 'scheduled',
      runAt: new Date(Date.now() + hours * 3600 * 1000),
      payload: JSON.stringify({ automationId, nextIndex, ctx: sanitizeCtx(ctx) }),
      status: 'pending'
    }
  });
}

function sanitizeCtx(ctx: TriggerContext): TriggerContext {
  return { ...ctx, timestamp: ctx.timestamp } as TriggerContext;
}

export async function runNode(
  businessId: string,
  node: WorkflowNode,
  ctx: TriggerContext,
  vars: Record<string, string>,
  manualTest = false
): Promise<StepResult> {
  switch (node.kind as NodeKind) {
    case 'TRIGGER':
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: ctx.triggerType };

    case 'REPLY': {
      const text = interpolateVars(String(node.config.text ?? ''), vars);
      if (!ctx.sendMessage && !manualTest) {
        return { nodeId: node.id, kind: node.kind, status: 'ok', detail: 'simulated', externalId: 'sim' };
      }
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) return { nodeId: node.id, kind: node.kind, status: 'failed', detail: 'no_business' };
      const res = await sendChannelMessage(business, ctx.channel ?? 'web', ctx.customerPhone, text);
      if (res.ok) {
        await recordOutboundMessage(businessId, ctx, text, node.id);
        await bumpUsage(businessId, 'messages');
        return { nodeId: node.id, kind: node.kind, status: 'ok', detail: 'sent', externalId: res.externalId };
      }
      await recordOutboundMessage(businessId, ctx, text, node.id, 'failed', res.reason);
      return { nodeId: node.id, kind: node.kind, status: 'failed', detail: res.reason || 'send_failed' };
    }

    case 'AI_REPLY': {
      const incoming = ctx.messageText || '';
      const { text } = await suggestReply(incoming, ctx.businessName);
      const node2 = { ...node, config: { ...node.config, text } };
      const res = await runNode(businessId, node2 as WorkflowNode, ctx, vars, manualTest);
      return res;
    }

    case 'NOTIFY': {
      const text = interpolateVars(String(node.config.text ?? 'Notification'), vars);
      const members = await prisma.membership.findMany({
        where: { businessId },
        include: { user: true }
      });
      const targets = (node.config.to as string) === 'owner'
        ? members.filter((m) => m.role === 'OWNER')
        : members.slice(0, 20);
      let count = 0;
      for (const m of targets) {
        await prisma.notification.create({
          data: {
            businessId,
            userId: m.userId,
            type: 'workflow',
            title: keepShort(text, 120),
            content: keepShort(text, 400),
            link: '/app/inbox'
          }
        });
        count++;
      }
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: `notified_${count}` };
    }

    case 'CREATE_CUSTOMER':
    case 'UPDATE_CUSTOMER': {
      let customerId = ctx.customerId;
      const source = ctx.channel && ctx.channel !== 'web' && ctx.channel !== 'manual' ? ctx.channel : 'form';
      if (!customerId) {
        // find by phone to avoid duplicates
        const existing = ctx.customerPhone
          ? await prisma.customer.findFirst({
              where: { businessId, phone: { contains: ctx.customerPhone.slice(-9) } }
            })
          : null;
        if (existing) customerId = existing.id;
      }
      if (customerId) {
        const cls = ctx.messageText ? classifyLead(ctx.messageText) : null;
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            status: (node.config.status as string) ?? cls?.status ?? 'contacted',
            tags: JSON.stringify([
              ...(cls ? [cls.tag] : []),
              ...(ctx.channel ? [ctx.channel] : [])
            ]),
            lastContactAt: new Date()
          }
        });
      } else {
        const cls = ctx.messageText ? classifyLead(ctx.messageText) : null;
        const created = await prisma.customer.create({
          data: {
            businessId,
            name: ctx.customerName || 'Nouveau contact',
            phone: ctx.customerPhone || null,
            email: ctx.customerEmail || null,
            source,
            status: (node.config.status as string) ?? cls?.status ?? 'new',
            tags: JSON.stringify([
              ...(cls ? [cls.tag] : []),
              ...(ctx.channel ? [ctx.channel] : []),
              ...(ctx.sourceTag ? [ctx.sourceTag] : [])
            ]),
            notes: ctx.messageText ? `Premier message : ${keepShort(ctx.messageText, 300)}` : null,
            lastContactAt: new Date()
          }
        });
        // transfer conversation link if present
        ctx.customerId = created.id;
        ctx.customerName = ctx.customerName || created.name;
        if (ctx.customerPhone) ctx.customerPhone = ctx.customerPhone;
        await bumpUsage(businessId, 'customers');
      }
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: customerId ? 'updated' : 'created' };
    }

    case 'CREATE_TASK': {
      const title = interpolateVars(String(node.config.title ?? 'Tâche'), vars);
      const members = await prisma.membership.findMany({ where: { businessId } });
      for (const m of members.slice(0, 10)) {
        await prisma.notification.create({
          data: {
            businessId,
            userId: m.userId,
            type: 'task',
            title: keepShort(title, 140),
            content: `${ctx.businessName} · ${ctx.customerName || ''}`,
            link: '/app/customers'
          }
        });
      }
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: 'task_created' };
    }

    case 'CREATE_APPOINTMENT': {
      const service = String(node.config.service ?? ctx.appointment?.service ?? '');
      const hours = Number(node.config.hoursFromNow || 24);
      const startsAt = new Date(Date.now() + hours * 3600 * 1000);
      const ap = await prisma.appointment.create({
        data: {
          businessId,
          customerId: ctx.customerId || null,
          clientName: ctx.customerName || 'Nouveau client',
          phone: ctx.customerPhone || null,
          service: service || null,
          startsAt,
          status: 'booked',
          source: ctx.channel || 'automation',
          notes: ctx.messageText ? keepShort(ctx.messageText, 200) : null
        }
      });
      // schedule reminder
      const reminder = await prisma.automation.findFirst({
        where: { businessId, triggerType: 'APPOINTMENT_REMINDER', enabled: true }
      });
      if (reminder) {
        const cfg = parseJson<Record<string, unknown>>(reminder.triggerConfig) ?? {};
        const days = Number(cfg.reminderDays || 1);
        await prisma.job.create({
          data: {
            businessId,
            type: 'reminder',
            runAt: new Date(startsAt.getTime() - days * 24 * 3600 * 1000),
            payload: JSON.stringify({
              automationId: reminder.id,
              appointmentId: ap.id,
              businessId
            }),
            status: 'pending'
          }
        });
      }
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: 'appointment_created' };
    }

    case 'SCHEDULE_REMINDER': {
      const hours = Number(node.config.hours || 24);
      const text = interpolateVars(String(node.config.text ?? 'Rappel'), vars);
      await prisma.job.create({
        data: {
          businessId,
          type: 'reminder',
          runAt: new Date(Date.now() + hours * 3600 * 1000),
          payload: JSON.stringify({
            message: text,
            businessId,
            channel: ctx.channel,
            customerPhone: ctx.customerPhone,
            customerName: ctx.customerName,
            customerEmail: ctx.customerEmail
          }),
          status: 'pending'
        }
      });
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: `reminder_in_${hours}h` };
    }

    case 'WEBHOOK_CALL': {
      const url = String(node.config.url ?? '').trim();
      if (!url) return { nodeId: node.id, kind: node.kind, status: 'failed', detail: 'no_url' };
      const payload = {
        event: 'wassil.trigger',
        business: ctx.businessSlug,
        customer: ctx.customerName,
        phone: ctx.customerPhone,
        message: ctx.messageText,
        fields: ctx.fields,
        timestamp: ctx.timestamp.toISOString()
      };
      // honor user-provided payload template (JSON object merged)
      if (node.config.payload && String(node.config.payload) !== '{}') {
        try {
          Object.assign(payload, JSON.parse(String(node.config.payload)));
        } catch {
          /* ignore */
        }
      }
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000)
        });
        return { nodeId: node.id, kind: node.kind, status: res.ok ? 'ok' : 'failed', detail: `http_${res.status}` };
      } catch (e) {
        return { nodeId: node.id, kind: node.kind, status: 'failed', detail: 'network_error' };
      }
    }

    case 'DELAY': {
      const hours = Number(node.config.hours || 0);
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: `delay_${hours}h` };
    }

    case 'CONDITION': {
      const field = String(node.config.field || 'messageText');
      const op = String(node.config.op || 'contains');
      const value = String(node.config.value || '');
      const actual = String(vars[field] ?? vars[`fields.${field}`] ?? '');
      let ok = false;
      if (op === 'equals') ok = actual.toLowerCase() === value.toLowerCase();
      else if (op === 'notEquals') ok = actual.toLowerCase() !== value.toLowerCase();
      else if (op === 'greaterThan') ok = Number(actual) > Number(value);
      else if (op === 'lessThan') ok = Number(actual) < Number(value);
      else ok = actual.toLowerCase().includes(value.toLowerCase());
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: ok ? 'true' : 'false' };
    }

    default:
      return { nodeId: node.id, kind: node.kind, status: 'ok', detail: 'noop' };
  }
}

async function recordOutboundMessage(
  businessId: string,
  ctx: TriggerContext,
  text: string,
  nodeId: string,
  status = 'sent',
  detail?: string
) {
  try {
    // find or keep conversation
    let conversation = ctx.customerId
      ? await prisma.conversation.findFirst({
          where: { businessId, customerId: ctx.customerId, status: 'open' }
        })
      : null;
    if (!conversation && ctx.customerPhone) {
      conversation = await prisma.conversation.findFirst({
        where: { businessId, externalId: ctx.customerPhone }
      });
    }
    if (!conversation) {
      const customer = ctx.customerId
        ? await prisma.customer.findUnique({ where: { id: ctx.customerId } })
        : null;
      conversation = await prisma.conversation.create({
        data: {
          businessId,
          channel: ctx.channel || 'web',
          customerId: customer?.id ?? null,
          externalId: ctx.customerPhone || null,
          title: customer?.name ?? ctx.customerName ?? 'Nouveau contact',
          lastMessageAt: new Date()
        }
      });
    }
    await prisma.message.create({
      data: {
        businessId,
        conversationId: conversation.id,
        direction: 'out',
        sender: ctx.businessName,
        content: text,
        channel: ctx.channel || 'web',
        type: 'notification',
        status,
        metadata: JSON.stringify({ nodeId, detail: detail || null })
      }
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: 'open' }
    });
  } catch (e) {
    console.error('recordOutboundMessage failed', e);
  }
}

function keepShort(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 3) + '…' : s;
}

// Add sourceTag to context type value availability
declare module './types' {
  interface TriggerContext {
    sourceTag?: string;
  }
}