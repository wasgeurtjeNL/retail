'use client';

import { useState } from 'react';

export default function CreateAdminPage() {
  const [email, setEmail] = useState('admin@wasgeurtje.nl');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/auth/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } catch (error) {
      setResult({ error: 'Failed to create/update admin user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          <strong>⚠️ Development Only:</strong> This page should be removed in production!
        </p>
      </div>

      <h1 className="text-2xl font-bold mb-6">Create/Update Admin User</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter a secure password"
            required
            minLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading || password.length < 6}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Create/Update Admin'}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-lg ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {result.success ? (
            <div>
              <p className="text-green-800 font-medium">✓ {result.message}</p>
              <p className="text-green-700 text-sm mt-1">Redirecting to login page...</p>
            </div>
          ) : (
            <p className="text-red-800">✗ {result.error}</p>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Next Steps:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Set a password for the admin user above</li>
          <li>You'll be redirected to the login page</li>
          <li>Log in with the email and password you just set</li>
          <li>Access the sales metrics dashboard</li>
        </ol>
      </div>
    </div>
  );
} 