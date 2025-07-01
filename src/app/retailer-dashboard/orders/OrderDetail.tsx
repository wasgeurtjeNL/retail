import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../lib/utils';
import Link from 'next/link';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
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
  shipping_provider?: 'postnl' | 'dhl';
}

interface OrderDetailProps {
  order: Order;
  onClose: () => void;
  onPayNow: (order: Order) => void;
  onUpdateStatus: (order: Order, newStatus: Order['status']) => void;
}

// Component voor tracking informatie met visuele statusindicator
export const TrackingInfo = ({ trackingCode, shippingProvider = 'postnl' }: { trackingCode?: string, shippingProvider?: 'postnl' | 'dhl' }) => {
  if (!trackingCode) {
    return (
      <div className="flex items-center text-gray-500">
        <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Geen tracking code beschikbaar</span>
      </div>
    );
  }

  // Bepaal de juiste tracking URL en provider naam op basis van de verzendmethode
  const trackingUrl = shippingProvider === 'dhl' 
    ? `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${trackingCode}` 
    : `https://postnl.nl/tracktrace/?B=${trackingCode}`;
  
  const providerName = shippingProvider === 'dhl' ? 'DHL' : 'PostNL';
  
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
      <h4 className="font-medium text-gray-900 mb-2">Track & Trace Informatie</h4>
      
      <div className="flex flex-col space-y-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Tracking Code: {trackingCode}</p>
            <p className="text-sm text-gray-500">Uw bestelling is verzonden en kan worden gevolgd via {providerName}</p>
          </div>
        </div>
        
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer" 
          className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
        >
          <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Volg je pakket bij {providerName}
        </a>
      </div>
    </div>
  );
};

