import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/activity';

function randomId(n: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { businessId: ws.businessId },
    select: { id: true, name: true, prefix: true, active: true, lastUsedAt: true, createdAt: true }
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!['OWNER', 'ADMIN'].includes(ws.membershipRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || 'API').trim();
  const prefix = `wsp_${randomId(8)}`;
  const secret = randomId(32);
  const keyHash = await bcrypt.hash(secret, 10);

  const key = await prisma.apiKey.create({
    data: { businessId: ws.businessId, name, prefix, keyHash, active: body.active !== false }
  });

  await logActivity({
    businessId: ws.businessId,
    userId: ws.userId,
    kind: 'apikey.created',
    summary: `Clé API « ${name} » créée`
  });

  // Full secret is returned exactly once.
  return NextResponse.json({ key: { id: key.id, name: key.name, prefix }, apiKey: `${prefix}_${secret}` }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!['OWNER', 'ADMIN'].includes(ws.membershipRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const id = String(req.nextUrl.searchParams.get('id') || '');
  const existing = await prisma.apiKey.findFirst({ where: { id, businessId: ws.businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}