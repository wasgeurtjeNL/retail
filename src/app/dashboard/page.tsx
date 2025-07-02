"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import { getProducts, resetApplicationData, getPendingRetailers } from "@/lib/supabase";
import LogoutButton from "@/components/LogoutButton";
import WasstripsApplicationsOverview from "@/components/WasstripsApplicationsOverview";
import AdminRetailerSwitchNotice from './AdminRetailerSwitchNotice';

// Add a debug logging helper
const debugLog = (message: string, data?: any) => {
  console.debug(`[DEBUG] Dashboard: ${message}`, data || '');
};

// Reset knop component
const ResetDataButton = () => {
  const handleReset = () => {
    if (window.confirm('Dit zal alle mockdata resetten. Doorgaan?')) {
      resetApplicationData();
      alert('Data is gereset. Herlaad de pagina om de wijzigingen te zien.');
    }
  };
  
  return (
    <button
      onClick={handleReset}
      className="inline-flex items-center px-4 py-2 border border-red-500 text-sm font-medium rounded-md text-red-500 bg-white hover:bg-red-50 focus:outline-none"
    >
      <span className="mr-2">🔄</span> Reset mock-data
    </button>
  );
};

// Nieuwe asynchrone functie:
const fetchWasstripsApplications = async () => {
  try {
    console.log('[DEBUG] Fetching Wasstrips applications from API...');
    const res = await fetch('/api/wasstrips-applications');
    
    if (!res.ok) {
      console.error('[DEBUG] API response not OK:', res.status);
      return 0;
    }
    
    const result = await res.json();
    console.log('[DEBUG] API response:', result);
    
    // De nieuwe API structuur gebruikt { applications: [...] }
    if (result && Array.isArray(result.applications)) {
      // Tel alleen aanvragen van retailers die nog in behandeling zijn (retailer pending)
      const pendingRetailerApplications = result.applications.filter((app: any) => app.retailerPending);
      console.log('[DEBUG] Total applications:', result.applications.length);
      console.log('[DEBUG] Applications from pending retailers:', pendingRetailerApplications.length);
      return pendingRetailerApplications.length;
    }
    
    console.log('[DEBUG] No applications found or invalid structure');
    return 0;
  } catch (error) {
    console.error('[DEBUG] Error fetching Wasstrips applications from API:', error);
    return 0;
  }
};

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [pendingRetailersCount, setPendingRetailersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [wasstripsApplicationsCount, setWasstripsApplicationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Safely fetch products with better error handling
  const fetchProducts = useCallback(async () => {
    if (!mountedRef.current) return 0;
    
    debugLog("fetchProducts started");
    
    try {
      const productsArray = await getProducts();
      
      if (!mountedRef.current) return 0;

      // getProducts retourneert een array, dus we controleren de lengte
      debugLog("getProducts resultaat", { length: productsArray.length });
      return productsArray.length;

    } catch (error) {
      // This catches any unexpected errors during the fetch
      console.error('[DEBUG] Unexpected error in fetchProducts:', error);
      return 0;
    }
  }, []);

  // Safely fetch pending retailers with better error handling
  const fetchPendingRetailers = useCallback(async () => {
    if (!mountedRef.current) return 0;
    
    debugLog("fetchPendingRetailers started");
    
    try {
      const retailersArray = await getPendingRetailers();
      
      if (!mountedRef.current) return 0;

      // getPendingRetailers retourneert een array, dus we controleren de lengte
      debugLog("getPendingRetailers resultaat", { length: retailersArray.length });
      return retailersArray.length;

    } catch (error) {
      // This catches any unexpected errors during the fetch
      console.error('[DEBUG] Unexpected error in fetchPendingRetailers:', error);
      return 0;
    }
  }, []);

  // Load dashboard data with better error handling
  useEffect(() => {
    debugLog('Dashboard component mounted');
    
    // Set mounted ref to true on mount
    mountedRef.current = true;
    
    // Create an asynchronous function to load data
    const loadData = async () => {
      console.log("[DEBUG] loadData started");
      try {
        // Skip if still loading auth or not authorized
        if (authLoading || !user || !isAdmin) {
          console.log("[DEBUG] Skipping data load - auth status:", { authLoading, userExists: !!user, isAdmin });
          if (mountedRef.current) setIsLoading(false);
          return;
        }
        
        if (mountedRef.current) setIsLoading(true);
        
        // Fetch data with safer implementations
        try {
          console.log("[DEBUG] About to call fetchProducts");
          // Get product count with error handling
          const productCount = await fetchProducts().catch(error => {
            console.error('[DEBUG] Error in fetchProducts catch:', error);
            return 0;
          });
          console.log("[DEBUG] productCount result:", productCount);
          
          console.log("[DEBUG] About to call fetchPendingRetailers");
          // Get pending retailers count with error handling
          const pendingRetailersCount = await fetchPendingRetailers().catch(error => {
            console.error('[DEBUG] Error in fetchPendingRetailers catch:', error);
            return 0;
          });
          console.log("[DEBUG] pendingRetailersCount result:", pendingRetailersCount);
          
          console.log("[DEBUG] About to call fetchPendingOrders");
          // Get pending orders count
          const pendingOrdersCount = 0; // Tijdelijke fix
          console.log("[DEBUG] pendingOrdersCount result:", pendingOrdersCount);
          
          // Get Wasstrips applications count
          console.log("[DEBUG] Fetching Wasstrips applications");
          const wasstripsAppsCount = await fetchWasstripsApplications();
          console.log("[DEBUG] wasstripsAppsCount result:", wasstripsAppsCount);
          
          // Only update state if still mounted
          if (mountedRef.current) {
            console.log("[DEBUG] Updating state with counts:", { productCount, pendingRetailersCount, pendingOrdersCount, wasstripsAppsCount });
            setProductsCount(productCount);
            setPendingRetailersCount(pendingRetailersCount);
            setPendingOrdersCount(pendingOrdersCount);
            setWasstripsApplicationsCount(wasstripsAppsCount);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('[DEBUG] Error fetching dashboard data:', error);
          if (mountedRef.current) {
            console.log("[DEBUG] Setting counts to 0 due to error");
            setProductsCount(0);
            setPendingRetailersCount(0);
            setPendingOrdersCount(0);
            setWasstripsApplicationsCount(0);
            setIsLoading(false);
          }
        }
      } catch (error) {
        // Handle any unexpected errors
        console.error('[DEBUG] Dashboard data loading failed:', error);
        
        if (mountedRef.current) {
          console.log("[DEBUG] Setting counts to 0 due to outer error");
          setProductsCount(0);
          setPendingRetailersCount(0);
          setPendingOrdersCount(0);
          setWasstripsApplicationsCount(0);
          setIsLoading(false);
        }
      }
    };
    
    // Load data immediately (no delay to ensure auth state)
    if (!authLoading) {
      loadData().catch(error => {
        console.error('Unhandled error in loadData:', error);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      });
    } else {
      // Setup a listener for when auth is done loading
      const checkAuthInterval = setInterval(() => {
        if (!authLoading && mountedRef.current) {
          clearInterval(checkAuthInterval);
          loadData().catch(error => {
            console.error('Unhandled error in loadData:', error);
            if (mountedRef.current) {
              setIsLoading(false);
            }
          });
        }
      }, 100);
      
      // Clean up the interval
      return () => clearInterval(checkAuthInterval);
    }
    
    // Clean up function
    return () => {
      mountedRef.current = false;
    };
  }, [user, authLoading, isAdmin, fetchProducts, fetchPendingRetailers]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
            <p className="text-gray-600 mb-6">
              U heeft geen toegang tot deze pagina. Log in als admin om toegang te krijgen.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
            >
              Inloggen
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            
            <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold leading-6 text-gray-900">Admin Dashboard</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Beheer uw producten, retailers en instellingen vanuit één centrale locatie.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <ResetDataButton />
                <LogoutButton />
              </div>
            </div>
            
            <div className="mt-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900">Snelle Links</h3>
              <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* Retailer Aanvragen */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Retailer Aanvragen
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-pink-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                pendingRetailersCount
                              )}
                            </div>
                            {pendingRetailersCount > 0 && (
                              <div className="ml-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {pendingRetailersCount} nieuw
                                </span>
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/retailers" className="font-medium text-purple-600 hover:text-purple-500">
                        Bekijk alle aanvragen
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Producten Beheren */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-pink-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Producten
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-pink-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                productsCount
                              )}
                            </div>
                            <div className="ml-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Catalogus
                              </span>
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/products" className="font-medium text-pink-600 hover:text-pink-500">
                        Beheer producten
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Bestellingen - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Bestellingen
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-green-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                pendingOrdersCount
                              )}
                            </div>
                            {pendingOrdersCount > 0 && (
                              <div className="ml-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Te verzenden
                                </span>
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/orders" className="font-medium text-green-600 hover:text-green-500">
                        Beheer bestellingen
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Wasstrips Aanvragen - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-cyan-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Wasstrips Aanvragen
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-cyan-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                wasstripsApplicationsCount
                              )}
                            </div>
                            {wasstripsApplicationsCount > 0 && (
                              <div className="ml-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Retailers in behandeling
                                </span>
                              </div>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/wasstrips-applications" className="font-medium text-cyan-600 hover:text-cyan-500">
                        Bekijk alle aanvragen
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Monitoring */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Monitoring
                          </dt>
                          <dd>
                            <div className="text-2xl font-semibold text-gray-900">
                              Real-time
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/monitoring" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Bekijk monitoring
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Instellingen */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gray-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Instellingen
                          </dt>
                          <dd>
                            <div className="text-2xl font-semibold text-gray-900">
                              Configuratie
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/settings" className="font-medium text-gray-600 hover:text-gray-500">
                        Beheer instellingen
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recente Activiteit
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Overzicht van recente gebeurtenissen op het platform.
                </p>
              </div>
              <div className="border-t border-gray-200">
                <dl>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Retailer aanvragen
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {pendingRetailersCount === 0 
                        ? 'Geen openstaande aanvragen' 
                        : `${pendingRetailersCount} nieuwe aanvragen die goedkeuring vereisen`}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Wasstrips aanvragen
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {wasstripsApplicationsCount === 0 
                        ? 'Geen Wasstrips aanvragen van retailers in behandeling' 
                        : `${wasstripsApplicationsCount} aanvragen van retailers die nog goedkeuring wachten`}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Te verzenden bestellingen
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {pendingOrdersCount === 0 
                        ? 'Geen bestellingen te verzenden' 
                        : `${pendingOrdersCount} bestellingen wachten op verzending`}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Laatste login
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date().toLocaleString('nl-NL')}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Producten catalogus
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {productsCount === 0 
                        ? 'Geen producten in de catalogus' 
                        : `${productsCount} producten beschikbaar in de catalogus`}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* Wasstrips Aanvragen Overview */}
            <div className="mt-6">
              <WasstripsApplicationsOverview />
            </div>
            
            <AdminRetailerSwitchNotice />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 