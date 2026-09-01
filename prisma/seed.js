/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const j = (o) => JSON.stringify(o);

const TRIGGERS = {
  message: 'MESSAGE_RECEIVED',
  form: 'FORM_SUBMITTED',
  appointment: 'APPOINTMENT_CREATED',
  reminder: 'APPOINTMENT_REMINDER',
  customer: 'CUSTOMER_CREATED',
  webhook: 'WEBHOOK'
};

const node = (id, kind, config = {}, label) => ({ id, kind, config, label });

// ---------------- Templates ----------------
const templates = [
  {
    slug: 'clinic-appointment-reminder',
    industry: 'clinic',
    triggerType: TRIGGERS.reminder,
    triggerConfig: { reminderDays: 1 },
    featured: true,
    icon: 'alarmClock',
    name: 'Rappel de rendez-vous',
    description: 'Envoie un rappel automatique la veille de chaque rendez-vous et demande une confirmation. Réduit fortement les absences.',
    languages: {
      fr: { name: 'Rappel de rendez-vous', description: "Envoie un rappel automatique la veille de chaque rendez-vous et demande une confirmation. Réduit fortement les absences." },
      en: { name: 'Appointment reminder', description: 'Automatically reminds patients one day before their appointment and asks for confirmation. Drastically reduces no-shows.' },
      ar: { name: 'تذكير المواعيد', description: 'يذكّر المرضى تلقائياً قبل موعدهم بيوم ويطلب تأكيداً. يقلل الغياب بشكل كبير.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Rendez-vous'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 👋 Un rappel pour votre rendez-vous prévu le {{appointment_date}} chez {{business_name}}. Répondez OUI pour confirmer, merci !' }, 'Envoyer le rappel'),
      node('t1', 'CREATE_TASK', { title: 'Confirmer le rendez-vous de {{customer_name}}' }, 'Tâche de confirmation'),
      node('end', 'END', {})
    ]
  },
  {
    slug: 'clinic-new-message-reply',
    industry: 'clinic',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'facebook', 'instagram', 'telegram'] },
    featured: true,
    icon: 'stethoscope',
    name: 'Réponse clinic & enregistrement',
    description: 'Chaque nouveau message répond automatiquement, enregistre le patient et prévient la réception.',
    languages: {
      fr: { name: 'Réponse clinique & enregistrement', description: 'Chaque nouveau message répond automatiquement, enregistre le patient et prévient la réception.' },
      en: { name: 'Clinic reply & patient capture', description: 'Every new message gets an automatic reply, the patient is saved and reception is notified.' },
      ar: { name: 'رد العيادة وتسجيل المرضى', description: 'كل رسالة جديدة تُرد تلقائياً، ويُسجل المريض ويُبلغ الاستقبال.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Message patient'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le patient'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 👋 Bienvenue chez {{business_name}}. Nous avons bien reçu votre message et un membre de l’équipe vous répondra dans quelques minutes. Pour prendre rendez-vous, dites-nous simplement : « je veux un rendez-vous ».' }, 'Réponse automatique'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouveau message patient : {{customer_name}}' }, 'Prévenir la réception')
    ]
  },
  {
    slug: 'clinic-followup-no-reply',
    industry: 'clinic',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp'], keywords: ['prix', 'tarif', 'rendez', 'rdv', 'consultation'] },
    featured: true,
    icon: 'repeat',
    name: 'Relance des demandes de RDV',
    description: 'Enregistre les demandes de rendez-vous, répond immédiatement, puis relance automatiquement 24h plus tard ceux qui n’ont pas répondu.',
    languages: {
      fr: { name: 'Relance des demandes de RDV', description: "Enregistre les demandes de rendez-vous, répond immédiatement, puis relance automatiquement 24h plus tard ceux qui n'ont pas répondu." },
      en: { name: 'Appointment lead follow-up', description: 'Captures booking requests, replies instantly, then automatically follows up 24h later.' },
      ar: { name: 'متابعة طلبات المواعيد', description: 'يسجل طلبات المواعيد، يرد فوراً، ثم يتابع تلقائياً بعد 24 ساعة.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Demande de RDV'),
      node('c1', 'CREATE_CUSTOMER', { status: 'qualified' }, 'Prospect qualifié'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 🙏 Nous avons bien reçu votre demande pour {{business_name}}. Pour un rendez-vous, merci de nous indiquer le jour et l’heure qui vous conviennent.' }, 'Réponse immédiate'),
      node('d1', 'DELAY', { hours: 24 }, 'Attendre 24h'),
      node('c2', 'CONDITION', { field: 'customer_name', op: 'notEquals', value: '' }, 'Relancer'),
      node('r2', 'REPLY', { text: 'Salam {{customer_name}}, nous voulions savoir si vous souhaitiez toujours prendre rendez-vous chez {{business_name}} 😊 Répondez-nous simplement OUI ou NON.' }, 'Relance 24h'),
      node('n1', 'NOTIFY', { to: 'owner', text: 'Aucune réponse depuis 24h : relancer {{customer_name}} par téléphone' }, 'Alerte équipe')
    ]
  },
  {
    slug: 'salon-greeting-and-resolution',
    industry: 'salon',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'instagram', 'facebook'] },
    featured: false,
    icon: 'sparkles',
    name: 'Accueil & réservation salon',
    description: 'Répond immédiatement aux nouveautés, enregistre la cliente et réserve un créneau automatiquement.',
    languages: {
      fr: { name: 'Accueil & réservation salon', description: "Répond immédiatement aux nouvelles clientes, les enregistre et leur propose un créneau." },
      en: { name: 'Salon greeting & booking', description: 'Instantly replies to new clients, saves them and proposes a time slot.' },
      ar: { name: 'ترحيب الصالون والحجز', description: 'يرد فوراً على العميلات الجديدات، يسجّلهن ويقترح موعداً.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Message cliente'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer la cliente'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} ✨ Bienvenue chez {{business_name}} ! Nous sommes disponibles aujourd’hui à partir de 10h. Pour quel service souhaitez-vous réserver ?' }, 'Réponse immédiate'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouvelle demande de réservation : {{customer_name}}' }, 'Alerte équipe')
    ]
  },
  {
    slug: 'restaurant-order-confirmation',
    industry: 'restaurant',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp'], keywords: ['commande', 'order', 'طلب', 'livraison'] },
    featured: false,
    icon: 'utensils',
    name: 'Confirmation commande restaurant',
    description: 'Confirme chaque commande reçue sur WhatsApp et prévient la cuisine immédiatement.',
    languages: {
      fr: { name: 'Confirmation commande restaurant', description: 'Confirme chaque commande reçue sur WhatsApp et prévient la cuisine immédiatement.' },
      en: { name: 'Restaurant order confirmation', description: 'Confirms every WhatsApp order and alerts the kitchen instantly.' },
      ar: { name: 'تأكيد طلبات المطعم', description: 'يؤكد كل طلب يصل عبر واتساب ويُعلم المطبخ فوراً.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Commande reçue'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le client'),
      node('r1', 'REPLY', { text: 'Merci pour votre commande {{customer_name}} 🍽️ Nous la traitons maintenant. Livraison estimée en 45 minutes. Bon appétit !' }, 'Confirmation'),
      node('n1', 'NOTIFY', { to: 'all', text: '➡️ NOUVELLE COMMANDE à préparer ({{customer_name}})' }, 'Alerte cuisine')
    ]
  },
  {
    slug: 'estate-lead-capture',
    industry: 'estate',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'facebook', 'instagram'] },
    featured: true,
    icon: 'building',
    name: 'Capture lead immobilier',
    description: 'Chaque demande est enregistrée, répond automatiquement et planifie une relance personnalisée.',
    languages: {
      fr: { name: 'Capture lead immobilier', description: "Chaque demande est enregistrée, reçoit une réponse automatique et une relance planifiée." },
      en: { name: 'Real estate lead capture', description: 'Every enquiry is saved, auto-answered and scheduled for a personalized follow-up.' },
      ar: { name: 'تسجيل عملاء العقارات', description: 'كل طلب يُسجل ويُرد عليه تلقائياً مع متابعة مجدولة.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Demande client'),
      node('c1', 'CREATE_CUSTOMER', { status: 'qualified' }, 'Créer le prospect'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 🏠 Merci pour votre intérêt pour {{business_name}}. Nous vous envoyons les biens disponibles dans quelques minutes. Quel quartier / budget recherchez-vous ?' }, 'Réponse'),
      node('t1', 'CREATE_TASK', { title: 'Appeler le prospect immobilier {{customer_name}} ({{phone}})' }, 'Tâche conseiller'),
      node('d1', 'DELAY', { hours: 24 }, 'Attendre 24h'),
      node('r2', 'REPLY', { text: 'Salam {{customer_name}}, avez-vous eu l’occasion de consulter les biens que nous vous avons envoyés ? Nous pouvons organiser une visite 🙌' }, 'Relance 24h')
    ]
  },
  {
    slug: 'ecommerce-order-payment-followup',
    industry: 'ecommerce',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp'], keywords: ['commande', 'order', 'شراء', 'طلب', 'paiement'] },
    featured: false,
    icon: 'shoppingBag',
    name: 'Suivi commande & paiement',
    description: 'Confirme la commande, enregistre le client et planifie un rappel de paiement si nécessaire.',
    languages: {
      fr: { name: 'Suivi commande & paiement', description: "Confirme la commande, enregistre le client et planifie un rappel de paiement." },
      en: { name: 'Order & payment follow-up', description: 'Confirms orders, saves the customer and plans a payment reminder.' },
      ar: { name: 'متابعة الطلبات والدفع', description: 'يؤكد الطلبات ويسجل العميل ويجدول تذكيراً بالدفع.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Commande client'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le client'),
      node('r1', 'REPLY', { text: 'Commande bien reçue ✅ Merci {{customer_name}} ! Paiement : CCP / BaridiMob / livraison. Nous confirmons la disponibilité et la livraison très vite.' }, 'Confirmation'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouvelle commande : {{customer_name}}' }, 'Alerte équipe')
    ]
  },
  {
    slug: 'form-lead-welcome',
    industry: 'service',
    triggerType: TRIGGERS.form,
    triggerConfig: { formSlug: 'any' },
    featured: true,
    icon: 'formInput',
    name: 'Accueil après formulaire',
    description: 'Un client remplit votre formulaire → enregistré automatiquement, remercié et votre équipe notifiée.',
    languages: {
      fr: { name: 'Accueil après formulaire', description: 'Un client remplit votre formulaire → enregistré automatiquement, remercié et votre équipe notifiée.' },
      en: { name: 'Form submission welcome', description: 'A client fills your form → automatically saved, thanked, and your team notified.' },
      ar: { name: 'ترحيب بعد النموذج', description: 'يملأ العميل نموذجك فيُسجل تلقائياً ويُشكر ويُبلَّغ فريقك.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Formulaire envoyé'),
      node('c1', 'CREATE_CUSTOMER', { status: 'qualified' }, 'Enregistrer le client'),
      node('r1', 'REPLY', { text: 'Merci {{customer_name}} 🙏 Nous avons bien reçu votre demande via notre formulaire et revenons vers vous très vite !' }, 'Remerciement'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouvelle demande formulaire : {{customer_name}} ({{phone}})' }, 'Alerte équipe')
    ]
  },
  {
    slug: 'webhook-lead-ingest',
    industry: 'service',
    triggerType: TRIGGERS.webhook,
    triggerConfig: {},
    featured: false,
    icon: 'webhook',
    name: 'Ingestion webhook',
    description: 'Recevez des leads depuis vos autres outils (CRM, site web, API) et enregistrez-les automatiquement.',
    languages: {
      fr: { name: 'Ingestion webhook', description: 'Recevez des leads depuis vos autres outils (CRM, site web, API) et enregistrez-les automatiquement.' },
      en: { name: 'Webhook lead ingest', description: 'Receive leads from your other tools (CRM, website, API) and save them automatically.' },
      ar: { name: 'استقبال الويب هوك', description: 'استقبل العملاء من أدواتك الأخرى وسجلهم تلقائياً.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Webhook reçu'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le lead'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouveau lead via webhook : {{customer_name}}' }, 'Notifier')
    ]
  },
  {
    slug: 'gym-membership-renewal',
    industry: 'gym',
    triggerType: TRIGGERS.reminder,
    triggerConfig: { reminderDays: 3 },
    featured: true,
    icon: 'dumbbell',
    name: 'Relance abonnement salle de sport',
    description: 'Relance automatiquement les membres avant l’expiration de leur abonnement et relance l’équipe en cas de non-réponse.',
    languages: {
      fr: { name: 'Relance abonnement salle de sport', description: "Relance automatiquement les membres avant l'expiration de leur abonnement et alerte l'équipe en cas de non-réponse." },
      en: { name: 'Gym membership renewal', description: 'Automatically messages members before their membership expires and alerts the team if they do not reply.' },
      ar: { name: 'متابعة اشتراكات الصالة', description: 'يراسل الأعضاء تلقائياً قبل انتهاء اشتراكهم ويُبلغ الفريق عند عدم الرد.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Abonnement bientôt échu'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 💪 On espère te voir bientôt à {{business_name}} ! Ton abonnement expire le {{appointment_date}}. Profites-en pour réactiver avec une offre spéciale 😉' }, 'Message de relance'),
      node('t1', 'CREATE_TASK', { title: 'Appeler {{customer_name}} pour renouvellement' }, 'Tâche équipe'),
      node('n1', 'NOTIFY', { to: 'owner', text: 'Abonnement de {{customer_name}} expire bientôt' }, 'Alerte gérant')
    ]
  },
  {
    slug: 'gym-class-booking',
    industry: 'gym',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'instagram', 'facebook'], keywords: ['cours', 'séance', 'class', 'حصة', 'réservation'] },
    featured: false,
    icon: 'calendarDays',
    name: 'Réservation de cours',
    description: 'Répond aux demandes de réservation de cours, enregistre le membre et prévient le coach.',
    languages: {
      fr: { name: 'Réservation de cours', description: "Répond aux demandes de cours, enregistre le membre et prévient le coach." },
      en: { name: 'Class booking', description: 'Replies to class booking requests, saves the member and alerts the coach.' },
      ar: { name: 'حجز الحصص', description: 'يرد على طلبات حجز الحصص ويسجل العضو ويُعلم المدرب.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Demande de cours'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le membre'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 🏋️ Nos cours disponibles : HIIT, Yoga, Musculation. Quel créneau vous intéresse ?' }, 'Réponse'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouvelle demande de cours : {{customer_name}}' }, 'Alerte coach')
    ]
  },
  {
    slug: 'training-course-enrollment',
    industry: 'training',
    triggerType: TRIGGERS.form,
    triggerConfig: { formSlug: 'any' },
    featured: true,
    icon: 'graduationCap',
    name: 'Inscription formation',
    description: 'Chaque inscription à une formation est confirmée, le participant enregistré et votre équipe notifiée.',
    languages: {
      fr: { name: 'Inscription formation', description: "Chaque inscription à une formation est confirmée, le participant enregistré et votre équipe notifiée." },
      en: { name: 'Training enrollment', description: 'Every training enrollment is confirmed, the participant saved and your team notified.' },
      ar: { name: 'التسجيل في التكوين', description: 'كل تسجيل في تكوين يُؤكد ويُسجل فيه المشارك ويُبلغ فريقك.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Formulaire d’inscription'),
      node('c1', 'CREATE_CUSTOMER', { status: 'qualified' }, 'Enregistrer le participant'),
      node('r1', 'REPLY', { text: 'Félicitations {{customer_name}} 🎓 Votre inscription à la formation chez {{business_name}} est bien reçue. Nous confirmons votre place et vous envoyons les détails très vite.' }, 'Confirmation'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouvelle inscription formation : {{customer_name}}' }, 'Alerte équipe'),
      node('t1', 'CREATE_TASK', { title: 'Envoyer le programme à {{customer_name}}' }, 'Tâche suivi')
    ]
  },
  {
    slug: 'training-course-inquiry',
    industry: 'training',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'facebook'], keywords: ['formation', 'cours', 'prix', 'training', 'دورة'] },
    featured: false,
    icon: 'messageCircle',
    name: 'Suivi demande de formation',
    description: 'Enregistre les demandes de formation, répond immédiatement et relance 24h plus tard.',
    languages: {
      fr: { name: 'Suivi demande de formation', description: "Enregistre les demandes de formation, répond immédiatement et relance 24h plus tard." },
      en: { name: 'Training inquiry follow-up', description: 'Captures training enquiries, replies instantly and follows up after 24h.' },
      ar: { name: 'متابعة طلبات التكوين', description: 'يسجل طلبات التكوين ويرد فوراً ويتبعها بعد 24 ساعة.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Demande de formation'),
      node('c1', 'CREATE_CUSTOMER', { status: 'qualified' }, 'Prospect'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 📚 Merci pour votre intérêt pour {{business_name}} ! Voici nos prochaines sessions et tarifs. Souhaitez-vous être contacté par un conseiller ?' }, 'Réponse'),
      node('d1', 'DELAY', { hours: 24 }, 'Attendre 24h'),
      node('r2', 'REPLY', { text: 'Salam {{customer_name}}, tenté par une de nos formations ? Nous réservons les places rapidement 😊' }, 'Relance 24h')
    ]
  },
  {
    slug: 'agency-client-intake',
    industry: 'agency',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'email', 'facebook'] },
    featured: true,
    icon: 'briefcase',
    name: 'Accueil nouveau client agence',
    description: 'Accueille chaque nouveau client, enregistre sa demande et crée une tâche pour l’équipe.',
    languages: {
      fr: { name: 'Accueil nouveau client agence', description: "Accueille chaque nouveau client, enregistre sa demande et crée une tâche pour l'équipe." },
      en: { name: 'Agency new client intake', description: 'Welcomes each new client, captures their request and creates a task for the team.' },
      ar: { name: 'استقبال عملاء الوكالة', description: 'يرحب بكل عميل جديد ويسجل طلبه وينشئ مهمة للفريق.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Nouveau message'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le client'),
      node('r1', 'REPLY', { text: 'Salam {{customer_name}} 👋 Merci de contacter {{business_name}}. Pouvez-vous décrire votre besoin ? Un membre de notre équipe vous répond rapidement.' }, 'Accueil'),
      node('n1', 'NOTIFY', { to: 'all', text: 'Nouveau client agence : {{customer_name}} ({{phone}})' }, 'Alerte équipe'),
      node('t1', 'CREATE_TASK', { title: 'Qualifier la demande de {{customer_name}}' }, 'Tâche')
    ]
  },
  {
    slug: 'service-review-request',
    industry: 'service',
    triggerType: TRIGGERS.appointment,
    triggerConfig: { afterMinutes: 30 },
    featured: true,
    icon: 'star',
    name: 'Demande d’avis après prestation',
    description: 'Envoie automatiquement une demande d’avis aux clients satisfaits après leur service. Améliore votre réputation en ligne.',
    languages: {
      fr: { name: 'Demande d’avis après prestation', description: "Envoie automatiquement une demande d'avis après le service. Améliore votre réputation en ligne." },
      en: { name: 'Post-service review request', description: 'Automatically asks for a review after a service. Boosts your online reputation.' },
      ar: { name: 'طلب تقييم بعد الخدمة', description: 'يطلب تقييماً تلقائياً بعد تقديم الخدمة. يحسّن سمعتك على الإنترنت.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Prestation terminée'),
      node('r1', 'REPLY', { text: 'Merci {{customer_name}} 🙏 Nous espérons que vous êtes satisfait·e de {{business_name}}. Si c’est le cas, nous serions ravis d’avoir votre avis ! Laissez-nous une note ⭐' }, 'Demande d’avis'),
      node('t1', 'CREATE_TASK', { title: 'Vérifier la satisfaction de {{customer_name}}' }, 'Tâche suivi')
    ]
  },
  {
    slug: 'ai-customer-assistant',
    industry: 'service',
    triggerType: TRIGGERS.message,
    triggerConfig: { channels: ['whatsapp', 'telegram', 'facebook', 'instagram', 'email'] },
    featured: true,
    icon: 'bot',
    name: 'Assistant IA 24/7',
    description: 'Un assistant IA répond intelligemment à chaque message, répond aux questions fréquentes et enregistre les clients. Ne laissez plus jamais une demande sans réponse.',
    languages: {
      fr: { name: 'Assistant IA 24/7', description: "Un assistant IA répond intelligemment à chaque message, répond aux questions fréquentes et enregistre les clients. Ne laissez plus jamais une demande sans réponse." },
      en: { name: '24/7 AI assistant', description: 'An AI assistant intelligently answers every message, replies to common questions and saves customers. Never miss a request again.' },
      ar: { name: 'مساعد ذكي 24/7', description: 'مساعد ذكي يرد على كل رسالة ويجيب على الأسئلة الشائعة ويسجل العملاء. لا تفوّت أي طلب بعد الآن.' }
    },
    nodes: [
      node('trigger', 'TRIGGER', {}, 'Message reçu'),
      node('c1', 'CREATE_CUSTOMER', { status: 'contacted' }, 'Enregistrer le client'),
      node('a1', 'AI_REPLY', { instructions: 'Répond aux questions courantes (horaires, services, prix), demande le prénom si inconnu et propose de prendre rendez-vous ou de contacter un humain si nécessaire. Reste courtois·e et en français.' }, 'Réponse IA'),
      node('n1', 'NOTIFY', { to: 'owner', text: 'Nouveau contact IA : {{customer_name}} — {{phone}}' }, 'Alerte gérant')
    ]
  }
];

