import { Stripe, loadStripe } from '@stripe/stripe-js';
import { stripe as serverStripe } from './stripe-server';

// Hardcoded test key for development
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51LmLUMJtFvAJ7sDPKPYFmeytjnl4plJADipNJqdTvzv4mgjMdnuNKbsLUUhVw7kTmCF1w1LxmsDfNw4MzDswYYue00yPdbie2B';

// Store the Stripe promise globally
let stripePromise: Promise<Stripe | null> | null = null;

// Get or initialize Stripe
export const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Types
export interface StripeLineItem {
  price_data?: {
    currency: string;
    product_data: {
      name: string;
      description?: string;
      images?: string[];
    };
    unit_amount: number;
  };
  price?: string;
  quantity: number;
}

// Create a checkout session
export const createCheckoutSession = async (
  items: StripeLineItem[],
  applicationId?: string
): Promise<{ url: string } | { error: string }> => {
  try {
    console.log('Client: Creating checkout session with items:', items);
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items,
          applicationId
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // First check if response is OK before attempting to parse JSON
      if (!response.ok) {
        // Clone the response before trying to read it
        const errorResponse = response.clone();
        
        // Try to parse error as JSON first
        try {
          const errorData = await errorResponse.json();
          throw new Error(errorData.error || `Error ${response.status}: Failed to create checkout session`);
        } catch (jsonError) {
          // If JSON parsing fails, get the text content instead from the original response
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText.substring(0, 100)}...`);
        }
      }
      
      // Parse successful response - clone it first to avoid "body used already" errors
      const responseClone = response.clone();
      
      try {
        const data = await responseClone.json();
        
        if (!data.url) {
          throw new Error('No checkout URL returned');
        }

        // Handle successful response with redirect to Stripe
        if (data.url) {
          // Open in a new tab instead of redirecting the current page
          window.open(data.url, '_blank');
          return { url: data.url };
        } else {
          throw new Error('Invalid response from server: missing checkout URL');
        }
      } catch (jsonError) {
        // If the first attempt failed, try reading the original response
        try {
          const fallbackData = await response.json();
          if (fallbackData.url) {
            window.open(fallbackData.url, '_blank');
            return { url: fallbackData.url };
          }
        } catch (fallbackError) {
          // If both attempts fail, throw a meaningful error
          throw new Error(`Failed to parse API response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
        }
        
        // Add a default return to satisfy TypeScript
        return { error: 'Failed to process checkout response' };
      }
    } catch (fetchError: any) {
      // Handle abort/timeout errors specifically
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out after 10 seconds');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Client: Error creating checkout session:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error creating checkout session' 
    };
  }
};

// Check if Stripe is configured
export function checkStripeConfiguration() {
  return {
    isConfigured: true,
    message: 'Stripe is configured with hardcoded test keys'
  };
}

// Types for Stripe products
export type StripeProduct = {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  active?: boolean;
  metadata?: Record<string, string>;
};

// Types for Stripe price and checkout
export type StripePrice = {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  active?: boolean;
  metadata?: Record<string, string>;
};

export type StripeCheckoutSession = {
  id: string;
  success_url: string;
  cancel_url: string;
  line_items: StripeLineItem[];
  mode: 'payment' | 'subscription';
  payment_status?: 'paid' | 'unpaid';
};

// Hulpfunctie om producten van Supabase naar Stripe te synchroniseren
export const syncProductToStripe = async (
  productId: string,
  product: {
    name: string;
    description: string;
    price: number;
    image_url: string;
  }
) => {
  // Check of we in development mode zijn
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === '' || 
      !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.log('Development mode: Skipping Stripe sync for product', productId);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch('/api/stripe/sync-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        product,
      }),
    });
    
    return await res.json();
  } catch (error) {
    console.error('Error syncing product to Stripe:', error);
    return { error };
  }
}; 