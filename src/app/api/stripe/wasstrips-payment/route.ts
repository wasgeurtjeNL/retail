import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

// API route voor Wasstrips betalingen (aanbetaling en restbedrag)
export async function POST(req: NextRequest) {
  try {
    console.log('[API] Wasstrips payment request received');
    
    const body = await req.json();
    const { paymentLinkId, paymentType, applicationId } = body;
    
    // Ondersteuning voor zowel payment link als directe applicatie calls
    if ((!paymentLinkId && !applicationId) || !paymentType) {
      return NextResponse.json({ 
        error: 'Either payment link ID or application ID is required, along with payment type' 
      }, { status: 400 });
    }

    console.log('[API] Processing payment for:', paymentLinkId || applicationId, 'Type:', paymentType, 'Mode:', applicationId ? 'direct' : 'payment-link');

    // Valideer payment type
    if (!['deposit', 'remaining'].includes(paymentType)) {
      return NextResponse.json({ 
        error: 'Invalid payment type. Must be "deposit" or "remaining"' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal applicatie gegevens op basis van payment link of direct op applicationId
    let applications, fetchError;
    
    if (applicationId) {
      // Directe call met applicationId
      const result = await supabase
        .from('wasstrips_applications')
        .select('*')
        .eq('id', applicationId)
        .single();
      applications = result.data;
      fetchError = result.error;
    } else {
      // Bestaande payment link logica
      const result = await supabase
        .from('wasstrips_applications')
        .select('*')
        .or(
          paymentType === 'deposit' 
            ? `deposit_payment_link.eq.${paymentLinkId}`
            : `remaining_payment_link.eq.${paymentLinkId}`
        )
        .single();
      applications = result.data;
      fetchError = result.error;
    }

    if (fetchError || !applications) {
      console.error('[API] Application not found for:', paymentLinkId || applicationId);
      return NextResponse.json({ 
        error: applicationId ? 'Application not found' : 'Payment link not found or expired' 
      }, { status: 404 });
    }

    // Haal retailer gegevens op
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', applications.profile_id)
      .single();

    if (profileError || !profile) {
      console.error('[API] Profile not found for application');
      return NextResponse.json({ 
        error: 'Retailer profile not found' 
      }, { status: 404 });
    }

    // Bepaal bedrag en beschrijving
    const isDeposit = paymentType === 'deposit';
    const amount = isDeposit ? 30.00 : 270.00;
    const description = isDeposit 
      ? 'Wasstrips Aanbetaling (10% van €300 minimum bestelling)'
      : 'Wasstrips Restbedrag (€300 - €30 aanbetaling)';

    // Controleer of betaling al gedaan is
    if (isDeposit && applications.deposit_status === 'paid') {
      return NextResponse.json({ 
        error: 'Deposit has already been paid' 
      }, { status: 400 });
    }

    if (!isDeposit && applications.remaining_payment_status === 'paid') {
      return NextResponse.json({ 
        error: 'Remaining payment has already been paid' 
      }, { status: 400 });
    }

    // Voor restbedrag, controleer of aanbetaling betaald is
    if (!isDeposit && applications.deposit_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Deposit must be paid before remaining payment' 
      }, { status: 400 });
    }

    // Voor directe calls, update payment method selection
    if (applicationId) {
      const { error: updateError } = await supabase
        .from('wasstrips_applications')
        .update({
          payment_method_selected: 'direct',
          payment_method_selected_at: new Date().toISOString(),
          status: 'direct_payment_initiated',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('[API] Error updating payment method selection:', updateError);
        // Continue anyway, don't fail the payment
      }
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    
    // Check if test mode is enabled (default to test mode for safety)
    const isTestMode = body.isTestMode !== false; // Default to true unless explicitly set to false
    
    // Use appropriate Stripe keys based on test mode
    const secretKey = isTestMode 
      ? process.env.STRIPE_TEST_SECRET_KEY
      : process.env.STRIPE_LIVE_SECRET_KEY;

    if (!secretKey) {
      console.error('[API] Stripe secret key not found for mode:', isTestMode ? 'test' : 'live');
      return NextResponse.json({ 
        error: `Stripe ${isTestMode ? 'test' : 'live'} secret key not configured` 
      }, { status: 500 });
    }

    try {
      // Create line items voor Stripe
      const lineItems = [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Wasstrips ${isDeposit ? 'Aanbetaling' : 'Restbedrag'}`,
            description: description,
            images: [`${origin}/assets/images/wasstrips-product.jpg`]
          },
          unit_amount: Math.round(amount * 100), // Stripe verwacht bedrag in centen
        },
        quantity: 1,
      }];

      console.log('[API] Creating Stripe session for Wasstrips payment:', {
        amount: amount,
        type: paymentType,
        applicationId: applications.id,
        testMode: isTestMode
      });

      // Create checkout session
      const session = await createCheckoutSession({
        payment_method_types: ['card', 'ideal', 'bancontact'],
        line_items: lineItems,
        mode: 'payment',
        success_url: applicationId 
          ? `${origin}/retailer-dashboard/orders/confirmation?session_id={CHECKOUT_SESSION_ID}&application_id=${applicationId}&payment_type=${paymentType}`
          : `${origin}/payment/${paymentType}/success?session_id={CHECKOUT_SESSION_ID}&payment_link=${paymentLinkId}`,
        cancel_url: applicationId
          ? `${origin}/retailer-dashboard/payment-options/${applicationId}?cancelled=true`
          : `${origin}/payment/${paymentType}/${paymentLinkId}?cancelled=true`,
        custom_text: {
          submit: {
            message: isDeposit 
              ? 'Na betaling bereiden wij uw Wasstrips bestelling voor.'
              : 'Bedankt voor uw betaling. Veel succes met de verkoop!'
          }
        },
        metadata: {
          applicationId: applications.id.toString(),
          paymentLinkId: paymentLinkId || '',
          paymentType: paymentType,
          retailerEmail: profile.email,
          type: applicationId ? 'wasstrips_direct_payment' : 'wasstrips_payment',
          testMode: isTestMode.toString()
        }
      }, secretKey);

      console.log('[API] Successfully created Stripe session:', session.id);

      return NextResponse.json({
        success: true,
        url: session.url,
        sessionId: session.id
      });

    } catch (stripeError) {
      console.error('[API] Stripe error:', stripeError);
      return NextResponse.json({
        error: stripeError instanceof Error 
          ? `Stripe error: ${stripeError.message}` 
          : 'Error creating payment session'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[API] Unexpected error in Wasstrips payment:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 