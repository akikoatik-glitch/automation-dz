import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { authOptions } from './auth';
import { prisma } from './db';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  lang: string;
};

export type WorkspaceContext = {
  user: SessionUser;
  userId: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    lang: string;
    status: string;
    planStatus: string;
    planId: string | null;
    limits: string | null;
    settings: string | null;
    trialEndsAt: Date | null;
  };
  membershipRole: string;
  isSuperAdmin: boolean;
  expired?: boolean;
};

// Set the workspace as expired (overdue): auto-suspend + flag for lock screen.
async function reconcileExpiry(businessId: string, status: string, planStatus: string, trialEndsAt: Date | null): Promise<{ expired: boolean; status: string; planStatus: string }> {
  if (!trialEndsAt || new Date(trialEndsAt).getTime() > Date.now()) {
    return { expired: false, status, planStatus };
  }
  const suspended = status === 'suspended';
  const newStatus = 'suspended';
  const newPlanStatus = 'overdue';
  if (!suspended) {
    await prisma.business.update({
      where: { id: businessId },
      data: { status: newStatus, planStatus: newPlanStatus }
    }).catch(() => {});
  }
  return { expired: true, status: newStatus, planStatus: newPlanStatus };
}

export async function getServerUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const u = session?.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    lang: u.lang
  };
}

// Resolves the current business (workspace) for a user, enforcing membership.
export async function getSuperAdmin(): Promise<SessionUser | null> {
  const user = await getServerUser();
  if (!user || user.role !== 'super') return null;
  return user;
}

export async function getWorkspace(): Promise<WorkspaceContext | null> {
  const user = await getServerUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.active) return null;

  let businessId = dbUser.currentBusinessId;
  if (!businessId) {
    const m = await prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' }
    });
    if (!m) return null;
    businessId = m.businessId;
    await prisma.user.update({
      where: { id: user.id },
      data: { currentBusinessId: businessId }
    });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, businessId },
    include: { business: true }
  });
  if (!membership) return null;
  const business = membership.business;
  if (!business) return null;

  const reconciled = await reconcileExpiry(business.id, business.status, business.planStatus, business.trialEndsAt);
  if (reconciled.expired) {
    return {
      user,
      userId: user.id,
      businessId: business.id,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        industry: business.industry,
        lang: business.lang,
        status: reconciled.status,
        planStatus: reconciled.planStatus,
        planId: business.planId,
        limits: business.limits,
        settings: business.settings,
        trialEndsAt: business.trialEndsAt
      },
      membershipRole: membership.role,
      isSuperAdmin: user.role === 'super',
      expired: true
    };
  }
  if (business.status !== 'active') return null;

  return {
    user,
    userId: user.id,
    businessId: business.id,
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      industry: business.industry,
      lang: business.lang,
      status: business.status,
      planStatus: business.planStatus,
      planId: business.planId,
      limits: business.limits,
      settings: business.settings,
      trialEndsAt: business.trialEndsAt
    },
    membershipRole: membership.role,
    isSuperAdmin: user.role === 'super'
  };
}

// Auth layer for API routes: session OR workspace API key.
export async function getApiWorkspace(req: NextRequest) {
  const ws = await getWorkspace();
  if (ws) return { ctx: ws, via: 'session' as const };

  const authHeader = req.headers.get('authorization') || '';
  const key = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers.get('x-api-key') ?? '');

  if (!key) return null;

  // Key format: wsp_<prefix>_<secret>
  if (!key.startsWith('wsp_')) return null;

  const parts = key.split('_');
  const prefix = parts.slice(0, 2).join('_'); // "wsp_<prefix>"
  const secret = parts.slice(2).join('_');
  if (!secret) return null;

  const apiKey = await prisma.apiKey.findFirst({
    where: { prefix, active: true },
    include: { business: true }
  });
  if (!apiKey) return null;
  const bcrypt = await import('bcryptjs');
  const ok = await bcrypt.compare(secret, apiKey.keyHash);
  if (!ok) return null;
  const business = apiKey.business;
  const recon = await reconcileExpiry(business.id, business.status, business.planStatus, business.trialEndsAt);
  if (recon.expired) return null;
  if (business.status !== 'active') return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    ctx: {
      user: null,
      userId: 'apikey',
      businessId: business.id,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        industry: business.industry,
        lang: business.lang,
        status: business.status,
        planStatus: business.planStatus,
        planId: business.planId,
        limits: business.limits,
        settings: business.settings,
        trialEndsAt: business.trialEndsAt
      },
      membershipRole: 'API',
      isSuperAdmin: false
    },
    via: 'apikey' as const
  };
}

export function requireCtx(auth: { ctx: WorkspaceContext } | null): WorkspaceContext {
  if (!auth) throw new Error('UNAUTHORIZED');
  return auth.ctx;
}