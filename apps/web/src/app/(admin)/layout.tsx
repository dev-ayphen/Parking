'use client';

import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex bg-[#0A0A0A] h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-72 bg-gray-50 h-screen rounded-tl-[2.5rem] overflow-hidden shadow-2xl relative">
          <div className="p-8 h-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
