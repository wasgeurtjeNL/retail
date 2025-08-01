import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = 'eur', metadata = {} } = body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' }, 
        { status: 400 }
      );
    }
    
    // Mock payment intent for testing
    const mockPaymentIntent = {
      id: `pi_test_${Date.now()}`,
      client_secret: `pi_test_${Date.now()}_secret_test`,
      amount,
      currency,
      status: 'requires_payment_method',
    };
    
    return NextResponse.json({
      success: true,
      paymentIntent: mockPaymentIntent
    });
    
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }
    
    // Mock response
    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: id,
        status: 'succeeded',
        amount: 3999,
        currency: 'eur',
      }
    });
    
  } catch (error) {
    console.error('Payment intent GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve payment intent' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 