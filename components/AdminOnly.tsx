'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AdminOnlyProps {
  children: React.ReactNode;
}

export default function AdminOnly({ children }: AdminOnlyProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Debug logging
    console.log('AdminOnly Debug:', {
      loading,
      user: user ? {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        isBasic: user.isBasic
      } : null,
      shouldRedirect: !loading && (!user || !user.isAdmin)
    });

    if (!loading && (!user || !user.isAdmin)) {
      console.log('Redirecting to unauthorized page');
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    console.log('AdminOnly: User not admin, returning null');
    return null; // Will redirect to unauthorized page
  }

  console.log('AdminOnly: User is admin, rendering children');
  return <>{children}</>;
}
