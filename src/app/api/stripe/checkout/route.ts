import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe-server';
import { StripeLineItem } from '@/lib/stripe';
import Stripe from 'stripe';

// Helper for CORS responses
function corsResponse(req: NextRequest, data: any, status = 200) {
  // Get the origin from the request or default to localhost
  const origin = req.headers.get('origin') || 'http://localhost:3000';
  
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    },
  });
}

// Main checkout handler
export async function POST(req: NextRequest) {
  try {
    console.log('[API] Stripe checkout request received');
    
    // Parse the request body
    const body = await req.json();
    const { items, orderId, amount, applicationId } = body;
    
    console.log('[API] Checkout request data:', { 
      items: items?.length || 0, 
      orderId, 
      amount, 
      applicationId
    });
    
    // Get origin for success/cancel URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    console.log('[API] Request origin:', origin);
    
    // Check if test mode is enabled (default to test mode for safety)
    const isTestMode = body.isTestMode !== false; // Default to true unless explicitly set to false
    
    // Use appropriate Stripe keys based on test mode (zoals in werkende wasstrips-payment API)
    const secretKey = isTestMode 
      ? process.env.STRIPE_TEST_SECRET_KEY
      : process.env.STRIPE_LIVE_SECRET_KEY;

    if (!secretKey) {
      console.error('[API] Stripe secret key not found for mode:', isTestMode ? 'test' : 'live');
      return corsResponse(
        req,
        { success: false, error: `Stripe ${isTestMode ? 'test' : 'live'} secret key not configured` },
        500
      );
    }
    
    console.log('[API] Using Stripe in', isTestMode ? 'test' : 'live', 'mode');
    
    try {
      let lineItems;
      
      // Voor alle order betalingen gebruiken we de directe amount aanpak (zoals wasstrips-payment)
      if (amount && orderId) {
        console.log('[API] Processing direct amount checkout for order:', orderId, 'amount:', amount);
        // Direct amount checkout (pay existing order) - zoals in werkende wasstrips-payment
        lineItems = [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Betaling voor bestelling ${orderId}`,
              description: `Openstaande betaling voor order ${orderId}`, // Altijd een geldige description
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        }];
      } else if (items && Array.isArray(items) && items.length > 0) {
        console.log('[API] Processing items checkout with', items.length, 'items');
        // Standard items checkout (catalog orders) - alleen als fallback
        lineItems = items.map((item: any) => {
          const unitAmount = item.price_data?.unit_amount || Math.round((item.price || 0) * 100);
          console.log('[API] Processing item:', {
            name: item.name || item.price_data?.product_data?.name,
            unitAmount,
            quantity: item.quantity
          });
          
          return {
            price_data: {
              currency: 'eur',
              product_data: {
                name: item.name || item.price_data?.product_data?.name || 'Product',
                description: item.description || item.price_data?.product_data?.description || 'Productbeschrijving', // Altijd een geldige description
              },
              unit_amount: unitAmount,
            },
            quantity: item.quantity || 1,
          };
        });
      } else {
        console.error('[API] Error - No valid items or amount/orderId received');
        return corsResponse(
          req, 
          { success: false, error: 'Items or amount with orderId are required' }, 
          400
        );
      }
      
      console.log('[API] Final line items:', JSON.stringify(lineItems, null, 2));
      
      // Create a unique order ID if not provided
      const finalOrderId = orderId || `order_${Date.now()}`;
      
      // Determine success and cancel URLs based on the type of checkout
      let successUrl, cancelUrl;
      
      if (applicationId) {
        // Wasstrips application checkout
        successUrl = `${origin}/retailer-dashboard/wasstrips?payment=success&session_id={CHECKOUT_SESSION_ID}&application_id=${applicationId}`;
        cancelUrl = `${origin}/retailer-dashboard/wasstrips?payment=cancelled&application_id=${applicationId}`;
      } else {
        // Regular order checkout
        successUrl = `${origin}/retailer-dashboard/orders/confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${finalOrderId}`;
        cancelUrl = `${origin}/retailer-dashboard/orders?payment=cancelled&order_id=${finalOrderId}`;
      }
      
      console.log('[API] Checkout URLs:', { successUrl, cancelUrl });
      
      // Create the checkout session
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card', 'ideal'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        custom_text: {
          submit: {
            message: applicationId 
              ? 'Wij verwerken uw aanmelding direct na ontvangst van uw aanbetaling.'
              : 'Bedankt voor uw bestelling! We verwerken deze zo snel mogelijk.'
          }
        },
        metadata: {
          orderId: finalOrderId,
          applicationId: applicationId || '',
          type: applicationId ? 'wasstrips_application' : 'order_payment'
        }
      };
      
      console.log('[API] Creating Stripe session...');
      
      const session = await createCheckoutSession(sessionConfig, secretKey);
      
      console.log('[API] Successfully created checkout session:', {
        id: session.id,
        url: session.url ? 'URL present' : 'No URL',
        mode: session.mode,
        status: session.status
      });
      
      // Return the session URL
      const responseData = { 
        success: true, 
        url: session.url,
        sessionId: session.id
      };
      
      console.log('[API] Returning response:', responseData);
      
      return corsResponse(req, responseData, 200);
    } catch (stripeError) {
      console.error('[API] Stripe API error:', stripeError);
      console.error('[API] Stripe error details:', {
        message: stripeError instanceof Error ? stripeError.message : 'Unknown',
        stack: stripeError instanceof Error ? stripeError.stack : 'No stack'
      });
      
      return corsResponse(
        req,
        { 
          success: false, 
          error: stripeError instanceof Error 
            ? `Stripe error: ${stripeError.message}` 
            : 'Unknown error with Stripe API' 
        },
        500
      );
    }
  } catch (error) {
    console.error('[API] Error creating checkout session:', error);
    console.error('[API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack'
    });
    
    // Return a formatted error response
    return corsResponse(
      req,
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error creating checkout session' 
      },
      500
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return corsResponse(req, {});
} 