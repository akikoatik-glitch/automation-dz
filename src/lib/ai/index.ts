import { TriggerContext } from '../engine/types';

// ---------------------------------------------------------------------------
// Graceful AI layer. If AI_API_KEY is set, uses an OpenAI-compatible endpoint.
// Otherwise falls back to honest, rule-based logic built for Algerian business
// conversations. Nothing here ever mocks a successful API call.
// ---------------------------------------------------------------------------

function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

function modelName(): string {
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

function baseUrl(): string {
  return process.env.AI_BASE_URL || 'https://api.openai.com/v1';
}

async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  json = false
): Promise<string | null> {
  if (!aiConfigured()) return null;
  try {
    const res = await fetch(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName(),
        messages,
        temperature: 0.4,
        response_format: json ? { type: 'json_object' } : undefined
      })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ---- Reply suggestions -----------------------------------------------

const greetingAr = /(سلام|salut|bonjour|bonsoir|salam|صباح|مساء|slm|salem)/i;

export async function suggestReply(
  incoming: string,
  businessName: string
): Promise<{ text: string; offline: boolean }> {
  const prompt = [
    `You help a ${businessName} (an Algerian business) reply to a client message.`,
    `Write a short, warm, professional reply in the same language as the client message (Arabic/French/English mix with Algerian slang is fine).`,
    `Keep it under 2 sentences. End with a helpful question or a clear next step.`,
    `Client message: "${incoming}".`,
    `Reply with only the message text.`
  ].join('\n');

  const out = await chatCompletion([
    { role: 'system', content: 'You are a customer service assistant for Algerian businesses.' },
    { role: 'user', content: prompt }
  ]);
  if (out) return { text: out.trim(), offline: false };

  // Rule-based fallback
  if (greetingAr.test(incoming)) {
    return {
      text:
        'Salam! 🥰 Bienvenue chez ' +
        businessName +
        '. Comment pouvons-nous vous aider aujourd’hui ? (نحن هنا لخدمتكم)',
      offline: true
    };
  }
  if (/prix|price|coût|cost|كم الثمن|ثمن|combi|اشنو الثمن/i.test(incoming)) {
    return {
      text:
        'Merci de votre intérêt ! 📞 Pour un devis précis, nous vous proposons nos tarifs par message privé. Pouvez-vous nous envoyer votre numéro de téléphone ? (قد نرسل لكم الأسعار عبر رسالة خاصة)',
      offline: true
    };
  }
  if (/rdv|rendez|موعد|booking|take|book/i.test(incoming)) {
    return {
      text:
        'Avec plaisir ! 🗓️ Nous vous proposons un rendez-vous. Quel jour et quelle heure vous arrangent-ils ?',
      offline: true
    };
  }
  if (/heure|horaire|وقت|où|wen|location|adresse|عنوان|فين/i.test(incoming)) {
    return {
      text:
        'Nous sommes disponibles pour vous ! 🕐 Pouvez-vous nous préciser votre question, nous répondrons immédiatement (أرسلنا لكم معلومات العمل في رسالة خاصة).',
      offline: true
    };
  }
  return {
    text:
      `Merci de nous avoir contactés ! 🙏 Nous avons bien reçu votre message et revenons vers vous très vite. ` +
      `(شكراً لتواصلكم معنا، سنرد عليكم قريباً)`,
    offline: true
  };
}

// ---- Lead classification ---------------------------------------------

export function classifyLead(message: string): { status: string; tag: string } {
  const m = message.toLowerCase();
  if (/rdv|rendez|موعد|حجز/.test(m)) return { status: 'qualified', tag: 'wants_appointment' };
  if (/prix|tarif|price|ثمن|سعر/.test(m)) return { status: 'qualified', tag: 'asking_price' };
  if (/commande|order|شراء|طلب/.test(m)) return { status: 'qualified', tag: 'wants_order' };
  if (/urgent|عاجل|asap/.test(m)) return { status: 'qualified', tag: 'urgent' };
  return { status: 'contacted', tag: 'new_enquiry' };
}

// ---- Automation generation -------------------------------------------

export interface GeneratedAutomation {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  nodes: Array<{
    id: string;
    kind: string;
    label?: string;
    config: Record<string, unknown>;
  }>;
}

export async function generateAutomation(
  description: string,
  language: string,
  category?: string
): Promise<{ automation: GeneratedAutomation; offline: boolean }> {
  const nodeDefs = [
    'REPLY {text:string} send a message',
    'AI_REPLY {prompt:string} generate an AI reply',
    'NOTIFY {to:string("all"|"owner"),text:string} notify team',
    'CREATE_CUSTOMER {status:string} save customer',
    'UPDATE_CUSTOMER {status:string} update customer status/tags',
    'CREATE_TASK {title:string} create internal task',
    'CREATE_APPOINTMENT {service:string,hoursFromNow:number} create appointment',
    'SCHEDULE_REMINDER {hours:number,text:string} schedule a reminder message',
    'WEBHOOK_CALL {url:string,payload:string} call webhook',
    'DELAY {hours:number} wait',
    'CONDITION {field:string,op:string("contains"|"equals"|"notEquals"),value:string} branch',
    'END {} end'
  ];
  const triggers = [
    'MESSAGE_RECEIVED {channels:string[], keywords?:string[]}',
    'FORM_SUBMITTED {formSlug?:string, dateField?:string}',
    'APPOINTMENT_CREATED {serviceField?:string}',
    'APPOINTMENT_REMINDER {reminderDays:number}',
    'CUSTOMER_CREATED {}',
    'WEBHOOK {}',
    'MANUAL {}'
  ];

  const sys = [
    'You design automation workflows for an Algerian business automation platform.',
    `The user describes what they want in language "${language}". The user may write in Arabic, French, English, or Algerian Darija (mixed).`,
    'Understand the INTENT of the request in any language. Choose the best triggerType (one of ' +
      triggers.join(', ') +
      ') and build a simple, practical chain of nodes.',
    `The user picked the context/category "${category ?? 'unknown'}" but trust the actual description over the category.`,
    'Return a JSON object with keys: name, description, triggerType, triggerConfig (object), nodes (ordered array of node objects).',
    'Each node has: id (camelCase string), kind (one of ' +
      nodeDefs.join('; ') +
      '), label (short), config (object matching the node kind).',
    'The FIRST node must be kind "TRIGGER" with config {}. Then include 1 to 5 action nodes. Do NOT add an END node (the platform adds it).',
    'Use REPLY messages in the same language as the user request, including {{customer_name}} and {{business_name}} variables. Default channels to ["whatsapp"].',
    'For appointment reminders use APPOINTMENT_REMINDER trigger with reminderDays=1 and a REPLY text mentioning {{appointment_date}}.',
    'Prefer simple, practical workflows a non-technical small business owner understands immediately.'
  ].join('\n');

  const out = await chatCompletion(
    [
      { role: 'system', content: sys },
      { role: 'user', content: `Describe what you want (in any language): ${description}` }
    ],
    true
  );

  if (out) {
    try {
      const parsed = JSON.parse(out);
      let nodes: GeneratedAutomation['nodes'] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      // Normalize: prepend a TRIGGER node if missing, strip END nodes
      nodes = nodes.filter((n: { kind?: string }) => String(n.kind || '') !== 'END');
      if (nodes.length === 0 || String(nodes[0].kind) !== 'TRIGGER') {
        nodes = [{ id: 'trigger', kind: 'TRIGGER', label: 'Déclencheur', config: {} }, ...nodes];
      }
      const automation: GeneratedAutomation = {
        name: parsed.name || 'Generated automation',
        description: parsed.description || description.slice(0, 120),
        triggerType: parsed.triggerType || 'MESSAGE_RECEIVED',
        triggerConfig: parsed.triggerConfig || { channels: ['whatsapp'] },
        nodes
      };
      return { automation, offline: false };
    } catch {
      // fall through to rule-based
    }
  }

  return { automation: ruleBasedGeneration(description), offline: true };
}

// Rule-based generator (works offline, with honest status).
function ruleBasedGeneration(description: string): GeneratedAutomation {
  const d = description.toLowerCase();
  const business = '{{business_name}}';

  if (/clinique|dentist|medical|عيادة|طبيب|مختبر|pharmacie/i.test(d)) {
    return {
      name: 'Suivi patient clinique',
      description: 'Réponse automatique, enregistrement et rappel de rendez-vous.',
      triggerType: 'MESSAGE_RECEIVED',
      triggerConfig: { channels: ['whatsapp'] },
      nodes: [
        { id: 'n1', kind: 'TRIGGER', label: 'Message WhatsApp', config: {} },
        { id: 'n2', kind: 'CREATE_CUSTOMER', label: 'Enregistrer le patient', config: { status: 'qualified' } },
        { id: 'n3', kind: 'REPLY', label: 'Accusé de réception', config: { text: `بسم الله، شكراً لتواصلكم مع ${business}. عيادتنا ترد عليكم سريعاً.` } },
        { id: 'n4', kind: 'AI_REPLY', label: 'Réponse contextuelle', config: { prompt: '' } },
        { id: 'n5', kind: 'NOTIFY', label: 'Prévenir la réception', config: { to: 'all', text: 'Nouveau message patient' } }
      ]
    };
  }
  if (/salon|coiffure|beauté|spa|صالون|تجميل|esthe/i.test(d)) {
    return {
      name: 'Réservation salon automatique',
      description: 'Réponse rapide, réservation et rappels.',
      triggerType: 'MESSAGE_RECEIVED',
      triggerConfig: { channels: ['whatsapp'] },
      nodes: [
        { id: 'n1', kind: 'TRIGGER', label: 'Message WhatsApp', config: {} },
        { id: 'n2', kind: 'REPLY', label: 'Bienvenue', config: { text: `Salam 👋 Bienvenue chez ${business} ! Dispo. sur les horaires d’ouverture.` } },
        { id: 'n3', kind: 'CREATE_CUSTOMER', label: 'Enregistrer', config: { status: 'contacted' } },
        { id: 'n4', kind: 'NOTIFY', label: 'Notifier', config: { to: 'all', text: 'Nouveau client salon' } }
      ]
    };
  }
  if (/restaurant|café|pizzeria|مطعم|قهوة/i.test(d)) {
    return {
      name: 'Gestion commandes restaurant',
      description: 'Confirmation de commande et suivi livraison.',
      triggerType: 'MESSAGE_RECEIVED',
      triggerConfig: { channels: ['whatsapp'] },
      nodes: [
        { id: 'n1', kind: 'TRIGGER', label: 'Message WhatsApp', config: {} },
        { id: 'n2', kind: 'CREATE_CUSTOMER', label: 'Enregistrer', config: { status: 'contacted' } },
        { id: 'n3', kind: 'REPLY', label: 'Confirmation', config: { text: `Merci de commander chez ${business} 🍽️ Votre commande est bien reçue.` } },
        { id: 'n4', kind: 'NOTIFY', label: 'Alerter cuisine', config: { to: 'all', text: 'Nouvelle commande à traiter' } }
      ]
    };
  }
  if (/restaurant/i.test(d)) {
    // placeholder (unreachable duplicate branch avoided)
  }
  if (/immobilier|bien|vente|location|عقار/i.test(d)) {
    return {
      name: 'Capture leads immobilier',
      description: 'Enregistrer chaque demande et relancer.',
      triggerType: 'MESSAGE_RECEIVED',
      triggerConfig: { channels: ['whatsapp'] },
      nodes: [
        { id: 'n1', kind: 'TRIGGER', label: 'Message WhatsApp', config: {} },
        { id: 'n2', kind: 'CREATE_CUSTOMER', label: 'Créer le prospect', config: { status: 'qualified' } },
        { id: 'n3', kind: 'REPLY', label: 'Réponse', config: { text: `Salam, merci pour votre intérêt pour ${business} 🏠 Un conseiller vous répond immédiatement.` } },
        { id: 'n4', kind: 'CREATE_TASK', label: 'Tâche de suivi', config: { title: 'Rappeler ce prospect immobilier' } }
      ]
    };
  }
  if (/e-commerce|boutique|livraison|commande|متجر|طلب/i.test(d)) {
    return {
      name: 'Suivi commandes boutique',
      description: 'Confirmation, suivi livraison et rappels de paiement.',
      triggerType: 'MESSAGE_RECEIVED',
      triggerConfig: { channels: ['whatsapp'] },
      nodes: [
        { id: 'n1', kind: 'TRIGGER', label: 'Message WhatsApp', config: {} },
        { id: 'n2', kind: 'CREATE_CUSTOMER', label: 'Enregistrer', config: { status: 'contacted' } },
        { id: 'n3', kind: 'REPLY', label: 'Commande reçue', config: { text: `Commande bien reçue ✅ Merci pour votre confiance envers ${business}` } },
        { id: 'n4', kind: 'NOTIFY', label: 'Notifier', config: { to: 'all', text: 'Nouvelle commande' } }
      ]
    };
  }
  // Default: mention message → save customer → notify → quick reply
  return {
    name: 'Réponse & suivi automatique',
    description: 'Répond automatiquement aux nouveaux clients et prévient l’équipe.',
    triggerType: 'MESSAGE_RECEIVED',
    triggerConfig: { channels: ['whatsapp'] },
    nodes: [
      { id: 'n1', kind: 'TRIGGER', label: 'Message reçu', config: {} },
      { id: 'n2', kind: 'CREATE_CUSTOMER', label: 'Enregistrer le client', config: { status: 'contacted' } },
      { id: 'n3', kind: 'REPLY', label: 'Réponse', config: { text: `Salam {{customer_name}} 👋 Bienvenue chez ${business}, nous vous répondons très vite !` } },
      { id: 'n4', kind: 'NOTIFY', label: 'Prévenir l’équipe', config: { to: 'all', text: 'Nouveau client à contacter' } }
    ]
  };
}

// ---- Assistant chat ----------------------------------------------------

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}export async function assistantChat(
  history: AssistantTurn[],
  businessName: string
): Promise<{ content: string; offline: boolean }> {
  const sys = [
    `You are the AI business assistant of ${businessName}, an Algerian business using the Wassil automation platform.`,
    'Answer concisely in the language the user writes in (Arabic/French/English).',
    'Help them automate their business: auto-replies, lead capture, appointment reminders, payment follow-ups, forms, integrations (WhatsApp, Telegram, Facebook, Instagram, webhooks).',
    'If they want to create an automation, tell them to use the generator tab and give the exact description to write.',
    'Be practical and concrete. No generic filler.'
  ].join('\n');

  const messages = [
    { role: 'system' as const, content: sys },
    ...history.map((h) => ({ role: h.role, content: h.content }))
  ];

  const out = await chatCompletion(messages);
  if (out) return { content: out.trim(), offline: false };

  // Rule-based fallback assistant
  const last = history[history.length - 1]?.content?.toLowerCase() ?? '';
  if (/reminder|rappel|تذكير|no.show|absent/.test(last)) {
    return {
      content:
        'Vous pouvez automatiser les rappels en 2 minutes : 1) Ouvrez Automations, 2) démarrer depuis le modèle « Rappel de rendez-vous » (trigger APPOINTMENT_REMINDER, 1 jour avant). 3) Le client reçoit un rappel WhatsApp automatiquement. L’outil est honnête : il faut que votre WhatsApp Business soit connecté dans Intégrations pour l’envoi réel.',
      offline: true
    };
  }
  if (/relance|follow|متابعة|prospect/.test(last)) {
    return {
      content:
        'Pour relancer les prospects automatiquement : créez une automation « Message reçu » qui enregistre le client, répond avec vos tarifs, puis utilisez une action « Planifier un rappel » (ex: après 24h) pour envoyer une relance. Vous verrez chaque exécution dans le journal d’exécution.',
      offline: true
    };
  }
  return {
    content:
      'Voici ce que Wassil peut automatiser pour vous : réponses automatiques, enregistrement des clients, rappels de rendez-vous, relances, notifications d’équipe et envoi vers webhooks. Racontez-moi votre processus actuel (ex : « quand un patient m’écrit… ») et je vous propose une automatisation. L’assistant intégré répond hors ligne — configurez une clé IA pour des réponses plus précises.',
    offline: true
  };
}
// ---- Copilot: create OR modify an automation conversationally ----------

