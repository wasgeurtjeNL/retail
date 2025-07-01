'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getLogoUrl } from "@/lib/settings-service";

export default function RetailerNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/retailer-dashboard' },
    { name: 'Producten Bestellen', href: '/retailer-dashboard/catalog' },
    { name: 'Mijn Bestellingen', href: '/retailer-dashboard/orders' },
    { name: 'Marketingmateriaal', href: '/retailer-dashboard/marketing' },
    { name: 'Profiel', href: '/retailer-dashboard/profile' },
  ];
  
  const isActive = (path: string) => {
    if (path === '/retailer-dashboard') {
      return pathname === '/retailer-dashboard';
    }
    return pathname?.startsWith(path);
  };

  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Add a fallback default logo path
        const defaultLogoPath = '/assets/images/branding/company-logo.png';
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
        setLogoUrl('/assets/images/branding/company-logo.png');
      } finally {
        setLogoLoading(false);
      }
    };

    loadLogo();
  }, []);

  return (
    <header>
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
              <Link href="/retailer-dashboard" className="flex-shrink-0 flex items-center">
                {logoLoading ? (
                  <span className="text-xl font-bold text-yellow-400">Retailer Portal</span>
                ) : logoUrl ? (
                  <div className="h-14 flex items-center justify-center">
                    <img 
                      src={logoUrl} 
                      alt="Wasgeurtje Logo" 
                      className="max-h-14 max-w-[220px] object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-xl font-bold text-yellow-400">Retailer Portal</span>
                )}
              </Link>
              <div className="ml-10 hidden space-x-6 lg:flex">
                {navigation.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`${
                      isActive(link.href)
                        ? 'text-yellow-400 border-b-2 border-yellow-400'
                        : 'text-white hover:text-yellow-300'
                    } inline-flex items-center pb-2 text-sm font-medium`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="ml-10 space-x-4 flex items-center">
              <span className="text-sm text-white hidden md:inline-block">
                {user?.email || 'Retailer'}
              </span>
              <button
                onClick={() => logout()}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`${
                    isActive(link.href)
                      ? 'bg-gray-800 text-yellow-400'
                      : 'text-white hover:bg-gray-700 hover:text-yellow-300'
                  } block px-3 py-2 rounded-md text-base font-medium`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Mobile menu button - moved to main nav area */}
        <div className="lg:hidden px-4 py-2 flex justify-end">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white hover:text-yellow-400 focus:outline-none"
          >
            <span className="sr-only">Menu openen</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
} 