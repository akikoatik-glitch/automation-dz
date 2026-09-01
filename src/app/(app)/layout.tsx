import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/app/AppShell';
import { getWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

function SuspendedScreen({ endDate }: { endDate: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="card w-full max-w-md p-8 text-center animate-fade-up">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">⏳</div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Votre essai / accès est expiré</h1>
        <p className="mt-2 text-sm text-slate-500">
          Votre accès à la plateforme a pris fin{endDate ? ` le ${new Date(endDate).toLocaleDateString('fr-FR')}` : ''}.
          Pour continuer à utiliser vos automatisations, contactez votre prestataire pour renouveler votre abonnement.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a href="mailto:support@wassil.dz" className="btn btn-primary btn-premium w-full !py-2.5">
            Contacter le support
          </a>
          <Link href="/api/auth/signout" className="btn btn-ghost w-full !py-2.5 text-sm text-slate-500">
            Se déconnecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await getWorkspace();
  if (!ws) redirect('/login');

  if (ws.expired) {
    return (
      <ToastProvider>
        <SuspendedScreen endDate={ws.business.trialEndsAt ? ws.business.trialEndsAt.toISOString() : null} />
      </ToastProvider>
    );
  }

  // Redirect to onboarding if business hasn't been set up yet
  const isOnboarding = children && typeof children === 'object' && 'type' in children && (children as any).type?.name === 'OnboardingPage';
  if (!ws.business.industry && !isOnboarding) {
    redirect('/app/onboarding');
  }

  const business = await prisma.business.findUnique({
    where: { id: ws.businessId },
    include: { plan: true }
  });

  const [unreadCount] = await Promise.all([
    prisma.conversation.aggregate({
      where: { businessId: ws.businessId },
      _sum: { unreadCount: true }
    })
  ]);

  return (
    <ToastProvider>
      <AppShell
        businessName={business?.name ?? ws.business.name}
        planName={business?.plan?.name ?? null}
        userName={ws.user.name || 'Utilisateur'}
        userEmail={ws.user.email || ''}
        isSuper={ws.isSuperAdmin}
        initialUnread={unreadCount._sum.unreadCount ?? 0}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}