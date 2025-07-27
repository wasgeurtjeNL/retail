'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getAllOrdersForRetailer, Order as SupabaseOrder } from '@/lib/supabase';

// Interface voor Wasstrips applicaties
interface WasstripsApplication {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  paymentOptionSent?: boolean;
  selectedPaymentOption?: 'direct' | 'invoice' | null;
  isPaid: boolean;
  paymentLinkSentAt?: string;
  paymentDueDate?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'shipped' | 'delivered';
  deposit_status?: 'not_sent' | 'sent' | 'paid' | 'failed';
  deposit_paid_at?: string;
  tracking_code?: string;
}

// Helper functie om betaalmethode display info te bepalen
const getPaymentMethodDisplayInfo = (order: SupabaseOrder, stripePaymentMethods: Record<string, any> = {}) => {
  // Voor wasstrips orders
  if (order.metadata?.order_type === 'wasstrips') {
    const paymentMethodSelected = order.metadata?.payment_method_selected;
    if (paymentMethodSelected === 'direct') {
      return {
        name: 'Directe betaling',
        description: 'Via Stripe',
        icon: '💳',
        color: 'from-green-50 to-green-100 border-green-200'
      };
    } else if (paymentMethodSelected === 'invoice') {
      return {
        name: 'Betaling op factuur',
        description: 'Betalen binnen 14 dagen',
        icon: '📄',
        color: 'from-amber-50 to-amber-100 border-amber-200'
      };
    }
    // Default voor wasstrips zonder geselecteerde betaalmethode
    return {
      name: 'Nog niet gekozen',
      description: 'Betaalmethode wordt later gekozen',
      icon: '⏳',
      color: 'from-gray-50 to-gray-100 border-gray-200'
    };
  }
  
  // Voor reguliere orders
  if (order.payment_method === 'invoice') {
    return {
      name: 'Betaling op factuur',
      description: 'Betalen binnen 14 dagen',
      icon: '📄',
      color: 'from-amber-50 to-amber-100 border-amber-200'
    };
  }
  
  // Voor Stripe betalingen - gebruik echte betaalmethode data indien beschikbaar
  if (order.stripe_session_id) {
    const stripeData = stripePaymentMethods[order.stripe_session_id];
    if (stripeData) {
      const paymentMethod = stripeData.payment_method;
      const details = stripeData.payment_method_details;
      
      switch (paymentMethod) {
        case 'ideal':
          return {
            name: details?.bank ? `iDEAL (${details.bank})` : 'iDEAL',
            description: 'Via iDEAL internetbankieren',
            icon: '🏦',
            color: 'from-blue-50 to-blue-100 border-blue-200'
          };
        case 'bancontact':
          return {
            name: 'Bancontact',
            description: 'Via Bancontact',
            icon: '💳',
            color: 'from-purple-50 to-purple-100 border-purple-200'
          };
        case 'credit_card':
          return {
            name: details?.brand && details?.last4 ? `${details.brand.toUpperCase()} **** ${details.last4}` : 'Creditcard',
            description: 'Via Stripe creditcard',
            icon: '💳',
            color: 'from-green-50 to-green-100 border-green-200'
          };
        default:
          return {
            name: 'Directe betaling',
            description: 'Via online betaling',
            icon: '💳',
            color: 'from-green-50 to-green-100 border-green-200'
          };
      }
    }
    
    return {
      name: 'Directe betaling',
      description: 'Via online betaling',
      icon: '💳',
      color: 'from-green-50 to-green-100 border-green-200'
    };
  }
  
  // Default fallback
  return {
    name: 'Onbekend',
    description: 'Betaalmethode niet bekend',
    icon: '❓',
    color: 'from-gray-50 to-gray-100 border-gray-200'
  };
};

