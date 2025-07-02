'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { getOrders, updateOrder, deleteOrder, Order, getWasstripsOrders, WasstripsApplication, updateWasstripsApplication, updateWasstripsApplicationWithOrderDetails } from '@/lib/supabase';

// Status definities met labels en kleuren voor een consistent uiterlijk
const FULFILLMENT_STATUSES = {
  pending: { label: 'Te verzenden', color: 'yellow' },
  processing: { label: 'Wacht op betaalmethode', color: 'blue' },
  shipped: { label: 'Verzonden', color: 'green' },
  delivered: { label: 'Afgeleverd', color: 'indigo' },
  cancelled: { label: 'Geannuleerd', color: 'red' },
  canceled: { label: 'Geannuleerd', color: 'red' }
};

const PAYMENT_STATUSES = {
  processing: { label: 'In verwerking', color: 'blue' },
  requires_action: { label: 'Actie vereist', color: 'orange' },
  succeeded: { label: 'Betaald', color: 'green' },
  pending: { label: 'In afwachting', color: 'yellow' },
  paid: { label: 'Betaald', color: 'green' },
  canceled: { label: 'Geannuleerd', color: 'red' },
  failed: { label: 'Mislukt', color: 'red' },
  expired: { label: 'Verlopen', color: 'gray' },
  requires_payment_method: { label: 'Betaalmethode vereist', color: 'orange' }
};

// Helper functie voor het weergeven van status badges
const StatusBadge = ({ 
  status, 
  type 
}: { 
  status: string; 
  type: 'payment' | 'fulfillment' 
}) => {
  const statuses = type === 'payment' ? PAYMENT_STATUSES : FULFILLMENT_STATUSES;
  const statusInfo = (statuses as any)[status] || { label: status, color: 'gray' };
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    indigo: 'bg-indigo-100 text-indigo-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusInfo.color as keyof typeof colorClasses]}`}>
      {statusInfo.label}
    </span>
  );
};

