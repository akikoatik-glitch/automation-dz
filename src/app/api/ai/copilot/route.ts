import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { copilotAutomation } from '@/lib/ai';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const body = await req.json().catch(() => ({}));
  const history = Array.isArray(body.history)
    ? body.history
        .filter((h: { role?: string; content?: unknown }) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
        .slice(-12)
    : [];
  if (history.length === 0) {
    return NextResponse.json({ error: 'invalid', message: 'history required' }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });

  const current = body.current && typeof body.current === 'object' ? body.current : null;
  const { message, automation, offline } = await copilotAutomation(
    { history, current },
    business?.name || 'Votre entreprise'
  );

  return NextResponse.json({ message, automation, offline });
}
