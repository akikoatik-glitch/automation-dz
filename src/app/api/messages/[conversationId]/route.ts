import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

// Conversation detail (thread) — marks unread → read
export async function GET(req: NextRequest, ctx: { params: { conversationId: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;
  const { conversationId } = ctx.params;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId },
    include: { customer: true }
  });
  if (!conversation) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { unreadCount: 0 }
  });

  return NextResponse.json({ conversation, messages });
}

export async function PATCH(req: NextRequest, ctx: { params: { conversationId: string } }) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;
  const { conversationId } = ctx.params;

  const body = await req.json().catch(() => ({}));
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, businessId } });
  if (!conversation) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: body.status ? { status: body.status } : {}
  });
  return NextResponse.json({ conversation: updated });
}