// ---------------- Plans ----------------
const limits = (customers, automations, messages, users, ai) =>
  j({ customers, automations, messages, users, ai });

const plans = [
  {
    name: 'Starter',
    nameAr: 'ستارتر',
    priceDzd: 0,
    priceUsd: 0,
    sort: 0,
    limits: limits(100, 3, 250, 1, false),
    features: j(['1 canal', '100 clients', '3 automatisations', '250 messages / mois', 'Formulaires web'])
  },
  {
    name: 'Professional',
    nameAr: 'بروفيشينال',
    priceDzd: 2900,
    priceUsd: 9,
    sort: 1,
    limits: limits(1500, 15, 5000, 3, true),
    features: j(['WhatsApp + Telegram + Facebook + Instagram', '1 500 clients', '15 automatisations', '5 000 messages / mois', 'Assistant IA', 'Rappels & relances', 'Statistiques avancées'])
  },
  {
    name: 'Business',
    nameAr: 'بيزنس',
    priceDzd: 6900,
    priceUsd: 24,
    sort: 2,
    limits: limits(10000, 50, 25000, 10, true),
    features: j(['Tous les canaux + webhooks', '10 000 clients', '50 automatisations', '25 000 messages / mois', 'Equipe jusqu\'à 10 membres', 'API publique', 'Support prioritaire'])
  },
  {
    name: 'Enterprise',
    nameAr: 'إنتربرايز',
    priceDzd: 0,
    priceUsd: 0,
    sort: 3,
    limits: limits(0, 0, 0, 0, true), // 0 = unlimited
    features: j(['Limites illimitées', 'Intégrations personnalisées', 'Support dédié', 'Contrat & facturation'])
  }
];

