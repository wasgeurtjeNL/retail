import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/payment-monitoring';
import { createClient } from '@supabase/supabase-js';
import { sendTemplateEmail, getEmailBrandingContext } from '@/lib/mail-service';

// Disable Next.js body parsing for webhooks to preserve raw body
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Webhook endpoint voor Stripe events
export async function POST(req: NextRequest) {
  try {
    if (req.method !== 'POST') {
      return new NextResponse('Method not allowed', { status: 405 });
    }

    // Stripe stuurt een signature header voor validatie
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new NextResponse('Missing stripe-signature header', { status: 400 });
    }

    // Het webhook secret uit environment variable
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return new NextResponse('Webhook secret not configured', { status: 500 });
    }
    
    console.log('[WEBHOOK] Using webhook secret starting with:', webhookSecret.substring(0, 10) + '...');

    // Request body ophalen als raw text (cruciaal voor signature verification)
    const body = await req.text();
    
    console.log('[WEBHOOK] Request received:', {
      signature: signature.substring(0, 20) + '...',
      bodyLength: body.length,
      webhookSecretPrefix: webhookSecret.substring(0, 10) + '...'
    });

    // Webhook event verwerken
    const { event, error } = await handleWebhookEvent(body, signature, webhookSecret);

    if (error) {
      console.error('Webhook error:', error);
      return new NextResponse(`Webhook Error: ${error}`, { status: 400 });
    }

    // Supabase client initialiseren
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verwerk het event op basis van het type
    let intent = null;
    switch (event.type) {
      case 'payment_intent.succeeded':
        intent = event.data.object;
        console.log('PaymentIntent succeeded:', intent.id);
        
        // Hier zou je de bestelling kunnen updaten in je database
        // Voor deze demo kun je een webhook opzetten in het Stripe dashboard 
        // om dit te testen: https://dashboard.stripe.com/test/webhooks

        break;
      case 'payment_intent.payment_failed':
        intent = event.data.object;
        const message = intent.last_payment_error && intent.last_payment_error.message;
        console.log('PaymentIntent failed:', intent.id, message);
        
        // Update bestelling met mislukte betaalstatus
        // ...

        break;
      case 'checkout.session.completed':
        // Handle checkout session completed event
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        // Controleer of dit een Wasstrips betaling is
        if (session.metadata?.type === 'wasstrips_payment' || session.metadata?.type === 'wasstrips_direct_payment') {
          await handleWasstripsPayment(session, supabase);
        } else if (session.metadata?.type === 'order_payment') {
          // Handle catalog order payment
          await handleOrderPayment(session, supabase);
        } else {
          // Fallback: probeer een order te vinden op basis van metadata
          if (session.metadata?.orderId) {
            await handleOrderPayment(session, supabase);
          }
        }

        break;
      default:
        // Verwerk andere events indien nodig
        console.log('Unhandled event type:', event.type);
    }

    // Bevestig ontvangst aan Stripe
    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new NextResponse(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Verwerk Wasstrips betaling na succesvolle checkout
async function handleWasstripsPayment(session: any, supabase: any) {
  try {
    console.log('[WEBHOOK] Processing Wasstrips payment:', session.metadata);
    
    const { applicationId } = session.metadata;
    
    if (!applicationId) {
      console.error('[WEBHOOK] Missing applicationId in metadata for Wasstrips payment');
      return;
    }

    // Haal applicatie gegevens op
    const { data: application, error: appError } = await supabase
      .from('wasstrips_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[WEBHOOK] Application not found:', applicationId);
      return;
    }

    // Haal retailer gegevens op
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', application.profile_id)
      .single();

    if (profileError || !profile) {
      console.error('[WEBHOOK] Profile not found for application');
      return;
    }

    const now = new Date().toISOString();
    
    // Bepaal welk type betaling dit is op basis van metadata
    const paymentType = session.metadata?.paymentType || 'deposit';
    
    console.log('[WEBHOOK] Detected payment type from metadata:', paymentType);
    
    // Update database op basis van payment type
    if (paymentType === 'deposit') {
      const { error: updateError } = await supabase
        .from('wasstrips_applications')
        .update({
          deposit_status: 'paid',
          deposit_paid_at: now,
          status: 'approved', // Automatisch goedkeuren na succesvolle aanbetaling
          updated_at: now
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('[WEBHOOK] Error updating deposit status:', updateError);
        return;
      }

      console.log('[WEBHOOK] Successfully updated deposit status for application:', applicationId);

      // Verstuur bevestigingsmail voor aanbetaling
      await sendDepositConfirmationEmail(profile, application, session);
      
    } else if (paymentType === 'remaining') {
      const { error: updateError } = await supabase
        .from('wasstrips_applications')
        .update({
          remaining_payment_status: 'paid',
          updated_at: now
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('[WEBHOOK] Error updating remaining payment status:', updateError);
        return;
      }

      console.log('[WEBHOOK] Successfully updated remaining payment status for application:', applicationId);
      
      // Hier zou je een andere email template kunnen gebruiken voor restbetaling
      // Voor nu gebruiken we dezelfde template
    }

  } catch (error) {
    console.error('[WEBHOOK] Error processing Wasstrips payment:', error);
  }
}

// Verwerk catalog order betaling na succesvolle checkout
async function handleOrderPayment(session: any, supabase: any) {
  try {
    console.log('[WEBHOOK] Processing catalog order payment:', session.metadata);
    
    const { orderId } = session.metadata;
    
    if (!orderId) {
      console.error('[WEBHOOK] Missing orderId in metadata for order payment');
      return;
    }

    // Haal order gegevens op
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[WEBHOOK] Order not found:', orderId);
      return;
    }

    const now = new Date().toISOString();
    
    // Update order met betaalgegevens
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        updated_at: now
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[WEBHOOK] Error updating order payment status:', updateError);
      return;
    }

    console.log('[WEBHOOK] Successfully updated order payment status for order:', orderId);

    // Verstuur bevestigingsmail voor order
    // await sendOrderConfirmationEmail(order, session);
    
  } catch (error) {
    console.error('[WEBHOOK] Error processing order payment:', error);
  }
}

// Verstuur bevestigingsmail na succesvolle aanbetaling
async function sendDepositConfirmationEmail(profile: any, application: any, session: any) {
  try {
    console.log('[WEBHOOK] Sending deposit confirmation email to:', profile.email);

    // Haal branding context op
    const brandingContext = await getEmailBrandingContext();
    
    // Bereid email context voor
    const emailContext = {
      ...brandingContext,
      retailer_name: profile.company_name || profile.first_name || 'Retailer',
      payment_date: new Date().toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      application_id: application.id.substring(0, 8), // Korte ID voor display
      payment_amount: '€30,00',
      total_amount: '€300,00',
      remaining_amount: '€270,00'
    };

    // Verstuur email met template
    const result = await sendTemplateEmail({
      to: profile.email,
      template: 'wasstrips-deposit-paid',
      subject: 'Uw aanbetaling van €30 is ontvangen - Wasstrips bestelling',
      context: emailContext,
      replyTo: brandingContext.company_email
    });

    if (result.success) {
      console.log('[WEBHOOK] Successfully sent deposit confirmation email');
    } else {
      console.error('[WEBHOOK] Failed to send deposit confirmation email:', result.error);
    }

  } catch (error) {
    console.error('[WEBHOOK] Error sending deposit confirmation email:', error);
  }
}

// Ondersteun ook OPTIONS requests voor CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
}
