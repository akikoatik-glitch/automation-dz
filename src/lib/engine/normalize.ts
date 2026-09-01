// Normalizes the UI trigger descriptor ({type, channels, keywords…}) into the
// persisted shape stored on Automation.triggerConfig.
export interface NormalizedTrigger {
  type: string;
  channels?: string[];
  keywords?: string[];
  formSlug?: string;
  dateField?: string;
  serviceField?: string;
  reminderDays?: number;
  schedule?: string;
  sourceTag?: string;
}

export function normalizeTrigger(trigger: unknown): NormalizedTrigger {
  const t = (trigger && typeof trigger === 'object' ? trigger : {}) as Record<string, unknown>;
  const type = String(t.type || 'MESSAGE_RECEIVED').toLowerCase();
  const mapped =
    type === 'message_received' || type === 'message' ? 'MESSAGE_RECEIVED'
    : type === 'form_submitted' || type === 'form' ? 'FORM_SUBMITTED'
    : type === 'appointment_created' || type === 'appointment' ? 'APPOINTMENT_CREATED'
    : type === 'appointment_reminder' || type === 'reminder' ? 'APPOINTMENT_REMINDER'
    : type === 'customer_created' || type === 'customer' ? 'CUSTOMER_CREATED'
    : type === 'schedule' ? 'SCHEDULE'
    : type === 'webhook' || type === 'incoming_webhook' ? 'WEBHOOK'
    : type === 'manual' ? 'MANUAL'
    : 'MESSAGE_RECEIVED';

  return {
    type: mapped,
    channels: Array.isArray(t.channels) ? (t.channels as string[]) : undefined,
    keywords: Array.isArray(t.keywords) ? (t.keywords as string[]) : undefined,
    formSlug: t.formSlug ? String(t.formSlug) : undefined,
    dateField: t.dateField ? String(t.dateField) : undefined,
    serviceField: t.serviceField ? String(t.serviceField) : undefined,
    reminderDays: Number(t.reminderDays) || undefined,
    schedule: t.schedule ? String(t.schedule) : undefined,
    sourceTag: t.sourceTag ? String(t.sourceTag) : undefined
  };
}