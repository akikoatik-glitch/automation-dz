import AdminAccounts from '@/components/admin/AdminAccounts';

export const metadata = { title: 'Comptes clients' };
export const dynamic = 'force-dynamic';

export default function AdminAccountsPage() {
  return <AdminAccounts />;
}
