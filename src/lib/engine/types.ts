export type TriggerType =
  | 'MESSAGE_RECEIVED'
  | 'FORM_SUBMITTED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_REMINDER'
  | 'CUSTOMER_CREATED'
  | 'SCHEDULE'
  | 'WEBHOOK'
  | 'MANUAL';

export type NodeKind =
  | 'TRIGGER'
  | 'REPLY'
  | 'AI_REPLY'
  | 'NOTIFY'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'CREATE_TASK'
  | 'CREATE_APPOINTMENT'
  | 'SCHEDULE_REMINDER'
  | 'WEBHOOK_CALL'
  | 'DELAY'
  | 'CONDITION'
  | 'END';

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  label?: string;
  config: Record<string, unknown>;
}

export interface TriggerConfig {
  channels?: string[]; // whatsapp | facebook | instagram | telegram | form | web | manual | all
  keywords?: string[]; // trigger only when message contains one of these
  formSlug?: string;
  dateField?: string; // field for appointment date (form/appointment)
  serviceField?: string;
  reminderDays?: number; // days before appointment for APPOINTMENT_REMINDER
  schedule?: string; // cron expression (SCHEDULE)
}

export interface TriggerContext {
  businessId: string;
  businessName: string;
  businessSlug: string;
  triggerType: TriggerType;
  channel?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  messageText?: string;
  conversationId?: string;
  formSlug?: string;
  fields?: Record<string, string>;
  appointment?: {
    clientName: string;
    phone?: string | null;
    service?: string | null;
    startsAt: Date;
    id?: string;
  };
  external?: Record<string, unknown>;
  timestamp: Date;
  sendMessage?: boolean; // whether actions should actually send (manual test = false)
}

export interface StepResult {
  nodeId?: string;
  kind: NodeKind;
  status: 'ok' | 'skipped' | 'failed';
  detail?: string;
  externalId?: string;
}

const VALID_NODE_KINDS = new Set<string>([
  'TRIGGER', 'REPLY', 'AI_REPLY', 'NOTIFY', 'CREATE_CUSTOMER', 'UPDATE_CUSTOMER',
  'CREATE_TASK', 'CREATE_APPOINTMENT', 'SCHEDULE_REMINDER', 'WEBHOOK_CALL',
  'DELAY', 'CONDITION', 'END'
]);

// Validates + normalizes a raw node array before persisting.
export function sanitizeNodes(raw: unknown): WorkflowNode[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkflowNode[] = [];
  for (const n of raw) {
    if (!n || typeof n !== 'object') continue;
    const node = n as Partial<WorkflowNode>;
    if (!node.id || !VALID_NODE_KINDS.has(String(node.kind))) continue;
    out.push({
      id: String(node.id),
      kind: node.kind as NodeKind,
      label: typeof node.label === 'string' ? node.label : undefined,
      config: node.config && typeof node.config === 'object' ? { ...(node.config as object) } : {}
    });
  }
  return out;
}

export interface WorkflowResult {
  runId: string;
  status: 'success' | 'error' | 'partial';
  steps: StepResult[];
  message: string;
}

export const NODE_META: Record<
  string,
  { icon: string; color: string; labelKey: string; descKey: string; defaultConfig: Record<string, unknown> }
> = {
  REPLY: {
    icon: 'send',
    color: '#17a77f',
    labelKey: 'builder.node.reply',
    descKey: 'builder.node.replyDesc',
    defaultConfig: { text: 'Salam {{customer_name}}, merci de nous avoir contactés !' }
  },
  AI_REPLY: {
    icon: 'sparkles',
    color: '#7c3aed',
    labelKey: 'builder.node.aiReply',
    descKey: 'builder.node.aiReplyDesc',
    defaultConfig: { prompt: '' }
  },
  NOTIFY: {
    icon: 'bell',
    color: '#f59e0b',
    labelKey: 'builder.node.notify',
    descKey: 'builder.node.notifyDesc',
    defaultConfig: { to: 'all', text: 'Nouveau message de {{customer_name}}' }
  },
  CREATE_CUSTOMER: {
    icon: 'userPlus',
    color: '#0ea5e9',
    labelKey: 'builder.node.createCustomer',
    descKey: 'builder.node.createCustomer',
    defaultConfig: { status: 'qualified' }
  },
  UPDATE_CUSTOMER: {
    icon: 'userCog',
    color: '#0ea5e9',
    labelKey: 'builder.node.updateCustomer',
    descKey: 'builder.node.updateCustomer',
    defaultConfig: { status: 'contacted' }
  },
  CREATE_TASK: {
    icon: 'checkSquare',
    color: '#ef4444',
    labelKey: 'builder.node.task',
    descKey: 'builder.node.task',
    defaultConfig: { title: 'Suivre {{customer_name}}' }
  },
  CREATE_APPOINTMENT: {
    icon: 'calendar',
    color: '#10b981',
    labelKey: 'builder.node.appointment',
    descKey: 'builder.node.appointment',
    defaultConfig: { service: '', hoursFromNow: 24 }
  },
  SCHEDULE_REMINDER: {
    icon: 'alarmClock',
    color: '#f97316',
    labelKey: 'builder.node.reminder',
    descKey: 'builder.node.reminder',
    defaultConfig: { hours: 24, text: 'Rappel : votre rendez-vous {{appointment_date}}' }
  },
  WEBHOOK_CALL: {
    icon: 'webhook',
    color: '#6366f1',
    labelKey: 'builder.node.webhook',
    descKey: 'builder.node.webhook',
    defaultConfig: { url: '', payload: '{}' }
  },
  DELAY: {
    icon: 'clock',
    color: '#64748b',
    labelKey: 'builder.node.delay',
    descKey: 'builder.node.delay',
    defaultConfig: { hours: 24 }
  },
  CONDITION: {
    icon: 'gitFork',
    color: '#8b5cf6',
    labelKey: 'builder.node.condition',
    descKey: 'builder.node.condition',
    defaultConfig: { field: 'messageText', op: 'contains', value: 'prix' }
  },
  END: {
    icon: 'flag',
    color: '#94a3b8',
    labelKey: 'builder.node.end',
    descKey: 'builder.node.end',
    defaultConfig: {}
  }
};