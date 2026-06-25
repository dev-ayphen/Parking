'use client';

import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ToastProvider } from '@/components/Toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <ToastProvider>
        {/* Global connectivity banner — appears on ANY admin page when offline */}
        <OfflineBanner />
        <div className="flex bg-[#0A0A0A] h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 ml-0 lg:ml-72 bg-gray-50 h-screen overflow-hidden shadow-2xl relative lg:rounded-tl-[2.5rem]">
            <div className="p-8 h-full overflow-y-auto">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </ProtectedRoute>
  );
}
