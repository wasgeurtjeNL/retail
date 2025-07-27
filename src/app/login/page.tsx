"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { clearPersistentAuthIfNeeded } from "@/lib/supabase";

// Import components dynamically to avoid potential build issues
import dynamic from 'next/dynamic';

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAdmin, isRetailer } = useAuth();

  useEffect(() => {
    // Clear any persistent auth that might be causing conflicts
    if (typeof window !== 'undefined') {
      clearPersistentAuthIfNeeded();
    }
    
    // Check for success message in URL params
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(message);
      // Remove message from URL after showing it
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Only redirect if auth is fully loaded and user is authenticated
    if (!isLoading && user) {
      if (isAdmin) {
        router.push('/dashboard');
      } else if (isRetailer) {
        router.push('/retailer-dashboard');
      }
    }
  }, [user, isAdmin, isRetailer, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Vul alstublieft zowel e-mail als wachtwoord in.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: loginError } = await login(email, password);

      if (loginError) {
        setError(loginError.message || 'Er is een onbekende fout opgetreden.');
      }
    } catch (err: any) {
      setError(err.message || 'Er is een onverwachte fout opgetreden.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-8">
              <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
                Inloggen
              </h2>
              <div className="w-16 h-1 bg-pink-500 mx-auto mb-8"></div>
              
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-md">
                  <p>{successMessage}</p>
                </div>
              )}
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                  <p>{error}</p>
                </div>
              )}
              
              {/* Demo inloggegevens (alleen voor development) */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
                <p className="font-semibold">Demo inloggegevens:</p>
                <p>Admin: admin@wasgeurtje.nl / Admin123!</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    E-mailadres
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                      placeholder="uw@email.nl"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Wachtwoord
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Onthoud mij
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-pink-700 hover:text-pink-900">
                      Wachtwoord vergeten?
                    </a>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-md text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Inloggen...
                      </>
                    ) : (
                      'Inloggen'
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Nog geen account?{' '}
                <Link href="/register" className="font-medium text-pink-700 hover:text-pink-900">
                  Registreer nu
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}