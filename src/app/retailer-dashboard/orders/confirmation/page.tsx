'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { deleteOrder } from '@/lib/supabase';

interface OrderDetails {
  id: string;
  totalAmount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    image_url?: string;
  }[];
  date: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    houseNumber?: string;
    houseNumberAddition?: string;
    postcode?: string;
  };
  paymentMethod?: 'invoice' | 'stripe';
  paymentStatus?: 'processing' | 'requires_action' | 'succeeded' | 'canceled' | 'failed' | 'pending' | 'paid' | 'expired' | 'requires_payment_method';
  paymentDueDate?: string; // Voor facturen
  paymentIntentId?: string; // Stripe Payment Intent ID
  stripeSessionId?: string; // Track Stripe session ID
}

// Helper functie om een demo order te maken voor ontwikkelingsdoeleinden
const createDemoOrder = (): OrderDetails => {
  return {
    id: `DEMO-${Date.now()}`,
    date: new Date().toISOString(),
    totalAmount: 149.99,
    paymentMethod: 'invoice',
    paymentStatus: 'pending',
    items: [
      {
        id: 'demo-product-1',
        name: 'Demo Product',
        price: 49.99,
        quantity: 3,
        image_url: '/product-placeholder.jpg'
      }
    ]
  };
};

export default function OrderConfirmationPage() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const searchParams = useSearchParams();
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    // Check if we have returned from Stripe with a session_id
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    
    if (!localStorage) return;
    
    // Try to get the last order from localStorage
    const lastOrderJson = localStorage.getItem('lastOrder');
    
    if (!lastOrderJson) {
      // Als er geen order is, maar we hebben wel een session_id, probeer dan eerst
      // de order te vinden in de ordergeschiedenis
      if (sessionId) {
        tryToRecoverFromOrderHistory(sessionId);
      } else {
        // Als er geen sessie ID is en geen last order, maak een demo order
        const demoOrder = createDemoOrder();
        setOrderDetails(demoOrder);
        localStorage.setItem('lastOrder', JSON.stringify(demoOrder));
        addOrderToHistory(demoOrder);
      }
      return;
    }
    
    try {
      const parsedOrder: OrderDetails = JSON.parse(lastOrderJson);
      
      // Als we een Stripe session_id hebben, werk dan altijd de betalingsstatus bij
      // ongeacht wat de oorspronkelijke betalingsmethode was
      if (sessionId) {
        // Update beide - zowel de betalingsmethode als de status
        parsedOrder.paymentMethod = 'stripe';
        parsedOrder.paymentStatus = 'paid';
        parsedOrder.stripeSessionId = sessionId;
        
        // Sla op in localStorage
        localStorage.setItem('lastOrder', JSON.stringify(parsedOrder));
        
        // Update ook in de ordergeschiedenis
        updateOrderInHistory(parsedOrder);
      }
      
      // Zet de state
      setOrderDetails(parsedOrder);
      
      // Voeg de bestelling toe aan de geschiedenis als deze er nog niet in staat
      addOrderToHistory(parsedOrder);
      
      // Set isLoaded na een korte vertraging voor animatie-effect
      setTimeout(() => setIsLoaded(true), 100);
      
    } catch (error) {
      console.error('Error parsing order from localStorage', error);
      
      // Als parsing mislukt maar we hebben wel een sessionId, probeer dan te herstellen
      if (sessionId) {
        tryToRecoverFromOrderHistory(sessionId);
      }
    }
  }, []);
  
  // Helper functie om orders toe te voegen aan de geschiedenis
  const addOrderToHistory = (order: OrderDetails) => {
    saveOrderToHistory(order);
    syncOrderToAdminDashboard(order);
  };
  
  // Functie om bestellingen te synchroniseren met het admin dashboard
  const syncOrderToAdminDashboard = (order: OrderDetails) => {
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
      const existingOrderIndex = mockOrdersData.findIndex(o => o.id === order.id);
      
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
  
  // Poging om een order te vinden in de order history op basis van sessie ID
  const tryToRecoverFromOrderHistory = (sessionId: string | null) => {
    if (!sessionId) return;
    
    try {
      const ordersJson = localStorage.getItem('retailerOrders');
      if (!ordersJson) {
        createFallbackOrder(sessionId);
        return;
      }
      
      const orders: OrderDetails[] = JSON.parse(ordersJson);
      // Zoek een order met de juiste sessie ID
      const matchingOrder = orders.find(o => o.stripeSessionId === sessionId);
      
      if (matchingOrder) {
        // Update the payment method to stripe if needed
        if (matchingOrder.paymentMethod !== 'stripe') {
          matchingOrder.paymentMethod = 'stripe';
        }
        
        // Zorg ervoor dat de status betaald is
        if (matchingOrder.paymentStatus !== 'paid') {
          matchingOrder.paymentStatus = 'paid';
          updateOrderInHistory(matchingOrder);
        }
        
        setOrderDetails(matchingOrder);
        // Zorg ervoor dat deze order ook gesynchroniseerd wordt met het admin dashboard
        syncOrderToAdminDashboard(matchingOrder);
      } else {
        // Maak een tijdelijke order aan
        createFallbackOrder(sessionId);
      }
    } catch (error) {
      createFallbackOrder(sessionId);
    }
  };
  
  // Maak een fallback order aan als we alleen een sessie ID hebben
  const createFallbackOrder = (sessionId: string) => {
    const demoOrder: OrderDetails = {
      id: `order-${Date.now()}`,
      totalAmount: 0,
      items: [],
      date: new Date().toISOString(),
      paymentMethod: 'stripe',
      paymentStatus: 'paid',
      stripeSessionId: sessionId
    };
    
    setOrderDetails(demoOrder);
    saveOrderToHistory(demoOrder);
    // Zorg ervoor dat deze fallback order ook gesynchroniseerd wordt met het admin dashboard
    syncOrderToAdminDashboard(demoOrder);
  };
  
  // Update een bestaande order in de geschiedenis
  const updateOrderInHistory = (order: OrderDetails) => {
    try {
      const ordersJson = localStorage.getItem('retailerOrders');
      if (!ordersJson) return;
      
      const orders: OrderDetails[] = JSON.parse(ordersJson);
      const index = orders.findIndex(o => o.id === order.id);
      
      if (index >= 0) {
        orders[index] = order;
        localStorage.setItem('retailerOrders', JSON.stringify(orders));
      }
    } catch (error) {
      console.error('Error updating order in history', error);
    }
  };
  
  // Functie om de bestelling op te slaan in de bestellingengeschiedenis
  const saveOrderToHistory = (order: OrderDetails) => {
    // Voeg betaalstatus toe als deze nog niet bestaat
    if (!order.paymentStatus) {
      if (order.paymentMethod === 'invoice') {
        // Voor facturen, stel de status in op 'pending' en een vervaldatum van 14 dagen
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        order.paymentStatus = 'pending';
        order.paymentDueDate = dueDate.toISOString();
      } else if (order.paymentMethod === 'stripe') {
        // Voor Stripe betalingen die nog geen status hebben, 
        // controleer of we een sessie ID hebben
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
          order.paymentStatus = 'paid';
          order.stripeSessionId = sessionId;
        } else {
          order.paymentStatus = 'processing';
        }
      }
    }
    
    // Haal bestaande bestellingen op
    const existingOrdersJson = localStorage.getItem('retailerOrders');
    let existingOrders: OrderDetails[] = [];
    
    if (existingOrdersJson) {
      try {
        existingOrders = JSON.parse(existingOrdersJson);
      } catch (error) {
        console.error('Fout bij het parsen van retailerOrders:', error);
      }
    }
    
    // Controleer of de bestelling al bestaat, zo ja, werk deze bij
    const existingOrderIndex = existingOrders.findIndex(o => o.id === order.id);
    
    if (existingOrderIndex >= 0) {
      existingOrders[existingOrderIndex] = order;
    } else {
      // Voeg de nieuwe bestelling toe aan het begin van de array
      existingOrders.unshift(order);
    }
    
    // Sla de bijgewerkte bestellingen op
    localStorage.setItem('retailerOrders', JSON.stringify(existingOrders));
  };

  // Open het verwijdermodal voor een bestelling
  const handleDeleteOrder = (orderId: string) => {
    setDeletingOrderId(orderId);
  };

  // Sluit het verwijdermodal
  const handleCancelDelete = () => {
    setDeletingOrderId(null);
  };

  // Verwijder de bestelling
  const handleConfirmDelete = async () => {
    if (!deletingOrderId) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteOrder(deletingOrderId);
      
      if (result.error) {
        console.error('Error deleting order:', result.error);
        alert('Er is een fout opgetreden bij het verwijderen van de bestelling. Probeer het opnieuw.');
      } else {
        // Zet state terug en toon succes bericht
        setDeletingOrderId(null);
        setOrderDetails(null); // Verwijder huidige bestelling uit weergave
        alert('Bestelling succesvol verwijderd');
        
        // Optioneel: redirect naar orders overzicht
        window.location.href = '/retailer-dashboard/orders';
      }
    } catch (error) {
      console.error('Unexpected error deleting order:', error);
      alert('Er is een onverwachte fout opgetreden. Probeer het opnieuw.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen">
      <div
        className={`max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8 border-t-4 border-black transform ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        } transition-all duration-700 ease-out`}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-full mb-6 transform transition-transform hover:scale-110 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Bedankt voor je bestelling!</h1>
          <p className="text-gray-600 mt-2 text-lg max-w-lg mx-auto">
            Je bestelling is succesvol geplaatst en wordt nu verwerkt.
          </p>
        </div>
        
        {orderDetails ? (
          <div className="space-y-8">
            {/* Order status tracker */}
            <div className={`rounded-lg p-6 border border-gray-100 bg-white shadow-sm transform ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            } transition-all duration-500 delay-100 ease-out`}>
              <h2 className="text-xl font-bold text-black mb-6">Bestelstatus</h2>
              
              <div className="relative">
                {/* Progress bar */}
                <div className="overflow-hidden h-2 mb-6 text-xs flex rounded bg-gray-200">
                  <div className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-black transition-all duration-1000 ease-out" 
                       style={{ width: '25%' }}></div>
                </div>
                
                {/* Status steps blijven hetzelfde */}
                <div className="flex justify-between">
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto rounded-full border-2 border-black flex items-center justify-center bg-black text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div className="text-black font-medium mt-2">Bestelling</div>
                    <div className="text-xs text-gray-500">Geplaatst</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`w-10 h-10 mx-auto rounded-full border-2 ${
                      orderDetails.paymentStatus === 'paid' || orderDetails.paymentStatus === 'succeeded'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white text-gray-300'
                    } flex items-center justify-center`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                      </svg>
                    </div>
                    <div className={`font-medium mt-2 ${
                      orderDetails.paymentStatus === 'paid' || orderDetails.paymentStatus === 'succeeded'
                        ? 'text-black'
                        : 'text-gray-500'
                    }`}>Betaling</div>
                    <div className="text-xs text-gray-500">
                      {orderDetails.paymentStatus === 'paid' || orderDetails.paymentStatus === 'succeeded'
                        ? 'Betaald'
                        : orderDetails.paymentStatus === 'processing'
                        ? 'Verwerken'
                        : orderDetails.paymentStatus === 'requires_action' || orderDetails.paymentStatus === 'requires_payment_method'
                        ? 'Actie vereist'
                        : 'In afwachting'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto rounded-full border-2 border-gray-300 flex items-center justify-center bg-white text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="text-gray-500 font-medium mt-2">Verwerking</div>
                    <div className="text-xs text-gray-500">In voorbereiding</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto rounded-full border-2 border-gray-300 flex items-center justify-center bg-white text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                      </svg>
                    </div>
                    <div className="text-gray-500 font-medium mt-2">Verzonden</div>
                    <div className="text-xs text-gray-500">Onderweg</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Rest van de besteldetails blijft hetzelfde */}
            <div className={`rounded-lg bg-white shadow-sm overflow-hidden transform ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            } transition-all duration-500 delay-200 ease-out`}>
              <div className="bg-black px-6 py-4 text-white">
                <h2 className="text-xl font-semibold">Bestelgegevens</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                    <p className="text-gray-500 text-sm">Bestelnummer</p>
                    <p className="font-bold text-black text-lg">{orderDetails.id}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                    <p className="text-gray-500 text-sm">Datum</p>
                    <p className="font-bold text-black text-lg">{new Date(orderDetails.date).toLocaleDateString('nl-NL')}</p>
                  </div>
                </div>
                
                <h3 className="font-bold mb-4 text-black text-lg border-b border-gray-200 pb-2">Bestelde producten</h3>
                <div className="space-y-4">
                  {orderDetails.items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={`p-4 flex justify-between items-center rounded-lg border border-gray-100 hover:border-black transition-colors duration-300 transform ${
                        isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
                      } transition-all duration-300`}
                      style={{ transitionDelay: `${200 + index * 100}ms` }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-black">{item.name}</p>
                          <div className="flex space-x-2 items-center mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {item.quantity} stuks
                            </span>
                            <p className="text-sm text-gray-500">€{item.price.toFixed(2)} per stuk</p>
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-black text-lg">€{(item.quantity * item.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                {/* Payment info blijft grotendeels hetzelfde */}
                {orderDetails.paymentMethod && (
                  <div className="mt-8">
                    <h3 className="font-bold mb-4 text-black text-lg border-b border-gray-200 pb-2">Betaalinformatie</h3>
                    <div className="rounded-lg bg-gray-50 p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {orderDetails.paymentMethod === 'invoice' ? (
                            <>
                              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="ml-4">
                                <p className="font-bold text-black">Betaling op factuur</p>
                                <p className="text-sm text-gray-500">Betalen binnen 14 dagen</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              </div>
                              <div className="ml-4">
                                <p className="font-bold text-black">Directe betaling</p>
                                <p className="text-sm text-gray-500">Via Stripe</p>
                                {orderDetails.paymentIntentId && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Transactie ID: {orderDetails.paymentIntentId.substring(0, 12)}...
                                  </p>
                                )}
                                {orderDetails.stripeSessionId && (
                                  <p className="text-xs text-gray-500">
                                    Sessie ID: {orderDetails.stripeSessionId.substring(0, 8)}...
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Verbeterde betaalstatus weergave */}
                        <div>
                          {orderDetails.paymentMethod === 'invoice' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              In afwachting
                            </span>
                          ) : orderDetails.paymentStatus === 'paid' || orderDetails.paymentStatus === 'succeeded' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Betaald
                            </span>
                          ) : orderDetails.paymentStatus === 'processing' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              <svg className="h-3 w-3 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Verwerken
                            </span>
                          ) : orderDetails.paymentStatus === 'requires_action' || orderDetails.paymentStatus === 'requires_payment_method' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Actie vereist
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Niet voltooid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Totaalbedrag */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-black">Totaalbedrag</p>
                    <p className="font-bold text-2xl text-black">€{orderDetails.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 my-6 border border-gray-200 rounded-lg bg-gray-50">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="mt-4 text-gray-500">Geen bestelgegevens gevonden.</p>
          </div>
        )}
        
        <div className={`flex flex-col sm:flex-row gap-4 justify-center mt-12 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        } transition-all duration-700 delay-500 ease-out`}>
          <Link 
            href="/retailer-dashboard/catalog" 
            className="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 transition-colors duration-300"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            Terug naar catalogus
          </Link>
          <Link 
            href="/retailer-dashboard/orders" 
            className="inline-flex justify-center items-center px-6 py-3 border-2 border-black rounded-md shadow-sm text-base font-medium text-black bg-white hover:bg-gray-50 transition-colors duration-300"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Bekijk bestellingsoverzicht
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingOrderId && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Bestelling verwijderen
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Weet u zeker dat u deze bestelling wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 