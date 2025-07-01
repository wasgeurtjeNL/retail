'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCheckoutSession } from '@/lib/stripe';
import { motion } from 'framer-motion';

interface OrderDetails {
  id: string;
  totalAmount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  date: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    houseNumber?: string;
    houseNumberAddition?: string;
    postcode?: string;
  };
  shippingMethod?: 'dhl' | 'postnl';
  extraShippingCost?: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'invoice' | 'stripe' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  
  // Animation state
  const [paymentCardAnimation, setPaymentCardAnimation] = useState<'invoice' | 'stripe' | null>(null);
  
  useEffect(() => {
    // Haal bestellingsgegevens op uit localStorage
    const lastOrder = localStorage.getItem('lastOrder');
    if (!lastOrder) {
      // Als er geen bestellingsgegevens zijn, stuur gebruiker naar catalogus
      router.push('/retailer-dashboard/catalog');
      return;
    }
    
    try {
      const parsedOrder = JSON.parse(lastOrder);
      setOrderDetails(parsedOrder);
    } catch (error) {
      console.error('Fout bij het parsen van bestelgegevens:', error);
      router.push('/retailer-dashboard/catalog');
    }
  }, [router]);
  
  const handlePaymentSelection = (method: 'invoice' | 'stripe') => {
    setPaymentMethod(method);
    
    // Trigger card animation
    setPaymentCardAnimation(method);
    setTimeout(() => setPaymentCardAnimation(null), 1000);
  };
  
  const handlePayment = async () => {
    if (!paymentMethod || !orderDetails) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Update bestelgegevens met betaalmethode
      const updatedOrder = {
        ...orderDetails,
        paymentMethod,
        paymentStatus: paymentMethod === 'invoice' ? 'pending' : 'processing',
      };
      
      // Sla bijgewerkte bestelgegevens op
      localStorage.setItem('lastOrder', JSON.stringify(updatedOrder));
      
      // Bij factuur direct naar bevestiging, bij Stripe starten we de Stripe checkout
      if (paymentMethod === 'invoice') {
        // Simuleer verwerking van betaling
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Plaats de order in de ordergeschiedenis
        const existingOrdersJson = localStorage.getItem('retailerOrders');
        let existingOrders = [];
        if (existingOrdersJson) {
          existingOrders = JSON.parse(existingOrdersJson);
        }

        // Check if this order already exists in history
        const orderIndex = existingOrders.findIndex((o: any) => o.id === updatedOrder.id);
        if (orderIndex >= 0) {
          existingOrders[orderIndex] = updatedOrder;
        } else {
          existingOrders.unshift(updatedOrder);
        }

        localStorage.setItem('retailerOrders', JSON.stringify(existingOrders));
        
        // Synchroniseer met het admin dashboard
        syncOrderToAdminDashboard(updatedOrder);
        
        router.push('/retailer-dashboard/orders/confirmation');
      } else {
        // Stripe checkout starten
        console.log('Redirecting to Stripe checkout...');
        
        // Gebruik inline prijsgegevens in plaats van price IDs
        const stripeItems = orderDetails.items.map(item => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name,
              description: `${item.id} - ${item.quantity} stuks`,
            },
            unit_amount: Math.round(item.price * 100), // Stripe verwacht bedragen in centen
          },
          quantity: item.quantity
        }));
        
        console.log('Creating Stripe checkout session with items:', stripeItems);
        
        // Show a processing message
        setError('De betaling wordt verwerkt. Dit kan enkele seconden duren...');
        
        try {
          // Maak een checkout sessie - de redirect gebeurt automatisch in de functie
          // als de URL succesvol wordt opgehaald
          const result = await createCheckoutSession(stripeItems);
          
          // Als er een fout is, toon deze
          if ('error' in result) {
            console.error('Stripe checkout error:', result.error);
            setError(`Fout bij het starten van Stripe checkout: ${result.error}`);
            return;
          }
          
          // Als we hier komen, is er geen redirect gebeurd maar ook geen fout
          console.log('Checkout result:', result);
          
          // Als de pop-up geblokkeerd was, bieden we een handmatige link aan
          if (result.url) {
            setError(
              <>
                <span className="block mb-2">Stripe Checkout werd geopend in een nieuw tabblad.</span>
                <span className="block mb-4">Als er geen nieuw tabblad werd geopend, klik dan op onderstaande knop:</span>
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Ga naar Stripe Checkout
                </a>
              </>
            );
          } else {
            setError('Er is een fout opgetreden bij het redirecten naar Stripe. Probeer het opnieuw.');
          }
        } catch (checkoutError) {
          console.error('Stripe checkout exception:', checkoutError);
          setError('Er is een fout opgetreden bij het maken van de Stripe checkout sessie. Controleer de console voor meer informatie.');
        }
      }
    } catch (error) {
      console.error('Fout bij het verwerken van betaling:', error);
      setError('Er is een fout opgetreden bij het verwerken van uw betaling. Probeer het opnieuw.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Functie om bestellingen te synchroniseren met het admin dashboard
  const syncOrderToAdminDashboard = (order: any) => {
    try {
      // Haal bestaande admin bestellingen op
      const savedMockOrders = localStorage.getItem('mockOrders');
      console.log('DEBUG: syncOrderToAdminDashboard aangeroepen', {
        order_id: order.id,
        heeftBestaandeData: !!savedMockOrders,
        lengte: savedMockOrders?.length
      });
      
      let mockOrdersData: any[] = [];
      
      if (savedMockOrders) {
        mockOrdersData = JSON.parse(savedMockOrders);
        console.log('DEBUG: Bestaande mockOrders geladen', {
          aantal: mockOrdersData.length,
          ids: mockOrdersData.map((o: any) => o.id).join(', ')
        });
      }
      
      // Controleer of de bestelling al bestaat
      const existingOrderIndex = mockOrdersData.findIndex((o: any) => o.id === order.id);
      
      // Omzetten van retailer order naar admin order format
      const adminOrder = {
        id: order.id,
        retailer_id: '4', // In een echte implementatie zou dit de daadwerkelijke retailer ID zijn
        total_amount: order.totalAmount,
        items: order.items,
        date: order.date,
        shipping_address: order.shippingAddress || {},
        payment_method: order.paymentMethod || 'invoice',
        payment_status: order.paymentStatus || 'pending',
        fulfillment_status: 'pending',
        payment_intent_id: order.paymentIntentId,
        stripe_session_id: order.stripeSessionId,
        retailer_business_name: 'Wasparfum Express' // In een echte implementatie zou dit de daadwerkelijke naam zijn
      };
      
      if (existingOrderIndex >= 0) {
        // Update bestaande bestelling
        mockOrdersData[existingOrderIndex] = adminOrder;
        console.log('DEBUG: Bestaande order bijgewerkt', { id: adminOrder.id, index: existingOrderIndex });
      } else {
        // Voeg nieuwe bestelling toe aan het begin van de array
        mockOrdersData.unshift(adminOrder);
        console.log('DEBUG: Nieuwe order toegevoegd', { id: adminOrder.id, nieuwAantal: mockOrdersData.length });
      }
      
      // Sla bijgewerkte mockOrders op
      localStorage.setItem('mockOrders', JSON.stringify(mockOrdersData));
      console.log('DEBUG: mockOrders opgeslagen in localStorage', {
        aantal: mockOrdersData.length,
        ids: mockOrdersData.map((o: any) => o.id).join(', ')
      });
    } catch (error) {
      console.error('Fout bij synchroniseren van bestelling met admin dashboard:', error);
    }
  };
  
  if (!orderDetails) {
    return (
      <div className="h-screen bg-white flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
          <p className="mt-4 text-slate-600 font-medium">Betalingsgegevens laden...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header - Simplified for checkout */}
      <header className="bg-white shadow-sm py-4 mb-6">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo */}
            <div className="h-14 flex items-center">
              <img 
                src="/assets/images/branding/default-logo.png" 
                alt="Logo" 
                className="h-full object-contain"
              />
            </div>
            {/* Tagline */}
            <p className="ml-4 text-slate-600 hidden md:block">Uw betrouwbare partner voor kwaliteitsproducten</p>
          </div>
          <div className="text-sm text-slate-500 flex items-center">
            <svg className="w-5 h-5 mr-1 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Beveiligde checkout</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Voortgangsindicator - Interactive */}
        <motion.div 
          className="mb-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-2">
            <Link href="/retailer-dashboard/catalog" className="w-1/3 relative group">
              <div className="mx-auto w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center border-2 border-white shadow-md group-hover:bg-slate-300 transition-all cursor-pointer">
                <span className="text-lg font-bold">1</span>
              </div>
              <span className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-all">Winkelwagen</span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-slate-800 text-white text-xs py-1 px-2 rounded absolute -top-8 whitespace-nowrap">
                  Terug naar winkelwagen
                </span>
              </div>
            </Link>
            <Link href="/retailer-dashboard/orders/address" className="w-1/3 relative group">
              <div className="mx-auto w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center border-2 border-white shadow-md group-hover:bg-slate-300 transition-all cursor-pointer">
                <span className="text-lg font-bold">2</span>
              </div>
              <span className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-all">Adres</span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-slate-800 text-white text-xs py-1 px-2 rounded absolute -top-8 whitespace-nowrap">
                  Terug naar adres
                </span>
            </div>
            </Link>
            <div className="w-1/3 relative">
              <div className="mx-auto w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-blue-100">
                <span className="text-lg font-bold">3</span>
            </div>
              <span className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-xs font-bold text-blue-800">Betaling</span>
            </div>
          </div>
          <div className="relative h-1 bg-slate-200 rounded-full mt-8">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Content */}
          <div className="md:w-2/3">
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="border-b border-slate-100 py-5 px-6 bg-slate-50">
                <h1 className="text-xl font-bold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1M12 15h1M17 15h1M7 20h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  Betalingsmethode
                </h1>
                <p className="text-slate-500 text-sm ml-8">Kies een betaalmethode om je bestelling af te ronden</p>
          </div>
          
          {/* Bestelgegevens */}
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-medium text-slate-800 mb-4">Besteloverzicht</h2>
            
                <div className="mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex justify-between mb-2">
                    <span className="text-slate-600 text-sm">Bestelnummer:</span>
                    <span className="font-medium text-slate-800">{orderDetails.id}</span>
              </div>
              <div className="flex justify-between">
                    <span className="text-slate-600 text-sm">Datum:</span>
                    <span className="font-medium text-slate-800">{new Date(orderDetails.date).toLocaleDateString('nl-NL')}</span>
              </div>
            </div>
            
                {/* Product list */}
                <div className="rounded-lg border border-slate-200 overflow-hidden mb-5">
                  <div className="bg-slate-50 py-2 px-4 border-b border-slate-200">
                    <h3 className="font-medium text-slate-800">Producten</h3>
                  </div>
                  
                  <div className="divide-y divide-slate-200">
                    {orderDetails.items.map((item, index) => (
                      <motion.div 
                        key={item.id} 
                        className="py-3 px-4 flex justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 * index, duration: 0.3 }}
                      >
                  <div>
                          <p className="font-medium text-slate-800">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.quantity} × €{item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-medium text-slate-800">€{(item.quantity * item.price).toFixed(2)}</p>
                      </motion.div>
                    ))}
                  </div>
            </div>
            
                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="font-semibold text-base text-slate-800">Totaalbedrag</p>
                  <p className="font-bold text-xl text-blue-600">€{orderDetails.totalAmount.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Verzendadres */}
          {orderDetails.shippingAddress && (
                <div className="p-6 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-slate-800">Afleveradres</h2>
                    <Link 
                      href="/retailer-dashboard/orders/address" 
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Wijzigen
                    </Link>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="text-slate-800">
                  <p>{orderDetails.shippingAddress.street} {orderDetails.shippingAddress.houseNumber}{orderDetails.shippingAddress.houseNumberAddition}</p>
                  <p>{orderDetails.shippingAddress.postcode} {orderDetails.shippingAddress.city}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Verzendgegevens - Nieuwe sectie */}
              {orderDetails.shippingMethod && (
                <div className="p-6 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-slate-800 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                      </svg>
                      Verzendmethode
                    </h2>
                  <Link 
                    href="/retailer-dashboard/orders/address" 
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                      Wijzigen
                  </Link>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center">
                    {orderDetails.shippingMethod === 'dhl' ? (
                      <div className="h-10 w-16 mr-4 bg-[#FFCC00] flex items-center justify-center rounded">
                        <span className="font-bold text-[#D40511]">DHL</span>
                      </div>
                    ) : (
                      <div className="h-10 w-16 mr-4 bg-[#EC7405] flex items-center justify-center rounded">
                        <span className="font-bold text-white">PostNL</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-800">{orderDetails.shippingMethod === 'dhl' ? 'DHL' : 'PostNL'}</p>
                      <p className="text-sm text-slate-600">
                        {orderDetails.shippingMethod === 'dhl' 
                          ? 'Levering binnen 1-2 werkdagen' 
                          : 'Levering binnen 1-3 werkdagen'}
                      </p>
                      {orderDetails.extraShippingCost && orderDetails.extraShippingCost > 0 && (
                        <p className="text-sm text-slate-600 mt-1">
                          Verzendkosten: €{orderDetails.extraShippingCost.toFixed(2)}
                        </p>
                      )}
                </div>
              </div>
            </div>
          )}
          
          {/* Betaalmethodes */}
              <div className="p-6">
                <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  Kies uw betaalmethode
                </h2>
                
                <div className="space-y-4">
              {/* Betalen op factuur */}
                  <motion.div 
                    className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                  paymentMethod === 'invoice' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-30' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
                onClick={() => handlePaymentSelection('invoice')}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
              >
                    <div className="p-4 flex items-start">
                  <div className={`flex-shrink-0 h-5 w-5 rounded-full border ${
                        paymentMethod === 'invoice' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  } mr-3 mt-0.5 flex items-center justify-center`}>
                    {paymentMethod === 'invoice' && (
                          <motion.svg 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                            className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                          >
                        <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                    )}
                  </div>
                  
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-base font-medium text-slate-800">Betalen op factuur</h3>
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">Aanbevolen</span>
                        </div>
                        <p className="text-slate-600 text-sm mt-1">
                      Ontvang een factuur die binnen 14 dagen betaald moet worden
                    </p>
                    <div className="mt-2 flex items-center">
                          <svg className="h-4 w-4 text-green-500 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                          <span className="text-xs text-slate-600">Betaling binnen 14 dagen</span>
                    </div>
                  </div>
                      <div className="ml-4 bg-slate-100 p-3 rounded-lg">
                        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                </div>
              </div>
                  </motion.div>
              
              {/* Betalen met Stripe */}
                  <motion.div 
                    className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                  paymentMethod === 'stripe' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-30' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
                onClick={() => handlePaymentSelection('stripe')}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
              >
                    <div className="p-4 flex items-start">
                  <div className={`flex-shrink-0 h-5 w-5 rounded-full border ${
                        paymentMethod === 'stripe' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  } mr-3 mt-0.5 flex items-center justify-center`}>
                    {paymentMethod === 'stripe' && (
                          <motion.svg 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                            className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                          >
                        <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </motion.svg>
                    )}
                  </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-slate-800">Betalen met online betaalmethoden</h3>
                        <p className="text-slate-600 text-sm mt-1">
                      Betaal direct met uw creditcard of iDEAL via Stripe
                    </p>
                        
                        {/* Payment logos */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="bg-slate-50 py-1.5 px-3 rounded border border-slate-200 flex items-center">
                            <span className="text-[10px] text-slate-500 mr-1">Powered by</span>
                            <span className="text-blue-500 font-bold text-xs">Stripe</span>
                          </div>
                          <div className="flex gap-1">
                            <div className="h-6 w-10 bg-blue-600 rounded flex items-center justify-center text-[10px] font-semibold text-white">
                              VISA
                            </div>
                            <div className="h-6 w-10 bg-red-500 rounded flex items-center justify-center text-[10px] font-semibold text-white">
                              MC
                            </div>
                            <div className="h-6 w-10 bg-slate-700 rounded flex items-center justify-center text-[10px] font-semibold text-white">
                              AMEX
                            </div>
                          </div>
                          <div className="h-6 w-16 bg-green-600 rounded flex items-center justify-center text-[10px] font-semibold text-white">
                            iDEAL
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 bg-slate-100 p-3 rounded-lg">
                        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1M12 15h1M17 15h1M7 20h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {error && (
                  <motion.div 
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {error}
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Guarantee box */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500 mb-6 flex"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mr-4 text-blue-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Veilige betaling en verwerking</h3>
                <p className="text-sm text-slate-600">Uw bestelgegevens en betaling worden veilig en versleuteld verwerkt via onze beveiligde omgeving.</p>
          </div>
            </motion.div>

            {/* Actieknoppen */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-end"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link 
                href="/retailer-dashboard/orders/address" 
                className="py-3 px-5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-center font-medium text-sm transition-colors"
              >
                <span className="flex items-center justify-center">
                  <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Terug naar adres
                </span>
            </Link>
              
              <motion.button 
              onClick={handlePayment}
              disabled={!paymentMethod || isProcessing}
                className={`py-3 px-5 rounded-lg font-medium text-sm transition-colors ${
                !paymentMethod || isProcessing
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
                whileHover={!(!paymentMethod || isProcessing) ? { scale: 1.02 } : {}}
                whileTap={!(!paymentMethod || isProcessing) ? { scale: 0.98 } : {}}
            >
              {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verwerken...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Betalen {paymentMethod === 'invoice' ? 'met factuur' : 'met Stripe'}
                    <svg className="h-4 w-4 ml-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </motion.button>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="md:w-1/3">
            {/* Order stack */}
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-slate-800 text-white py-4 px-5">
                <h2 className="font-bold">Uw bestelling</h2>
              </div>
              <div className="p-5">
                <div className="mb-5">
                  <h3 className="font-medium text-slate-800 mb-2">Inbegrepen in uw pakket:</h3>
                  <ul className="space-y-3">
                    {orderDetails.items.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span className="text-sm text-slate-600">{item.name} <span className="text-slate-500">({item.quantity}x)</span></span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  {/* Bereken het oorspronkelijke bedrag zonder verzendkosten */}
                  {orderDetails.extraShippingCost !== undefined ? (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">Subtotaal</span>
                        <span className="text-sm text-slate-800 font-medium">
                          €{(orderDetails.totalAmount - (orderDetails.extraShippingCost || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">
                          Verzendkosten ({orderDetails.shippingMethod === 'dhl' ? 'DHL' : 'PostNL'})
                        </span>
                        <span className="text-sm text-slate-800 font-medium">
                          €{(orderDetails.extraShippingCost || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Subtotaal</span>
                      <span className="text-sm text-slate-800 font-medium">€{orderDetails.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">BTW (21%)</span>
                    <span className="text-sm text-slate-800 font-medium">Inbegrepen</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 mt-2">
                    <span className="font-medium text-slate-800">Totaal</span>
                    <span className="font-bold text-blue-600">€{orderDetails.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Testimonials */}
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-slate-50 border-b border-slate-200 py-3 px-5">
                <h2 className="font-medium text-slate-800">Wat klanten zeggen</h2>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-center mb-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-medium text-slate-600">Thomas B.</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"Zeer tevreden met mijn bestelling. De kwaliteit is uitstekend en de levering was snel."</p>
                  </div>

                  <div>
                    <div className="flex items-center mb-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-medium text-slate-600">Laura V.</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"Uitstekende producten en geweldige klantenservice. Zeker een aanrader voor elke retailer."</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Improved Trust badges */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-sm font-medium text-slate-700 mb-4 text-center">Beveiligd en vertrouwd</h3>
              <div className="flex justify-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-700">SSL Beveiliging</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-700">KVK Verificatie</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-700">BTW Gecontroleerd</span>
                </div>
              </div>
            </motion.div>

            {/* Add help box */}
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-blue-50 border-b border-blue-100 py-3 px-5 flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h2 className="font-medium text-slate-800">Hulp nodig?</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 mb-4">Voor vragen over uw bestelling of betaling kunt u contact opnemen met onze klantenservice.</p>
                <div className="flex items-center text-blue-600 font-medium text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                  <span>0800-1234567</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 