// ---------------- Demo data ----------------
function demoData() {
  const sixDaysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000);

  const customers = [
    { name: 'Amel Benali', phone: '+213550123456', source: 'whatsapp', status: 'client', tags: '["fidèle","clinique"]', lastContactAt: sixDaysAgo(0), notes: 'Patient·e régulier·e, allergie pénicilline.' },
    { name: 'Yacine Meziane', phone: '+213661234567', source: 'whatsapp', status: 'qualified', tags: '["nouveau","prix"]', lastContactAt: sixDaysAgo(0), notes: 'Demande prix détartrage.' },
    { name: 'Sara Haddad', phone: '+213770123456', source: 'form', status: 'contacted', tags: '["formulaire"]', lastContactAt: sixDaysAgo(1), notes: 'Contact via formulaire site.' },
    { name: 'Karim Boudjemaa', phone: '+213555123456', source: 'facebook', status: 'new', tags: '["facebook"]', lastContactAt: sixDaysAgo(0) },
    { name: 'Lina Cherif', phone: '+213782345678', source: 'instagram', status: 'qualified', tags: '["instagram","rdv"]', lastContactAt: sixDaysAgo(2) }
  ];

  const conversations = [
    { channel: 'whatsapp', customer: 0, title: 'Amel Benali', messages: [['in', 'Salam, je confirme mon rendez-vous demain 10h', sixDaysAgo(0)], ['out', 'Merci Amel, c’est confirmé ! À demain 🙌', sixDaysAgo(0)]] },
    { channel: 'whatsapp', customer: 1, title: 'Yacine Meziane', messages: [['in', 'Combien coûte un détartrage ?', sixDaysAgo(0)], ['out', 'Salam, le détartrage est à 4000 DZD. Quelle date vous convient ?', sixDaysAgo(0)]] },
    { channel: 'instagram', customer: 4, title: 'Lina Cherif', messages: [['in', 'Est-ce que vous prenez les clients le samedi ?', sixDaysAgo(2)], ['out', 'Oui bien sûr ! Samedi de 9h à 17h 👋', sixDaysAgo(2)]] }
  ];

  const appointments = [
    { customer: 0, clientName: 'Amel Benali', phone: '+213550123456', service: 'Détartrage', hoursFromNow: 26, status: 'booked', reminderSent: false },
    { customer: 2, clientName: 'Sara Haddad', phone: '+213770123456', service: 'Consultation', hoursFromNow: 50, status: 'confirmed', reminderSent: true }
  ];

  return { customers, conversations, appointments };
}

