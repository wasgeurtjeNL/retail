'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { getOrders, updateOrder, deleteOrder, Order, getWasstripsOrders, WasstripsApplication, updateWasstripsApplication, updateWasstripsApplicationWithOrderDetails } from '@/lib/supabase';
import OrderDetailsModal from '@/components/OrderDetailsModal';

// Status definities met labels en kleuren voor een consistent uiterlijk
const FULFILLMENT_STATUSES = {
  pending: { label: 'Wacht op betaling', color: 'orange' },
  processing: { label: 'Betaald - Gereed voor verzending', color: 'green' },
  shipped: { label: 'Verzonden', color: 'blue' },
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
  
  // State declarations first
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Enhanced filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Bulk actions state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Order details modal state
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Dashboard statistics
  const orderStats = useMemo(() => {
    console.log('[STATS] Calculating order statistics for', orders.length, 'orders');
    
    // Debug total amounts for each order
    orders.forEach((order, index) => {
      console.log(`[STATS] Order ${index + 1}: ${order.order_number} = €${order.total_amount} (type: ${typeof order.total_amount}) (raw: ${JSON.stringify(order.total_amount)})`);
    });
    
    const totalValue = orders.reduce((sum, o) => {
      let amount: number;
      if (typeof o.total_amount === 'string') {
        amount = parseFloat(o.total_amount);
        console.log(`[STATS] String conversion: "${o.total_amount}" -> ${amount}`);
      } else if (typeof o.total_amount === 'number') {
        amount = o.total_amount;
        console.log(`[STATS] Number value: ${amount}`);
      } else {
        amount = 0;
        console.log(`[STATS] Unknown type for ${o.order_number}: ${typeof o.total_amount}, setting to 0`);
      }
      
      if (isNaN(amount)) {
        console.log(`[STATS] WARNING: NaN detected for ${o.order_number}, using 0`);
        amount = 0;
      }
      
      console.log(`[STATS] Adding ${amount} to sum ${sum}, result: ${sum + amount}`);
      return sum + amount;
    }, 0);
    
    console.log('[STATS] Final total value:', totalValue);
    
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.payment_status === 'pending').length,
      paid: orders.filter(o => o.payment_status === 'paid').length,
      processing: orders.filter(o => o.fulfillment_status === 'processing').length,
      shipped: orders.filter(o => o.fulfillment_status === 'shipped').length,
      totalValue: totalValue,
      wasstrips: orders.filter(o => o.metadata?.order_type === 'wasstrips').length,
      catalog: orders.filter(o => !o.metadata?.order_type).length
    };
    
    console.log('[STATS] Final stats:', stats);
    return stats;
  }, [orders]);

  // Advanced filtering and search logic
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(search) ||
        order.profiles?.company_name?.toLowerCase().includes(search) ||
        order.profiles?.email?.toLowerCase().includes(search) ||
        order.tracking_code?.toLowerCase().includes(search) ||
        order.id.toLowerCase().includes(search)
      );
    }

    // Status filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.fulfillment_status === statusFilter);
    }
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.payment_status === paymentStatusFilter);
    }
    if (orderTypeFilter !== 'all') {
      if (orderTypeFilter === 'wasstrips') {
        filtered = filtered.filter(order => order.metadata?.order_type === 'wasstrips');
      } else if (orderTypeFilter === 'catalog') {
        filtered = filtered.filter(order => !order.metadata?.order_type);
      }
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      if (dateRange !== 'all') {
        filtered = filtered.filter(order => new Date(order.created_at) >= filterDate);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof Order];
      let bValue: any = b[sortColumn as keyof Order];

      // Handle nested properties
      if (sortColumn === 'retailer') {
        aValue = a.profiles?.company_name || '';
        bValue = b.profiles?.company_name || '';
      }

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, orderTypeFilter, dateRange, sortColumn, sortDirection]);

  // Pagination logic
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, endIndex);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  // Helper functions
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  }, [sortColumn]);

  const handleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(paginatedOrders.map(order => order.id));
      setSelectedOrders(allIds);
      setShowBulkActions(true);
    }
  }, [selectedOrders.size, paginatedOrders]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedOrders.size === 0) return;
    
    try {
      setIsLoading(true);
      
      switch (bulkAction) {
        case 'mark_shipped':
          // Implement bulk mark as shipped
          for (const orderId of selectedOrders) {
            await updateOrder(orderId, { fulfillment_status: 'shipped' });
          }
          break;
        case 'mark_delivered':
          // Implement bulk mark as delivered
          for (const orderId of selectedOrders) {
            await updateOrder(orderId, { fulfillment_status: 'delivered' });
          }
          break;
        case 'export':
          handleExportOrders();
          break;
      }
      
      await loadOrders();
      setSelectedOrders(new Set());
      setShowBulkActions(false);
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('Er is een fout opgetreden bij de bulk actie.');
    } finally {
      setIsLoading(false);
    }
  }, [bulkAction, selectedOrders]);

  const handleExportOrders = useCallback(() => {
    const ordersToExport = selectedOrders.size > 0 
      ? filteredAndSortedOrders.filter(order => selectedOrders.has(order.id))
      : filteredAndSortedOrders;

    const csvContent = [
      ['Bestelnummer', 'Retailer', 'Email', 'Datum', 'Bedrag', 'Betaling', 'Status', 'Tracking'].join(','),
      ...ordersToExport.map(order => [
        order.order_number || order.id,
        order.profiles?.company_name || '',
        order.profiles?.email || '',
        new Date(order.created_at).toLocaleDateString('nl-NL'),
        order.total_amount.toFixed(2),
        order.payment_status || '',
        order.fulfillment_status || '',
        order.tracking_code || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredAndSortedOrders, selectedOrders]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setOrderTypeFilter('all');
    setDateRange('all');
    setCurrentPage(1);
  }, []);
  
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
              payment_status: (
                // Als beide betalingen gedaan zijn EN betaalmethode is geselecteerd, dan volledig betaald
                app.deposit_status === 'paid' && app.remaining_payment_status === 'paid' && app.payment_method_selected ? 'paid' :
                // Als alleen aanbetaling gedaan is, dan nog in afwachting
                app.deposit_status === 'paid' && app.remaining_payment_status !== 'paid' ? 'pending' :
                // Anders ook in afwachting
                'pending'
              ) as Order['payment_status'],
              payment_method: 'credit_card' as Order['payment_method'],
              stripe_session_id: undefined,
              stripe_payment_intent_id: undefined,
              subtotal: parseFloat(app.total_amount as string) || 0,
              shipping_cost: 0,
              tax_amount: 0,
              total_amount: parseFloat(app.total_amount as string) || 0,
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
                // Als er een tracking code is, dan is het verzonden
                app.tracking_code ? 'shipped' :
                // Als status expliciet shipped is
                app.status === 'shipped' ? 'shipped' :
                // Als beide betalingen gedaan zijn EN betaalmethode is geselecteerd, dan processing (klaar voor verzending)
                app.deposit_status === 'paid' && app.remaining_payment_status === 'paid' && app.payment_method_selected ? 'processing' :
                // Andere statussen
                app.status === 'pending' ? 'pending' :
                app.status === 'approved' && !app.payment_method_selected ? 'processing' :
                app.status === 'order_ready' && !app.payment_method_selected ? 'processing' :
                app.status === 'payment_selected' && app.payment_method_selected ? 'processing' :
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

  // Open order details modal
  const handleViewOrderDetails = (order: Order) => {
    console.log('[OrderManagement] Opening order details for order:', order.id);
    setViewingOrder(order);
    setShowOrderDetails(true);
  };

  // Sluit order details modal
  const handleCloseOrderDetails = () => {
    console.log('[OrderManagement] Closing order details modal');
    setViewingOrder(null);
    setShowOrderDetails(false);
  };

  // Handle Pay Now from order details modal
  const handlePayNowFromDetails = async (order: Order) => {
    try {
      console.log('[OrderManagement] Pay Now clicked for order:', order.id, 'amount:', order.total_amount);
      
      // Check voor Wasstrips orders
      const currentStep = order.metadata?.current_step;
      const wasstripsApplicationId = order.metadata?.wasstrips_application_id;
      
      if (currentStep && wasstripsApplicationId) {
        console.log('[OrderManagement] Handling Wasstrips payment - Step:', currentStep);
        
        // Voor Wasstrips stap 3 (delivery): redirecteer naar betaalwijze keuze
        if (currentStep === 'delivery') {
          console.log('[OrderManagement] Redirecting to payment options for delivery step');
          window.location.href = `/retailer-dashboard/payment-options/${wasstripsApplicationId}`;
          return;
        }
        
        // Voor tussentoestand (wachten op admin): geen actie mogelijk
        if (currentStep === 'waiting_for_admin') {
          alert('Deze bestelling wordt momenteel voorbereid door de administratie.');
          return;
        }
        
        // Voor Wasstrips stappen 1 & 2: gebruik wasstrips payment endpoint
        if (currentStep === 'deposit' || currentStep === 'remaining') {
          const paymentType = currentStep === 'deposit' ? 'deposit' : 'remaining';
          const paymentLinkId = currentStep === 'deposit' 
            ? order.metadata?.deposit_payment_link 
            : order.metadata?.remaining_payment_link;
          
          if (!paymentLinkId) {
            console.error('[OrderManagement] No payment link found for step:', currentStep);
            alert('Fout: Betaallink niet gevonden. Contacteer de klantenservice.');
            return;
          }
          
          console.log('[OrderManagement] Redirecting to wasstrips payment:', {
            paymentType,
            paymentLinkId,
            amount: order.total_amount
          });
          
          // Redirecteer naar de wasstrips betaalpagina
          if (paymentType === 'deposit') {
            window.location.href = `/payment/deposit/${paymentLinkId}`;
          } else {
            window.location.href = `/payment/remaining/${paymentLinkId}`;
          }
          return;
        }
      }
      
      // Voor gewone orders: gebruik normale checkout
      console.log('[OrderManagement] Handling standard order payment');
      
      // Valideer order data
      if (!order.total_amount || order.total_amount <= 0) {
        console.error('[OrderManagement] Invalid order amount:', order.total_amount);
        alert('Fout: Ongeldig orderbedrag. Kan betaling niet starten.');
        return;
      }
      
      // Bereid order data voor voor Stripe
      const stripeOrder = {
        id: order.id,
        totalAmount: order.total_amount,
        items: order.items?.map(item => ({
          id: item.id || 'item',
          name: item.product_name || 'Product',
          quantity: item.quantity || 1,
          price: item.price || 0
        })) || [],
        date: order.created_at,
        status: order.fulfillment_status,
        paymentStatus: 'pending',
        paymentMethod: 'stripe'
      };
      
      console.log('[OrderManagement] Prepared stripe order:', stripeOrder);
      
      // Sla de order op in localStorage voor gebruik door Stripe
      localStorage.setItem('stripeOrder', JSON.stringify(stripeOrder));
      
      // Sluit de modal voordat we redirecten
      handleCloseOrderDetails();
      
      // Bereid API request voor
      const requestBody = {
        items: stripeOrder.items,
        orderId: order.id,
        amount: order.total_amount,
        isTestMode: true // Default to test mode for admin
      };
      
      console.log('[OrderManagement] API request body:', requestBody);
      
      // Start Stripe checkout via API
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[OrderManagement] API response status:', response.status);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OrderManagement] API response not ok:', response.status, errorText);
        alert(`API fout: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('[OrderManagement] API response data:', data);
      
      if (data.success && data.url) {
        console.log('[OrderManagement] Redirecting to Stripe checkout:', data.url);
        // Redirect naar Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('[OrderManagement] Stripe checkout failed:', data);
        const errorMessage = data.error || 'Onbekende fout bij het voorbereiden van de betaling';
        alert(`Er is een fout opgetreden: ${errorMessage}`);
      }
    } catch (error) {
      console.error('[OrderManagement] Payment initiation error:', error);
      alert(`Er is een fout opgetreden bij het voorbereiden van de betaling: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
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
              </div>
            </div>
            
            {/* Dashboard Statistics */}
            <div className="mt-6 mb-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">📊</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Totaal Orders</dt>
                          <dd className="text-lg font-medium text-gray-900">{orderStats.total}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">💰</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Betaald</dt>
                          <dd className="text-lg font-medium text-gray-900">{orderStats.paid}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">📦</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Verzonden</dt>
                          <dd className="text-lg font-medium text-gray-900">{orderStats.shipped}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm font-bold">€</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Totale Waarde</dt>
                          <dd className="text-lg font-medium text-gray-900">€{orderStats.totalValue.toFixed(2)}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Filters & Search */}
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Order Management</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filteredAndSortedOrders.length} van {orders.length} bestellingen
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0 flex space-x-2">
                    <button
                      onClick={handleExportOrders}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      📊 Export CSV
                    </button>
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      🔄 Reset Filters
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                      Zoeken
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 sm:text-sm">🔍</span>
                      </div>
                      <input
                        type="text"
                        id="search"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 pr-3 py-2 text-sm border-gray-300 rounded-md text-gray-900"
                        placeholder="Zoek op bestelnummer, retailer, email..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                      Fulfillment Status
                    </label>
                    <select
                      id="status-filter"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Alle statussen</option>
                      <option value="pending">Te verzenden</option>
                      <option value="processing">In behandeling</option>
                      <option value="shipped">Verzonden</option>
                      <option value="delivered">Afgeleverd</option>
                      <option value="cancelled">Geannuleerd</option>
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div>
                    <label htmlFor="payment-filter" className="block text-sm font-medium text-gray-700">
                      Betaling
                    </label>
                    <select
                      id="payment-filter"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900"
                      value={paymentStatusFilter}
                      onChange={(e) => {
                        setPaymentStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Alle betalingen</option>
                      <option value="pending">In afwachting</option>
                      <option value="paid">Betaald</option>
                      <option value="failed">Mislukt</option>
                    </select>
                  </div>

                  {/* Order Type Filter */}
                  <div>
                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      id="type-filter"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900"
                      value={orderTypeFilter}
                      onChange={(e) => {
                        setOrderTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Alle types</option>
                      <option value="wasstrips">Wasstrips ({orderStats.wasstrips})</option>
                      <option value="catalog">Catalog ({orderStats.catalog})</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700">
                      Periode
                    </label>
                    <select
                      id="date-filter"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900"
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Alle periodes</option>
                      <option value="today">Vandaag</option>
                      <option value="week">Afgelopen week</option>
                      <option value="month">Afgelopen maand</option>
                      <option value="quarter">Afgelopen kwartaal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {showBulkActions && (
                <div className="px-6 py-3 bg-blue-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-900">
                      {selectedOrders.size} order(s) geselecteerd
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        className="text-sm border-gray-300 rounded-md text-gray-900"
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                      >
                        <option value="">Kies actie...</option>
                        <option value="mark_shipped">Markeer als verzonden</option>
                        <option value="mark_delivered">Markeer als geleverd</option>
                        <option value="export">Export geselecteerde</option>
                      </select>
                      <button
                        onClick={handleBulkAction}
                        disabled={!bulkAction}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Uitvoeren
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('order_number')}
                          >
                            <div className="flex items-center">
                              Bestelnummer
                              {sortColumn === 'order_number' && (
                                <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('retailer')}
                          >
                            <div className="flex items-center">
                              Retailer
                              {sortColumn === 'retailer' && (
                                <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('created_at')}
                          >
                            <div className="flex items-center">
                              Datum
                              {sortColumn === 'created_at' && (
                                <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_amount')}
                          >
                            <div className="flex items-center">
                              Bedrag
                              {sortColumn === 'total_amount' && (
                                <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('payment_status')}
                          >
                            <div className="flex items-center">
                              Betaling
                              {sortColumn === 'payment_status' && (
                                <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('fulfillment_status')}
                          >
                            <div className="flex items-center">
                              Status
                              {sortColumn === 'fulfillment_status' && (
                                <span className="ml-1 text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Tracking
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Acties</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {isLoading ? (
                          <tr>
                            <td colSpan={9} className="py-10 text-center text-gray-500">
                              <svg className="mx-auto animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="mt-2">Bestellingen laden...</p>
                            </td>
                          </tr>
                        ) : orders.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-10 text-center text-gray-500">
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
                          paginatedOrders.map((order) => (
                            <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  checked={selectedOrders.has(order.id)}
                                  onChange={() => handleSelectOrder(order.id)}
                                />
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
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
                                <StatusBadge status={order.fulfillment_status || 'pending'} type="fulfillment" />
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {order.tracking_code ? (
                                  <span className="text-xs text-green-600 font-mono">{order.tracking_code}</span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <div className="flex justify-end space-x-2">
                                  {/* View Details button - always available */}
                                  <button
                                    onClick={() => handleViewOrderDetails(order)}
                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                    title="Bekijk volledige orderdetails"
                                  >
                                    View Details<span className="sr-only">, order {order.id}</span>
                                  </button>
                                  
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
                                      {order.metadata.payment_method_selected && 
                                       order.fulfillment_status !== 'shipped' && 
                                       order.fulfillment_status !== 'delivered' && (
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
                                      {/* Show direct shipping button for paid orders */}
                                      {order.fulfillment_status === 'processing' && order.payment_status === 'paid' && (
                                        <button
                                          onClick={() => handleEditOrder(order)}
                                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                          📦 Verzenden
                                        </button>
                                      )}
                                      
                                      {/* Standard edit button for other states */}
                                      {!(order.fulfillment_status === 'processing' && order.payment_status === 'paid') && (
                                        <button
                                          onClick={() => handleEditOrder(order)}
                                          className="text-green-600 hover:text-green-900"
                                        >
                                          Bewerken<span className="sr-only">, order {order.id}</span>
                                        </button>
                                      )}
                                      
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Vorige
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Volgende
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Toont{' '}
                      <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span>
                      {' '}tot{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)}
                      </span>
                      {' '}van{' '}
                      <span className="font-medium">{filteredAndSortedOrders.length}</span>
                      {' '}resultaten
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Per pagina:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="border-gray-300 rounded-md text-sm text-gray-900"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                    </div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Vorige</span>
                        ←
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Volgende</span>
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
            
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
                          <option value="pending">Wacht op betaling</option>
                          <option value="processing">Betaald - Gereed voor verzending</option>
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
            
            {/* Order Details Modal */}
            {showOrderDetails && viewingOrder && (
              <OrderDetailsModal
                order={viewingOrder}
                onClose={handleCloseOrderDetails}
                onPayNow={handlePayNowFromDetails}
              />
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