import React from 'react';
import { Order } from '@/app/retailer-dashboard/orders/page';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
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
    case 'nieuw': return 'bg-blue-100 text-blue-800';
    case 'betaald': return 'bg-yellow-100 text-yellow-800';
    case 'verzonden': return 'bg-purple-100 text-purple-800';
    case 'geleverd': return 'bg-green-100 text-green-800';
    case 'geannuleerd': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Sluiten</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div>
            <div className="mt-3 sm:mt-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  Bestelling #{order.id}
                </h3>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              
              <div className="border-t border-gray-200 py-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Besteldatum</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(order.created_at)}</dd>
                  </div>
                  <div className="col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Totaalbedrag</dt>
                    <dd className="mt-1 text-sm text-gray-900">€{order.total.toFixed(2)}</dd>
                  </div>
                  
                  {order.tracking_code && (
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Track & Trace</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order.tracking_code}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              <div className="border-t border-gray-200 py-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Bestelde producten</h4>
                <div className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500">{item.quantity} x €{item.price.toFixed(2)}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">€{(item.quantity * item.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {order.notes && (
                <div className="border-t border-gray-200 py-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Notities</h4>
                  <p className="text-sm text-gray-900">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-pink-600 text-base font-medium text-white hover:bg-pink-700 focus:outline-none sm:col-start-2 sm:text-sm"
              onClick={onClose}
            >
              Sluiten
            </button>
            {(order.status === 'verzonden' || order.status === 'geleverd') && order.tracking_code && (
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:col-start-1 sm:text-sm"
                onClick={() => window.open(
                  order.shipping_provider === 'dhl'
                    ? `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${order.tracking_code}`
                    : `https://postnl.nl/tracktrace/?B=${order.tracking_code}`, 
                  '_blank'
                )}
              >
                Volg zending
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal; 