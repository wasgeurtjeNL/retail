// Stripe Payment Monitoring Library
// Gebaseerd op Stripe Payments Intents API

import { Stripe, loadStripe } from '@stripe/stripe-js';
import { getStripeInstance } from './stripe-server';

// Stripe keys uit environment variabelen
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Gebruik de bestaande stripePromise
let stripePromise: Promise<Stripe | null> | null = null;

// Types
export type PaymentStatus = 'processing' | 'requires_payment_method' | 'requires_confirmation' | 
                           'requires_action' | 'succeeded' | 'canceled' | 'failed' | 'pending' | 
                           'paid' | 'expired';

export interface PaymentIntent {
  id: string;
  client_secret?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  next_action?: {
    type: string;
    redirect_to_url?: {
      url: string;
      return_url: string;
    }
  };
  last_payment_error?: {
    message: string;
  };
}

export interface Order {
  id: string;
  paymentIntentId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: 'invoice' | 'stripe' | 'ideal';
  totalAmount: number;
  // Andere ordervelden...
}

// Initialiseer Stripe-client voor browser gebruik
export const getStripe = async (): Promise<Stripe | null> => {
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.error('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY is not configured');
    return null;
  }
  
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Haal een PaymentIntent op met de client secret
 */
export const retrievePaymentIntent = async (clientSecret: string): Promise<PaymentIntent | { error: string }> => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return { error: 'Stripe kon niet worden geïnitialiseerd' };
    }

    const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
    
    if (error) {
      console.error('Error retrieving payment intent:', error);
      return { error: error.message || 'Onbekende fout bij ophalen payment intent' };
    }
    
    if (!paymentIntent) {
      return { error: 'Geen PaymentIntent ontvangen van Stripe' };
    }
    
    return paymentIntent as PaymentIntent;
  } catch (error) {
    console.error('Error in retrievePaymentIntent:', error);
    return { error: error instanceof Error ? error.message : 'Onbekende fout bij ophalen PaymentIntent' };
  }
};

/**
 * Bevestig een card payment (voor client-side)
 */
export const confirmCardPayment = async (
  clientSecret: string,
  paymentMethod: { id?: string } = {}
): Promise<{ paymentIntent?: PaymentIntent; error?: string }> => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return { error: 'Stripe kon niet worden geïnitialiseerd' };
    }

    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod.id ? paymentMethod.id : undefined,
    });

    if (error) {
      console.error('Error confirming card payment:', error);
      return { error: error.message || 'Onbekende fout bij bevestigen betaling' };
    }

    return { paymentIntent: paymentIntent as PaymentIntent };
  } catch (error) {
    console.error('Error in confirmCardPayment:', error);
    return { error: error instanceof Error ? error.message : 'Onbekende fout bij bevestigen betaling' };
  }
};

/**
 * Converteer een Stripe PaymentIntent status naar onze lokale PaymentStatus
 */
export const mapStripeStatusToPaymentStatus = (stripeStatus: string): PaymentStatus => {
  switch (stripeStatus) {
    case 'succeeded':
      return 'paid';
    case 'processing':
      return 'processing';
    case 'requires_payment_method':
      return 'requires_payment_method';
    case 'requires_action':
      return 'requires_action';
    case 'canceled':
      return 'canceled';
    default:
      return 'pending';
  }
};

/**
 * Update een order's betaalstatus op basis van Stripe status
 */
export const updateOrderPaymentStatus = (
  order: Order,
  paymentStatus: PaymentStatus
): Order => {
  return {
    ...order,
    paymentStatus,
  };
};

/**
 * Server-side PaymentIntent aanmaken
 * Dit moet worden aangeroepen vanuit een API route
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'eur',
  metadata: Record<string, string> = {},
  secret_key?: string
): Promise<{ paymentIntent?: PaymentIntent; error?: string }> => {
  try {
    const stripe = getStripeInstance(secret_key);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      payment_method_types: ['card', 'ideal'],
    });
    
    return { paymentIntent: paymentIntent as unknown as PaymentIntent };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return { error: error instanceof Error ? error.message : 'Onbekende fout bij aanmaken PaymentIntent' };
  }
};

/**
 * Server-side webhooks verwerken
 * Dit moet worden aangeroepen vanuit de webhook API route
 */
export const handleWebhookEvent = async (
  body: string,
  signature: string,
  secret?: string
): Promise<{ event?: any; error?: string }> => {
  try {
    const webhookSecret = secret || STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      return { error: 'STRIPE_WEBHOOK_SECRET is not configured' };
    }
    
    const stripe = getStripeInstance();
    
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    
    return { event };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return { error: error instanceof Error ? error.message : 'Ongeldige webhook signature' };
  }
};

