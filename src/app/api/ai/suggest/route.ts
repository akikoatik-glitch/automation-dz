import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { suggestReply } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { business } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const incoming = String(body.incoming || body.message || '').trim();
  if (!incoming) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { text, offline } = await suggestReply(incoming, business.name);
  return NextResponse.json({ text, offline });
}