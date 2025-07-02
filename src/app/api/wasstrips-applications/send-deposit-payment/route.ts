// API route voor het versturen van aanbetaling links naar retailers
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json();
    
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    console.log('[API] Sending deposit payment link for application:', applicationId);

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

    // Controleer of retailer goedgekeurd is
    if (profile.status !== 'active') {
      return NextResponse.json({ 
        error: 'Retailer must be approved before sending deposit payment link' 
      }, { status: 400 });
    }

    // Controleer of aanbetaling al verstuurd/betaald is
    if (application.deposit_status === 'paid') {
      return NextResponse.json({ 
        error: 'Deposit has already been paid' 
      }, { status: 400 });
    }

    // Genereer unieke payment link ID
    const paymentLinkId = `deposit-${applicationId}-${Date.now()}`;
    
    // Update de applicatie met deposit link status
    const { data: updatedApp, error: updateError } = await supabase
      .from('wasstrips_applications')
      .update({
        deposit_status: 'sent',
        deposit_payment_link: paymentLinkId,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Verstuur email naar retailer met aanbetaling link
    try {
      const { sendTemplateEmail, getEmailBrandingContext } = await import('../../../../lib/mail-service');
      
      // Haal branding context op voor email
      const brandingContext = await getEmailBrandingContext();
      
      // Genereer betaal URL (voor nu een placeholder, later te vervangen door echte Stripe link)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const paymentUrl = `${baseUrl}/payment/deposit/${paymentLinkId}`;
      
      // Email context samenstellen
      const emailContext = {
        ...brandingContext,
        contactName: profile.contact_name || profile.business_name,
        businessName: profile.business_name,
        email: profile.email,
        paymentUrl,
        amount: '30,00',
        totalAmount: '300,00',
        remainingAmount: '270,00'
      };
      
      // Verstuur email
      const emailResult = await sendTemplateEmail({
        to: profile.email,
        template: 'wasstrips-deposit-payment',
        subject: 'Aanbetaling voor uw Wasstrips bestelling - €30',
        context: emailContext,
        replyTo: 'orders@wasgeurtje.nl'
      });
      
      if (!emailResult.success && !emailResult.development) {
        console.error('[API] Failed to send deposit payment email:', emailResult.error);
        // Continue anyway - de database update is al gedaan
      } else if (emailResult.development) {
        console.log('[API] Deposit payment email logged (development mode) for:', profile.email);
      } else {
        console.log('[API] Deposit payment email sent successfully to:', profile.email);
      }
      
    } catch (emailError) {
      console.error('[API] Error sending deposit payment email:', emailError);
      // Continue anyway - de database update is al gedaan
    }
    
    console.log('[API] Deposit payment link sent successfully for:', applicationId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Aanbetaling link verstuurd naar retailer',
      paymentLinkId,
      application: updatedApp
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 