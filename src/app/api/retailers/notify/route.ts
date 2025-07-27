import { NextRequest, NextResponse } from 'next/server';
import { getRetailerById } from '@/lib/supabase';
import { sendEmail as sendMailchimpEmail, isMandrillConfigured } from '@/lib/mail-service';

// In een echte productieomgeving zou je hier een email service zoals SendGrid, Mailgun, etc. integreren
// Voor nu simuleren we het versturen van emails

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { retailerId, action, reason } = body;
    
    console.log(`[NOTIFY] Verzoek ontvangen voor retailer ${retailerId}, actie: ${action}`);
    
    if (!retailerId || !action) {
      console.error(`[NOTIFY] Fout: Ontbrekende vereiste velden: retailerId=${retailerId}, action=${action}`);
      return NextResponse.json({ error: 'Retailer ID en actie zijn verplicht' }, { status: 400 });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      console.error(`[NOTIFY] Fout: Ongeldige actie: ${action}`);
      return NextResponse.json({ error: 'Ongeldige actie. Gebruik "approve" of "reject"' }, { status: 400 });
    }
    
    // Haal retailer gegevens op via service role client (voor admin toegang)
    console.log(`[NOTIFY] Ophalen van retailer gegevens voor ID: ${retailerId}`);
    const { getServiceRoleClient } = await import('@/lib/supabase');
    const serviceClient = getServiceRoleClient();
    
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', retailerId)
      .eq('role', 'retailer')
      .single();
    
    if (profileError || !profileData) {
      console.error(`[NOTIFY] Fout bij ophalen retailer:`, profileError);
      return NextResponse.json({ 
        success: false, 
        error: 'Retailer niet gevonden',
        errorCode: 'NOT_FOUND',
        details: `Het ID ${retailerId} bestaat niet in het systeem. Controleer het correcte ID via het dashboard.`
      }, { status: 404 });
    }
    
    // Map profile data naar retailer format
    const retailer = {
      id: profileData.id,
      user_id: profileData.id,
      business_name: profileData.company_name || 'Onbekend bedrijf',
      contact_name: profileData.full_name || 'Onbekende naam',
      email: profileData.email,
      phone: profileData.phone || '',
      address: profileData.address || '',
      city: profileData.city || '',
      postal_code: profileData.postal_code || '',
      country: profileData.country || 'Nederland',
      status: profileData.status === 'active' ? 'approved' : (profileData.status === 'suspended' ? 'rejected' : 'pending'),
      created_at: profileData.created_at
    };
    
    const error = null;
    
    let emailResult; // Zorg dat emailResult overal beschikbaar is
    let emailSubject = '';
    let emailBody = '';
    
    if (error || !retailer) {
      console.error(`[NOTIFY] Fout bij ophalen retailer:`, error);
      // Stop het proces hier met een duidelijke foutmelding
      return NextResponse.json({ 
        success: false, 
        error: error?.message || 'Retailer niet gevonden',
        errorCode: error ? String((error as any).code) : 'NOT_FOUND',
        details: `Het ID ${retailerId} bestaat niet in het systeem. Controleer het correcte ID via het dashboard.`
      }, { status: 404 });
    }
    
    // Log volledig retailer object zodat we alle gegevens kunnen controleren
    console.log('[NOTIFY] Retailer gegevens ontvangen van getRetailerById:', {
      id: retailer.id,
      business_name: retailer.business_name,
      contact_name: retailer.contact_name,
      email: retailer.email,
      status: retailer.status
    });
    
    // Extra veiligheidscontrole op e-mailadres
    if (!retailer.email) {
      console.error(`[NOTIFY] Retailer gevonden maar heeft geen e-mailadres: ${retailer.id} (${retailer.business_name})`);
      return NextResponse.json({ 
        success: false, 
        error: 'Retailer heeft geen e-mailadres',
        errorCode: 'MISSING_EMAIL',
        details: `De retailer ${retailer.business_name} heeft geen e-mailadres ingesteld. Update het e-mailadres van de retailer.`
      }, { status: 400 });
    }
    
    console.log(`[NOTIFY] Retailer gevonden: ${retailer.business_name} (${retailer.email})`);
    
    if (action === 'approve') {
      // Stap 1: Update retailer status naar 'active' via service role client
      const { error: updateError } = await serviceClient
        .from('profiles')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', retailerId);
      
      if (updateError) {
        console.error('[NOTIFY] Error updating retailer status:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Fout bij updaten retailer status',
          details: 'Database update failed'
        }, { status: 500 });
      }
      
      // Stap 2: Genereer activation token
      const { createActivationToken } = await import('@/lib/supabase');
      const tokenResult = await createActivationToken(retailerId);
      
      if (tokenResult.error) {
        console.error('[NOTIFY] Error creating activation token:', tokenResult.error);
        return NextResponse.json({ 
          success: false, 
          error: 'Fout bij genereren activation token',
          details: 'Token generation failed'
        }, { status: 500 });
      }
      
      // Stap 3: Verstuur activatiemail met activation link
      const activationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/retailer-activate/${tokenResult.token}`;
      
      const context = {
        contactName: retailer.contact_name,
        businessName: retailer.business_name,
        email: retailer.email,
        currentYear: new Date().getFullYear().toString(),
        logoUrl: 'https://wasgeurtje.nl/images/logo.png',
        activationUrl: activationUrl
      };
      
      emailResult = await import('@/lib/mail-service').then(({ sendTemplateEmail }) =>
        sendTemplateEmail({
          to: retailer.email,
          template: 'retailer-approval',
          subject: 'Uw Wasgeurtje retailer aanvraag is goedgekeurd!',
          context
        })
      );
    } else {
      emailSubject = 'Update over uw Wasgeurtje Retailer aanvraag';
      emailBody = `
        Beste ${retailer.contact_name},
        
        Bedankt voor uw interesse in het worden van een Wasgeurtje retailer.
        
        Na zorgvuldige overweging kunnen we helaas niet doorgaan met uw aanvraag op dit moment.
        ${reason ? `\n\nReden: ${reason}` : ''}
        
        Als u vragen heeft of meer informatie wenst, aarzel dan niet om contact met ons op te nemen.
        
        Met vriendelijke groet,
        Het Wasgeurtje Team
      `;
      emailResult = await sendMailchimpEmail({
        to: retailer.email,
        subject: emailSubject,
        text: emailBody,
      });
    }
    
    console.log(`[NOTIFY] Verzenden van email naar ${retailer.email}, onderwerp: ${emailSubject}`);
    
    // Check Mandrill configuratie
    const mandrill_configured = isMandrillConfigured();
    console.log(`[NOTIFY] Mandrill geconfigureerd: ${mandrill_configured}`);
    
    // Zelfs als email verzenden faalt, blijft de status update van de retailer geldig
    // We sturen een waarschuwing maar gaan verder met het proces
    
    return NextResponse.json({
      success: true,
      message: `Notificatie voor ${action === 'approve' ? 'goedkeuring' : 'afwijzing'} is ${emailResult?.success ? 'verstuurd' : 'NIET verstuurd'} naar ${retailer.email}`,
      emailSent: emailResult?.success || false,
      mandrillConfigured: mandrill_configured,
      emailDetails: emailResult
    });
  } catch (error) {
    console.error('[NOTIFY] Onverwachte fout bij verwerken notificatie:', error);
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het versturen van de notificatie', details: error instanceof Error ? error.message : 'Onbekende fout' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to send retailer notifications' });
} 