import React from 'react';
import { Order } from '@/lib/supabase';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onPayNow: (order: Order) => void;
}

// Helper functie voor datum formatting
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper functie voor status badge
const getStatusBadgeClass = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'bg-blue-100 text-blue-800';
    case 'processing': return 'bg-yellow-100 text-yellow-800';
    case 'shipped': return 'bg-purple-100 text-purple-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Verbeterde Order Details Modal met wasstrips specifieke informatie
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, onPayNow }) => {
  const isWasstripsOrder = order.metadata?.wasstrips_application_id;
  const depositAmount = order.metadata?.deposit_amount || 0;
  const fullOrderAmount = order.metadata?.full_order_amount || order.total_amount;
  const remainingAmount = order.metadata?.remaining_amount || order.total_amount;
  const depositStatus = order.metadata?.deposit_status;
  const productDetails = order.metadata?.product_details;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {isWasstripsOrder ? 'Wasstrips Bestelling' : 'Bestelling Details'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {order.order_number} • {new Date(order.created_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hoofdinhoud */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wasstrips Product Showcase */}
            {isWasstripsOrder && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src="/assets/images/wasstrips-product.jpg"
                      alt="Wasstrips Starterpakket"
                      className="w-24 h-24 object-cover rounded-lg shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Wasstrips Starterpakket
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Compleet pakket met wasstrips en marketingmateriaal voor jouw winkel
                    </p>
                    
                    {/* Package Contents */}
                    {productDetails?.package_contents && (
                      <div className="bg-white rounded-md p-3 border border-blue-100">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Pakket bevat:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {productDetails.package_contents.map((item: string, index: number) => (
                            <li key={index} className="flex items-center">
                              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Bestelde Items</h4>
              </div>
              <div className="divide-y divide-gray-200">
                {order.items?.map((item, index) => (
                  <div key={index} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500">Aantal: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">€{item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Timeline voor Wasstrips */}
            {isWasstripsOrder && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Bestelling Status</h4>
                <div className="space-y-4">
                  {/* Aanbetaling */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      depositStatus === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {depositStatus === 'paid' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">1</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Aanbetaling {depositStatus === 'paid' ? 'Ontvangen' : 'In afwachting'}
                      </p>
                      <p className="text-sm text-gray-500">€{depositAmount.toFixed(2)}</p>
                    </div>
                    {depositStatus === 'paid' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Betaald
                      </span>
                    )}
                  </div>

                  {/* Restbetaling */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      order.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {order.payment_status === 'paid' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">2</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Restbedrag {order.payment_status === 'paid' ? 'Betaald' : 'Te betalen'}
                      </p>
                      <p className="text-sm text-gray-500">€{remainingAmount.toFixed(2)}</p>
                    </div>
                    {order.payment_status === 'paid' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Betaald
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Open
                      </span>
                    )}
                  </div>

                  {/* Verzending */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">3</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {order.fulfillment_status === 'shipped' ? 'Verzonden' : 
                         order.fulfillment_status === 'delivered' ? 'Geleverd' : 'Wordt voorbereid'}
                      </p>
                      {order.tracking_code && (
                        <p className="text-sm text-gray-500">Track & Trace: {order.tracking_code}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar met betaalinformatie */}
          <div className="space-y-6">
            {/* Betaaloverzicht */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Betaaloverzicht</h4>
              
              {isWasstripsOrder ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Totaal bestelling:</span>
                    <span className="font-medium">€{fullOrderAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Aanbetaling:</span>
                    <span className={`font-medium ${depositStatus === 'paid' ? 'text-green-600' : 'text-gray-900'}`}>
                      €{depositAmount.toFixed(2)}
                      {depositStatus === 'paid' && (
                        <span className="ml-1 text-xs text-green-600">✓</span>
                      )}
                    </span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Restbedrag:</span>
                    <span className={remainingAmount > 0 ? 'text-blue-600' : 'text-green-600'}>
                      €{remainingAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotaal:</span>
                    <span className="font-medium">€{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verzendkosten:</span>
                    <span className="font-medium">€{order.shipping_cost.toFixed(2)}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Totaal:</span>
                    <span>€{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Betaal knop */}
            {order.payment_status === 'pending' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Betaling</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {isWasstripsOrder 
                    ? `Betaal het restbedrag van €${remainingAmount.toFixed(2)} om je bestelling te voltooien.`
                    : `Betaal €${order.total_amount.toFixed(2)} om je bestelling te voltooien.`
                  }
                </p>
                <button
                  onClick={() => onPayNow(order)}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>Betaal Nu €{(isWasstripsOrder ? remainingAmount : order.total_amount).toFixed(2)}</span>
                </button>
                
                {/* Betaalmethoden */}
                <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <div className="w-6 h-4 bg-blue-600 rounded text-white text-center text-xs font-bold">iDEAL</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-8 h-5 bg-gray-800 rounded text-white text-center text-xs">CARD</div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Status */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Betaling:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment_status === 'paid' ? 'Betaald' : 'Open'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Levering:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.fulfillment_status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.fulfillment_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.fulfillment_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.fulfillment_status === 'delivered' ? 'Geleverd' :
                     order.fulfillment_status === 'shipped' ? 'Verzonden' :
                     order.fulfillment_status === 'processing' ? 'In behandeling' :
                     order.fulfillment_status === 'pending' ? 'Wachtend' : 'Onbekend'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal; 