/**
 * Sla betalingsgegevens lokaal op voor gebruik in de browser
 */
export const savePaymentInfoToLocalStorage = (
  orderId: string,
  paymentIntentId: string,
  paymentStatus: PaymentStatus,
  clientSecret?: string
): void => {
  try {
    // Haal bestaande payment info op
    const paymentInfoString = localStorage.getItem('paymentInfo');
    let paymentInfo: Record<string, any> = {};
    
    if (paymentInfoString) {
      paymentInfo = JSON.parse(paymentInfoString);
    }
    
    // Update payment info voor deze order
    paymentInfo[orderId] = {
      paymentIntentId,
      paymentStatus,
      clientSecret,
      lastUpdated: new Date().toISOString(),
    };
    
    // Opslaan in localStorage
    localStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
  } catch (error) {
    console.error('Error saving payment info to localStorage:', error);
  }
};

/**
 * Haal betalingsgegevens op uit localStorage
 */
export const getPaymentInfoFromLocalStorage = (orderId: string): {
  paymentIntentId?: string;
  paymentStatus?: PaymentStatus;
  clientSecret?: string;
  lastUpdated?: string;
} | null => {
  try {
    const paymentInfoString = localStorage.getItem('paymentInfo');
    
    if (!paymentInfoString) {
      return null;
    }
    
    const paymentInfo = JSON.parse(paymentInfoString);
    return paymentInfo[orderId] || null;
  } catch (error) {
    console.error('Error retrieving payment info from localStorage:', error);
    return null;
  }
};

/**
 * Update de betaalstatus van een order in localStorage
 */
export const updateOrderStatusInLocalStorage = (orderId: string): void => {
  try {
    // Check if we have saved payment info for this order
    const paymentInfo = getPaymentInfoFromLocalStorage(orderId);
    if (!paymentInfo || !paymentInfo.clientSecret) {
      return;
    }
    
    // Haal de bestelling op
    const orderString = localStorage.getItem('lastOrder');
    if (!orderString) {
      return;
    }
    
    const order = JSON.parse(orderString);
    
    // Bevestig de betaling en update de status
    retrievePaymentIntent(paymentInfo.clientSecret)
      .then((result) => {
        if ('error' in result) {
          console.error('Error retrieving payment intent:', result.error);
          return;
        }
        
        const paymentIntent = result as PaymentIntent;
        const paymentStatus = mapStripeStatusToPaymentStatus(paymentIntent.status);
        
        // Update order with payment status
        const updatedOrder = updateOrderPaymentStatus(order, paymentStatus);
        localStorage.setItem('lastOrder', JSON.stringify(updatedOrder));
        
        // Update payment info
        savePaymentInfoToLocalStorage(
          orderId,
          paymentIntent.id,
          paymentStatus,
          paymentInfo.clientSecret
        );
      })
      .catch((error) => {
        console.error('Error updating payment status:', error);
      });
  } catch (error) {
    console.error('Error updating order status in localStorage:', error);
  }
};

/**
 * Proces voor het bijwerken van de betaalstatus vanuit de checkout pagina
 */
export const checkPaymentStatus = async (
  sessionId: string | null,
  order: Order
): Promise<Order> => {
  if (!sessionId) {
    return order;
  }
  
  try {
    // Controleren of we betaalgegevens hebben opgeslagen voor deze bestelling
    const paymentInfo = getPaymentInfoFromLocalStorage(order.id);
    
    // Als we clientSecret hebben, gebruik dat om de betaling te controleren
    if (paymentInfo?.clientSecret) {
      const result = await retrievePaymentIntent(paymentInfo.clientSecret);
      
      if ('error' in result) {
        console.error('Error retrieving payment intent:', result.error);
        return order;
      }
      
      const paymentIntent = result as PaymentIntent;
      const paymentStatus = mapStripeStatusToPaymentStatus(paymentIntent.status);
      
      // Update betaalstatus in localStorage
      savePaymentInfoToLocalStorage(
        order.id,
        paymentIntent.id,
        paymentStatus,
        paymentInfo.clientSecret
      );
      
      // Return bijgewerkte bestelling
      return {
        ...order,
        paymentStatus: paymentStatus,
        paymentIntentId: paymentIntent.id
      };
    }
    
    // Als we geen client secret hebben, maar wel een sessionId, dan is het waarschijnlijk een succesvolle betaling
    if (sessionId) {
      // Update paymentStatus naar 'paid'
      return {
        ...order,
        paymentStatus: 'paid'
      };
    }
    
    return order;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return order;
  }
};
