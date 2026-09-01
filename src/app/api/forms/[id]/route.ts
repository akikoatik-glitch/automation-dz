import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await prisma.webForm.findFirst({ where: { id: ctx.params.id, businessId: auth.ctx.businessId } });
  if (!form) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    return NextResponse.json({ form: { ...form, fields: JSON.parse(form.fields) } });
  } catch {
    return NextResponse.json({ form });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;
  const existing = await prisma.webForm.findFirst({ where: { id: ctx.params.id, businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name) data.name = String(body.name);
  if (body.enabled !== undefined) data.enabled = !!body.enabled;
  if (Array.isArray(body.fields)) data.fields = JSON.stringify(body.fields);

  const form = await prisma.webForm.update({ where: { id: ctx.params.id }, data });
  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'form.updated',
    entityType: 'form',
    entityId: form.id,
    summary: `Formulaire « ${form.name} » mis à jour`
  });
  return NextResponse.json({ form });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const existing = await prisma.webForm.findFirst({ where: { id: ctx.params.id, businessId: auth.ctx.businessId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.webForm.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}