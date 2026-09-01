import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { generateAutomation } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  if (!description) return NextResponse.json({ error: 'invalid', message: 'description required' }, { status: 400 });

  const language = String(body.language || 'fr');
  const category = body.category ? String(body.category) : undefined;
  const { automation, offline } = await generateAutomation(description, language, category);
  return NextResponse.json({ automation, offline });
}