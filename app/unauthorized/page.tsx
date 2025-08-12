'use client';

import Link from 'next/link';
import { Shield, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <Shield className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-red-600 bg-clip-text text-transparent mb-4">
            Access Denied
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300">
            You don&apos;t have permission to access this resource.
          </p>
        </div>

        {/* Action Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl p-8">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please contact your administrator if you believe you should have access to this feature.
              </p>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <Home className="h-5 w-5 mr-2" />
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 