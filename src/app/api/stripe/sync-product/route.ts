import { NextRequest, NextResponse } from 'next/server';
import { createStripeProduct, createStripePrice } from '@/lib/stripe-server';

// Deze route synchroniseert een product van Supabase naar Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, product } = body;
    
    if (!productId || !product) {
      return NextResponse.json({ error: 'ProductId en product zijn verplicht' }, { status: 400 });
    }
    
    // Maak eerst het product aan in Stripe
    const { product: stripeProduct, error: productError } = await createStripeProduct({
      name: product.name,
      description: product.description,
      images: product.image_url ? [product.image_url] : undefined,
    });
    
    if (productError || !stripeProduct) {
      return NextResponse.json({ error: 'Error creating product in Stripe' }, { status: 500 });
    }
    
    // Maak de prijs aan voor het product
    const { price: stripePrice, error: priceError } = await createStripePrice(
      stripeProduct.id,
      {
        unit_amount: Math.round(product.price * 100), // Converteer naar centen
        currency: 'eur',
      }
    );
    
    if (priceError || !stripePrice) {
      return NextResponse.json({ error: 'Error creating price in Stripe' }, { status: 500 });
    }
    
    // Stuur de Stripe product en price IDs terug
    return NextResponse.json({
      success: true,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    });
  } catch (error) {
    console.error('Error syncing product to Stripe:', error);
    return NextResponse.json({ error: 'Error syncing product to Stripe' }, { status: 500 });
  }
} 