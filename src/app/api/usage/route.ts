import { NextRequest, NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/workspace';
import { getUsage, getLimits } from '@/lib/usage';

export async function GET(req: NextRequest) {
  const auth = await getApiWorkspace(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { businessId } = auth.ctx;

  const [usage, limits] = await Promise.all([getUsage(businessId), getLimits(businessId)]);
  return NextResponse.json({ usage, limits });
}