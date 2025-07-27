import Stripe from 'stripe';
import { StripeLineItem } from './stripe';

// Use environment variables or locally stored key
const STRIPE_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY || 'your_stripe_secret_key';

// Function to get a Stripe instance with the provided key
export function getStripeInstance(secretKey?: string): Stripe {
  // Use provided key, hardcoded key, or from localStorage
  const key = secretKey || STRIPE_SECRET_KEY;
  return new Stripe(key, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  });
}

// Server-side Stripe integration
export const stripe = {
  products: {
    create: async () => { 
      throw new Error('Directe toegang tot stripe object is niet beschikbaar. Gebruik getStripeInstance().'); 
    }
  },
  prices: {
    create: async () => { 
      throw new Error('Directe toegang tot stripe object is niet beschikbaar. Gebruik getStripeInstance().'); 
    }
  },
  checkout: {
    sessions: {
      create: async () => { 
        throw new Error('Directe toegang tot stripe object is niet beschikbaar. Gebruik getStripeInstance().'); 
      }
    }
  }
};

// Admin functies voor Stripe configuratie
export const setupStripeAccount = async (secretKey: string, publishableKey: string) => {
  // Log de configuratie
  console.log('Stripe secretKey configured:', secretKey.substring(0, 10) + '...');
  console.log('Stripe publishableKey configured:', publishableKey.substring(0, 10) + '...');
  
  try {
    // Test de verbinding door een eenvoudige Stripe API call te doen
    console.log('Testing Stripe connection...');
    try {
      // Creëer de Stripe instantie met de nieuwe secretKey
      const stripeInstance = getStripeInstance(secretKey);
      
      // Test de verbinding door de API versie op te halen
      await stripeInstance.applePayDomains.list({ limit: 1 });
      console.log('Stripe connection test successful');
    } catch (stripeError) {
      console.error('Stripe connection test failed:', stripeError);
      return { 
        success: false, 
        error: stripeError instanceof Error ? stripeError.message : 'Invalid Stripe credentials'
      };
    }
    
    // In Next.js in de browser kunnen we process.env niet direct aanpassen
    // Dus in plaats daarvan slaan we het op in localStorage voor client-side gebruik
    if (typeof window !== 'undefined') {
      try {
        // Eerst de localStorage leegmaken voor deze keys om eventuele corruptie te voorkomen
        localStorage.removeItem('STRIPE_SECRET_KEY');
        localStorage.removeItem('STRIPE_PUBLISHABLE_KEY');
        
        // Dan de nieuwe waarden opslaan
        localStorage.setItem('STRIPE_SECRET_KEY', secretKey);
        localStorage.setItem('STRIPE_PUBLISHABLE_KEY', publishableKey);
        
        // Verifieer dat de keys correct zijn opgeslagen
        const storedSecretKey = localStorage.getItem('STRIPE_SECRET_KEY');
        const storedPublishableKey = localStorage.getItem('STRIPE_PUBLISHABLE_KEY');
        
        const secretKeyMatches = storedSecretKey === secretKey;
        const publishableKeyMatches = storedPublishableKey === publishableKey;
        
        console.log('Stripe keys verification:', {
          secretKeyStored: !!storedSecretKey,
          publishableKeyStored: !!storedPublishableKey,
          secretKeyMatches,
          publishableKeyMatches,
          secretKeyLength: storedSecretKey?.length || 0,
          publishableKeyLength: storedPublishableKey?.length || 0
        });
        
        if (!secretKeyMatches || !publishableKeyMatches) {
          console.error('Stripe keys verification failed - stored keys do not match provided keys');
          return {
            success: false,
            error: 'Failed to store Stripe keys correctly in localStorage'
          };
        }
        
        console.log('Stripe keys stored and verified in localStorage');
      } catch (storageError) {
        console.error('Error storing in localStorage:', storageError);
        return {
          success: false,
          error: 'Failed to save Stripe keys to localStorage: ' + 
            (storageError instanceof Error ? storageError.message : 'Unknown error')
        };
      }
    } else {
      console.log('Window is undefined, not storing keys in localStorage (server-side context)');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error storing Stripe keys:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error storing Stripe configuration'
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

// Create a product in Stripe
export async function createProduct(product: { name: string; description?: string; images?: string[] }, secretKey?: string): Promise<Stripe.Product> {
  const stripe = getStripeInstance(secretKey);
  
  try {
    return await stripe.products.create(product);
  } catch (error) {
    console.error('Error creating product in Stripe:', error);
    throw error;
  }
}

// Create a price for a product in Stripe
export async function createPrice(price: { product: string; unit_amount: number; currency: string }, secretKey?: string): Promise<Stripe.Price> {
  const stripe = getStripeInstance(secretKey);
  
  try {
    return await stripe.prices.create(price);
  } catch (error) {
    console.error('Error creating price in Stripe:', error);
    throw error;
  }
}

// Create a checkout session
export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, secretKey?: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeInstance(secretKey);
  
  try {
    return await stripe.checkout.sessions.create(params);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
} 