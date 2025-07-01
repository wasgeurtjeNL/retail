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
    
    // Haal retailer gegevens op
    console.log(`[NOTIFY] Ophalen van retailer gegevens voor ID: ${retailerId}`);
    const { retailer, error } = await getRetailerById(retailerId);
    
    if (error || !retailer) {
      console.error(`[NOTIFY] Fout bij ophalen retailer:`, error);
      // Stop het proces hier met een duidelijke foutmelding
      return NextResponse.json({ 
        success: false, 
        error: error?.message || 'Retailer niet gevonden',
        errorCode: error?.code || 'NOT_FOUND',
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
    
    let emailSubject = '';
    let emailBody = '';
    
    if (action === 'approve') {
      emailSubject = 'Uw Wasgeurtje Retailer aanvraag is goedgekeurd!';
      emailBody = `
        Beste ${retailer.contact_name},
        
        Goed nieuws! Uw aanvraag om Wasgeurtje retailer te worden is goedgekeurd.
        
        We zullen binnenkort contact met u opnemen om de volgende stappen te bespreken en uw gratis proefpakket te versturen.
        
        U kunt nu inloggen op ons retailer portaal met uw e-mailadres. Als u nog geen wachtwoord heeft ingesteld, 
        kunt u de "wachtwoord vergeten" functie gebruiken om een wachtwoord in te stellen.
        
        Heeft u vragen? Neem dan gerust contact met ons op.
        
        Met vriendelijke groet,
        Het Wasgeurtje Team
      `;
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
    }
    
    console.log(`[NOTIFY] Verzenden van email naar ${retailer.email}, onderwerp: ${emailSubject}`);
    
    // Check Mandrill configuratie
    const mandrill_configured = isMandrillConfigured();
    console.log(`[NOTIFY] Mandrill geconfigureerd: ${mandrill_configured}`);
    
    // Poging tot verzenden van email
    let emailResult;
    try {
      // Gebruik de nieuwe mail-service
      emailResult = await sendMailchimpEmail({
        to: retailer.email,
        subject: emailSubject,
        text: emailBody,
      });
      
      console.log(`[NOTIFY] Email verzendresultaat:`, emailResult);
    } catch (emailError) {
      console.error(`[NOTIFY] Onverwachte fout bij verzenden email:`, emailError);
      emailResult = { 
        success: false, 
        error: emailError,
        errorMessage: emailError instanceof Error ? emailError.message : 'Onbekende fout bij verzenden' 
      };
    }
    
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