import { requireAdmin } from '@/lib/auth-helpers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export const metadata = {
  title: 'Admin Dashboard | PMStore',
  description: 'Admin dashboard for managing orders, products, and more',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect to login if not authenticated or to home if not admin
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader user={session.user} />

      <div className="flex">
        {/* Sidebar Navigation */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
