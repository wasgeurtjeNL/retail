"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getLogoUrl } from "@/lib/settings-service";
import { useAuth } from "@/contexts/AuthContext";
import LogoutButton from "./LogoutButton";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Add a fallback default logo path
        const defaultLogoPath = '/assets/images/branding/default-logo.png';
        let url: string | null = null;
        
        try {
          url = await getLogoUrl();
        } catch (error) {
          console.error('Error fetching logo URL:', error);
          // Don't throw - use the default logo
        }
        
        // If getLogoUrl fails or returns null, use default logo
        setLogoUrl(url || defaultLogoPath);
      } catch (error) {
        console.error('Error in loadLogo function:', error);
        // Set a default logo path in case of error
        setLogoUrl('/assets/images/branding/default-logo.png');
      } finally {
        setLogoLoading(false);
      }
    };

    loadLogo();
  }, []);

  return (
    <>
      {/* Top bar with ratings and info */}
      <div className="bg-gray-900 text-white text-xs py-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center">
          <div className="flex items-center">
            <div className="flex text-yellow-400 mr-2">
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>
            <span className="text-white">4.8/5 (1400+ google reviews)</span>
          </div>
          
          <div className="flex space-x-4 items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Voor 16:00 uur besteld, vandaag verzonden*</span>
            </div>
            
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>Gratis verzending NL & BE</span>
            </div>
            
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 9.5c.671-.671 1.763-.671 2.121 0 .671.671.671 1.763 0 2.121-.671.671-1.763.671-2.121 0-.671-.671-.671-1.763 0-2.121zM15.5 9.5c.671-.671 1.763-.671 2.121 0 .671.671.671 1.763 0 2.121-.671.671-1.763.671-2.121 0-.671-.671-.671-1.763 0-2.121zM12 16c1.5 0 3-1 3-3" />
              </svg>
              <span>Service & Contact</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                {logoLoading ? (
                  <span className="text-xl font-bold text-yellow-400">Wasgeurtje.nl</span>
                ) : logoUrl ? (
                  <div className="h-14 flex items-center justify-center">
                    <img 
                      src={logoUrl} 
                      alt="Wasgeurtje Logo" 
                      className="max-h-14 max-w-[220px] object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-xl font-bold text-yellow-400">Wasgeurtje.nl</span>
                )}
              </Link>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
              <Link href="/" className="px-3 py-2 text-sm font-medium text-white uppercase hover:text-yellow-400">
                Home
              </Link>
              
              {user ? (
                <>
                  {isAdmin && (
                    <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-white uppercase hover:text-yellow-400">
                      Dashboard
                    </Link>
                  )}
                  <LogoutButton size="sm" variant="secondary" className="text-white border-white hover:text-yellow-400 hover:border-yellow-400 bg-transparent" />
                </>
              ) : (
                <>
                  <Link href="/register" className="px-3 py-2 text-sm font-medium text-white uppercase hover:text-yellow-400">
                    Word een Retailer
                  </Link>
                  <Link href="/login" className="px-3 py-2 text-sm font-medium text-white uppercase hover:text-yellow-400">
                    Retailer Inloggen
                  </Link>
                  <Link 
                    href="/register" 
                    className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-black bg-yellow-400 hover:bg-yellow-500"
                  >
                    Nu Aanmelden
                  </Link>
                </>
              )}
            </div>
            
            {/* Search and Cart Icons */}
            <div className="hidden sm:flex items-center ml-4 space-x-4">
              <button 
                className="text-yellow-400 hover:text-yellow-300"
                aria-label="Zoeken"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button 
                className="text-yellow-400 hover:text-yellow-300"
                aria-label="Winkelwagen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-yellow-400 hover:bg-gray-800"
              >
                <span className="sr-only">Open hoofdmenu</span>
                {mobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden bg-black">
            <div className="pt-2 pb-3 space-y-1">
              <Link href="/" className="block px-3 py-2 text-base font-medium text-white hover:bg-gray-800 hover:text-yellow-400">
                Home
              </Link>
              
              {user ? (
                <>
                  {isAdmin && (
                    <Link href="/dashboard" className="block px-3 py-2 text-base font-medium text-white hover:bg-gray-800 hover:text-yellow-400">
                      Dashboard
                    </Link>
                  )}
                  <div className="px-3 py-2">
                    <LogoutButton variant="danger" />
                  </div>
                </>
              ) : (
                <>
                  <Link href="/register" className="block px-3 py-2 text-base font-medium text-white hover:bg-gray-800 hover:text-yellow-400">
                    Word een Retailer
                  </Link>
                  <Link href="/login" className="block px-3 py-2 text-base font-medium text-white hover:bg-gray-800 hover:text-yellow-400">
                    Retailer Inloggen
                  </Link>
                  <Link 
                    href="/register" 
                    className="block w-full text-left px-3 py-2 text-base font-medium text-black bg-yellow-400 hover:bg-yellow-500"
                  >
                    Nu Aanmelden
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      {/* Gold bar below navigation */}
      <div className="h-1 bg-yellow-400"></div>
    </>
  );
} 