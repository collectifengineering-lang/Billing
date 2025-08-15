'use client';

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';

export default function AdminTestPage() {
  const { user, loading } = useAuth();
  const [envDebug, setEnvDebug] = useState<any>({});
  const [serverTest, setServerTest] = useState<any>(null);
  const [testingServer, setTestingServer] = useState(false);

  useEffect(() => {
    // Debug environment variables and admin status
    const debugInfo = {
      NEXT_PUBLIC_ADMIN_EMAILS: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      userEmail: user?.email,
      userIsAdmin: user?.isAdmin,
      loading,
      user: user ? {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        isBasic: user.isBasic
      } : null
    };
    
    console.log('AdminTest Debug Info:', debugInfo);
    setEnvDebug(debugInfo);
  }, [user, loading]);

  const testServerAdminCheck = async () => {
    if (!user?.email) return;
    
    setTestingServer(true);
    try {
      const response = await fetch(`/api/auth/admin-test?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      setServerTest(data);
      console.log('Server admin test result:', data);
    } catch (error) {
      setServerTest({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setTestingServer(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Access Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Environment Variables (Client Side)</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(envDebug, null, 2)}
          </pre>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">User Status</h2>
          <p>Email: {user.email}</p>
          <p>Is Admin: {user.isAdmin ? 'Yes' : 'No'}</p>
          <p>Is Basic: {user.isBasic ? 'Yes' : 'No'}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">Server-Side Admin Check</h2>
          <button
            onClick={testServerAdminCheck}
            disabled={testingServer}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            {testingServer ? 'Testing...' : 'Test Server Admin Check'}
          </button>
          
          {serverTest && (
            <div className="mt-4">
              <h3 className="font-medium">Server Response:</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded mt-2">
                {JSON.stringify(serverTest, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold">Access Test</h2>
          {user.isAdmin ? (
            <div className="text-green-600">
              ✅ You have admin access! You should be able to view the settings and financial dashboard.
            </div>
          ) : (
            <div className="text-red-600">
              ❌ You do not have admin access. Check the environment variable NEXT_PUBLIC_ADMIN_EMAILS.
            </div>
          )}
        </div>

        <div className="p-4 border rounded bg-yellow-50">
          <h2 className="font-semibold">Troubleshooting Steps</h2>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>Check that <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_ADMIN_EMAILS=jonathan@collectif.nyc</code> is set in your Vercel environment variables</li>
            <li>Verify the environment variable is deployed (may take a few minutes after setting)</li>
            <li>Check that your email ends with <code className="bg-yellow-100 px-1 rounded">@collectif.nyc</code></li>
            <li>Look at the browser console for debug information</li>
            <li>Try the server-side admin check above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
