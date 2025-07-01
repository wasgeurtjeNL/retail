'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

// Lazy load modal component to improve initial load performance
const OrderDetailsModal = dynamic(() => import('@/components/OrderDetailsModal'), {
  loading: () => <div className="fixed z-10 inset-0 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p>Details laden...</p>
      </div>
    </div>
  </div>,
  ssr: false
});

// Types voor orders
interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

// Payment and fulfillment status types
type PaymentStatus = 'paid' | 'pending' | 'failed';
type FulfillmentStatus = 'processing' | 'shipped' | 'delivered' | 'canceled' | 'pending';

export interface Order {
  id: string;
  created_at: string;
  status: 'nieuw' | 'betaald' | 'verzonden' | 'geleverd' | 'geannuleerd';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'expired';
  paymentMethod?: 'invoice' | 'stripe';
  paymentDueDate?: string;
  total: number;
  items: OrderItem[];
  tracking_code?: string;
  notes?: string;
  payment_method: 'stripe' | 'invoice';
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  date: string;
  total_amount: number;
  shipping_provider?: 'postnl' | 'dhl';
}

// Voeg een extra interface toe voor Wasstrips applicaties
interface WasstripsApplication {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  paymentOptionSent?: boolean;
  selectedPaymentOption?: 'direct' | 'invoice' | null;
  isPaid: boolean;
  paymentLinkSentAt?: string;
  paymentDueDate?: string; // Voor factuurbetalingen
}

