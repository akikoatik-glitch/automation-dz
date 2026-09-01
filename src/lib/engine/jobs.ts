import { prisma } from '../db';
import { runAutomation } from './runner';
import { sendChannelMessage } from '../integrations/sender';
import { TriggerContext } from './types';

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// Processes all due scheduled jobs. Intended to be called by the cron endpoint.
export async function processDueJobs(limit = 50): Promise<{ processed: number }> {
  const now = new Date();
  const jobs = await prisma.job.findMany({
    where: { runAt: { lte: now }, status: 'pending' },
    orderBy: { runAt: 'asc' },
    take: limit
  });

  let processed = 0;
  for (const job of jobs) {
    try {
      await executeJob(job);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'done', executedAt: new Date() }
      });
      processed++;
    } catch (e) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(e) }
      });
    }
  }
  return { processed };
}

async function executeJob(job: {
  id: string;
  businessId: string;
  type: string;
  payload: string | null;
}): Promise<void> {
  const payload = parseJson<Record<string, unknown>>(job.payload);
  if (!payload) return;

  if (job.type === 'scheduled') {
    // Resume a workflow after a DELAY
    const automationId = String(payload.automationId || '');
    const nextIndex = Number(payload.nextIndex || 0);
    const ctx = payload.ctx as unknown as TriggerContext;
    if (!automationId || !ctx) return;
    ctx.businessId = job.businessId;
    await runAutomation(automationId, job.businessId, ctx, {
      startAtIndex: nextIndex,
      recordRun: true
    });
    return;
  }

  if (job.type === 'reminder') {
    // Either a plain scheduled message, or an appointment reminder tied to an automation.
    const message = String(payload.message || '');
    const automationId = payload.automationId ? String(payload.automationId) : null;
    const appointmentId = payload.appointmentId ? String(payload.appointmentId) : null;

    if (automationId && appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });
      if (!appointment) return;
      if (appointment.status === 'cancelled') return; // don't remind cancelled
      const business = await prisma.business.findUnique({ where: { id: job.businessId } });
      if (!business) return;
      const automation = await prisma.automation.findUnique({ where: { id: automationId } });
      if (!automation) return;

      const ctx: TriggerContext = {
        businessId: job.businessId,
        businessName: business.name,
        businessSlug: business.slug,
        triggerType: 'APPOINTMENT_REMINDER',
        timestamp: new Date(),
        channel: 'whatsapp',
        customerName: appointment.clientName || '',
        customerPhone: appointment.phone || '',
        customerId: appointment.customerId || undefined,
        appointment: {
          id: appointment.id,
          clientName: appointment.clientName,
          phone: appointment.phone,
          service: appointment.service,
          startsAt: appointment.startsAt
        }
      };
      await runAutomation(automation.id, job.businessId, ctx, { recordRun: true });
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true }
      });
      return;
    }

    if (message) {
      const business = await prisma.business.findUnique({ where: { id: job.businessId } });
      if (!business) return;
      await sendChannelMessage(
        business,
        String(payload.channel || 'whatsapp'),
        String(payload.customerPhone || ''),
        message
      );
      return;
    }
  }
}

// Long-poll Telegram updates for integrations that don't use a public webhook
// (e.g. local dev). Called from the cron endpoint.
export async function pollTelegramInboxes(): Promise<number> {
  const integrations = await prisma.integration.findMany({
    where: { type: 'telegram', enabled: true },
    include: { business: true }
  });
  let handled = 0;
  for (const it of integrations) {
    const cfg = parseJson<Record<string, unknown>>(it.config);
    const token = cfg?.token;
    if (!token) continue;
    let offset = Number(cfg?.lastUpdateId || 0);
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=1&offset=${offset + 1}&limit=10`
      );
      const data = (await res.json()) as {
        ok?: boolean;
        result?: Array<{
          update_id: number;
          message?: { message_id: number; chat?: { id: number }; from?: { first_name?: string }; text?: string };
        }>;
      };
      const updates = data.ok ? data.result || [] : [];
      for (const u of updates) {
        offset = Math.max(offset, u.update_id);
        const msg = u.message;
        if (!msg?.text) continue;
        const chatId = String(msg.chat?.id ?? '');
        const senderName = msg.from?.first_name || 'Client';
        // Skip commands from the owner (starts with /)
        if (msg.text.startsWith('/')) continue;
        const { ingestMessage } = await import('./trigger');
        await ingestMessage({
          businessId: it.businessId,
          channel: 'telegram',
          externalId: chatId,
          senderName,
          senderPhone: chatId,
          content: msg.text,
          sourceTag: 'telegram'
        });
        handled++;
      }
      await prisma.integration.update({
        where: { id: it.id },
        data: { config: JSON.stringify({ ...cfg, lastUpdateId: offset }) }
      });
    } catch {
      // network error — try next integration
    }
  }
  return handled;
}

// Run zero-cost platform housekeeping each cron pass:
// mark overdue invoices.
export async function updateOverdueInvoices(): Promise<number> {
  const res = await prisma.invoice.updateMany({
    where: { status: 'pending', dueDate: { lt: new Date() } },
    data: { status: 'overdue' }
  });
  return res.count;
}