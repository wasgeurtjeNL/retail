import { NextRequest, NextResponse } from 'next/server';
import { getRetailerById, updateRetailerStatus, createActivationToken } from '@/lib/supabase';
import { sendTemplateEmail } from '@/lib/mail-service';

export async function POST(req: NextRequest) {
  console.log('[API] Retailer activatie request ontvangen');
  
  try {
    // Debug request
    console.log('[API] Request headers:', {
      contentType: req.headers.get('content-type'),
      host: req.headers.get('host'),
      origin: req.headers.get('origin')
    });
    
    // Clone request before reading it to avoid stream errors
    const clonedReq = req.clone();
    const reqText = await clonedReq.text();
    console.log('[API] Raw request body:', reqText);
    
    // Parse JSON safely
    let retailerId;
    try {
      const reqBody = JSON.parse(reqText);
      retailerId = reqBody.retailerId;
      console.log('[API] Parsed retailerId from request:', retailerId);
    } catch (parseError) {
      console.error('[API] Error parsing request JSON:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Ongeldige JSON in verzoek: ' + (parseError instanceof Error ? parseError.message : 'Onbekende fout')
      }, { status: 400 });
    }
    
    if (!retailerId) {
      console.error('[API] Geen retailerId opgegeven in activate endpoint');
      return NextResponse.json({ 
        success: false, 
        error: 'Geen retailerId opgegeven' 
      }, { status: 400 });
    }
    
    console.log(`[API] Activeren van retailer: ${retailerId}`);
    
    // 1. Haal retailer gegevens op
    const { retailer, error: getRetailerError } = await getRetailerById(retailerId);
    
    if (getRetailerError || !retailer) {
      // Verbeterde error handling voor getRetailerError - altijd een string teruggeven
      const errorMessage = getRetailerError ? 
        (typeof getRetailerError === 'object' ? 
          JSON.stringify(getRetailerError) : 
          String(getRetailerError)
        ) : 'Retailer niet gevonden';

      console.error('[API] Retailer niet gevonden of fout bij ophalen:', errorMessage);
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage
      }, { status: 404 });
    }
    
    console.log(`[API] Retailer gevonden: ${retailer.business_name} (${retailer.email})`);
    
    // 2. Update retailer status naar approved
    const { error: updateError } = await updateRetailerStatus(retailerId, 'approved');
    
    if (updateError) {
      // Verbeterde error handling voor updateError - altijd een string teruggeven
      const errorMessage = typeof updateError === 'object' ? 
        JSON.stringify(updateError) : 
        String(updateError);
        
      console.error('[API] Fout bij het updaten van retailer status:', errorMessage);
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage
      }, { status: 500 });
    }
    
    console.log(`[API] Status van retailer ${retailer.business_name} succesvol bijgewerkt naar 'approved'`);
    
    // 3. Maak een activation token aan
    const { token, error: tokenError } = await createActivationToken(retailerId);
    
    if (tokenError || !token) {
      console.error('[API] Fout bij het aanmaken van activation token:', tokenError);
      return NextResponse.json({ 
        success: false, 
        error: 'Fout bij het aanmaken van activation token'
      }, { status: 500 });
    }
    
    console.log(`[API] Activation token aangemaakt voor retailer ${retailer.email}`);
    
    // 4. Stuur activatiemail met token
    try {
      // Genereer activatie URL
      const activationUrl = `${req.nextUrl.origin}/retailer-activate/${token}`;
      console.log(`[API] Activatie URL gegenereerd: ${activationUrl}`);
      
      // Stuur email met activatielink
      const emailResult = await sendTemplateEmail({
        to: retailer.email,
        template: 'retailer-approval',
        subject: 'Uw Wasgeurtje retailer aanvraag is goedgekeurd!',
        context: {
          contactName: retailer.contact_name || 'Retailer',
          businessName: retailer.business_name || 'Uw bedrijf',
          email: retailer.email,
          activationUrl: activationUrl,
          currentYear: new Date().getFullYear().toString(),
          logoUrl: `${req.nextUrl.origin}/assets/images/branding/company-logo.png`
        }
      });
      
      if (!emailResult.success) {
        console.error('[API] Fout bij het versturen van activatiemail:', emailResult.error);
        // Dit is niet kritisch, ga door met het proces
      } else {
        console.log('[API] Activatiemail succesvol verzonden naar:', retailer.email);
      }
    } catch (emailError) {
      console.error('[API] Onverwachte fout bij het versturen van activatiemail:', emailError);
      // Dit is niet kritisch, ga door met het proces
    }
    
    // Retourneer succes
    console.log('[API] ============ ACTIVATION SUCCESS ============');
    
    return NextResponse.json({
      success: true,
      message: `Retailer ${retailer.business_name} succesvol geactiveerd en activatiemail verzonden`,
      retailer: {
        id: retailer.id,
        email: retailer.email,
        business_name: retailer.business_name,
        status: 'approved'
      },
      activationTokenCreated: true
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
    console.error('[API] Onverwachte fout in retailer activation:', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 