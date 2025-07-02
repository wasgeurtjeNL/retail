import { NextRequest, NextResponse } from 'next/server';
import { createActivationToken, getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  console.log('[API] Resend activation request ontvangen');
  
  try {
    const body = await req.json();
    const { retailerId } = body;
    
    if (!retailerId) {
      return NextResponse.json({
        success: false,
        error: 'Retailer ID is verplicht'
      }, { status: 400 });
    }
    
    console.log(`[API] Resending activation for retailer: ${retailerId}`);
    
    // 1. Haal retailer gegevens op (gebruik service role voor admin functie)
    const supabase = getServiceRoleClient();
    const { data: retailer, error: getError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', retailerId)
      .eq('role', 'retailer')
      .single();
    
    if (getError || !retailer) {
      console.error('[API] Retailer not found:', getError);
      return NextResponse.json({
        success: false,
        error: 'Retailer niet gevonden'
      }, { status: 404 });
    }
    
    console.log(`[API] Found retailer: ${retailer.company_name} (${retailer.email})`);
    
    // 2. Maak een nieuwe activation token aan
    const { token, error: tokenError } = await createActivationToken(retailerId);
    
    if (tokenError || !token) {
      console.error('[API] Error creating activation token:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Fout bij het aanmaken van activation token'
      }, { status: 500 });
    }
    
    console.log(`[API] New activation token created for retailer ${retailer.email}`);
    
    // 3. Stuur activatiemail
    try {
      const activationUrl = `${req.nextUrl.origin}/retailer-activate/${token}`;
      
      // Gebruik dezelfde werkende methode als in notify route
      const context = {
        contactName: retailer.full_name || 'Retailer',
        businessName: retailer.company_name || 'Uw bedrijf',
        email: retailer.email,
        activationUrl: activationUrl,
        currentYear: new Date().getFullYear().toString(),
        logoUrl: `${req.nextUrl.origin}/assets/images/branding/company-logo.png`
      };
      
      const emailResult = await import('@/lib/mail-service').then(({ sendTemplateEmail }) =>
        sendTemplateEmail({
          to: retailer.email,
          template: 'retailer-approval',
          subject: 'Activeer uw Wasgeurtje retailer account',
          context
        })
      );
      
      if (!emailResult.success) {
        console.error('[API] Error sending activation email:', emailResult.error);
        return NextResponse.json({
          success: false,
          error: 'Fout bij het versturen van activatiemail'
        }, { status: 500 });
      }
      
      console.log('[API] Activation email sent successfully to:', retailer.email);
      
    } catch (emailError) {
      console.error('[API] Unexpected error sending email:', emailError);
      return NextResponse.json({
        success: false,
        error: 'Onverwachte fout bij het versturen van email'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Nieuwe activatiemail verzonden naar ${retailer.email}`,
      retailer: {
        id: retailer.id,
        email: retailer.email,
        company_name: retailer.company_name
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
    console.error('[API] Unexpected error in resend activation:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Er is een onverwachte fout opgetreden'
    }, { status: 500 });
  }
} 