async function main() {
  console.log('🌱 Seeding Wassil…');

  const hash = await bcrypt.hash('Admin123!', 10);

  // Super admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@wassil.dz';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'super', active: true },
    create: {
      name: 'Platform Admin',
      email: adminEmail,
      passwordHash: hash,
      lang: 'fr',
      role: 'super'
    }
  });
  console.log('✔ super admin', adminEmail);

  // Plans
  for (const p of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.plan.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.plan.create({ data: p });
    }
  }
  console.log('✔ plans', plans.length);

  // Templates
  for (const t of templates) {
    const existing = await prisma.template.findUnique({ where: { slug: t.slug } });
    const data = {
      name: t.name,
      description: t.description,
      industry: t.industry,
      triggerType: t.triggerType,
      triggerConfig: j(t.triggerConfig),
      nodes: j(t.nodes),
      icon: t.icon,
      featured: t.featured,
      sort: t.featured ? 0 : 1,
      languages: j(t.languages)
    };
    if (existing) await prisma.template.update({ where: { id: existing.id }, data });
    else await prisma.template.create({ data: { slug: t.slug, ...data } });
  }
  console.log('✔ templates', templates.length);

  // Site settings
  await prisma.siteSetting.upsert({
    where: { key: 'platform' },
    update: {},
    create: {
      key: 'platform',
      value: j({ name: process.env.APP_NAME || 'Wassil', defaultLang: 'fr' })
    }
  });

  // ---- Demo workspace (only on fresh/non-prod installs) ----
  const demoEmail = 'demo@wassil.dz';
  const demoBizName = 'Clinique El-Nour';
  const demoExists = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!demoExists && process.env.SEED_DEMO !== 'off') {
    const demoSlug = 'clinique-el-nour';
    const biz = await prisma.business.create({
      data: {
        name: demoBizName,
        slug: demoSlug,
        industry: 'clinic',
        lang: 'fr',
        planStatus: 'trial'
      }
    });
    const demoUser = await prisma.user.create({
      data: {
        name: 'Nadia Demo',
        email: demoEmail,
        passwordHash: hash,
        lang: 'fr',
        currentBusinessId: biz.id
      }
    });
    await prisma.membership.create({
      data: { businessId: biz.id, userId: demoUser.id, role: 'OWNER' }
    });

    const d = demoData();
    const createdCustomers = [];
    for (const c of d.customers) {
      createdCustomers.push(
        await prisma.customer.create({ data: { businessId: biz.id, ...c } })
      );
    }
    for (const conv of d.conversations) {
      const customer = createdCustomers[conv.customer];
      const conversation = await prisma.conversation.create({
        data: {
          businessId: biz.id,
          channel: conv.channel,
          customerId: customer.id,
          externalId: conv.customer === 1 ? '+213661234567' : null,
          title: conv.title,
          unreadCount: 0,
          status: 'open',
          lastMessageAt: conv.messages[conv.messages.length - 1][2]
        }
      });
      for (const m of conv.messages) {
        await prisma.message.create({
          data: {
            businessId: biz.id,
            conversationId: conversation.id,
            direction: m[0],
            sender: m[0] === 'out' ? demoBizName : null,
            content: m[1],
            channel: conv.channel,
            status: 'sent',
            createdAt: m[2]
          }
        });
      }
    }
    for (const a of d.appointments) {
      const customer = createdCustomers[a.customer];
      await prisma.appointment.create({
        data: {
          businessId: biz.id,
          customerId: customer.id,
          clientName: a.clientName,
          phone: a.phone,
          service: a.service,
          startsAt: new Date(Date.now() + a.hoursFromNow * 3600 * 1000),
          status: a.status,
          reminderSent: a.reminderSent
        }
      });
    }

    // Enable the two flagship automations in demo workspace
    for (const slug of ['clinic-appointment-reminder', 'clinic-new-message-reply']) {
      const tpl = await prisma.template.findUnique({ where: { slug } });
      if (tpl) {
        await prisma.automation.create({
          data: {
            businessId: biz.id,
            name: tpl.name,
            description: tpl.description,
            industry: 'clinic',
            triggerType: tpl.triggerType,
            triggerConfig: tpl.triggerConfig,
            nodes: tpl.nodes,
            enabled: true,
            aiGenerated: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }

    // Demo integrations (Telegram connected with placeholder note, whatsapp configured status)
    await prisma.integration.upsert({
      where: { businessId_type: { businessId: biz.id, type: 'whatsapp' } },
      update: {},
      create: {
        businessId: biz.id,
        type: 'whatsapp',
        name: 'WhatsApp Business',
        status: 'inactive',
        enabled: false,
        config: j({ note: 'Configurez votre compte Meta pour activer.' })
      }
    });
    await prisma.integration.upsert({
      where: { businessId_type: { businessId: biz.id, type: 'telegram' } },
      update: {},
      create: {
        businessId: biz.id,
        type: 'telegram',
        name: 'Telegram Bot',
        status: 'inactive',
        enabled: false,
        config: j({})
      }
    });

    console.log('✔ demo workspace', demoSlug);
  } else {
    console.log('· demo workspace skipped (already exists or SEED_DEMO=off)');
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());