import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe-server';
import { StripeLineItem } from '@/lib/stripe';

// Helper om CORS headers toe te voegen
const corsHeaders = (request: Request) => {
  const origin = request.headers.get('origin') || 'http://localhost:3000';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// OPTIONS request handler voor CORS preflight requests
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(request),
  });
}

// Deze route maakt een Stripe checkout sessie aan
export async function POST(request: NextRequest) {
  // CORS Headers
  const headers = corsHeaders(request);
  
  try {
    console.log('API: Stripe checkout request ontvangen');
    const body = await request.json();
    const { items } = body;
    
    console.log('API: Items voor checkout:', JSON.stringify(items, null, 2));
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('API: Fout - Geen geldige items ontvangen');
      return NextResponse.json(
        { success: false, error: 'Items zijn verplicht en moeten een array zijn' }, 
        { status: 400, headers }
      );
    }
    
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const retailerConfirmationUrl = `${origin}/retailer-dashboard/orders/confirmation`;
    const retailerCanceledUrl = `${origin}/retailer-dashboard/catalog`;
    
    // Valideer items
    for (const item of items) {
      if (!item.quantity || (typeof item.quantity !== 'number')) {
        console.error('API: Fout - Item zonder geldige quantity:', item);
        return NextResponse.json(
          { success: false, error: 'Elk item moet een quantity hebben' }, 
          { status: 400, headers }
        );
      }
      
      // Controleer of item price of price_data heeft
      if (!item.price && !item.price_data) {
        console.error('API: Fout - Item zonder price of price_data:', item);
        return NextResponse.json(
          { success: false, error: 'Elk item moet ofwel een price ID of price_data hebben' }, 
          { status: 400, headers }
        );
      }
      
      // Als price_data aanwezig is, valideer de vereiste velden
      if (item.price_data) {
        if (!item.price_data.currency || !item.price_data.product_data || !item.price_data.unit_amount) {
          console.error('API: Fout - Ongeldige price_data:', item.price_data);
          return NextResponse.json(
            { success: false, error: 'price_data moet currency, product_data en unit_amount bevatten' }, 
            { status: 400, headers }
          );
        }
      }
    }
    
    // Bereid de parameters voor de checkout sessie voor
    const sessionParams = {
      payment_method_types: ['card'] as Array<'card' | 'ideal' | 'bancontact' | 'sofort'>,
      line_items: items as StripeLineItem[],
      mode: 'payment' as const,
      success_url: retailerConfirmationUrl,
      cancel_url: retailerCanceledUrl,
    };
    
    console.log('API: Creating checkout session met parameters:', JSON.stringify(sessionParams, null, 2));
    
    try {
      // Maak de checkout sessie aan
      const session = await createCheckoutSession(sessionParams);
      
      if (!session.url) {
        console.error('API: Fout - De aangemaakte Stripe sessie heeft geen URL.');
        return NextResponse.json(
          { success: false, error: 'De aangemaakte Stripe sessie bevat geen redirect URL.' }, 
          { status: 500, headers }
        );
      }
      
      console.log('API: Checkout sessie succesvol aangemaakt:', session.id);
      
      // Stuur de volledige URL van de sessie terug, niet alleen de ID
      return NextResponse.json(
        { success: true, url: session.url }, 
        { status: 200, headers }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout bij het maken van de Stripe sessie.';
      console.error('API: Fout bij het aanroepen van createCheckoutSession:', errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage }, 
        { status: 500, headers }
      );
    }

  } catch (error) {
    console.error('API: Onverwachte fout bij het verwerken van de request body:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected error processing request body: ' + 
          (error instanceof Error ? error.message : 'Unknown error') 
      }, 
      { status: 500, headers }
    );
  }
} 