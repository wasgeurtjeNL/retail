'use client';

import { useState, useEffect } from 'react';

export default function AuthDebugPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Error checking auth:', error);
      setAuthStatus({ error: 'Failed to check auth status' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Info</h1>
      
      <div className="bg-gray-100 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Status:</h2>
        <pre className="bg-white p-4 rounded overflow-auto">
          {JSON.stringify(authStatus, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-2">Authentication Status</h3>
          <p className={`text-lg ${authStatus?.authenticated ? 'text-green-600' : 'text-red-600'}`}>
            {authStatus?.authenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
          </p>
        </div>

        {authStatus?.authenticated && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">User Info</h3>
              <p>Email: {authStatus?.user?.email || 'N/A'}</p>
              <p>ID: {authStatus?.user?.id || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">Profile Info</h3>
              <p>Role: <span className={`font-bold ${authStatus?.isAdmin ? 'text-green-600' : 'text-gray-600'}`}>
                {authStatus?.profile?.role || 'N/A'}
              </span></p>
              <p>Status: {authStatus?.profile?.status || 'N/A'}</p>
              <p>Company: {authStatus?.profile?.company_name || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">Access Levels</h3>
              <p className={authStatus?.isAdmin ? 'text-green-600' : 'text-red-600'}>
                Admin Access: {authStatus?.isAdmin ? '✓ Yes' : '✗ No'}
              </p>
              <p className={authStatus?.isRetailer ? 'text-green-600' : 'text-gray-600'}>
                Retailer Access: {authStatus?.isRetailer ? '✓ Yes' : '✗ No'}
              </p>
            </div>
          </>
        )}

        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">What to do:</h3>
          {!authStatus?.authenticated ? (
            <div>
              <p className="mb-2">You are not logged in. Please:</p>
              <a href="/login" className="text-blue-600 hover:underline">Go to Login Page →</a>
            </div>
          ) : !authStatus?.isAdmin ? (
            <div>
              <p className="mb-2">You are logged in but not as an admin. You need admin access to view sales metrics.</p>
              <p className="text-sm text-gray-600">Current role: {authStatus?.profile?.role}</p>
            </div>
          ) : (
            <div>
              <p className="text-green-600">✓ You have admin access!</p>
              <a href="/dashboard/sales-metrics" className="text-blue-600 hover:underline">Go to Sales Metrics →</a>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={checkAuth}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
} 