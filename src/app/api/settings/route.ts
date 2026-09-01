import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace, getServerUser } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [business, members, apiKeys] = await Promise.all([
    prisma.business.findUnique({ where: { id: ws.businessId }, include: { plan: true } }),
    prisma.membership.findMany({
      where: { businessId: ws.businessId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } }
    }),
    prisma.apiKey.findMany({
      where: { businessId: ws.businessId },
      select: { id: true, name: true, prefix: true, active: true, lastUsedAt: true, createdAt: true }
    })
  ]);

  let settings = {};
  let limits = {};
  try {
    settings = business?.settings ? JSON.parse(business.settings) : {};
  } catch {}
  try {
    limits = business?.limits ? JSON.parse(business.limits) : {};
  } catch {}

  return NextResponse.json({
    business: business
      ? { ...business, settings, limits }
      : null,
    members: members.map((m) => ({ id: m.id, role: m.role, user: m.user })),
    apiKeys,
    me: { id: ws.user.id, name: ws.user.name, email: ws.user.email, lang: ws.user.lang, role: ws.user.role }
  });
}

export async function PUT(req: NextRequest) {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.name && String(body.name).trim()) updates.name = String(body.name).trim();
  if (body.industry !== undefined) updates.industry = body.industry ? String(body.industry) : null;
  if (body.lang !== undefined) updates.lang = String(body.lang);
  if (body.status !== undefined && ws.membershipRole === 'OWNER') updates.status = String(body.status);

  if (body.settings && typeof body.settings === 'object') {
    updates.settings = JSON.stringify(body.settings);
  }

  if (updates.name) {
    // ensure unique slug
    const slug = String(updates.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    const other = await prisma.business.findFirst({ where: { slug, id: { not: ws.businessId } } });
    if (other) {
      updates.slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    } else {
      updates.slug = slug;
    }
  }

  const business = await prisma.business.update({
    where: { id: ws.businessId },
    data: updates
  });

  // persist user language preference
  const user = await getServerUser();
  if (user && body.lang) {
    await prisma.user.update({ where: { id: user.id }, data: { lang: String(body.lang) } });
  }

  await logActivity({
    businessId: ws.businessId,
    userId: ws.userId,
    kind: 'settings.updated',
    summary: 'Paramètres de l’entreprise mis à jour'
  });

  return NextResponse.json({ business });
}