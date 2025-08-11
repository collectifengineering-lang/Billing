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

  // TEMPORARY: Allow access while Azure AD is being configured
  // TODO: Remove this bypass once environment variables are set in Vercel
  const isTemporaryAdmin = true;

  useEffect(() => {
    if (!loading && !isTemporaryAdmin && (!user || !user.isAdmin)) {
      router.push('/unauthorized');
    }
  }, [user, loading, router, isTemporaryAdmin]);

  if (loading && !isTemporaryAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isTemporaryAdmin && (!user || !user.isAdmin)) {
    return null; // Will redirect to unauthorized page
  }

  // Show admin access warning if using temporary bypass
  if (isTemporaryAdmin) {
    return (
      <>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Admin Access Warning:</strong> You are accessing admin features with temporary bypass. 
                Please configure Azure AD environment variables in Vercel for proper authentication.
              </p>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
