import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { logActivity } from '@/lib/activity';

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  businessName: z.string().min(2).max(80),
  industry: z.string().optional().default('service'),
  lang: z.string().optional().default('fr')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 });
    }
    const { name, email, password, businessName, industry, lang } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);

    const slugBase = slugify(businessName) || 'business';
    let slug = slugBase;
    let i = 1;
    while (await prisma.business.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${i++}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: email.toLowerCase(), passwordHash: hash, lang }
      });
      const business = await tx.business.create({
        data: { name: businessName, slug, industry }
      });
      await tx.membership.create({
        data: { businessId: business.id, userId: user.id, role: 'OWNER' }
      });
      await tx.user.update({
        where: { id: user.id },
        data: { currentBusinessId: business.id }
      });
      return { user, business };
    });

    await logActivity({
      businessId: result.business.id,
      userId: result.user.id,
      kind: 'business.created',
      summary: `Espace de travail « ${businessName} » créé`
    });

    return NextResponse.json({ ok: true, businessId: result.business.id });
  } catch (e) {
    console.error('register error', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}