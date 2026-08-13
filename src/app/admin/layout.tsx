import { requireAdmin } from '@/lib/auth-helpers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export const metadata = {
  title: 'Admin Dashboard | PM Store',
  description: 'Admin dashboard for managing orders, products, and more',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect to login if not authenticated or to home if not admin
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Mobile-only admin nav bar. On desktop the left sidebar + the orange
          site navbar (from SiteChrome) provide navigation, so this is hidden. */}
      <AdminHeader />

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