export interface CopilotRequest {
  history: AssistantTurn[];
  current?: {
    name?: string;
    description?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    nodes?: Array<{ id: string; kind: string; label?: string; config: Record<string, unknown> }>;
  } | null;
}

export interface CopilotResult {
  message: string;
  automation: GeneratedAutomation | null;
  offline: boolean;
}

export async function copilotAutomation(
  req: CopilotRequest,
  businessName: string
): Promise<CopilotResult> {
  const nodeDefs = [
    'REPLY {text:string} send a message',
    'AI_REPLY {prompt:string} generate an AI reply',
    'NOTIFY {to:string("all"|"owner"),text:string} notify team',
    'CREATE_CUSTOMER {status:string} save customer',
    'UPDATE_CUSTOMER {status:string} update customer status/tags',
    'CREATE_TASK {title:string} create internal task',
    'CREATE_APPOINTMENT {service:string,hoursFromNow:number} create appointment',
    'SCHEDULE_REMINDER {hours:number,text:string} schedule a reminder message',
    'DELAY {hours:number} wait',
    'CONDITION {field:string,op:string("contains"|"equals"|"notEquals"),value:string} branch',
    'END {} end'
  ];
  const triggers = [
    'MESSAGE_RECEIVED {channels:string[], keywords?:string[]}',
    'FORM_SUBMITTED {formSlug?:string}',
    'APPOINTMENT_CREATED {}',
    'APPOINTMENT_REMINDER {reminderDays:number}',
    'CUSTOMER_CREATED {}',
    'SCHEDULE {schedule:string}',
    'WEBHOOK {}',
    'MANUAL {}'
  ];

  const currentBlock = req.current ? JSON.stringify(req.current) : 'none';

  const sys = [
    `You are the AI automation copilot inside ${businessName} (Wassil).`,
    'The user describes, in Arabic/French/English or Algerian Darija, an automation they want, or a CHANGE to the current automation.',
    'The CURRENT automation is: ' + currentBlock + '.',
    'If the user asks to CREATE a new automation, build it from scratch.',
    'If the user asks to MODIFY the current automation (e.g. "change to 5 days", "send in French", "don\'t send on weekends"), apply that change and return the FULL updated automation.',
    'Interpret natural language: weekends off -> add a CONDITION, "5 days instead" -> change DELAY hours or reminderDays accordingly, "in French" -> translate REPLY/AI_REPLY text to French.',
    'Return ONLY a JSON object with keys: message (short, friendly, in the user\'s language), automation (the full GeneratedAutomation object: name, description, triggerType, triggerConfig, nodes).',
    'Node kinds: ' + nodeDefs.join('; ') + '. Trigger types: ' + triggers.join('; ') + '.',
    'First node must be kind "TRIGGER" config {}. Do not add an END node. Keep REPLY text in the user\'s language with {{customer_name}}/{{business_name}} variables.',
    'Return "automation": null if the user is just asking a question, not requesting a build/change.'
  ].join('\n');

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: sys }
  ];
  const turns = req.history.slice(-12);
  for (const h of turns) {
    messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
  }

  const out = await chatCompletion(messages, true);
  if (out) {
    try {
      const parsed = JSON.parse(out);
      const automation = parsed.automation
        ? {
            name: parsed.automation.name || 'Mon automatisation',
            description: parsed.automation.description || '',
            triggerType: parsed.automation.triggerType || 'MESSAGE_RECEIVED',
            triggerConfig: parsed.automation.triggerConfig || { channels: ['whatsapp'] },
            nodes: Array.isArray(parsed.automation.nodes)
              ? parsed.automation.nodes.filter((n: { kind?: string }) => String(n.kind || '') !== 'END')
              : []
          }
        : null;
      return {
        message: parsed.message || 'Voila !',
        automation,
        offline: false
      };
    } catch {
      // fall through
    }
  }

  return { message: defaultCopilotReply(turns[turns.length - 1]?.content), automation: null, offline: true };
}

function defaultCopilotReply(last?: string): string {
  const l = (last ?? '').toLowerCase();
  if (/rappel|remind|appoint|rdv|rendez/.test(l)) {
    return 'Je peux creer un rappel automatique. Dites-moi simplement : "Rappelle mes clients un jour avant leur rendez-vous".';
  }
  if (/relance|follow|relancer|suivi/.test(l)) {
    return 'Je peux creer une relance automatique pour les clients qui ne repondent pas. Decrivez le delai et le message voulus.';
  }
  return 'Dites-moi en quelques mots ce que vous voulez (par ex. "quand un client m envoie un message, reponds, enregistre-le et prevenis-moi") et je le construis pour vous.';
}
