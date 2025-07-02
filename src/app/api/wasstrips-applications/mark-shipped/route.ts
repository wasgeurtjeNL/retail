import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTemplateEmail, getEmailBrandingContext } from '@/lib/mail-service';

// API route voor het markeren van Wasstrips applicaties als verzonden
export async function POST(req: NextRequest) {
  try {
    const { applicationId, trackingCode } = await req.json();

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    console.log('[API] Marking Wasstrips application as shipped:', applicationId);

    // Supabase client met service role voor admin operaties
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal applicatie gegevens op
    const { data: application, error: appError } = await supabase
      .from('wasstrips_applications')
      .select(`
        *,
        profiles!wasstrips_applications_profile_id_fkey (
          id, email, company_name, full_name
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[API] Application not found:', appError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Controleer of applicatie al verzonden is
    if (application.status === 'shipped') {
      return NextResponse.json({ error: 'Application is already marked as shipped' }, { status: 400 });
    }

    // Controleer of applicatie goedgekeurd is
    if (application.status !== 'approved') {
      return NextResponse.json({ error: 'Application must be approved before shipping' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update applicatie status naar verzonden
    const updateData: any = {
      status: 'shipped',
      shipped_at: now,
      updated_at: now
    };

    // Voeg tracking code toe als opgegeven
    if (trackingCode) {
      updateData.tracking_code = trackingCode;
    }

    const { error: updateError } = await supabase
      .from('wasstrips_applications')
      .update(updateData)
      .eq('id', applicationId);

    if (updateError) {
      console.error('[API] Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    console.log('[API] Successfully marked application as shipped');

    // Verstuur verzendbevestiging email
    if (application.profiles) {
      await sendShippingConfirmationEmail(application.profiles, application, trackingCode);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Application marked as shipped successfully',
      trackingCode: trackingCode || null
    });

  } catch (error) {
    console.error('[API] Error in mark-shipped route:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Verstuur verzendbevestiging email
async function sendShippingConfirmationEmail(profile: any, application: any, trackingCode?: string) {
  try {
    console.log('[API] Sending shipping confirmation email to:', profile.email);

    // Haal branding context op
    const brandingContext = await getEmailBrandingContext();
    
    // Bereid email context voor
    const emailContext = {
      ...brandingContext,
      retailer_name: profile.company_name || profile.full_name || 'Retailer',
      shipping_date: new Date().toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      application_id: application.id.substring(0, 8),
      tracking_code: trackingCode || 'Wordt later toegevoegd',
      has_tracking: !!trackingCode
    };

    // Verstuur email met template (we maken deze template nog)
    const result = await sendTemplateEmail({
      to: profile.email,
      template: 'wasstrips-shipped',
      subject: 'Uw Wasstrips bestelling is verzonden! 📦',
      context: emailContext,
      replyTo: brandingContext.company_email
    });

    if (result.success) {
      console.log('[API] Successfully sent shipping confirmation email');
    } else {
      console.error('[API] Failed to send shipping confirmation email:', result.error);
    }

  } catch (error) {
    console.error('[API] Error sending shipping confirmation email:', error);
  }
} 