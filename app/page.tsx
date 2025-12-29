'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/recepcion');
      }
    }
  }, [user, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-pulse text-slate-400">Cargando...</div>
    </main>
  );
}
