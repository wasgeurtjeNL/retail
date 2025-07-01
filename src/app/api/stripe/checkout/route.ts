import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe-server';
import { StripeLineItem } from '@/lib/stripe';

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
    console.log('API: Stripe checkout request received');
    
    // Parse the request body
    const body = await req.json();
    const { items } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('API: Error - No valid items received');
      return corsResponse(
        req, 
        { success: false, error: 'Items are required and must be an array' }, 
        400
      );
    }
    
    console.log('API: Items for checkout:', JSON.stringify(items, null, 2));
    
    // Get origin for success/cancel URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    // Use environment variable or locally stored key
    const secretKey = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key';
    
    try {
      // Create line items from the request
      const lineItems = items.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.price_data?.product_data?.name || 'Wasparfum product',
            description: item.price_data?.product_data?.description || '',
          },
          unit_amount: item.price_data?.unit_amount || 0,
        },
        quantity: item.quantity || 1,
      }));
      
      console.log('API: Creating Stripe session with items:', JSON.stringify(lineItems, null, 2));
      
      // Create a unique order ID if not provided
      const orderId = body.orderId || `order_${Date.now()}`;
      
      // Create the checkout session
      const session = await createCheckoutSession({
        payment_method_types: ['card', 'ideal'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}/retailer-dashboard/wasstrips?payment=success&session_id={CHECKOUT_SESSION_ID}&application_id=${body.applicationId || ''}`,
        cancel_url: `${origin}/retailer-dashboard/wasstrips?payment=cancelled&application_id=${body.applicationId || ''}`,
        custom_text: {
          submit: {
            message: 'Wij verwerken uw aanmelding direct na ontvangst van uw aanbetaling.'
          }
        },
        metadata: {
          applicationId: body.applicationId || '',
          type: 'wasstrips_application'
        }
      }, secretKey);
      
      console.log('API: Successfully created checkout session with ID:', session.id);
      
      // Return the session URL
      return corsResponse(
        req,
        { 
          success: true, 
          url: session.url,
          sessionId: session.id
        },
        200
      );
    } catch (stripeError) {
      console.error('API: Stripe API error:', stripeError);
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
    console.error('API: Error creating checkout session:', error);
    
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