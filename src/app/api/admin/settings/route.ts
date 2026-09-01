import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdmin } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export async function GET() {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const rows = await prisma.siteSetting.findMany();
  const settings: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  }
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = await getSuperAdmin();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const updates: Promise<unknown>[] = [];
  for (const [key, value] of Object.entries(body.settings || {})) {
    updates.push(
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) }
      })
    );
  }
  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}
