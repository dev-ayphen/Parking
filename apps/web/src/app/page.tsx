'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    router.replace(user ? '/dashboard' : '/login');
  }, [user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 size={36} className="animate-spin text-[#DC0159]" />
    </main>
  );
}
