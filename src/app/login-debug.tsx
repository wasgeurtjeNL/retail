'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginDebugPage() {
  const { user, isAdmin, isRetailer, retailerName, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [mockRetailerName, setMockRetailerName] = useState('');
  
  // Check if we're in dev mode on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const devSignedIn = localStorage.getItem('dev-signed-in');
      setDevMode(devSignedIn === 'true');
      
      const storedRetailerName = localStorage.getItem('dev-retailer-name');
      if (storedRetailerName) {
        setMockRetailerName(storedRetailerName);
      }
    }
  }, []);
  
  // Handle regular login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    try {
      const { error } = await login(email, password);
      if (error) {
        setLoginError(error.message || 'Login failed');
      }
    } catch (error: any) {
      setLoginError(error.message || 'An unexpected error occurred');
    }
  };
  
  // Handle development mode login
  const enableDevMode = (asAdmin: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev-signed-in', 'true');
      localStorage.setItem('dev-is-admin', asAdmin ? 'true' : 'false');
      if (mockRetailerName) {
        localStorage.setItem('dev-retailer-name', mockRetailerName);
      } else {
        // Set a default retailer name if not provided
        localStorage.setItem('dev-retailer-name', 'Uw Winkel'); 
      }
      setDevMode(true);
      // Force page reload to apply the changes
      window.location.reload();
    }
  };
  
  // Handle clearing dev mode
  const clearDevMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dev-signed-in');
      localStorage.removeItem('dev-is-admin');
      localStorage.removeItem('dev-retailer-name');
      setDevMode(false);
      // Force logout and page reload
      logout();
      window.location.reload();
    }
  };
  
  // Reset all localStorage for a clean start
  const resetAllStorage = () => {
    if (typeof window !== 'undefined' && confirm('Are you sure you want to clear all localStorage? This will reset all settings.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Login Debug Tool</h1>
          
          {/* Current auth state */}
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Current Auth State</h2>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Logged in:</span> {user ? 'Yes' : 'No'}</p>
              {user && (
                <>
                  <p><span className="font-medium">User ID:</span> {user.id}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                </>
              )}
              <p><span className="font-medium">Is Admin:</span> {isAdmin ? 'Yes' : 'No'}</p>
              <p><span className="font-medium">Is Retailer:</span> {isRetailer ? 'Yes' : 'No'}</p>
              <p><span className="font-medium">Retailer Name:</span> {retailerName || 'Not set'}</p>
              <p><span className="font-medium">Dev Mode:</span> {devMode ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          
          {/* Local Storage Display */}
          <div className="mb-6 bg-yellow-50 p-4 rounded-md">
            <h2 className="text-lg font-medium text-yellow-900 mb-2">localStorage Inspection</h2>
            <div className="space-y-1 text-sm overflow-auto max-h-40">
              {typeof window !== 'undefined' ? (
                Object.entries(localStorage).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium mr-2">{key}:</span>
                    <span className="truncate">{value}</span>
                  </div>
                ))
              ) : (
                <p>localStorage not available</p>
              )}
            </div>
          </div>
          
          {/* Dev Mode Controls */}
          <div className="mb-6 border border-blue-200 rounded-md p-4 bg-blue-50">
            <h2 className="text-lg font-medium text-blue-900 mb-2">Development Mode</h2>
            <p className="text-sm text-blue-700 mb-4">
              Use these controls to enable or disable development mode authentication without requiring Supabase.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mock Retailer Name
              </label>
              <input
                type="text"
                value={mockRetailerName}
                onChange={(e) => setMockRetailerName(e.target.value)}
                className="w-full text-gray-900 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="Enter mock retailer name"
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => enableDevMode(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
              >
                Login as Retailer (Dev Mode)
              </button>
              
              <button
                onClick={() => enableDevMode(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-purple-700"
              >
                Login as Admin (Dev Mode)
              </button>
              
              <button
                onClick={clearDevMode}
                className="bg-red-600 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-red-700"
              >
                Clear Dev Mode Login
              </button>
            </div>
          </div>
          
          {/* Regular Login Form */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Regular Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-gray-900 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
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
                  className="w-full text-gray-900 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
              
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {loginError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-pink-600 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-pink-700"
              >
                Login
              </button>
            </form>
          </div>
          
          {/* Advanced Options */}
          <div className="pt-4 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Advanced Options</h2>
            <div className="space-y-2">
              <button
                onClick={resetAllStorage}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-gray-700"
              >
                Reset All localStorage
              </button>
              
              <button
                onClick={logout}
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-gray-300"
              >
                Logout
              </button>
              
              <div className="flex space-x-2 pt-4">
                <Link 
                  href="/"
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-gray-200 text-center"
                >
                  Go to Home
                </Link>
                
                <Link 
                  href="/retailer-dashboard"
                  className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-blue-200 text-center"
                >
                  Retailer Dashboard
                </Link>
                
                <Link 
                  href="/dashboard"
                  className="flex-1 bg-purple-100 text-purple-700 px-4 py-2 rounded-md shadow-sm text-sm font-medium hover:bg-purple-200 text-center"
                >
                  Admin Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 