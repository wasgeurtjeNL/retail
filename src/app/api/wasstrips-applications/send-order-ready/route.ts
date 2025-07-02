// API route voor het versturen van "bestelling binnen" melding naar retailers
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json();
    
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    console.log('[API] Sending order ready notification for application:', applicationId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal eerst de applicatie op
    const { data: application, error: fetchError } = await supabase
      .from('wasstrips_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('[API] Error fetching application:', fetchError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Haal dan het bijbehorende profiel op
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', application.profile_id)
      .single();

    if (profileError || !profile) {
      console.error('[API] Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Controleer of aanbetaling betaald is
    if (application.deposit_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Deposit must be paid before sending order ready notification' 
      }, { status: 400 });
    }

    // Controleer of melding niet al verstuurd is
    if (application.status === 'order_ready' || application.payment_options_sent) {
      return NextResponse.json({ 
        error: 'Order ready notification has already been sent' 
      }, { status: 400 });
    }

    // Update de applicatie status naar order_ready
    const { data: updatedApp, error: updateError } = await supabase
      .from('wasstrips_applications')
      .update({
        status: 'order_ready',
        payment_options_sent: true,
        payment_options_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Verstuur email naar retailer met "bestelling binnen" melding
    try {
      const { sendTemplateEmail, getEmailBrandingContext } = await import('../../../../lib/mail-service');
      
      // Haal branding context op voor email
      const brandingContext = await getEmailBrandingContext();
      
      // Genereer payment options URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const paymentOptionsUrl = `${baseUrl}/retailer-dashboard/payment-options/${applicationId}`;
      
      // Email context samenstellen
      const emailContext = {
        ...brandingContext,
        retailer_name: profile.company_name || profile.business_name,
        application_id: applicationId,
        payment_options_url: paymentOptionsUrl,
        company_email: 'orders@wasgeurtje.nl',
        company_name: 'Wasgeurtje.nl'
      };
      
      console.log('[API] Sending order ready email to:', profile.email, 'with context:', emailContext);
      
      // Verstuur email
      const emailResult = await sendTemplateEmail({
        to: profile.email,
        template: 'wasstrips-order-ready',
        subject: 'Uw Wasstrips bestelling is binnen - Kies uw betaalmethode 📦',
        context: emailContext,
        replyTo: 'orders@wasgeurtje.nl'
      });
      
      if (!emailResult.success && !emailResult.development) {
        console.error('[API] Failed to send order ready email:', emailResult.error);
        // Continue anyway - de database update is al gedaan
      } else if (emailResult.development) {
        console.log('[API] Order ready email logged (development mode) for:', profile.email);
      } else {
        console.log('[API] Order ready email sent successfully to:', profile.email);
      }
      
    } catch (emailError) {
      console.error('[API] Error sending order ready email:', emailError);
      // Continue anyway - de database update is al gedaan
    }
    
    console.log('[API] Order ready notification sent successfully for:', applicationId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bestelling binnen melding verstuurd naar retailer',
      application: updatedApp
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 