'use client';

import { ReactNode } from 'react';
import RetailerNavbar from '@/components/RetailerNavbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function RetailerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading, isRetailer } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Controleer of we op een checkout pagina zijn
  const isCheckoutPage = pathname?.includes('/retailer-dashboard/orders/');

  // Redirect niet-retailers naar login
  useEffect(() => {
    if (!isLoading && (!user || !isRetailer)) {
      router.push('/login');
    }
  }, [user, isLoading, isRetailer, router]);

  // Toon loading state terwijl we controleren of gebruiker is ingelogd
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  // Toon geen inhoud als niet ingelogd als retailer
  if (!user || !isRetailer) {
    return null; // Inhoud wordt niet getoond, redirect gebeurt via useEffect
  }

  // Voor checkout pagina's, toon alleen de content zonder RetailerNavbar of Footer
  if (isCheckoutPage) {
    return children;
  }

  // Voor normale pagina's, toon de standaard layout met RetailerNavbar en Footer
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <RetailerNavbar />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
} 