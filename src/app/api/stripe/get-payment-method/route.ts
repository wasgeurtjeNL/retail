import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 });
    }

    console.log('[API] Retrieving payment method for session:', sessionId);

    // Use test key by default for safety
    const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
    
    if (!secretKey) {
      console.error('[API] Stripe secret key not configured');
      return NextResponse.json({ 
        error: 'Stripe not configured' 
      }, { status: 500 });
    }

    const stripe = getStripeInstance(secretKey);
    
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.payment_method']
    });

    console.log('[API] Retrieved Stripe session:', {
      id: session.id,
      payment_status: session.payment_status,
      payment_intent: session.payment_intent && typeof session.payment_intent === 'object' ? {
        id: session.payment_intent.id,
        status: session.payment_intent.status
      } : null
    });

    // Determine the actual payment method used
    let paymentMethod = 'unknown';
    let paymentMethodDetails = null;

    if (session.payment_intent && typeof session.payment_intent === 'object') {
      const paymentIntent = session.payment_intent;
      
      if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
        const pm = paymentIntent.payment_method;
        paymentMethod = pm.type || 'unknown';
        
        // Get additional details based on payment method type
        switch (pm.type) {
          case 'card':
            paymentMethodDetails = {
              brand: pm.card?.brand,
              last4: pm.card?.last4,
              country: pm.card?.country
            };
            break;
          case 'ideal':
            paymentMethodDetails = {
              bank: pm.ideal?.bank,
              bic: pm.ideal?.bic
            };
            break;
          case 'bancontact':
            paymentMethodDetails = {
              type: 'bancontact'
            };
            break;
        }
      }
    }

    console.log('[API] Determined payment method:', paymentMethod, paymentMethodDetails);

    // Map Stripe payment method to our internal format
    const mappedPaymentMethod = mapStripePaymentMethod(paymentMethod);

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      payment_method: mappedPaymentMethod,
      payment_method_raw: paymentMethod,
      payment_method_details: paymentMethodDetails,
      payment_status: session.payment_status
    });

  } catch (error) {
    console.error('[API] Error retrieving payment method:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve payment method',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to map Stripe payment methods to our internal format
function mapStripePaymentMethod(stripeMethod: string): string {
  switch (stripeMethod) {
    case 'card':
      return 'credit_card';
    case 'ideal':
      return 'ideal';
    case 'bancontact':
      return 'bancontact';
    default:
      return 'credit_card'; // Default fallback
  }
}

// Helper function to get user-friendly payment method name
export function getPaymentMethodDisplayName(paymentMethod: string, details?: any): string {
  switch (paymentMethod) {
    case 'credit_card':
      if (details?.brand && details?.last4) {
        return `${details.brand.toUpperCase()} **** ${details.last4}`;
      }
      return 'Creditcard';
    case 'ideal':
      if (details?.bank) {
        return `iDEAL (${details.bank})`;
      }
      return 'iDEAL';
    case 'bancontact':
      if (details?.bank_name) {
        return `Bancontact (${details.bank_name})`;
      }
      return 'Bancontact';
    case 'invoice':
      return 'Betaling op factuur';
    default:
      return 'Directe betaling';
  }
} 