export default function OrdersPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // State voor de order die bewerkt wordt
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedFulfillmentStatus, setSelectedFulfillmentStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [shippingProvider, setShippingProvider] = useState<'postnl' | 'dhl'>('postnl'); // Standaard PostNL
  
  // State voor het verwijderen van orders
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State voor wasstrips order ready
  const [sendingOrderReady, setSendingOrderReady] = useState<string | null>(null);
  
  // Laad bestellingen
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // Bepaal de juiste filters voor de query
      const fulfillmentStatus = statusFilter !== 'all' ? 
        statusFilter as Order['fulfillment_status'] : 
        undefined;
      
      console.log('[DEBUG] loadOrders wordt uitgevoerd met filter:', statusFilter);
      
      // Haal reguliere bestellingen op
      const regularOrdersResult = await getOrders(undefined, fulfillmentStatus);
      
      // Haal wasstrips applicaties op (alleen die met betaalde aanbetaling)
      const wasstripsResult = await getWasstripsOrders('paid');
      
      console.log('[DEBUG] Regular orders resultaat:', {
        success: !regularOrdersResult.error,
        aantalOrders: regularOrdersResult.orders?.length || 0
      });
      
      console.log('[DEBUG] Wasstrips orders resultaat:', {
        success: !wasstripsResult.error,
        aantalOrders: wasstripsResult.orders?.length || 0
      });
      
      // Combineer beide resultaten
      const allOrders: Order[] = [];
      
      // Voeg reguliere orders toe
      if (!regularOrdersResult.error && regularOrdersResult.orders) {
        allOrders.push(...regularOrdersResult.orders);
      }
      
              // Converteer wasstrips applicaties naar Order format
        if (!wasstripsResult.error && wasstripsResult.orders) {
          console.log('[DEBUG] Converting wasstrips orders:', wasstripsResult.orders);
          console.log('[DEBUG] First wasstrips order profiles:', wasstripsResult.orders[0]?.profiles);
          
          const convertedWasstripsOrders: Order[] = wasstripsResult.orders.map((app: WasstripsApplication) => {
            console.log('[DEBUG] Converting app:', app.id, 'profiles:', app.profiles);
            return {
              id: app.id,
              order_number: `WS-${app.id.slice(0, 8)}`,
              retailer_id: app.profile_id,
              profile_id: app.profile_id,
              status: app.status as Order['status'],
              payment_status: app.deposit_status === 'paid' ? 'paid' : 'pending' as Order['payment_status'],
              payment_method: 'credit_card' as Order['payment_method'],
              stripe_session_id: undefined,
              stripe_payment_intent_id: undefined,
              subtotal: Number(app.total_amount) || 0,
              shipping_cost: 0,
              tax_amount: 0,
              total_amount: Number(app.total_amount) || 0,
              shipping_address: undefined,
              shipping_city: undefined,
              shipping_postal_code: undefined,
              shipping_country: undefined,
              billing_address: undefined,
              billing_city: undefined,
              billing_postal_code: undefined,
              billing_country: undefined,
              tracking_code: app.tracking_code,
              notes: app.notes,
              metadata: { 
                order_type: 'wasstrips',
                deposit_amount: app.deposit_amount,
                deposit_paid_at: app.deposit_paid_at,
                payment_options_sent: app.payment_options_sent,
                payment_options_sent_at: app.payment_options_sent_at,
                payment_method_selected: app.payment_method_selected,
                payment_method_selected_at: app.payment_method_selected_at
              },
              created_at: app.created_at,
              updated_at: app.updated_at,
              fulfillment_status: (
                app.status === 'pending' ? 'pending' :
                app.status === 'approved' && !app.payment_method_selected ? 'processing' :
                app.status === 'order_ready' && !app.payment_method_selected ? 'processing' :
                app.status === 'payment_selected' || app.payment_method_selected ? 'pending' :
                app.status === 'shipped' ? 'shipped' :
                'processing'
              ) as Order['fulfillment_status'],
              shipping_provider: 'postnl' as 'postnl' | 'dhl',
              profiles: Array.isArray(app.profiles) 
                ? app.profiles[0] || { email: 'Onbekend', company_name: 'Onbekende retailer' }
                : app.profiles || { email: 'Onbekend', company_name: 'Onbekende retailer' }
            };
          });
          
          console.log('[DEBUG] Converted wasstrips orders:', convertedWasstripsOrders);
          allOrders.push(...convertedWasstripsOrders);
        }
      
      // Filter op fulfillment status als nodig
      const filteredOrders = fulfillmentStatus 
        ? allOrders.filter(order => order.fulfillment_status === fulfillmentStatus)
        : allOrders;
      
      // Sorteer op datum (nieuwste eerst)
      filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('[DEBUG] Totaal gecombineerde orders:', {
        aantal: filteredOrders.length,
        wasstripsOrders: filteredOrders.filter(o => o.metadata?.order_type === 'wasstrips').length,
        reguliereOrders: filteredOrders.filter(o => !o.metadata?.order_type).length
      });
      
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Unexpected error loading orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Laad bestellingen wanneer de pagina wordt geladen of het filter wijzigt
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadOrders();
    }
  }, [authLoading, user, isAdmin, statusFilter]);
  
  // Open het bewerkingsmodal voor een bestelling
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderNotes(order.notes || '');
    setSelectedFulfillmentStatus(order.fulfillment_status || 'pending');
    setTrackingCode(order.tracking_code || '');
    setShippingProvider((order.shipping_provider as 'postnl' | 'dhl') || 'postnl'); // Gebruik de bestaande provider of standaard PostNL
  };
  
  // Sluit het bewerkingsmodal
  const handleCloseModal = () => {
    setEditingOrder(null);
    setOrderNotes('');
    setSelectedFulfillmentStatus('pending');
    setTrackingCode('');
    setShippingProvider('postnl');
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
        // Vernieuw de bestellingen
        await loadOrders();
        setDeletingOrderId(null);
      }
    } catch (error) {
      console.error('Unexpected error deleting order:', error);
      alert('Er is een onverwachte fout opgetreden. Probeer het opnieuw.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler voor het versturen van "bestelling binnen" melding voor wasstrips
  const handleSendOrderReady = async (applicationId: string) => {
    setSendingOrderReady(applicationId);
    
    try {
      const response = await fetch('/api/wasstrips-applications/send-order-ready', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden bij het versturen van de melding.');
      }
      
      console.log('Order ready notification sent successfully');
      // Refresh de orders lijst om de nieuwe status te tonen
      await loadOrders();
      
    } catch (error) {
      console.error('Error sending order ready notification:', error);
      alert(error instanceof Error ? error.message : 'Er is een onverwachte fout opgetreden.');
    } finally {
      setSendingOrderReady(null);
    }
  };
  
  // Sla de wijzigingen op
  const handleSaveOrder = async () => {
    if (!editingOrder) return;
    
    setIsSaving(true);
    try {
      console.log('[handleSaveOrder] Starting save for order:', editingOrder.id);
      console.log('[handleSaveOrder] Order metadata:', editingOrder.metadata);
      
      // Check if this is a wasstrips order
      const isWasstripsOrder = editingOrder.metadata?.order_type === 'wasstrips';
      console.log('[handleSaveOrder] Is wasstrips order:', isWasstripsOrder);
      
      // Bereid updates voor
      const updates: Partial<Pick<Order, 'fulfillment_status' | 'notes' | 'tracking_code' | 'shipping_provider'>> = {};
      
      // Voeg alleen gewijzigde velden toe
      if (selectedFulfillmentStatus !== editingOrder.fulfillment_status) {
        updates.fulfillment_status = selectedFulfillmentStatus as Order['fulfillment_status'];
        console.log('[handleSaveOrder] Fulfillment status changed from', editingOrder.fulfillment_status, 'to', selectedFulfillmentStatus);
      }
      
      if (orderNotes !== editingOrder.notes) {
        updates.notes = orderNotes;
        console.log('[handleSaveOrder] Notes changed');
      }
      
      if (trackingCode !== editingOrder.tracking_code) {
        updates.tracking_code = trackingCode;
        console.log('[handleSaveOrder] Tracking code changed to:', trackingCode);
        
        // Als tracking code is ingevuld, update ook status naar verzonden
        if (trackingCode && selectedFulfillmentStatus !== 'shipped') {
          updates.fulfillment_status = 'shipped';
          setSelectedFulfillmentStatus('shipped');
          console.log('[handleSaveOrder] Auto-updating status to shipped due to tracking code');
        }
      }

      if (shippingProvider !== editingOrder.shipping_provider) {
        updates.shipping_provider = shippingProvider;
        console.log('[handleSaveOrder] Shipping provider changed to:', shippingProvider);
      }
      
      // Als er niets is gewijzigd, sluit het modal
      if (Object.keys(updates).length === 0) {
        console.log('[handleSaveOrder] No changes detected, closing modal');
        handleCloseModal();
        return;
      }
      
      console.log('[handleSaveOrder] Prepared updates:', updates);
      
      let result: { order?: any; error?: any };
      
      if (isWasstripsOrder) {
        // Voor wasstrips orders, update de wasstrips_applications tabel
        console.log('[handleSaveOrder] Updating wasstrips application...');
        
        // Map de order updates naar wasstrips application updates
        const wasstripsUpdates: any = {};
        
        if (updates.notes !== undefined) {
          wasstripsUpdates.notes = updates.notes;
        }
        
        if (updates.tracking_code !== undefined) {
          wasstripsUpdates.tracking_code = updates.tracking_code;
        }
        
        // Map fulfillment status naar wasstrips status
        if (updates.fulfillment_status) {
          switch (updates.fulfillment_status) {
            case 'shipped':
              wasstripsUpdates.status = 'shipped';
              break;
            case 'delivered':
              wasstripsUpdates.status = 'shipped'; // Wasstrips heeft geen delivered status
              break;
            case 'pending':
              wasstripsUpdates.status = 'payment_selected';
              break;
            case 'processing':
              wasstripsUpdates.status = 'order_ready';
              break;
            default:
              wasstripsUpdates.status = 'payment_selected';
          }
        }
        
        console.log('[handleSaveOrder] Wasstrips updates:', wasstripsUpdates);
        
        // Use updateWasstripsApplication for wasstrips orders
        const wasstripsResult = await updateWasstripsApplication(editingOrder.id, wasstripsUpdates);
        result = { error: wasstripsResult.error, order: wasstripsResult.application || 'updated' };
        
      } else {
        // Voor reguliere orders, gebruik de normale updateOrder functie
        console.log('[handleSaveOrder] Updating regular order...');
        result = await updateOrder(editingOrder.id, updates);
      }
      
      if (result.error) {
        console.error('[handleSaveOrder] Error from update function:', result.error);
        let errorMessage = 'Onbekende fout';
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (result.error && typeof result.error === 'object') {
          errorMessage = (result.error as any).message || JSON.stringify(result.error);
        }
        alert(`Er is een fout opgetreden bij het bijwerken van de bestelling: ${errorMessage}`);
      } else {
        console.log('[handleSaveOrder] Order updated successfully:', result.order || result || 'wasstrips application updated');
        
        // Force refresh van de bestellingen lijst
        console.log('[handleSaveOrder] Force refreshing orders list...');
        setIsLoading(true);
        
        // Kleine vertraging voor visuele feedback
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadOrders();
        setIsLoading(false);
        
        handleCloseModal();
        
        // Toon gedetailleerd succes bericht
        const updateType = isWasstripsOrder ? 'Wasstrips bestelling' : 'Bestelling';
        const statusText = trackingCode ? 'verzonden' : 'bijgewerkt';
        const trackingText = trackingCode ? `\nTracking code: ${trackingCode}\nVervoerder: ${shippingProvider?.toUpperCase()}` : '';
        
        alert(`✅ ${updateType} succesvol ${statusText}!${trackingText}\n\nDe status is automatisch bijgewerkt in het retailer dashboard.`);
      }
    } catch (error) {
      console.error('[handleSaveOrder] Unexpected error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      alert(`Er is een onverwachte fout opgetreden: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Force reload orders knop
  const ForceReloadOrdersButton = () => {
    const handleForceReload = () => {
      try {
        console.log('Forceer het laden van orders vanuit localStorage');
        const mockOrdersJSON = localStorage.getItem('mockOrders');
        
        if (mockOrdersJSON) {
          const orders = JSON.parse(mockOrdersJSON);
          console.log('Direct vanuit localStorage geladen orders:', {
            aantal: orders.length,
            ids: orders.map((o: any) => o.id).join(', ')
          });
          
          // Converteer naar het juiste format en zet in state
          setOrders(orders);
          
          alert(`${orders.length} bestellingen direct uit localStorage geladen!`);
        } else {
          alert('Geen bestellingen gevonden in localStorage!');
        }
      } catch (error) {
        console.error('Fout bij direct laden van orders:', error);
        alert('Er is een fout opgetreden bij het laden van bestellingen.');
      }
    };
    
    return (
      <button
        onClick={handleForceReload}
        className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Laad direct uit localStorage
      </button>
    );
  };
  
  // Render loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  // Render toegang geweigerd
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
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
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            
            <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold leading-6 text-gray-900">Bestellingen</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Beheer en volg bestellingen van retailers.
                </p>
              </div>
              <div className="flex">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Terug naar dashboard
                </Link>
                <ForceReloadOrdersButton />
              </div>
            </div>
            
            {/* Statussen Filter */}
            <div className="mt-6 mb-4">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h3 className="text-lg font-medium text-gray-900">Bestellingen</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Een overzicht van alle bestellingen in het systeem.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                  <select
                    id="status-filter"
                    name="status-filter"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Alle statussen</option>
                    <option value="pending">Te verzenden</option>
                    <option value="processing">In behandeling</option>
                    <option value="shipped">Verzonden</option>
                    <option value="delivered">Afgeleverd</option>
                    <option value="cancelled">Geannuleerd</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Bestellingen Tabel */}
            <div className="mt-4 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Bestelnummer
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Retailer
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Datum
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Bedrag
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Betaling
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Acties</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {isLoading ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-gray-500">
                              <svg className="mx-auto animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="mt-2">Bestellingen laden...</p>
                            </td>
                          </tr>
                        ) : orders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-10 text-center text-gray-500">
                              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="mt-2">Geen bestellingen gevonden</p>
                              {statusFilter !== 'all' && (
                                <button 
                                  onClick={() => setStatusFilter('all')}
                                  className="mt-2 text-sm text-green-600 hover:text-green-500"
                                >
                                  Toon alle bestellingen
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                <div className="flex flex-col">
                                  <span>{order.order_number || order.id}</span>
                                  {order.metadata?.order_type === 'wasstrips' && (
                                    <span className="text-xs text-blue-600 font-medium">Wasstrips</span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <div className="flex flex-col">
                                  <span>{order.profiles?.company_name || `Retailer ID: ${order.retailer_id || 'Onbekend'}`}</span>
                                  {order.profiles?.email && (
                                    <span className="text-xs text-gray-400">{order.profiles.email}</span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString('nl-NL')}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                €{order.total_amount.toFixed(2)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <div className="flex flex-col space-y-1">
                                  <span className="text-xs text-gray-500">
                                    {order.metadata?.order_type === 'wasstrips' 
                                      ? `Aanbetaling €${order.metadata.deposit_amount || 30}` 
                                      : (order.payment_method === 'credit_card' ? 'Stripe' : 'Factuur')
                                    }
                                  </span>
                                  <StatusBadge status={order.payment_status || 'pending'} type="payment" />
                                  {order.metadata?.order_type === 'wasstrips' && order.metadata.deposit_paid_at && (
                                    <span className="text-xs text-green-600">
                                      Betaald: {new Date(order.metadata.deposit_paid_at).toLocaleDateString('nl-NL')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <div className="flex flex-col space-y-1">
                                  <StatusBadge status={order.fulfillment_status || 'pending'} type="fulfillment" />
                                  {order.tracking_code && (
                                    <span className="text-xs text-green-600 mt-1">{order.tracking_code}</span>
                                  )}
                                </div>
                              </td>
                              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <div className="flex justify-end space-x-2">
                                  {/* Wasstrips specific buttons */}
                                  {order.metadata?.order_type === 'wasstrips' ? (
                                    <>
                                      {/* Show "Bestelling Binnen" button only if deposit is paid but order ready email not sent yet */}
                                      {order.payment_status === 'paid' && !order.metadata.payment_options_sent && (
                                        <button
                                          onClick={() => handleSendOrderReady(order.id)}
                                          disabled={sendingOrderReady === order.id}
                                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {sendingOrderReady === order.id ? (
                                            <>
                                              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              Versturen...
                                            </>
                                          ) : (
                                            '📧 Bestelling Binnen'
                                          )}
                                        </button>
                                      )}
                                      
                                      {/* Show shipping button only if payment method is selected AND status is ready to ship */}
                                      {order.metadata.payment_method_selected && order.fulfillment_status === 'pending' && (
                                        <button
                                          onClick={() => handleEditOrder(order)}
                                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                          📦 Verzenden
                                        </button>
                                      )}
                                      
                                      {/* Show status info if waiting for payment method selection */}
                                      {order.metadata.payment_options_sent && !order.metadata.payment_method_selected && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          ⏳ Wacht op betaalmethode
                                        </span>
                                      )}
                                      
                                      {/* Regular edit button for other states - only show if no other buttons are visible */}
                                      {!order.metadata.payment_options_sent && !order.metadata.payment_method_selected && (
                                        <button
                                          onClick={() => handleEditOrder(order)}
                                          className="text-green-600 hover:text-green-900"
                                        >
                                          Bekijken<span className="sr-only">, order {order.id}</span>
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    /* Regular order buttons */
                                    <>
                                      <button
                                        onClick={() => handleEditOrder(order)}
                                        className="text-green-600 hover:text-green-900"
                                      >
                                        Bewerken<span className="sr-only">, order {order.id}</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        Verwijderen<span className="sr-only">, order {order.id}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Edit Modal */}
            {editingOrder && (
              <div className="fixed z-10 inset-0 overflow-y-auto">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                  <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                  <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div>
                      <div className="mt-3 text-center sm:mt-5">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                          Bestelling bewerken
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Bestelnummer: {editingOrder.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-4">
                        <label htmlFor="fulfillment-status" className="block text-sm font-medium text-gray-700">
                          Verzendstatus
                        </label>
                        <select
                          id="fulfillment-status"
                          name="fulfillment-status"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md text-gray-900"
                          value={selectedFulfillmentStatus}
                          onChange={(e) => setSelectedFulfillmentStatus(e.target.value)}
                        >
                          <option value="pending">Te verzenden</option>
                          <option value="processing">In behandeling</option>
                          <option value="shipped">Verzonden</option>
                          <option value="delivered">Afgeleverd</option>
                          <option value="cancelled">Geannuleerd</option>
                        </select>
                      </div>

                      <div className="mb-4">
                        <label htmlFor="tracking_code" className="block text-sm font-medium text-gray-700">
                          Track & Trace Code
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="text"
                            name="tracking_code"
                            id="tracking_code"
                            className="focus:ring-green-500 focus:border-green-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 text-gray-900"
                            placeholder="Bijv. 3SXXXXXXXX"
                            value={trackingCode}
                            onChange={(e) => setTrackingCode(e.target.value)}
                          />
                        </div>
                        {selectedFulfillmentStatus === 'shipped' && !trackingCode && (
                          <p className="mt-1 text-sm text-yellow-600">
                            Het is aan te raden om een tracking code in te voeren wanneer een order als verzonden wordt gemarkeerd.
                          </p>
                        )}
                        {trackingCode && (
                          <p className="mt-1 text-sm text-gray-500">
                            De tracking code wordt zichtbaar voor de retailer.
                          </p>
                        )}
                      </div>

                      <div className="mb-4">
                        <label htmlFor="shipping_provider" className="block text-sm font-medium text-gray-700">
                          Verzendmethode
                        </label>
                        <select
                          id="shipping_provider"
                          name="shipping_provider"
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md text-gray-900"
                          value={shippingProvider}
                          onChange={(e) => setShippingProvider(e.target.value as 'postnl' | 'dhl')}
                        >
                          <option value="postnl">PostNL</option>
                          <option value="dhl">DHL</option>
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                          De verzendmethode bepaalt welke track & trace URL de klant ontvangt.
                        </p>
                      </div>

                      <div className="mb-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notities (optioneel)
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900"
                          placeholder="Bijv. Track & trace code, bijzonderheden..."
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                        ></textarea>
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="button"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                          onClick={handleSaveOrder}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                          onClick={handleCloseModal}
                          disabled={isSaving}
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 