const OrderDetail: React.FC<OrderDetailProps> = ({
  order,
  onClose,
  onPayNow,
  onUpdateStatus
}) => {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Helper functions
  const getPaymentStatus = () => {
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
  };

  // Calculate countdown timer
  useEffect(() => {
    if (!order.paymentDueDate || getPaymentStatus() === 'paid') {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const dueDate = new Date(order.paymentDueDate!);
      const timeDiff = dueDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setCountdown("Betaaltermijn verstreken");
        return;
      }

      // Calculate days, hours, minutes, seconds
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      // Format the countdown
      let countdownText = "";
      if (days > 0) {
        countdownText += `${days}d `;
      }
      countdownText += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setCountdown(countdownText);
    };

    // Initial update
    updateCountdown();
    
    // Update countdown every second
    const countdownInterval = setInterval(updateCountdown, 1000);
    
    // Clean up interval
    return () => clearInterval(countdownInterval);
  }, [order]);

  // Payment handling
  const handlePayment = async () => {
    setPaymentError(null);
    setIsProcessingPayment(true);
    
    try {
      // Prepare order data for Stripe
      const paymentOrder = {
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
      
      console.log('Betaalgegevens voorbereid voor Stripe:', order.id, 'bedrag:', order.total);
      
      // Store the order temporarily in localStorage
      localStorage.setItem('stripeOrder', JSON.stringify(paymentOrder));
      
      // Simulate a small delay to ensure localStorage is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Sluit eerst het modal voordat we navigeren
      onClose();
      
      // Direct naar Stripe checkout navigeren met bedrag als parameter
      window.location.href = `/api/stripe/checkout?orderId=${order.id}&amount=${order.total}`;
    } catch (error) {
      console.error("Payment processing error:", error);
      setPaymentError("Er is een fout opgetreden bij het voorbereiden van uw betaling. Probeer het later opnieuw.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Bestelling #{order.id}</h3>
            <p className="text-sm text-gray-500">Geplaatst op {formatDate(order.created_at)}</p>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={onClose}
          >
            <span className="sr-only">Sluiten</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status section with payment info */}
        <div className="mt-4 bg-gray-50 p-4 rounded-md">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <div className="mt-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${order.status === 'nieuw' ? 'bg-blue-100 text-blue-800' : 
                    order.status === 'betaald' ? 'bg-green-100 text-green-800' : 
                    order.status === 'verzonden' ? 'bg-purple-100 text-purple-800' : 
                    order.status === 'geleverd' ? 'bg-teal-100 text-teal-800' : 
                    'bg-red-100 text-red-800'}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Betaalstatus</h4>
              <div className="mt-1">
                {getPaymentStatus() === 'paid' ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 min-w-[120px] justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Betaald
                  </span>
                ) : getPaymentStatus() === 'pending' ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 min-w-[120px] justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Betaling open
                  </span>
                ) : getPaymentStatus() === 'expired' ? (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 min-w-[120px] justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Betaling te laat
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 min-w-[120px] justify-center">
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Betaling mislukt
                  </span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Betaalmethode</h4>
              <p className="mt-1 text-sm text-gray-900">
                {order.paymentMethod === 'invoice' ? 'Factuur' : 
                 order.paymentMethod === 'stripe' ? 'Creditcard (Stripe)' : 'Niet gespecificeerd'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Totaalbedrag</h4>
              <p className="mt-1 text-sm text-gray-900 font-medium">€{order.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Payment section with countdown */}
          {(getPaymentStatus() === 'pending' || getPaymentStatus() === 'expired') && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex flex-wrap justify-between items-center">
                <div className="w-1/2">
                  <h4 className="text-base font-medium text-gray-700">Betaaltermijn</h4>
                  {countdown && (
                    <div className={`mt-2 font-mono text-base ${
                      getPaymentStatus() === 'expired' ? 'text-red-600' : 
                      'text-yellow-600 font-medium'
                    }`}>
                      {getPaymentStatus() === 'expired' ? 'Verlopen' : countdown}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {order.paymentDueDate && `Uiterste betaaldatum: ${formatDate(order.paymentDueDate)}`}
                  </p>
                </div>
                
                <div>
                  {paymentError && (
                    <div className="text-sm text-red-600 mb-2">{paymentError}</div>
                  )}
                  <button
                    onClick={handlePayment}
                    disabled={isProcessingPayment}
                    className={`inline-flex items-center px-5 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                      ${isProcessingPayment ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'}`}
                  >
                    {isProcessingPayment ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Betaling verwerken...
                      </>
                    ) : (
                      <>
                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Nu betalen
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900">Bestelde producten</h4>
          <div className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 flex justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900">{item.product_name}</h5>
                  <p className="mt-1 text-sm text-gray-500">{item.quantity} x €{item.price.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">€{(item.quantity * item.price).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin controls - only shown for admin users */}
        {process.env.NEXT_PUBLIC_ENABLE_ADMIN_CONTROLS === 'true' && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900">Beheerder opties</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onUpdateStatus(order, 'betaald')}
                disabled={order.status === 'betaald'}
                className={`text-xs py-1 px-3 rounded-md ${
                  order.status === 'betaald' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                Markeer als betaald
              </button>
              <button
                onClick={() => onUpdateStatus(order, 'verzonden')}
                disabled={order.status === 'verzonden'}
                className={`text-xs py-1 px-3 rounded-md ${
                  order.status === 'verzonden' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Markeer als verzonden
              </button>
              <button
                onClick={() => onUpdateStatus(order, 'geleverd')}
                disabled={order.status === 'geleverd'}
                className={`text-xs py-1 px-3 rounded-md ${
                  order.status === 'geleverd' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
              >
                Markeer als geleverd
              </button>
              <button
                onClick={() => onUpdateStatus(order, 'geannuleerd')}
                disabled={order.status === 'geannuleerd'}
                className={`text-xs py-1 px-3 rounded-md ${
                  order.status === 'geannuleerd' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Annuleer bestelling
              </button>
            </div>
          </div>
        )}

        {/* Tracking info section */}
        {order.status.toLowerCase() === 'verzonden' || order.status.toLowerCase() === 'geleverd' ? (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <TrackingInfo trackingCode={order.tracking_code} shippingProvider={order.shipping_provider} />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Link
            href="/retailer-dashboard/orders"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Terug naar overzicht
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail; 