// Professionele Order Status Component met animaties
const OrderStatusBadge = ({ order }: { order: SupabaseOrder }) => {
  const getStatusInfo = () => {
    // Check voor Wasstrips orders (hebben metadata met current_step)
    const currentStep = order.metadata?.current_step;
    const stepDescription = order.metadata?.step_description;
    
    if (currentStep) {
      // Wasstrips specifieke stappen
      switch (currentStep) {
        case 'deposit':
          return { 
            text: 'Aanbetaling (€30)', 
            color: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-300', 
            icon: '💳', 
            urgent: true,
            pulse: true,
            description: stepDescription || 'Aanbetaling te betalen'
          };
        case 'remaining':
          return { 
            text: 'Restbedrag (€270)', 
            color: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300', 
            icon: '💰', 
            urgent: true,
            pulse: true,
            description: stepDescription || 'Restbedrag te betalen'
          };
        case 'waiting_for_admin':
          return { 
            text: 'Aanbetaling ✓', 
            color: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300', 
            icon: '⏳', 
            urgent: false,
            pulse: true,
            description: stepDescription || 'Aanbetaling ontvangen - Bestelling wordt voorbereid'
          };
        case 'delivery':
          return { 
            text: 'Kies betaalwijze', 
            color: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300', 
            icon: '⚙️', 
            urgent: true,
            pulse: true,
            description: stepDescription || 'Kies leveringsoptie'
          };
        case 'completed':
          if (order.fulfillment_status === 'shipped') {
            return { 
              text: 'Verzonden', 
              color: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300', 
              icon: '🚚', 
              urgent: false,
              pulse: false,
              description: stepDescription || 'Bestelling verzonden'
            };
          }
          return { 
            text: 'Wordt voorbereid', 
            color: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300', 
            icon: '⚡', 
            urgent: false,
            pulse: true,
            description: stepDescription || 'Bestelling wordt voorbereid'
          };
      }
    }
    
    // Standaard order logica (voor non-Wasstrips orders)
    if (order.payment_status === 'pending') {
      return { 
        text: 'Betaling open', 
        color: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-300', 
        icon: '💳', 
        urgent: true,
        pulse: true,
        description: 'Betaling in afwachting'
      };
    }
    if (order.payment_status === 'paid' && order.fulfillment_status === 'processing') {
      return { 
        text: 'Wordt voorbereid', 
        color: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300', 
        icon: '⚡', 
        urgent: false,
        pulse: true,
        description: 'Bestelling wordt voorbereid'
      };
    }
    if (order.fulfillment_status === 'shipped') {
      return { 
        text: 'Onderweg', 
        color: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300', 
        icon: '🚚', 
        urgent: false,
        pulse: false,
        description: 'Bestelling onderweg'
      };
    }
    if (order.fulfillment_status === 'delivered') {
      return { 
        text: 'Afgeleverd', 
        color: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300', 
        icon: '✅', 
        urgent: false,
        pulse: false,
        description: 'Bestelling afgeleverd'
      };
    }
    return { 
      text: 'In behandeling', 
      color: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300', 
      icon: '📋', 
      urgent: false,
      pulse: false,
      description: 'Bestelling in behandeling'
    };
  };

  const status = getStatusInfo();

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${status.color} ${
        status.urgent ? 'ring-2 ring-amber-200 shadow-lg' : 'shadow-sm'
      } ${status.pulse ? 'animate-pulse' : ''} transition-all duration-300 hover:scale-105`}>
        <span className="mr-1.5 text-sm">{status.icon}</span>
        {status.text}
      </span>
      {status.description && (
        <span className="text-xs text-gray-600 px-2">
          {status.description}
        </span>
      )}
    </div>
  );
};

// Professionele Track & Trace Component met animaties
const CompactTrackingInfo = ({ order }: { order: SupabaseOrder }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!order.tracking_code) return null;

  const getCarrierInfo = () => {
    const code = order.tracking_code;
    if (code?.startsWith('3S')) {
      return { 
        name: 'PostNL', 
        url: `https://postnl.nl/tracktrace/?B=${code}&P=1015CW&D=NL&T=C`, 
        logo: '📮',
        color: 'from-orange-50 to-orange-100 border-orange-200'
      };
    }
    if (code?.includes('DHL')) {
      return { 
        name: 'DHL', 
        url: `https://www.dhl.com/nl-nl/home/tracking.html?tracking-id=${code}`, 
        logo: '📦',
        color: 'from-yellow-50 to-yellow-100 border-yellow-200'
      };
    }
    return { 
      name: 'Vervoerder', 
      url: '#', 
      logo: '🚚',
      color: 'from-blue-50 to-blue-100 border-blue-200'
    };
  };

  const carrier = getCarrierInfo();

  return (
    <div 
      className={`mt-3 p-3 bg-gradient-to-r ${carrier.color} rounded-lg border transition-all duration-300 hover:shadow-md ${
        isHovered ? 'scale-102' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{carrier.logo}</span>
            <p className="text-xs font-semibold text-gray-700">Track & Trace Actief</p>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-ping"></div>
              <div className="w-1 h-1 bg-green-500 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1 h-1 bg-green-500 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-mono bg-white/60 px-2 py-1 rounded">
            {order.tracking_code}
          </p>
        </div>
        <a
          href={carrier.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md flex items-center gap-1"
          title={`Volg bij ${carrier.name}`}
        >
          <span>{carrier.logo}</span>
          <span className="font-medium">Volg</span>
        </a>
      </div>
    </div>
  );
};

// Uitgebreide Order Detail Modal met professionele timeline
const OrderDetailModalWithTimeline = ({ order, onClose, onPayNow, stripePaymentMethods = {} }: {
  order: SupabaseOrder;
  onClose: () => void;
  onPayNow: (order: SupabaseOrder) => void;
  stripePaymentMethods?: Record<string, any>;
}) => {
  const getStatusSteps = () => {
    const currentStep = order.metadata?.current_step;
    const depositStatus = order.metadata?.deposit_status;
    const remainingPaymentStatus = order.metadata?.remaining_payment_status;
    const paymentOptionsSent = order.metadata?.payment_options_sent;
    const paymentMethodSelected = order.metadata?.payment_method_selected;
    
    // Wasstrips-specifieke timeline
    if (currentStep) {
      const steps = [
        {
          id: 'order_placed',
          title: 'Bestelling Geplaatst',
          description: 'Uw wasstrips aanmelding is ontvangen en goedgekeurd',
          completed: true,
          current: false,
          icon: '📋',
          color: 'text-green-600 bg-green-100'
        },
        {
          id: 'deposit_payment',
          title: 'Stap 1: Aanbetaling (€30)',
          description: depositStatus === 'paid' ? 'Aanbetaling succesvol ontvangen' : 'Betaal de aanbetaling om uw bestelling te activeren',
          completed: depositStatus === 'paid',
          current: currentStep === 'deposit',
          icon: '💳',
          color: depositStatus === 'paid' ? 'text-green-600 bg-green-100' : 'text-amber-600 bg-amber-100'
        },
        {
          id: 'remaining_payment',
          title: 'Stap 2: Restbedrag (€270)',
          description: remainingPaymentStatus === 'paid' 
            ? 'Restbedrag succesvol betaald' 
            : 'Betaal het restbedrag zodra wij aangeven dat uw bestelling binnen is',
          completed: remainingPaymentStatus === 'paid',
          current: currentStep === 'remaining',
          icon: '💰',
          color: remainingPaymentStatus === 'paid' ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'
        },
        {
          id: 'delivery_choice',
          title: 'Stap 3: Kies Betaalwijze',
          description: paymentMethodSelected 
            ? `Betaalwijze gekozen: ${paymentMethodSelected === 'direct' ? 'Direct betalen' : 'Betalen op rekening'}`
            : 'Kies hoe u wilt betalen voor levering: direct of op rekening',
          completed: !!paymentMethodSelected,
          current: currentStep === 'delivery',
          icon: '⚙️',
          color: paymentMethodSelected ? 'text-green-600 bg-green-100' : 'text-purple-600 bg-purple-100'
        },
        {
          id: 'preparation',
          title: 'Bestelling Voorbereiden',
          description: 'Wasgeurtje bereidt uw zending zorgvuldig voor',
          completed: order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered',
          current: currentStep === 'completed' && order.fulfillment_status === 'processing',
          icon: '⚡',
          color: (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered') ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'
        },
        {
          id: 'shipped',
          title: 'Verzonden',
          description: order.tracking_code ? `Uw pakket is onderweg! Track & Trace: ${order.tracking_code}` : 'Uw zending is onderweg naar u',
          completed: order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered',
          current: order.fulfillment_status === 'shipped',
          icon: '🚚',
          color: (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered') ? 'text-green-600 bg-green-100' : 'text-gray-400 bg-gray-100'
        }
      ];
      
      return steps;
    }

    // Standaard timeline voor gewone orders
    const steps = [
      {
        id: 'order_placed',
        title: 'Bestelling Geplaatst',
        description: 'Uw bestelling is ontvangen en geregistreerd',
        completed: true,
        current: false,
        icon: '📋',
        color: 'text-green-600 bg-green-100'
      },
      {
        id: 'payment_completed',
        title: 'Betaling Voltooid',
        description: order.payment_status === 'paid' ? 'Betaling succesvol ontvangen en verwerkt' : 'Wachtend op uw betaling',
        completed: order.payment_status === 'paid',
        current: order.payment_status === 'pending',
        icon: '💳',
        color: order.payment_status === 'paid' ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'
      },
      {
        id: 'preparation',
        title: 'Bestelling Voorbereiden',
        description: 'Wasgeurtje bereidt uw zending zorgvuldig voor',
        completed: order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered',
        current: order.payment_status === 'paid' && order.fulfillment_status === 'processing',
        icon: '⚡',
        color: (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered') ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'
      },
      {
        id: 'shipped',
        title: 'Verzonden',
        description: order.tracking_code ? `Uw pakket is onderweg! Track & Trace: ${order.tracking_code}` : 'Uw zending is onderweg naar u',
        completed: order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered',
        current: order.fulfillment_status === 'shipped',
        icon: '🚚',
        color: (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered') ? 'text-green-600 bg-green-100' : 'text-gray-400 bg-gray-100'
      },
      {
        id: 'delivered',
        title: 'Afgeleverd',
        description: order.metadata?.order_type === 'wasstrips' 
          ? 'Uw wasstrips pakket is succesvol afgeleverd' 
          : 'Uw bestelling is succesvol afgeleverd',
        completed: order.fulfillment_status === 'delivered',
        current: false,
        icon: '✅',
        color: order.fulfillment_status === 'delivered' ? 'text-green-600 bg-green-100' : 'text-gray-400 bg-gray-100'
      }
    ];

    return steps;
  };

  const steps = getStatusSteps();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-10 mx-auto p-0 border-0 w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-2xl rounded-2xl bg-white animate-in slide-in-from-bottom-4 duration-300">
        {/* Header met gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Bestelling {order.order_number}</h3>
              <p className="text-blue-100 text-sm mt-1">Volledige status en tracking informatie</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-light transition-colors hover:rotate-90 transform duration-200"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Order Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border">
              <p className="text-sm text-gray-600 mb-1">Besteldatum</p>
              <p className="font-semibold text-gray-900">
                {new Date(order.created_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Totaalbedrag</p>
              <p className="font-bold text-xl text-green-700">€{order.total_amount.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <OrderStatusBadge order={order} />
            </div>
            {(() => {
              const paymentInfo = getPaymentMethodDisplayInfo(order, stripePaymentMethods);
              return (
                <div className={`bg-gradient-to-br ${paymentInfo.color} p-4 rounded-xl border`}>
                  <p className="text-sm text-gray-600 mb-1">Betaalmethode</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{paymentInfo.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{paymentInfo.name}</p>
                      <p className="text-xs text-gray-600">{paymentInfo.description}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Professional Timeline */}
          <div className="mb-8">
            <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Bestelling Voortgang
            </h4>
            <div className="relative">
              {steps.map((step, index) => (
                <div key={step.id} className="relative flex items-start mb-8 last:mb-0">
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className={`absolute left-6 top-12 w-0.5 h-16 transition-all duration-500 ${
                      step.completed ? 'bg-gradient-to-b from-green-400 to-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                  
                  {/* Icon Circle */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold border-2 transition-all duration-300 ${
                    step.completed 
                      ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-300 text-green-700 shadow-lg' 
                      : step.current 
                      ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 text-blue-700 animate-pulse shadow-lg ring-4 ring-blue-100' 
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {step.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="ml-6 flex-1">
                    <h5 className={`text-base font-semibold mb-1 transition-colors duration-300 ${
                      step.completed ? 'text-green-900' : step.current ? 'text-blue-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </h5>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                      step.completed ? 'text-green-700' : step.current ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                    
                    {/* Current step extra info */}
                    {step.current && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 animate-in slide-in-from-left duration-300">
                        <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                          {step.id === 'payment_completed' && (
                            <>
                              <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                              💡 Klik op "Betaal Nu" om uw bestelling te activeren
                            </>
                          )}
                          {step.id === 'preparation' && (
                            <>
                              <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                              ⏱️ Verwachte voorbereidingstijd: 1-2 werkdagen
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Track & Trace Section */}
          {order.tracking_code && (
            <div className="mb-8 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
              <h4 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-ping"></span>
                Track & Trace Actief
              </h4>
              <CompactTrackingInfo order={order} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              Sluiten
            </button>
            {/* Toon actie knop voor pending betalingen of delivery stap keuze */}
            {(order.payment_status === 'pending' || order.metadata?.current_step === 'delivery') && (
              <button
                onClick={() => onPayNow(order)}
                className={`px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 ${
                  order.metadata?.current_step === 'delivery' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                }`}
              >
                <span className="text-lg">
                  {order.metadata?.current_step === 'delivery' ? '⚙️' : '💳'}
                </span>
                {order.metadata?.current_step === 'delivery' ? 'Kies Betaalwijze' : 'Betaal Nu'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Professionele Order List Item met hover effecten
const OrderListItem = ({ order, onPayNow, onViewDetails, onDownloadInvoice, stripePaymentMethods = {} }: {
  order: SupabaseOrder;
  onPayNow: (order: SupabaseOrder) => void;
  onViewDetails: (order: SupabaseOrder) => void;
  onDownloadInvoice: (order: SupabaseOrder) => void;
  stripePaymentMethods?: Record<string, any>;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-xl p-5 transition-all duration-300 cursor-pointer ${
        isHovered ? 'shadow-xl border-blue-300 transform scale-102' : 'shadow-sm hover:shadow-lg'
      } ${order.payment_status === 'pending' ? 'ring-2 ring-amber-200' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">{order.order_number}</h3>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            {new Date(order.created_at).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-xl text-gray-900">€{order.total_amount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            {order.metadata?.current_step ? (
              order.metadata.current_step === 'deposit' ? `€${order.metadata.current_payment_amount || 30} nu te betalen` :
              order.metadata.current_step === 'waiting_for_admin' ? 'Aanbetaling ontvangen ✓' :
              order.metadata.current_step === 'remaining' ? `€${order.metadata.current_payment_amount || 270} nu te betalen` :
              order.metadata.current_step === 'delivery' ? 'Kies betaalwijze' :
              'Volledig afgehandeld'
            ) : (
              `${order.items?.reduce((total, item) => total + item.quantity, 0) || 1} item(s)`
            )}
          </p>
        </div>
      </div>

      {/* Wasstrips Product Info */}
      {order.metadata?.current_step && (
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🧴</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-lg">Wasstrips Starterpakket</h4>
              <p className="text-sm text-gray-600">Exclusieve wasstrips collectie voor retailers</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Totale waarde</p>
              <p className="font-bold text-lg text-gray-900">€300.00</p>
            </div>
          </div>
          
          {/* Betalingsstappen Info */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Betalingsstappen:</span>
              <span className="text-xs text-gray-500">
                {order.metadata.current_step === 'deposit' ? 'Stap 1 van 3' : 
                 order.metadata.current_step === 'waiting_for_admin' ? 'Stap 1 ✓ - Wachten op stap 2' : 
                 order.metadata.current_step === 'remaining' ? 'Stap 2 van 3' : 
                 order.metadata.current_step === 'delivery' ? 'Stap 3 van 3' : 'Afgerond'}
              </span>
            </div>
            
            <div className="space-y-2">
              {/* Stap 1 */}
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  order.metadata.deposit_status === 'paid' ? 'bg-green-100 text-green-600' : 
                  order.metadata.current_step === 'deposit' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {order.metadata.deposit_status === 'paid' ? '✓' : '1'}
                </div>
                <span className={`text-sm ${
                  order.metadata.deposit_status === 'paid' ? 'text-green-600 font-medium' : 
                  order.metadata.current_step === 'deposit' ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  Aanbetaling €30 {order.metadata.deposit_status === 'paid' ? '(Betaald)' : ''}
                </span>
              </div>
              
              {/* Stap 2 */}
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  order.metadata.remaining_payment_status === 'paid' ? 'bg-green-100 text-green-600' : 
                  order.metadata.current_step === 'remaining' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {order.metadata.remaining_payment_status === 'paid' ? '✓' : '2'}
                </div>
                <span className={`text-sm ${
                  order.metadata.remaining_payment_status === 'paid' ? 'text-green-600 font-medium' : 
                  order.metadata.current_step === 'remaining' ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  Restbedrag €270 {order.metadata.remaining_payment_status === 'paid' ? '(Betaald)' : ''}
                </span>
              </div>
              
              {/* Stap 3 */}
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  order.metadata.payment_method_selected ? 'bg-green-100 text-green-600' : 
                  order.metadata.current_step === 'delivery' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {order.metadata.payment_method_selected ? '✓' : '3'}
                </div>
                <span className={`text-sm ${
                  order.metadata.payment_method_selected ? 'text-green-600 font-medium' : 
                  order.metadata.current_step === 'delivery' ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  Betaalwijze kiezen {order.metadata.payment_method_selected ? `(${order.metadata.payment_method_selected === 'direct' ? 'Direct' : 'Factuur'})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-4">
        <OrderStatusBadge order={order} />
      </div>

      {/* Track & Trace (compact) */}
      <CompactTrackingInfo order={order} />

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        {(() => {
          const currentStep = order.metadata?.current_step;
          
          // Voor Wasstrips orders met specifieke stappen
          if (currentStep) {
            if (currentStep === 'deposit' || currentStep === 'remaining') {
              // Stap 1 & 2: Toon betaalknop
              return (
                <button
                  onClick={() => onPayNow(order)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span className="text-base">💳</span>
                  {currentStep === 'deposit' ? 'Betaal Aanbetaling' : 'Betaal Restbedrag'}
                </button>
              );
            } else if (currentStep === 'waiting_for_admin') {
              // Tussentoestand: Toon wachtmelding
              return (
                <button
                  onClick={() => onViewDetails(order)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span className="text-base">⏳</span>
                  Bestelling Wordt Voorbereid
                </button>
              );
            } else if (currentStep === 'delivery') {
              // Stap 3: Toon keuze knop - gebruik onPayNow voor correcte navigatie
              return (
                <button
                  onClick={() => onPayNow(order)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span className="text-base">⚙️</span>
                  Kies Betaalwijze
                </button>
              );
            } else {
              // Stap 4+: Toon details knop
              return (
                <button
                  onClick={() => onViewDetails(order)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span className="text-base">👁️</span>
                  Details
                </button>
              );
            }
          }
          
          // Voor gewone orders: oorspronkelijke logica
          if (order.payment_status === 'pending') {
            return (
              <button
                onClick={() => onPayNow(order)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <span className="text-base">💳</span>
                Betaal Nu
              </button>
            );
          } else {
            return (
              <button
                onClick={() => onViewDetails(order)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <span className="text-base">👁️</span>
                Details
              </button>
            );
          }
        })()}
        
        <button
          onClick={() => onDownloadInvoice(order)}
          className="px-4 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 text-sm rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105"
          title="Download factuur"
        >
          📄
        </button>
      </div>
    </div>
  );
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SupabaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<SupabaseOrder | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'wasstrips' | 'catalog'>('all');
  const [stripePaymentMethods, setStripePaymentMethods] = useState<Record<string, any>>({});

  // Mock functie voor backward compatibility
  const loadWasstripsApplications = useCallback(() => {
    console.log('[Frontend] loadWasstripsApplications called (mock function)');
  }, []);

  // Functie om Stripe payment methods op te halen voor orders met session IDs
  const loadStripePaymentMethods = useCallback(async (orders: SupabaseOrder[]) => {
    const ordersWithStripeSession = orders.filter(order => order.stripe_session_id);
    
    if (ordersWithStripeSession.length === 0) {
      return;
    }
    
    console.log('[Frontend] Loading Stripe payment methods for', ordersWithStripeSession.length, 'orders');
    
    const paymentMethodPromises = ordersWithStripeSession.map(async (order) => {
      try {
        const response = await fetch(`/api/stripe/get-payment-method?session_id=${order.stripe_session_id}`);
        if (response.ok) {
          const data = await response.json();
          return {
            sessionId: order.stripe_session_id,
            data: data
          };
        }
      } catch (error) {
        console.warn('[Frontend] Failed to load payment method for session:', order.stripe_session_id, error);
      }
      return null;
    });
    
    const results = await Promise.all(paymentMethodPromises);
    const paymentMethodsMap: Record<string, any> = {};
    
    results.forEach(result => {
      if (result && result.sessionId) {
        paymentMethodsMap[result.sessionId] = result.data;
      }
    });
    
    console.log('[Frontend] Loaded payment methods for', Object.keys(paymentMethodsMap).length, 'orders');
    setStripePaymentMethods(paymentMethodsMap);
  }, []);

  // Laad echte orders uit Supabase
  const loadRealOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[Frontend] Fetching wasstrips orders from Supabase...');
      
      // Controleer of user.email bestaat
      if (!user?.email) {
        console.warn('[Frontend] No user email found');
        setOrders([]);
        setIsLoading(false);
        return;
      }
      
      // Cache buster om nieuwe data te forceren
      const timestamp = Date.now();
      console.log('[Frontend] Cache buster timestamp:', timestamp);
      
      const result = await getAllOrdersForRetailer(user.email);
      console.log('[Frontend] Found all orders result:', result);
      
      // Extract orders from result
      const allOrders = result.orders || [];
      console.log('[Frontend] Extracted orders:', allOrders);
      
      // Debug: log each order's total_amount and payment_status
      allOrders.forEach((order: SupabaseOrder, index: number) => {
        console.log(`[Frontend] Order ${index + 1} (${order.order_number}):`, {
          total_amount: order.total_amount,
          payment_status: order.payment_status,
          fulfillment_status: order.fulfillment_status,
          tracking_code: order.tracking_code,
          metadata: order.metadata,
          order_type: order.metadata?.order_type || 'wasstrips'
        });
      });
      
      // Zet orders in state
      setOrders(allOrders);
      
      // Laad Stripe payment methods voor orders met session IDs
      await loadStripePaymentMethods(allOrders);
      
      setIsLoading(false);
        } catch (error) {
      console.error('[Frontend] Error loading wasstrips orders:', error);
      // Fallback naar lege array bij fout
      setOrders([]);
      setIsLoading(false);
    }
  }, [user?.email]);

  // useEffect voor data loading - nu met echte Supabase data
  useEffect(() => {
    if (!user) return;
    
    console.log('[Frontend] useEffect triggered, user:', user.email);
    loadRealOrders();
  }, [user, loadRealOrders]);

  // Auto-refresh elke 30 seconden
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      console.log('[Frontend] Auto-refresh triggered');
      loadRealOrders();
    }, 30000); // 30 seconden
    
    return () => clearInterval(interval);
  }, [user, loadRealOrders]);

  // Manual refresh met visuele feedback
  const handleForceRefresh = async () => {
    console.log('[Frontend] Force refresh triggered by user');
    setIsLoading(true);
    await loadRealOrders();
    // Korte vertraging voor visuele feedback
    setTimeout(() => setIsLoading(false), 500);
  };

  // Functie om wasstrips orders te identificeren
  const isWasstripsOrder = (order: SupabaseOrder) => {
    // Wasstrips orders hebben een wasstrips_application_id in metadata
    return order.metadata?.wasstrips_application_id || 
           order.order_number?.startsWith('WS-') || 
           order.metadata?.order_type === 'wasstrips';
  };

  // Filter orders based on selected tab and filter
  const filteredOrders = orders.filter(order => {
    // Filter eerst op tab
    if (activeTab === 'wasstrips' && !isWasstripsOrder(order)) {
      return false;
    }
    if (activeTab === 'catalog' && isWasstripsOrder(order)) {
      return false;
    }
    
    // Dan filter op status
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return order.payment_status === 'pending';
    if (filterStatus === 'paid') return order.payment_status === 'paid';
    if (filterStatus === 'shipped') return order.fulfillment_status === 'shipped';
    return true;
  });

  // Bereken counts voor tabs
  const wasstripsCount = orders.filter(isWasstripsOrder).length;
  const catalogCount = orders.length - wasstripsCount;

  // Betaalfunctie voor openstaande bestellingen
  const handlePayNow = async (order: SupabaseOrder) => {
    try {
      console.log('[Frontend] Initiating payment for order:', order.id, 'amount:', order.total_amount);
      
      // Check voor Wasstrips orders
      const currentStep = order.metadata?.current_step;
      const wasstripsApplicationId = order.metadata?.wasstrips_application_id;
      
      if (currentStep && wasstripsApplicationId) {
        console.log('[Frontend] Handling Wasstrips payment - Step:', currentStep);
        
        // Voor Wasstrips stap 3 (delivery): redirecteer naar betaalwijze keuze
        if (currentStep === 'delivery') {
          console.log('[Frontend] Redirecting to payment options for delivery step');
          window.location.href = `/retailer-dashboard/payment-options/${wasstripsApplicationId}`;
          return;
        }
        
        // Voor tussentoestand (wachten op admin): geen actie mogelijk
        if (currentStep === 'waiting_for_admin') {
          alert('Uw aanbetaling is ontvangen! Wij bereiden uw bestelling voor en sturen u binnenkort de restbetaling.');
          return;
        }
        
        // Voor Wasstrips stappen 1 & 2: gebruik wasstrips payment endpoint
        if (currentStep === 'deposit' || currentStep === 'remaining') {
          const paymentType = currentStep === 'deposit' ? 'deposit' : 'remaining';
          const paymentLinkId = currentStep === 'deposit' 
            ? order.metadata?.deposit_payment_link 
            : order.metadata?.remaining_payment_link;
          
          if (!paymentLinkId) {
            console.error('[Frontend] No payment link found for step:', currentStep);
            alert('Fout: Betaallink niet gevonden. Contacteer de klantenservice.');
            return;
          }
          
          console.log('[Frontend] Redirecting to wasstrips payment:', {
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
      console.log('[Frontend] Handling standard order payment');
      
      // Valideer order data
      if (!order.total_amount || order.total_amount <= 0) {
        console.error('[Frontend] Invalid order amount:', order.total_amount);
        alert('Fout: Ongeldig orderbedrag. Kan betaling niet starten.');
        return;
      }
      
      // Check test mode from localStorage (zoals in werkende wasstrips code)
      const savedTestMode = localStorage.getItem('STRIPE_TEST_MODE');
      const isTestMode = savedTestMode !== 'false'; // Default to test mode unless explicitly set to false
      
      console.log('[Frontend] Using test mode:', isTestMode);
      
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
      
      console.log('[Frontend] Prepared stripe order:', stripeOrder);
      
      // Sla de order op in localStorage voor gebruik door Stripe
      localStorage.setItem('stripeOrder', JSON.stringify(stripeOrder));
      
      // Bereid API request voor (inclusief isTestMode zoals in werkende code)
      const requestBody = {
        items: stripeOrder.items,
        orderId: order.id,
        amount: order.total_amount,
        isTestMode: isTestMode
      };
      
      console.log('[Frontend] API request body:', requestBody);
      
      // Start Stripe checkout via API
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[Frontend] API response status:', response.status);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] API response not ok:', response.status, errorText);
        alert(`API fout: ${response.status} - ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('[Frontend] API response data:', data);
      
      if (data.success && data.url) {
        console.log('[Frontend] Redirecting to Stripe checkout:', data.url);
        // Redirect naar Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('[Frontend] Stripe checkout failed:', data);
        const errorMessage = data.error || 'Onbekende fout bij het voorbereiden van de betaling';
        alert(`Er is een fout opgetreden: ${errorMessage}`);
      }
    } catch (error) {
      console.error('[Frontend] Payment initiation error:', error);
      alert(`Er is een fout opgetreden bij het voorbereiden van de betaling: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  // Order detail modal openen
  const handleOrderClick = (order: SupabaseOrder) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  // Factuur download functie (voorbereiding)
  const handleDownloadInvoice = async (order: SupabaseOrder) => {
    try {
      console.log('[Frontend] Preparing invoice download for order:', order.order_number);
      
      // TODO: Implementeer echte factuur download
      // Voor nu tonen we een placeholder
      alert(`Factuur download wordt voorbereid voor bestelling ${order.order_number}.\n\nDeze functionaliteit wordt binnenkort beschikbaar gemaakt.`);
      
      // Toekomstige implementatie:
      // const response = await fetch(`/api/orders/${order.id}/invoice`);
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `factuur-${order.order_number}.pdf`;
      // a.click();
      
    } catch (error) {
      console.error('[Frontend] Error preparing invoice download:', error);
      alert('Er is een fout opgetreden bij het voorbereiden van de factuur download.');
    }
  };

  if (isLoading) {
        return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-ping mx-auto"></div>
              </div>
              <p className="text-gray-600 font-medium">Orders laden...</p>
              <p className="text-sm text-gray-500 mt-1">Even geduld, we halen uw bestellingen op</p>
          </div>
              </div>
            </div>
          </div>
        );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header met gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
            <h1 className="text-4xl font-bold mb-2">Mijn Bestellingen</h1>
            <p className="text-blue-100 text-lg">Volg de status van uw wasstrips bestellingen in realtime</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              <span className="text-sm text-blue-100">Live status updates</span>
            </div>
            </div>
              </div>

        {/* Tabs en Filters met verbeterde styling */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <div className="flex justify-between items-center">
              <nav className="flex space-x-1">
          <button
            onClick={() => setActiveTab('all')}
                  className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Alle Bestellingen ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('wasstrips')}
                  className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'wasstrips'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  💎 Wasstrips ({wasstripsCount})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
                  className={`py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'catalog'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  📦 Catalog ({catalogCount})
          </button>
        </nav>

              {/* Status Filter met verbeterde styling */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-600">Filter:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">Alle ({orders.length})</option>
                  <option value="pending">💳 Betaling open ({orders.filter(o => o.payment_status === 'pending').length})</option>
                  <option value="paid">✅ Betaald ({orders.filter(o => o.payment_status === 'paid').length})</option>
                  <option value="shipped">🚚 Verzonden ({orders.filter(o => o.fulfillment_status === 'shipped').length})</option>
                </select>
                
                {/* Refresh Button */}
                                <button
                  onClick={handleForceRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ververs bestellingen"
                >
                  <svg 
                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  <span className="ml-1 hidden sm:block">Ververs</span>
                </button>
                </div>
              </div>
            </div>
          </div>

        {/* Content */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-32 w-32 text-gray-300 mb-6">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
            </svg>
          </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {orders.length === 0 ? 'Nog geen bestellingen' : 'Geen bestellingen gevonden'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              {orders.length === 0 
                ? 'U heeft nog geen wasstrips bestellingen geplaatst. Start vandaag nog met het uitbreiden van uw assortiment!'
                : 'Er zijn geen bestellingen die voldoen aan de geselecteerde filter.'
              }
            </p>
            {orders.length === 0 && (
              <Link
                href="/retailer-dashboard/wasstrips"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="mr-3 text-xl">🛒</span>
                Plaats Uw Eerste Bestelling
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onPayNow={handlePayNow}
                onViewDetails={handleOrderClick}
                onDownloadInvoice={handleDownloadInvoice}
                stripePaymentMethods={stripePaymentMethods}
              />
            ))}
      </div>
      )}
      
        {/* Order Detail Modal */}
        {isOrderDetailOpen && selectedOrder && (
          <OrderDetailModalWithTimeline
            order={selectedOrder}
            onClose={() => {
              setIsOrderDetailOpen(false);
              setSelectedOrder(null);
            }}
            onPayNow={handlePayNow}
            stripePaymentMethods={stripePaymentMethods}
          />
        )}
      </div>
    </div>
  );
} 