// Mock data voor development
const mockOrders: Order[] = [
  {
    id: 'ORD-1744497956483',
    created_at: '2025-04-13T14:30:00Z',
    status: 'geleverd',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    total: 355.70,
    items: [
      { id: 'item1', product_id: 'p1', product_name: 'Wasgeurtje Lavendel', quantity: 1, price: 119.90 },
      { id: 'item2', product_id: 'p2', product_name: 'Wasgeurtje Vanille', quantity: 1, price: 119.90 },
      { id: 'item3', product_id: 'p3', product_name: 'Wasparfum Zomer', quantity: 1, price: 115.90 }
    ],
    tracking_code: 'NL12345678',
    notes: 'Betaald via Stripe',
    payment_method: 'stripe',
    payment_status: 'paid',
    fulfillment_status: 'delivered',
    date: '2025-04-13T14:30:00Z',
    total_amount: 355.70
  },
  {
    id: 'ORD-1744496722160',
    created_at: '2025-04-13T10:15:00Z',
    status: 'verzonden',
    paymentStatus: 'paid', 
    paymentMethod: 'stripe',
    total: 737.50,
    items: [
      { id: 'item4', product_id: 'p4', product_name: 'Wasgeurtje Oceaan', quantity: 2, price: 119.95 },
      { id: 'item5', product_id: 'p5', product_name: 'Wasgeurtje Bos', quantity: 2, price: 122.50 },
      { id: 'item6', product_id: 'p6', product_name: 'Wasparfum Lente', quantity: 1, price: 252.60 }
    ],
    tracking_code: 'NL98765432',
    payment_method: 'stripe',
    payment_status: 'paid',
    fulfillment_status: 'shipped',
    date: '2025-04-13T10:15:00Z',
    total_amount: 737.50
  },
  {
    id: 'ORD-1744496139797',
    created_at: '2025-04-13T16:45:00Z',
    status: 'betaald',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    total: 505.20,
    items: [
      { id: 'item7', product_id: 'p1', product_name: 'Wasgeurtje Lavendel', quantity: 1, price: 119.90 },
      { id: 'item8', product_id: 'p6', product_name: 'Wasparfum Lente', quantity: 1, price: 252.60 },
      { id: 'item9', product_id: 'p7', product_name: 'Display Standaard', quantity: 1, price: 132.70 }
    ],
    payment_method: 'stripe',
    payment_status: 'paid',
    fulfillment_status: 'processing',
    date: '2025-04-13T16:45:00Z',
    total_amount: 505.20
  },
  {
    id: 'ORD-1744493550478',
    created_at: '2025-04-12T14:30:00Z',
    status: 'betaald',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    total: 519.35,
    items: [
      { id: 'item10', product_id: 'p8', product_name: 'Premium Wasparfum Set', quantity: 1, price: 519.35 }
    ],
    payment_method: 'stripe',
    payment_status: 'paid',
    fulfillment_status: 'processing',
    date: '2025-04-12T14:30:00Z',
    total_amount: 519.35
  },
  {
    id: 'ORD-1744491694005',
    created_at: '2025-04-12T12:30:00Z',
    status: 'betaald',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    total: 334.95,
    items: [
      { id: 'item11', product_id: 'p9', product_name: 'Wasparfum Basic Set', quantity: 1, price: 334.95 }
    ],
    payment_method: 'stripe',
    payment_status: 'paid',
    fulfillment_status: 'processing',
    date: '2025-04-12T12:30:00Z',
    total_amount: 334.95
  }
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wasstripsApplications, setWasstripsApplications] = useState<WasstripsApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'wasstrips'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showInvoiceAlert, setShowInvoiceAlert] = useState(false);
  const [invoiceAlertDismissed, setInvoiceAlertDismissed] = useState(false);
  const [minutesSinceAlert, setMinutesSinceAlert] = useState(0);
  const [currentInvoiceApp, setCurrentInvoiceApp] = useState<WasstripsApplication | null>(null);
  
  // Gebruik useCallback voor event handlers om onnodige renders te voorkomen
  const openOrderDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  }, []);
  
  const closeOrderDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedOrder(null);
  }, []);
  
  const handleDismissAlert = useCallback(() => {
    setInvoiceAlertDismissed(true);
    setShowInvoiceAlert(false);
  }, []);

  // Verplaats de loadWasstripsApplications functie naar buiten de useEffect om hermontage te voorkomen
  const loadWasstripsApplications = useCallback(() => {
    try {
      const storedApplications = localStorage.getItem('wasstrips-applications');
      if (storedApplications) {
        const applications = JSON.parse(storedApplications);
        
        // Filter applicaties die relevant zijn voor deze gebruiker
        const userEmail = user?.email;
        if (userEmail) {
          const userApplications = applications.filter((app: any) => app.email === userEmail);
          
          // Voeg potentiële ontbrekende velden toe voor de weergave
          const processedApplications = userApplications.map((app: any) => {
            // Als een factuur is geselecteerd, voeg een vervaldatum toe
            if (app.selectedPaymentOption === 'invoice' && !app.paymentDueDate && app.paymentLinkSentAt) {
              const dueDate = new Date(app.paymentLinkSentAt);
              dueDate.setDate(dueDate.getDate() + 14); // 14 dagen betalingstermijn
              app.paymentDueDate = dueDate.toISOString();
            }
            return app;
          });
          
          // Verwijder overbodige console.log
          setWasstripsApplications(processedApplications);
          
          // Reset de standaard waarschuwingsvlag
          setShowInvoiceAlert(false);
          
          // Controleer of er een factuur is geselecteerd en toon de juiste melding
          const invoiceApp = processedApplications.find((app: WasstripsApplication) => 
            app.selectedPaymentOption === 'invoice' && !app.isPaid
          );
          
          // Als er een factuur-optie is gekozen, toon de factuur alert
          if (invoiceApp && !invoiceAlertDismissed) {
            setShowInvoiceAlert(true);
            setMinutesSinceAlert(16); // Start willekeurig met 16 minuten geleden
            setCurrentInvoiceApp(invoiceApp);
            
            // Timer voor de "minuten geleden" teller
            const timer = setInterval(() => {
              setMinutesSinceAlert(prev => prev + 1);
            }, 60000); // Elke minuut updaten
            
            return () => clearInterval(timer);
          }
        }
      }
    } catch (error) {
      console.error('Fout bij het ophalen van Wasstrips applicaties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, invoiceAlertDismissed]);
  
  // Maak de handlePayNow functie met useCallback om onnodige renders te voorkomen
  const handlePayNow = useCallback(async (order: Order) => {
    try {
      // Bereid de data voor voor Stripe
      const stripeOrder = {
        id: order.id,
        totalAmount: order.total,
        items: order.items.map(item => ({
          id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.price
        })),
        date: order.created_at,
        status: order.status,
        paymentStatus: 'pending',
        paymentMethod: 'stripe'
      };
      
      // Sla het order op in localStorage voor gebruik door Stripe
      localStorage.setItem('stripeOrder', JSON.stringify(stripeOrder));
      
      // Markeer de order als 'in process' in de UI, indien nodig
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? { ...o, paymentStatus: 'pending' as const } 
            : o
        )
      );
      
      // Maak de items array voor de Stripe API
      const items = order.items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.product_name,
            description: `Product ID: ${item.product_id}`,
          },
          unit_amount: Math.round(item.price * 100), // Stripe verwacht bedragen in centen
        },
        quantity: item.quantity
      }));
      
      // Direct POST-verzoek naar de juiste API route
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items,
          orderId: order.id
        }),
      });
      
      // Controleer op succesvolle response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API fout (${response.status}): ${errorText}`);
      }
      
      // Parse de JSON response
      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect naar Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Onbekende fout bij het maken van de checkout sessie');
      }
    } catch (error) {
      console.error('Fout bij het voorbereiden van de betaling:', error);
      alert(`Er is een fout opgetreden bij het voorbereiden van de betaling: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  }, []);

  // Helper functies naar pure funktions omgezet, buiten de component
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);
  
  const getStatusBadgeClass = useCallback((status: Order['status']) => {
    switch (status) {
      case 'nieuw': return 'bg-blue-100 text-blue-800';
      case 'betaald': return 'bg-yellow-100 text-yellow-800';
      case 'verzonden': return 'bg-purple-100 text-purple-800';
      case 'geleverd': return 'bg-green-100 text-green-800';
      case 'geannuleerd': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);
  
  // useEffect voor data loading
  useEffect(() => {
    setIsLoading(true);
    
    // Voer de applicaties laden functie uit
    loadWasstripsApplications();
    
    // Orders laden met setTimeout om de UI niet te blokkeren
    const loadOrdersTimer = setTimeout(() => {
      // Initialiseer een Map om unieke orders op te slaan
      const orderMap = new Map();
      
      // Haal admin orders op uit localStorage voor synchronisatie van tracking codes
      const adminOrdersData = localStorage.getItem('mockOrders');
      let adminOrders: any[] = [];
      
      // Parse admin orders data als deze beschikbaar is
      if (adminOrdersData) {
        try {
          adminOrders = JSON.parse(adminOrdersData);
          // Verwijder console.log debug statements
        } catch (error) {
          console.error('Fout bij het ophalen van admin orders:', error);
        }
      }
      
      // Voeg eerst mock orders toe aan de map
      mockOrders.forEach((mockOrder: Order) => {
        // Controleer of er een bijbehorende admin order is met tracking code
        const adminOrder = adminOrders.find(ao => ao.id === mockOrder.id);
        
        if (adminOrder && adminOrder.tracking_code && !mockOrder.tracking_code) {
          // Synchroniseer tracking code van admin naar mock order
          mockOrder.tracking_code = adminOrder.tracking_code;
        }
        orderMap.set(mockOrder.id, mockOrder);
      });
      
      // Probeer dan bestellingen uit localStorage toe te voegen
      const localStorageOrders = localStorage.getItem('retailerOrders');
      
      if (localStorageOrders) {
        try {
          const parsedLocalOrders = JSON.parse(localStorageOrders);
          
          // Verwerk alle localStorage orders
          const formattedOrders = parsedLocalOrders.map((order: any) => {
            // Als het al een volledig Order object is, gebruik het zoals het is
            if (order.status && order.created_at) {
              return order as Order;
            }
            
            // Anders zet het om naar het juiste format
            const formattedOrder: Order = {
              id: order.id || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              created_at: order.date || order.created_at || new Date().toISOString(),
              status: order.status || 'nieuw',
              paymentStatus: order.paymentStatus || (order.paymentMethod === 'stripe' ? 'paid' : 'pending'),
              paymentMethod: order.paymentMethod,
              paymentDueDate: order.paymentDueDate,
              total: order.totalAmount || order.total,
              items: order.items.map((item: any) => ({
                id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: item.price
              })),
              payment_method: order.paymentMethod,
              payment_status: order.paymentStatus,
              fulfillment_status: order.status,
              date: order.date || new Date().toISOString(),
              total_amount: order.totalAmount || order.total
            };
            
            // Als er een factuur betaalmethode is maar geen vervaldatum, voeg die toe
            if (formattedOrder.paymentMethod === 'invoice' && !formattedOrder.paymentDueDate) {
              const dueDate = new Date(formattedOrder.created_at);
              dueDate.setDate(dueDate.getDate() + 14); // 14 dagen betalingstermijn
              formattedOrder.paymentDueDate = dueDate.toISOString();
            }
            
            return formattedOrder;
          });
          
          // Update localStorage met geformatteerde orders
          localStorage.setItem('retailerOrders', JSON.stringify(formattedOrders));
          
          // Voeg elke geformatteerde order toe aan de Map als deze nog niet bestaat
          // of update deze als ID al bestaat (localStorage heeft voorrang)
          formattedOrders.forEach((order: Order) => {
            // Zoek of er een bijbehorende admin order is met tracking code
            const adminOrder = adminOrders.find(ao => ao.id === order.id);
            
            if (adminOrder && adminOrder.tracking_code && !order.tracking_code) {
              // Synchroniseer tracking code van admin naar retailer
              order.tracking_code = adminOrder.tracking_code;
            }
            orderMap.set(order.id, order); 
          });
        } catch (error) {
          console.error('Fout bij het parsen van retailerOrders uit localStorage:', error);
        }
      }
      
      // Zet de Map om naar een array voor de state
      const finalOrders = Array.from(orderMap.values());
      setOrders(finalOrders);
      setIsLoading(false);
    }, 200); // Verlaag timeout om sneller te renderen
    
    return () => clearTimeout(loadOrdersTimer);
  }, []); // Verwijder loadWasstripsApplications van dependencies
  
  // Memoizeer berekende waardes
  const getPaymentStatus = useCallback((order: Order) => {
    // Controleer eerst of er een betaalstatus is
    if (order.paymentStatus) {
      return order.paymentStatus;
    }
    
    // Als er geen expliciete betaalstatus is, gebruiken we de order status
    if (order.status === 'betaald' || order.status === 'verzonden' || order.status === 'geleverd') {
      return 'paid';
    }
    
    // Voor facturen controleren we of de vervaldatum is verstreken
    if (order.paymentMethod === 'invoice' && order.paymentDueDate) {
      const dueDate = new Date(order.paymentDueDate);
      if (dueDate < new Date()) {
        return 'expired';
      }
      return 'pending';
    }
    
    // Standaard voor nieuwe orders zonder betaalstatus
    return 'pending';
  }, []);

  const calculateDaysRemaining = useCallback((dueDateString?: string) => {
    if (!dueDateString) return null;
    
    const dueDate = new Date(dueDateString);
    const today = new Date();
    
    // Reset time component for accurate day calculation
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, []);
  
  // Gebruik useMemo voor afgeleide state om te voorkomen dat deze bij elke render wordt berekend
  const filteredOrders = useMemo(() => 
    orders
      .filter(order => {
        if (activeTab === 'all') return true;
        if (activeTab === 'active') {
          return ['nieuw', 'betaald', 'verzonden'].includes(order.status);
        }
        if (activeTab === 'completed') {
          return ['geleverd', 'geannuleerd'].includes(order.status);
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [orders, activeTab]
  );

  // Gebruik useCallback voor render-intensieve functies
  const getPaymentStatusBadge = useCallback((order: Order) => {
    const status = getPaymentStatus(order);
    const daysRemaining = order.paymentDueDate ? calculateDaysRemaining(order.paymentDueDate) : null;
    
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Betaald
          </span>
        );
      case 'pending':
        return (
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Betaling open
            </span>
            {daysRemaining !== null && (
              <div className="text-sm mt-1.5 text-yellow-600 font-medium">
                Nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'}
              </div>
            )}
          </div>
        );
      case 'expired':
        return (
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Betaling te laat
            </span>
            {daysRemaining !== null && daysRemaining < 0 && (
              <div className="text-sm mt-1.5 text-red-600 font-medium">
                {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dag' : 'dagen'} over tijd
              </div>
            )}
          </div>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Betaling mislukt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Onbekend
          </span>
        );
    }
  }, [getPaymentStatus, calculateDaysRemaining]);

  const getWasstripsApplicationStatus = useCallback((app: WasstripsApplication) => {
    // Direct betaald
    if (app.isPaid) {
      return 'paid';
    }
    
    // Betaalmethode gekozen maar nog niet betaald
    if (app.selectedPaymentOption) {
      // Voor facturen controleren we of de vervaldatum is verstreken
      if (app.selectedPaymentOption === 'invoice' && app.paymentDueDate) {
        const dueDate = new Date(app.paymentDueDate);
        if (dueDate < new Date()) {
          return 'expired';
        }
        return 'pending';
      }
      
      // Voor directe betalingen die nog niet zijn voltooid
      if (app.selectedPaymentOption === 'direct') {
        return 'pending';
      }
    }
    
    // Nog geen betaalmethode gekozen
    if (app.paymentOptionSent && !app.selectedPaymentOption) {
      return 'awaiting_selection';
    }
    
    // Standaard status
    return 'pending';
  }, []);

  const getWasstripsStatusBadge = useCallback((app: WasstripsApplication) => {
    const status = getWasstripsApplicationStatus(app);
    const daysRemaining = app.paymentDueDate ? calculateDaysRemaining(app.paymentDueDate) : null;
    
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Betaald
          </span>
        );
      case 'pending':
        return (
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Betaling open
              {app.selectedPaymentOption === 'invoice' && ' (Factuur)'}
              {app.selectedPaymentOption === 'direct' && ' (iDEAL)'}
            </span>
            {daysRemaining !== null && app.selectedPaymentOption === 'invoice' && (
              <div className="text-sm mt-1.5 text-yellow-600 font-medium">
                Nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'}
              </div>
            )}
          </div>
        );
      case 'expired':
        return (
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Betaling te laat
            </span>
            {daysRemaining !== null && daysRemaining < 0 && (
              <div className="text-sm mt-1.5 text-red-600 font-medium">
                {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dag' : 'dagen'} over tijd
              </div>
            )}
          </div>
        );
      case 'awaiting_selection':
        return (
          <div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Kies betaalmethode
            </span>
            <div className="mt-2">
              <Link
                href={`/retailer-dashboard/payment-options/${app.id}`}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Betaalmethode kiezen
              </Link>
            </div>
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Onbekend
          </span>
        );
    }
  }, [getWasstripsApplicationStatus, calculateDaysRemaining]);
  
  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Toon de factuur betaling waarschuwing indien van toepassing */}
      {showInvoiceAlert && (
        <div className="rounded-md bg-amber-50 p-4 mb-6 border border-amber-300 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-amber-800">
                Uw bestelling van Wasstrips kan bij u afgeleverd worden. Betaal nu direct via factuur. {currentInvoiceApp && (
                  <Link 
                    href={`/retailer-dashboard/payment-options/${currentInvoiceApp.id}/invoice`} 
                    className="font-bold underline"
                  >
                    Bekijk en betaal nu
                  </Link>
                )}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                {minutesSinceAlert} minuten geleden
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={handleDismissAlert}
                  className="inline-flex bg-amber-50 rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none"
                >
                  <span className="sr-only">Sluiten</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toon de waarschuwing alleen als er Wasstrips aanvragen zijn die nog geen betaalmethode hebben gekozen */}
      {activeTab === 'wasstrips' && 
       wasstripsApplications.some((app: WasstripsApplication) => app.paymentOptionSent && !app.selectedPaymentOption) && 
       !wasstripsApplications.some((app: WasstripsApplication) => app.selectedPaymentOption) && 
       !showInvoiceAlert && (
        <div className="rounded-md bg-yellow-50 p-4 mb-6 border border-yellow-300 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Belangrijk over uw bestelling</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Bij online betaling worden uw producten verzonden nadat de betaling is ontvangen. <button className="font-semibold underline hover:text-yellow-800 focus:outline-none" onClick={() => alert('Bij directe betaling via iDEAL of creditcard kunnen we uw bestelling meteen verwerken!')}>Waarom?</button></p>
                <p className="mt-2">Bij keuze voor factuur worden uw Wasstrips direct verzonden. U heeft dan 14 dagen om te betalen. <button className="font-semibold underline hover:text-yellow-800 focus:outline-none" onClick={() => alert('Met factuurbetalingen kunt u de Wasstrips ontvangen en testen voordat u betaalt. Na 14 dagen wordt een betalingsherinnering verstuurd.')}>Hoe werkt factuur?</button></p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="border-b border-gray-200 pb-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mijn Bestellingen</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bekijk en beheer al uw bestellingen en Wasstrips aanvragen
        </p>
      </div>
      
      {/* Navigatieknoppen */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Terug
        </button>
        <Link
          href="/retailer-dashboard"
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Hoofdmenu
        </Link>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Alle orders
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Actieve orders
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Afgeronde orders
          </button>
          <button
            onClick={() => setActiveTab('wasstrips')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'wasstrips'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Wasstrips Aanvragen
            {wasstripsApplications.filter(app => app.paymentOptionSent && !app.selectedPaymentOption).length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {wasstripsApplications.filter(app => app.paymentOptionSent && !app.selectedPaymentOption).length}
              </span>
            )}
          </button>
        </nav>
      </div>
      
      {/* Wasstrips Applicaties Section */}
      {activeTab === 'wasstrips' && (
        <div className="mt-8">
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  {wasstripsApplications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 mb-4">U heeft nog geen Wasstrips aanvragen.</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aanvraag ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bedrijfsnaam
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Datum
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Betaalstatus
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acties
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {wasstripsApplications.map((app) => (
                          <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {app.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {app.businessName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {app.paymentLinkSentAt ? formatDate(app.paymentLinkSentAt) : 'Onbekend'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getWasstripsStatusBadge(app)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {app.selectedPaymentOption === 'direct' && !app.isPaid && (
                                <button
                                  onClick={() => handlePayNow(
                                    // Create a temporary Order object with the required fields
                                    {
                                      id: app.id,
                                      created_at: app.paymentLinkSentAt || new Date().toISOString(),
                                      status: 'nieuw',
                                      total: 450, // Default price for Wasstrips
                                      items: [{ 
                                        id: 'wasstrips-package', 
                                        product_id: 'wasstrips-package', 
                                        product_name: 'Wasstrips Pakket', 
                                        quantity: 1, 
                                        price: 450 
                                      }],
                                      payment_method: 'stripe',
                                      payment_status: 'pending',
                                      fulfillment_status: 'pending',
                                      date: app.paymentLinkSentAt || new Date().toISOString(),
                                      total_amount: 450,
                                    } as Order
                                  )}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none"
                                >
                                  Nu betalen
                                </button>
                              )}
                              {app.selectedPaymentOption === 'invoice' && !app.isPaid && (
                                <Link
                                  href={`/retailer-dashboard/payment-options/${app.id}/invoice`}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                                >
                                  Bekijk factuur
                                </Link>
                              )}
                              {app.paymentOptionSent && !app.selectedPaymentOption && (
                                <span className="text-gray-500">
                                  Gebruik de betaalmethode knop in de betaalstatus kolom
                                </span>
                              )}
                              {app.isPaid && (
                                <span className="text-green-600 font-medium">
                                  Betaling afgerond
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Orders Section - Keep existing code */}
      {activeTab !== 'wasstrips' && (
      <div className="bg-white shadow overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Geen bestellingen gevonden.</p>
            <div className="mt-4">
              <Link
                href="/retailer-dashboard/catalog"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
              >
                Plaats een bestelling
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bestelnr.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betaalstatus
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bedrag
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producten
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Track & Trace
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="bg-white">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentStatusBadge(order)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      €{order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* Debug log voor tracking code */}
                      {(() => { console.log(`DEBUG: Rendering tracking code voor ${order.id}:`, order.tracking_code || 'geen'); return null; })()}
                      {order.items.length} {order.items.length === 1 ? 'product' : 'producten'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.tracking_code ? (
                        <a 
                          href={order.shipping_provider === 'dhl' 
                            ? `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${order.tracking_code}` 
                            : `https://postnl.nl/tracktrace/?B=${order.tracking_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {order.tracking_code}
                        </a>
                      ) : (
                        <span className="text-gray-400">Niet beschikbaar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Betaal knop (alleen tonen bij openstaande betalingen) */}
                        {getPaymentStatus(order) === 'pending' || getPaymentStatus(order) === 'expired' ? (
                          <button
                            onClick={() => handlePayNow(order)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                          >
                            <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Nu betalen
                          </button>
                        ) : null}
                        
                        {/* Details knop */}
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
      
      {/* Order details modal */}
      {showDetails && selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={closeOrderDetails} />
      )}
    </div>
  );
} 