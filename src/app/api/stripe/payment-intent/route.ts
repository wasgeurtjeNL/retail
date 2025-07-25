import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/payment-monitoring';

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

// POST endpoint om een nieuwe PaymentIntent aan te maken
export async function POST(req: NextRequest) {
  try {
    console.log('API: Stripe payment intent request received');
    
    // Parse de request body
    const body = await req.json();
    const { amount, currency = 'eur', metadata = {} } = body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.error('API: Error - Invalid amount provided');
      return corsResponse(
        req, 
        { success: false, error: 'Valid amount is required' }, 
        400
      );
    }
    
    console.log('API: Creating payment intent for amount:', amount, currency);
    
    // Gebruik hardcoded test key (in een productie-omgeving haal je dit uit environment variables)
    const secretKey = 'sk_test_51LmLUMJtFvAJ7sDP0ngS4YOWBaJmxz7T8zT44vsmi9ej7MR10MB92xAxBbyrLyQrGfssbU76zvd5F9HI4cWDrNIM00qzuSfE5O';
    
    // Maak het PaymentIntent aan
    const result = await createPaymentIntent(amount, currency, metadata, secretKey);
    
    if (result.error) {
      console.error('API: Error creating payment intent:', result.error);
      return corsResponse(
        req,
        { success: false, error: result.error },
        500
      );
    }
    
    console.log('API: Successfully created payment intent with ID:', result.paymentIntent?.id);
    
    // Return the payment intent with its client_secret
    return corsResponse(
      req,
      { 
        success: true, 
        paymentIntent: {
          id: result.paymentIntent?.id,
          client_secret: result.paymentIntent?.client_secret,
          amount: result.paymentIntent?.amount,
          currency: result.paymentIntent?.currency,
          status: result.paymentIntent?.status,
        }
      },
      200
    );
  } catch (error) {
    console.error('API: Error in payment intent endpoint:', error);
    
    return corsResponse(
      req,
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error creating payment intent' 
      },
      500
    );
  }
}

// GET endpoint om een bestaande PaymentIntent op te halen (voor dev/test doeleinden)
export async function GET(req: NextRequest) {
  try {
    // Extract payment intent ID from the URL
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return corsResponse(
        req,
        { success: false, error: 'Payment intent ID is required' },
        400
      );
    }
    
    // In een echte app zou je hier de Stripe API aanroepen om het payment intent op te halen
    // Voor deze demo returnen we een mock response
    return corsResponse(
      req,
      {
        success: true,
        paymentIntent: {
          id: id,
          status: 'succeeded',
          amount: 3999,
          currency: 'eur',
        }
      },
      200
    );
  } catch (error) {
    console.error('API: Error retrieving payment intent:', error);
    
    return corsResponse(
      req,
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error retrieving payment intent' 
      },
      500
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return corsResponse(req, {});
}
