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

// Fetch prospects count
const fetchProspectsCount = async () => {
  try {
    console.log('[DEBUG] Fetching prospects count from API...');
    const res = await fetch('/api/commercial/prospects?limit=1');
    
    if (!res.ok) {
      console.error('[DEBUG] Prospects API response not OK:', res.status);
      return 0;
    }
    
    const result = await res.json();
    console.log('[DEBUG] Prospects API response:', result);
    
    if (result && result.success && result.data && result.data.statistics) {
      const total = result.data.statistics.total || 0;
      console.log('[DEBUG] Total prospects:', total);
      return total;
    }
    
    console.log('[DEBUG] No prospects found or invalid structure');
    return 0;
  } catch (error) {
    console.error('[DEBUG] Error fetching prospects from API:', error);
    return 0;
  }
};

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [pendingRetailersCount, setPendingRetailersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [wasstripsApplicationsCount, setWasstripsApplicationsCount] = useState(0);
  const [prospectsCount, setProspectsCount] = useState(0);
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
          
          // Get prospects count
          console.log("[DEBUG] Fetching prospects count");
          const prospectsCount = await fetchProspectsCount();
          console.log("[DEBUG] prospectsCount result:", prospectsCount);
          
          // Only update state if still mounted
          if (mountedRef.current) {
            console.log("[DEBUG] Updating state with counts:", { productCount, pendingRetailersCount, pendingOrdersCount, wasstripsAppsCount, prospectsCount });
            setProductsCount(productCount);
            setPendingRetailersCount(pendingRetailersCount);
            setPendingOrdersCount(pendingOrdersCount);
            setWasstripsApplicationsCount(wasstripsAppsCount);
            setProspectsCount(prospectsCount);
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
            setProspectsCount(0);
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
          setProspectsCount(0);
          setIsLoading(false);
        }
      }
    };
    
    // Load data immediately (no delay to ensure auth state)
    if (!authLoading) {
      loadData().catch(error => {
        console.error('Unhandled error in loadData:', error);
        if (mountedRef.current) {
          setProspectsCount(0);
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
          setProspectsCount(0);
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Retailer Aanvragen
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {pendingRetailersCount}
                            </div>
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Producten
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {productsCount}
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Bestellingen
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {pendingOrdersCount}
                            </div>
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
                
                {/* Bedrijfsuitnodigingen */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-pink-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Uitnodigingen
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Beheer
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/invitations" className="font-medium text-pink-600 hover:text-pink-500">
                        Bedrijven uitnodigen
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Wasstrips Aanvragen
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {wasstripsApplicationsCount}
                            </div>
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

                {/* Recente Activiteit */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Recente Activiteit
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Overzicht
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/recent-activity" className="font-medium text-yellow-600 hover:text-yellow-500">
                        Bekijk activiteit
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Website Analyse - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Website Analyses
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              AI-gedreven
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/website-analysis" className="font-medium text-blue-600 hover:text-blue-500">
                        Beheer analyses
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Sales Success Metrics - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Sales Success Program
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Metrics & ROI
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/sales-metrics" className="font-medium text-purple-600 hover:text-purple-500">
                        Bekijk success metrics
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Sales Analytics - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Sales Analytics
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Performance Insights
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/sales-analytics" className="font-medium text-blue-600 hover:text-blue-500">
                        Bekijk analytics
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Sales Metrics - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Sales Metrics
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Retailer Engagement
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/sales-metrics" className="font-medium text-orange-600 hover:text-orange-500">
                        Bekijk metrics
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Fulfillment Orders - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Fulfillment Orders
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Trial Packages
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Link href="/dashboard/fulfillment" className="font-medium text-orange-600 hover:text-orange-500">
                        Beheer fulfillment
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
                            <div className="text-lg font-medium text-gray-900">
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
                
                {/* Funnel Analyse */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Funnel Analyse
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              Conversie Tracking
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm space-y-1">
                      <div>
                        <Link href="/dashboard/funnel-analysis" className="font-medium text-indigo-600 hover:text-indigo-500">
                          📊 Conversie overzicht →
                        </Link>
                      </div>
                      <div>
                        <Link href="/dashboard/funnel-details" className="font-medium text-purple-600 hover:text-purple-500">
                          🔍 Gedetailleerde tracking →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Commerciële Acquisitie - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Commerciële Acquisitie
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              AI-gedreven prospecting
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm space-y-1">
                      <div>
                        <Link href="/dashboard/commercial-acquisition" className="font-medium text-pink-600 hover:text-pink-500">
                          🎯 Acquisitie Dashboard →
                        </Link>
                      </div>
                      <div>
                        <Link href="/dashboard/commercial-acquisition?tab=two_phase_automation" className="font-medium text-blue-600 hover:text-blue-500">
                          🚀 2-Fase Automation →
                        </Link>
                      </div>
                      <div>
                        <Link href="/dashboard/segment-templates" className="font-medium text-indigo-600 hover:text-indigo-500">
                          🎨 Segment Templates →
                        </Link>
                      </div>
                      <div>
                        <Link href="/commercial-partner" target="_blank" className="font-medium text-purple-600 hover:text-purple-500">
                          📄 Landing Page Preview →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prospects Database - NIEUWE KAART */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-blue-600 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Prospects Database
                          </dt>
                                                     <dd>
                             <div className="text-lg font-medium text-gray-900">
                               {prospectsCount} prospects gevonden
                             </div>
                           </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm space-y-1">
                      <div>
                        <Link href="/dashboard/prospects" className="font-medium text-green-600 hover:text-green-500">
                          👥 Alle prospects bekijken →
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500">
                        🧠 Via Perplexity AI gevonden
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instellingen */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-gray-500 rounded-md p-3">
                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Instellingen
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
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
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 