import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/activity';

// POST { email, role } → add a member to the workspace (creates user if needed).
export async function POST(req: NextRequest) {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!['OWNER', 'ADMIN'].includes(ws.membershipRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const role = ['OWNER', 'ADMIN', 'MEMBER'].includes(body.role) ? body.role : 'MEMBER';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const existing = await prisma.membership.findFirst({
    where: { businessId: ws.businessId, user: { email } }
  });
  if (existing) return NextResponse.json({ error: 'already_member' }, { status: 409 });

  let user = await prisma.user.findUnique({ where: { email } });
  let created = false;
  if (!user) {
    // create account with a random password (they reset via login-less invite)
    const temp = Math.random().toString(36).slice(2, 12);
    user = await prisma.user.create({
      data: { name: body.name ? String(body.name) : email.split('@')[0], email, passwordHash: await bcrypt.hash(temp, 10) }
    });
    created = true;
  }

  const membership = await prisma.membership.create({
    data: { businessId: ws.businessId, userId: user.id, role }
  });

  await prisma.notification.create({
    data: {
      businessId: ws.businessId,
      userId: user.id,
      type: 'member',
      title: `Ajouté à « ${ws.business.name} »`,
      content: `${ws.user.name} vous a ajouté sur la plateforme Wassil.`,
      link: '/app'
    }
  });

  await logActivity({
    businessId: ws.businessId,
    userId: ws.userId,
    kind: 'member.added',
    summary: `${user.name} (${email}) ajouté comme ${role}`
  });

  return NextResponse.json({ membership, user: { id: user.id, name: user.name, email: user.email }, created });
}

// DELETE ?id= → remove a member
export async function DELETE(req: NextRequest) {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!['OWNER', 'ADMIN'].includes(ws.membershipRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const membershipId = String(req.nextUrl.searchParams.get('id') || '');
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.businessId !== ws.businessId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (membership.role === 'OWNER') {
    return NextResponse.json({ error: 'cannot_remove_owner' }, { status: 400 });
  }

  await prisma.membership.delete({ where: { id: membershipId } });
  await logActivity({
    businessId: ws.businessId,
    userId: ws.userId,
    kind: 'member.removed',
    summary: 'Membre retiré du workspace'
  });
  return NextResponse.json({ ok: true });
}