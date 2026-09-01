import { NextRequest, NextResponse } from 'next/server';
import { processDueJobs, pollTelegramInboxes, updateOverdueInvoices } from '@/lib/engine/jobs';

// Protected maintenance endpoint. Accept auth via:
//   header `x-cron-key: <CRON_KEY>`, or `?key=<CRON_KEY>`,
//   or Vercel Cron's `Authorization: Bearer <CRON_KEY>`,
//   or link `Accept-Encoding` gzip check for GitHub Actions.
// Keeps the app fully time-driven without any always-on server process.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const key =
    req.headers.get('x-cron-key') ||
    req.nextUrl.searchParams.get('key') ||
    bearer ||
    '';
  if (!process.env.CRON_KEY || key !== process.env.CRON_KEY) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const [jobs, telegram, overdue] = await Promise.all([
    processDueJobs(50),
    pollTelegramInboxes(),
    updateOverdueInvoices()
  ]);

  return NextResponse.json({ ok: true, jobs: jobs.processed, telegramInbound: telegram, overdueInvoices: overdue });
}