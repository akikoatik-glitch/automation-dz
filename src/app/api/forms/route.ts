import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const forms = await prisma.webForm.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' }
  });
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  return NextResponse.json({ forms, businessSlug: business?.slug });
}

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId, userId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'invalid', message: 'name required' }, { status: 400 });

  const fields = Array.isArray(body.fields) && body.fields.length
    ? body.fields.map((f: Record<string, unknown>) => ({
        key: String(f.key || `f_${Math.random().toString(36).slice(2, 6)}`),
        label: String(f.label || 'Champ'),
        required: !!f.required,
        type: String(f.type || 'text'),
        options: Array.isArray(f.options) ? f.options : []
      }))
    : [
        { key: 'name', label: 'Nom complet', required: true, type: 'text', options: [] },
        { key: 'phone', label: 'Téléphone', required: true, type: 'tel', options: [] },
        { key: 'message', label: 'Votre message', required: false, type: 'textarea', options: [] }
      ];

  const slug = (body.slug ? String(body.slug) : name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/-+$/, '');
  const base = slug || `form-${Date.now()}`;

  const form = await prisma.webForm.create({
    data: {
      businessId,
      slug: `${base}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      fields: JSON.stringify(fields),
      enabled: body.enabled !== false
    }
  });

  await logActivity({
    businessId,
    userId: userId === 'apikey' ? null : userId,
    kind: 'form.created',
    entityType: 'form',
    entityId: form.id,
    summary: `Formulaire « ${form.name} » créé`
  });

  return NextResponse.json({ form }, { status: 201 });
}