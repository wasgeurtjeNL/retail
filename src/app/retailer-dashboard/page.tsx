"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getProducts, Product, getAllOrdersForRetailer, Order as SupabaseOrder } from "@/lib/supabase";
import { createCheckoutSession } from "@/lib/stripe";

import { SunIcon, MoonIcon, SparklesIcon } from "@heroicons/react/24/outline";

import RetailerNotification from "@/components/RetailerNotification";
import TestNotification from "@/components/TestNotification";
import RetailerOnboarding from "@/components/RetailerOnboarding";
import SalesAdviceWidget from "@/components/SalesAdviceWidget";

// Functie om echte ordergegevens op te halen uit Supabase
const getOrdersFromSupabase = async (userEmail: string): Promise<SupabaseOrder[]> => {
  try {
    console.log('[RETAILER-DASHBOARD] Fetching orders from Supabase for:', userEmail);
    const result = await getAllOrdersForRetailer(userEmail);
    const orders = result.orders || [];
    console.log('[RETAILER-DASHBOARD] Loaded orders from Supabase:', orders);
    return orders;
  } catch (error) {
    console.error('[RETAILER-DASHBOARD] Error loading orders from Supabase:', error);
    return [];
  }
};

export default function RetailerDashboardPage() {
  const { user, isLoading: authLoading, isRetailer, retailerName } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [contactName, setContactName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingOrders: 0,
    productsSold: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  // Update the current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Get time-based greeting based on current hour
  const getTimeBasedGreeting = () => {
    const hour = currentTime.getHours();
    
    if (hour >= 5 && hour < 12) {
      // Ochtendgroet (5:00 - 11:59)
      return {
        text: "Goedemorgen",
        icon: <SunIcon className="h-6 w-6 text-yellow-400 animate-pulse-slow" />,
        className: "bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text",
        message: "Een productieve dag gewenst!"
      };
    } else if (hour >= 12 && hour < 18) {
      // Middaggroet (12:00 - 17:59)
      return {
        text: "Goedemiddag",
        icon: <SunIcon className="h-6 w-6 text-amber-500" />,
        className: "bg-gradient-to-r from-amber-500 to-orange-600 text-transparent bg-clip-text",
        message: "Nog even doorzetten!"
      };
    } else if (hour >= 18 && hour < 23) {
      // Avondgroet (18:00 - 22:59)
      return {
        text: "Goedenavond", 
        icon: <MoonIcon className="h-6 w-6 text-indigo-400" />,
        className: "bg-gradient-to-r from-indigo-400 to-purple-600 text-transparent bg-clip-text",
        message: "Een fijne avond toegewenst!"
      };
    } else {
      // Nachtgroet (23:00 - 4:59)
      return {
        text: "Goedenacht",
        icon: <SparklesIcon className="h-6 w-6 text-blue-400 animate-pulse-slow" />,
        className: "bg-gradient-to-r from-blue-600 to-purple-800 text-transparent bg-clip-text",
        message: "U bent laat aan het werk!"
      };
    }
  };
  
  useEffect(() => {
    const loadProducts = async () => {
      if (!authLoading && user && isRetailer) {
        setIsLoading(true);
        try {
          const productsData = await getProducts();
          // De functie getProducts() handelt de error al af en logt deze, 
          // en retourneert een lege array bij een fout.
          setProducts(productsData || []);
        } catch (error) {
          console.error('Error fetching products:', error);
          setProducts([]); // Zorg ervoor dat products een lege array is bij een fout
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadProducts();
  }, [user, authLoading, isRetailer]);
  
  // Fetch retailer profile to get contact person name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || authLoading) return;
      
      try {
        // Use simple email-based profile API (like getAllOrdersForRetailer)
        if (!user.email) {
          console.log('[RETAILER-DASHBOARD] No user email available');
          return;
        }
        
        console.log('[RETAILER-DASHBOARD] Fetching profile with email:', user.email);
        
        const response = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`, {
          method: 'GET',
        });
        
        console.log('[RETAILER-DASHBOARD] Profile API response status:', response.status);
        
        if (response.ok) {
          const profileData = await response.json();
          console.log('[RETAILER-DASHBOARD] Profile API response data:', profileData);
          
          if (profileData.profile) {
            const fullName = profileData.profile.full_name || '';
            const companyName = profileData.profile.company_name || '';
            
            // Use database data
            setContactName(fullName);
            setBusinessName(companyName);
            
            console.log('[RETAILER-DASHBOARD] Profile loaded successfully:', { fullName, companyName });
            return;
          }
        } else {
          const errorText = await response.text();
          console.log('[RETAILER-DASHBOARD] Profile API error:', response.status, errorText);
        }
        
        // Only use fallbacks if no database data is available
        console.log('[RETAILER-DASHBOARD] No database profile found, trying fallbacks');
        
        // Try to get from user metadata as fallback
        if (user.user_metadata?.contactName) {
          setContactName(user.user_metadata.contactName);
          setBusinessName(user.user_metadata?.businessName || 'Mijn Bedrijf');
          console.log('[RETAILER-DASHBOARD] Using user metadata');
          return;
        }
        
        // Last resort fallback to email username
        if (user?.email) {
          const emailUsername = user.email.split('@')[0];
          setContactName(emailUsername);
          setBusinessName('Mijn Bedrijf');
          console.log('[RETAILER-DASHBOARD] Using email fallback:', emailUsername);
        }
        
      } catch (error) {
        console.error('Error fetching profile:', error);
        
        // Fallback to email username as last resort
        if (user?.email && !contactName) {
          setContactName(user.email.split('@')[0]);
          setBusinessName('Mijn Bedrijf');
        }
      }
    };
    
    fetchProfile();
  }, [user, authLoading]);

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/onboarding/progress?profile_id=${user.id}`);
        const data = await response.json();
        
        if (data.needs_onboarding) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
  }, [user]);
  
  useEffect(() => {
    // Haal echte ordergegevens op uit Supabase
    const loadOrdersAndStats = async () => {
      if (!user?.email) {
        setStatsLoading(false);
        return;
      }
      
      try {
        setStatsLoading(true);
        const orders = await getOrdersFromSupabase(user.email);
        setRecentOrders(orders);
    
        // Bereken totalen met correcte type conversie
        const totalSales = orders.reduce((sum: number, order: SupabaseOrder) => {
          const orderTotal = typeof order.total_amount === 'string' 
            ? parseFloat(order.total_amount) 
            : Number(order.total_amount) || 0;
          console.log('[RETAILER-DASHBOARD] Processing order:', order.order_number, 'Total:', orderTotal);
          return sum + orderTotal;
        }, 0);
        
        const totalItems = orders.reduce((sum: number, order: SupabaseOrder) => {
          const items = order.items ? order.items.length : 0;
          return sum + items;
        }, 0);
        
        console.log('[RETAILER-DASHBOARD] Stats calculation:', {
          totalOrders: orders.length,
          totalSales,
          totalItems
        });
    
    setStats({
          totalSales: totalSales || 0,
          pendingOrders: orders.filter((order: SupabaseOrder) => order.payment_status === 'pending').length,
          productsSold: totalItems || 0
    });
        
      } catch (error) {
        console.error('[RETAILER-DASHBOARD] Error loading orders:', error);
        // Zet fallback stats bij fout
        setStats({
          totalSales: 0,
          pendingOrders: 0,
          productsSold: 0
        });
      } finally {
        setStatsLoading(false);
      }
    };
    
    loadOrdersAndStats();
  }, [user?.email]);

  const handlePurchase = async (product: Product) => {
    setOrderLoading(true);
    try {
      // Dit is een hypothetische voorbeeld; in een echte implementatie zou je 
      // de juiste stripe_price_id moeten ophalen en gebruiken
      const stripePriceId = "price_123"; // Demo prijs ID
      
      await createCheckoutSession([
        { price: stripePriceId, quantity: 1 }
      ]);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Er is een fout opgetreden bij het verwerken van uw bestelling. Probeer het opnieuw.');
    } finally {
      setOrderLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-grow flex justify-center items-center">
        <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user || !isRetailer) {
    return (
      <div className="flex-grow flex justify-center items-center">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
          <p className="text-gray-600 mb-6">
            U heeft geen toegang tot deze pagina. Log in als retailer om toegang te krijgen.
          </p>
          <Link 
            href="/login" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
          >
            Inloggen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Onboarding Modal */}
      {showOnboarding && !checkingOnboarding && user && (
        <RetailerOnboarding
          profileId={user.id}
          onComplete={() => {
            setShowOnboarding(false);
            // Refresh the page to load fresh data
            window.location.reload();
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Test Notification Component */}
        <TestNotification />
        
        {/* Notification component for payment options */}
        {user?.email && (
          <div className="mb-6">
            <RetailerNotification userEmail={user.email} />
          </div>
        )}
        
        {/* Wasstrips Banner - Prominent op dashboard */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern-grid opacity-10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400 rounded-full transform translate-x-16 -translate-y-16 opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-800 rounded-full transform -translate-x-16 translate-y-16 opacity-20"></div>
          
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-8">
              <div className="inline-block bg-black text-yellow-400 px-3 py-1 text-xs uppercase font-bold rounded mb-4">
                Limited Time Offer
              </div>
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">Exclusieve Wasstrips nu beschikbaar!</h2>
              <p className="text-cyan-100 text-base mb-4">
                Ons nieuwste product met al 25.000+ klanten in de eerste maand. <span className="font-bold">60-70% marge</span> en gemiddeld 35% omzetstijging voor retailers!
              </p>
              
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Aanmeldperiode: nog 14 dagen</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">First come, first served</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="bg-white rounded-lg p-4 mb-4 shadow-lg transform rotate-3 relative animate-pulse-slow">
                <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  EXCLUSIEF
                </div>
                <img 
                  src="/assets/images/wasstrips-product.jpg" 
                  alt="Wasstrips" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <Link 
                href="/retailer-dashboard/wasstrips"
                className="bg-black text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-gray-900 transition-colors border-2 border-transparent hover:border-yellow-400 flex items-center"
              >
                Schrijf nu in
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-b border-gray-200 pb-5 mb-6">
          {/* Enhanced greeting header with animation and styling */}
          <div className="rounded-lg bg-gradient-to-r from-gray-50 to-white p-4 shadow-sm transition-all duration-300 hover:shadow border border-gray-100">
            <div className="flex items-center space-x-2 mb-1">
              {getTimeBasedGreeting().icon}
              <h1 className="text-2xl font-extrabold">
                <span className={getTimeBasedGreeting().className}>{getTimeBasedGreeting().text}</span>
                <span className="text-gray-900"> {contactName} van {businessName || retailerName}</span>
              </h1>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="mt-1 text-sm text-gray-600 italic animate-fade-in">
                  {getTimeBasedGreeting().message} Bekijk uw retailer dashboard voor bestellingen, verkopen en meer.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · {currentTime.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Link 
                href="/retailer-dashboard/catalog"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 transition-all duration-300 hover:shadow-md"
              >
                Nieuwe bestelling plaatsen
              </Link>
            </div>
          </div>
        </div>
        
        {/* Statistieken */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-pink-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Totale verkopen
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {statsLoading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-20 rounded"></div>
                        ) : (
                          <>€{(stats.totalSales || 0).toFixed(2)}</>
                        )}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/retailer-dashboard/orders" className="font-medium text-pink-600 hover:text-pink-500">
                  Bekijk alle verkopen
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Lopende bestellingen
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {statsLoading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
                        ) : (
                          stats.pendingOrders
                        )}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/retailer-dashboard/orders" className="font-medium text-pink-600 hover:text-pink-500">
                  Bestellingen bijhouden
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Marketing Tools
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        Verhoog uw omzet
                      </div>
                      <div className="text-sm text-gray-500">
                        Tot +€1.250/maand mogelijk
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/retailer-dashboard/marketing" className="font-medium text-purple-600 hover:text-purple-500 flex items-center">
                  <span>Ontdek marketing strategieën</span>
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Verkochte producten
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {statsLoading ? (
                          <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
                        ) : (
                          stats.productsSold
                        )}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/retailer-dashboard/catalog" className="font-medium text-pink-600 hover:text-pink-500">
                  Producten bestellen
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Advice Widget */}
        <div className="mb-8">
          <SalesAdviceWidget profileId={user?.id} />
        </div>
        
        {/* Recente bestellingen */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Recente bestellingen</h2>
              <p className="mt-1 text-sm text-gray-500">
                Uw meest recente bestellingen en hun statussen
              </p>
            </div>
            <Link href="/retailer-dashboard/orders" className="text-sm font-medium text-pink-600 hover:text-pink-500">
              Alle bestellingen bekijken
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">U heeft nog geen bestellingen geplaatst.</p>
              <div className="mt-4">
                <Link 
                  href="/retailer-dashboard/catalog"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
                >
                  Plaats uw eerste bestelling
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordernummer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Totaal
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{order.order_number || order.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(order.created_at || order.date || Date.now()).toLocaleDateString('nl-NL')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.fulfillment_status === 'delivered' || order.status === 'Geleverd'
                            ? 'bg-green-100 text-green-800' 
                            : order.fulfillment_status === 'shipped' || order.status === 'Verzonden'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.payment_status === 'paid'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.fulfillment_status === 'delivered' || order.status === 'Geleverd' 
                            ? 'Geleverd'
                            : order.fulfillment_status === 'shipped' || order.status === 'Verzonden'
                              ? 'Verzonden'
                              : order.payment_status === 'paid'
                                ? 'Betaald'
                                : order.payment_status === 'pending'
                                  ? 'Pending'
                                  : order.status || 'Onbekend'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        €{(typeof order.total_amount === 'string' 
                          ? parseFloat(order.total_amount) 
                          : Number(order.total_amount) || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/retailer-dashboard/orders/${order.id}`}
                          className="text-pink-600 hover:text-pink-900"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        

      </div>
    </div>
  );
} 