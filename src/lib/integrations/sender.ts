import { prisma } from '../db';
import type { Business } from '@prisma/client';

export interface SendResult {
  ok: boolean;
  externalId?: string;
  reason?: string;
}

function parseConfig(s: string | null): Record<string, unknown> | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Sends an outbound message over the given channel using the workspace's
// configured integration. Unconfigured channels return ok:false so the
// workflow runner can mark the step accurately (no fake success).
export async function sendChannelMessage(
  business: Business,
  channel: string,
  to: string | null | undefined,
  text: string
): Promise<SendResult> {
  const toNormalized = (to || '').trim();
  if (!text) return { ok: false, reason: 'empty_text' };
  if (!toNormalized) return { ok: false, reason: 'no_recipient' };

  const integration = await prisma.integration.findUnique({
    where: { businessId_type: { businessId: business.id, type: channel } }
  });

  if (!integration || !integration.enabled) {
    return { ok: false, reason: 'integration_not_configured' };
  }

  const config = parseConfig(integration.config) ?? {};
  const businessName = business.name;

  switch (channel) {
    case 'telegram': {
      const token = (config.token as string) || '';
      if (!token) return { ok: false, reason: 'integration_not_configured' };
      const chatId = toNormalized.replace(/\D/g, '');
      if (!chatId) return { ok: false, reason: 'no_recipient' };
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: Number(chatId), text, disable_web_page_preview: true })
          }
        );
        const data = (await res.json()) as { ok?: boolean; result?: { message_id?: number } };
        if (data.ok) {
          return { ok: true, externalId: String(data.result?.message_id ?? '') };
        }
        return { ok: false, reason: data.ok === false ? 'telegram_api_error' : 'http_error' };
      } catch {
        return { ok: false, reason: 'network_error' };
      }
    }

    case 'whatsapp': {
      // Meta WhatsApp Cloud API
      const phoneId = (config.phoneNumberId as string) || '';
      const token = (config.accessToken as string) || '';
      if (!phoneId || !token) return { ok: false, reason: 'integration_not_configured' };
      const toNum = toNormalized.replace(/\D/g, '');
      if (!toNum) return { ok: false, reason: 'no_recipient' };
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: toNum,
              type: 'text',
              text: { body: text }
            })
          }
        );
        const data = (await res.json()) as { error?: { message?: string }; messages?: Array<{ id?: string }> };
        if (data.error) return { ok: false, reason: 'whatsapp_api_error' };
        return { ok: true, externalId: data.messages?.[0]?.id };
      } catch {
        return { ok: false, reason: 'network_error' };
      }
    }

    case 'email': {
      // SMTP sending if configured via env; otherwise mark unconfigured.
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return { ok: false, reason: 'integration_not_configured' };
      }
      try {
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT || 587) === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `Wassil <no-reply>`,
          to: toNormalized,
          subject: `Message de ${businessName}`,
          text
        });
        return { ok: true };
      } catch {
        return { ok: false, reason: 'smtp_error' };
      }
    }

    default:
      // facebook / instagram / sms / form / web / manual don't send out
      // without their provider API. Not a fake success.
      return { ok: false, reason: 'channel_not_available' };
  }
}