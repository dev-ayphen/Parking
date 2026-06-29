'use client';

import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ToastProvider } from '@/components/Toast';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';

function AdminContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const mainMargin = collapsed ? 'lg:ml-[110px]' : 'lg:ml-72';

  return (
    <div className="flex bg-[#0A0A0A] h-screen overflow-hidden">
      <Sidebar />
      <main className={`flex-1 ml-0 ${mainMargin} bg-gray-50 h-screen overflow-hidden relative transition-all duration-300 ease-in-out`}>
        <div className="px-6 pt-6 pb-6 h-full overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <SidebarProvider>
          <OfflineBanner />
          <AdminContent>{children}</AdminContent>
        </SidebarProvider>
      </ToastProvider>
    </ProtectedRoute>
  );
}
