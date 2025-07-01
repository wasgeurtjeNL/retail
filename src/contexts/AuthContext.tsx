"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase, getCurrentUser, signIn, signOut } from '../lib/supabase';

interface UserRole {
  role: string;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isRetailer: boolean;
  retailerName?: string; // Naam van de retailer voor persoonlijke aanbevelingen
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  isRetailer: false,
  retailerName: '',
  login: async () => ({ error: null }),
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRetailer, setIsRetailer] = useState(false);
  const [retailerName, setRetailerName] = useState('');
  
  const router = useRouter();
  const pathname = usePathname();

  const checkSessionAndUser = useCallback(async () => {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (session?.user) {
          const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role, company_name')
              .eq('id', session.user.id)
              .single();

          if (profileError) {
              setUser(null);
              setIsAdmin(false);
              setIsRetailer(false);
              setRetailerName('');
          } else {
              setUser(session.user);
              const userRole = profile?.role;
              setIsAdmin(userRole === 'admin');
              setIsRetailer(userRole === 'retailer');
              setRetailerName(profile?.company_name || '');
          }
      } else {
          setUser(null);
          setIsAdmin(false);
          setIsRetailer(false);
          setRetailerName('');
      }
      setIsLoading(false);
  }, []);

  // Initialize auth state
  useEffect(() => {
    checkSessionAndUser();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
            checkSessionAndUser();
        } else if (_event === 'SIGNED_OUT') {
            setUser(null);
            setIsAdmin(false);
            setIsRetailer(false);
            setRetailerName('');
        }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkSessionAndUser]);

  // Login function
  const login = async (email: string, password: string) => {
    // Roep de signIn functie aan, die de Supabase client aanroept
    const { data, error: signInError } = await signIn(email, password);

    if (signInError) {
        return { error: signInError };
    }

    if (data.session && data.user) {
        // Gebruik de data direct in plaats van te wachten op een nieuwe getSession()
        // Roep direct de check aan met de zojuist ontvangen gebruiker om de state te forceren
        await checkSessionAndUser();
        return { error: null };
    }

    return { error: { name: 'LoginError', message: 'Kon sessie niet verifiëren na inloggen.' } };
  };

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Clear development mode flags first
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dev-signed-in');
        localStorage.removeItem('dev-is-admin');
        localStorage.removeItem('dev-retailer-name');
      }
      // Attempt Supabase logout if needed
      await signOut();
      // Reset authentication state
      setUser(null);
      setIsAdmin(false);
      setIsRetailer(false);
      setRetailerName('');
      // Redirect to home after logout if on a protected page
      if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/retailer-dashboard')) {
        router.push('/');
      }
    } catch (error) {
      // Ensure state is reset even if Supabase logout fails
      setUser(null);
      setIsAdmin(false);
      setIsRetailer(false);
      setRetailerName('');
      // Force redirect to home page on error
      if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/retailer-dashboard')) {
        router.push('/');
      }
    }
  }, [router, pathname]);

  const value = {
    user,
    isLoading,
    isAdmin,
    isRetailer,
    retailerName,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 