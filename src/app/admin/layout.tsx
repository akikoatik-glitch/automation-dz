import { redirect } from 'next/navigation';
import { getSuperAdmin } from '@/lib/workspace';
import AdminShell from '@/components/admin/AdminShell';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSuperAdmin();
  if (!user) redirect('/login?next=/admin');

  return (
    <ToastProvider>
      <AdminShell name={user.name || user.email || 'Admin'} email={user.email || ''}>{children}</AdminShell>
    </ToastProvider>
  );
}