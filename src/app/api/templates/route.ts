import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerLocale } from '@/lib/i18n/server';

export async function GET(req: NextRequest) {
  const locale = getServerLocale();
  const industry = req.nextUrl.searchParams.get('industry') || '';

  const where = industry && industry !== 'all' ? { industry } : {};
  const templates = await prisma.template.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { sort: 'asc' }]
  });

  const out = templates.map((t) => {
    let i18n = null;
    try {
      i18n = t.languages ? JSON.parse(t.languages) : null;
    } catch {}
    const localized = i18n?.[locale] ?? null;
    return {
      id: t.id,
      slug: t.slug,
      industry: t.industry,
      icon: t.icon,
      triggerType: t.triggerType,
      triggerConfig: t.triggerConfig ? JSON.parse(t.triggerConfig) : null,
      nodes: JSON.parse(t.nodes),
      name: localized?.name || t.name,
      description: localized?.description || t.description,
      featured: t.featured
    };
  });

  return NextResponse.json({ templates: out, locale });
}