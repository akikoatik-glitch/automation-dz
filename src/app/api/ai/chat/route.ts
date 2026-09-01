import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { assistantChat, AssistantTurn } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { business } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const history = Array.isArray(body.history)
    ? (body.history as AssistantTurn[]).filter((h) => h && ['user', 'assistant'].includes(h.role)).slice(-12)
    : [];

  const { content, offline } = await assistantChat(history, business.name);
  return NextResponse.json({ content, offline });
}