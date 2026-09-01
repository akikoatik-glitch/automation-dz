import { prisma } from '@/lib/db';

type Actor = { userId?: string; userName?: string } | null;

// Records an activity entry for a workspace (used for the activity feeds).
export async function logActivity(params: {
  businessId?: string;
  userId?: string | null;
  kind: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        businessId: params.businessId || null,
        userId: params.userId || undefined,
        kind: params.kind,
        entityType: params.entityType,
        entityId: params.entityId,
        summary: params.summary,
        meta: params.meta ? JSON.stringify(params.meta) : null
      }
    });
  } catch (e) {
    console.error('logActivity failed', e);
  }
}

export async function notifyWorkspace(params: {
  businessId: string;
  userId?: string;
  type?: string;
  title: string;
  content?: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        businessId: params.businessId,
        userId: params.userId || null,
        type: params.type || 'info',
        title: params.title,
        content: params.content,
        link: params.link
      }
    });
  } catch (e) {
    console.error('notifyWorkspace failed', e);
  }
}

export async function getAllActivities(businessId: string, take = 20) {
  return prisma.activityLog.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { name: true, email: true } } }
  });
}