import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplate, compileTemplate } from '@/lib/email-templates';
import { sendEmail, isMandrillConfigured } from '@/lib/mail-service';

// Debug helper
function logDebug(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log('[EMAIL TEST TEMPLATE]', ...args);
}

// POST /api/email/test-template
export async function POST(request: NextRequest) {
  try {
    // Body uitlezen en valideren
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      logDebug('Body kon niet worden geparsed:', err);
      return NextResponse.json({ error: 'Ongeldige JSON body' }, { status: 400 });
    }
    const { templateKey, email, testData } = body || {};
    if (!templateKey || !email) {
      logDebug('Ontbrekende velden:', { templateKey, email });
      return NextResponse.json({ error: 'templateKey en email zijn verplicht' }, { status: 400 });
    }

    // Template ophalen
    const template = await getEmailTemplate(templateKey);
    if (!template) {
      logDebug('Template niet gevonden:', templateKey);
      return NextResponse.json({ error: 'Template niet gevonden' }, { status: 404 });
    }

    // Testdata fallback
    const context = typeof testData === 'object' && testData !== null
      ? testData
      : {
          contactName: 'Testgebruiker',
          businessName: 'Testbedrijf BV',
          email: 'test@example.com',
          phone: '0612345678',
        };

    // Compileer template
    let subject, html, text;
    try {
      subject = compileTemplate(template.subject, context);
      html = compileTemplate(template.html, context);
      text = compileTemplate(template.text, context);
    } catch (err) {
      logDebug('Fout bij compileren van template:', err);
      return NextResponse.json({ error: 'Fout bij compileren van template', details: String(err) }, { status: 500 });
    }

    // Mandrill check
    const mandrillConfigured = isMandrillConfigured();
    logDebug('Mandrill geconfigureerd:', mandrillConfigured);

    // Simuleer verzending in dev als Mandrill ontbreekt
    if (!mandrillConfigured) {
      logDebug('Mandrill niet geconfigureerd, simuleer verzending');
      return NextResponse.json({
        success: true,
        message: `Simulatie: testmail zou worden verzonden naar ${email}`,
        development: true,
      });
    }

    // E-mail verzenden
    logDebug('Versturen email naar:', email, 'met subject:', subject);
    const result = await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html,
      text,
    });

    // Resultaat checken
    if (!result.success) {
      let errorMsg = 'Onbekende fout bij verzenden van testmail';
      if (result.error) {
        if (typeof result.error === 'object' && result.error !== null && 'message' in result.error) {
          errorMsg = String((result.error as any).message);
        } else {
          errorMsg = String(result.error);
        }
      }
      logDebug('Mandrill fout:', errorMsg, result.error);
      return NextResponse.json({
        success: false,
        error: errorMsg,
        details: typeof result.error === 'object' ? JSON.stringify(result.error) : String(result.error),
      }, { status: 500 });
    }

    logDebug('Testmail succesvol verzonden naar', email);
    return NextResponse.json({
      success: true,
      message: `Testmail succesvol verzonden naar ${email}`,
      mandrillConfigured: true,
    });
  } catch (error: any) {
    logDebug('Onverwachte serverfout:', error);
    return NextResponse.json({
      error: 'Onverwachte serverfout',
      details: error?.message ? String(error.message) : String(error),
      stack: error?.stack ? String(error.stack) : null,
    }, { status: 500 });
  }
}

// Genereer standaard testdata afhankelijk van template type
function createDefaultTestData(templateKey: string): Record<string, any> {
  const baseData = {
    logoUrl: 'https://wasgeurtje.nl/logo.png',
    businessName: 'Testbedrijf BV',
    contactName: 'John Doe',
    email: 'test@example.com',
    phone: '0612345678',
    date: new Date().toLocaleDateString('nl-NL')
  };
  
  // Voeg template-specifieke data toe
  switch (templateKey) {
    case 'retailer-registration-confirmation':
      return baseData;
      
    case 'retailer-approval':
      return {
        ...baseData,
        activationUrl: 'https://wasgeurtje.nl/activate?token=123456789'
      };
      
    case 'retailer-rejection':
      return {
        ...baseData,
        rejectionReason: 'Deze aanvraag is alleen voor testdoeleinden.'
      };
      
    case 'order-confirmation':
      return {
        ...baseData,
        orderNumber: 'WG-1234',
        orderDate: new Date().toLocaleDateString('nl-NL'),
        items: [
          { name: 'Wasgeurblokje Lavendel', quantity: 2, price: '12.95' },
          { name: 'Wasgeurblokje Vanille', quantity: 1, price: '12.95' }
        ],
        subtotal: '38.85',
        tax: '8.16',
        shipping: '4.95',
        total: '51.96',
        address: 'Voorbeeldstraat 123',
        postalCode: '1234 AB',
        city: 'Amsterdam',
        country: 'Nederland',
        orderDetailsUrl: 'https://wasgeurtje.nl/order/WG-1234'
      };
      
    case 'admin-notification':
      return {
        ...baseData,
        notificationType: 'Nieuwe Retailer Aanmelding',
        details: {
          bedrijfsnaam: 'Testbedrijf BV',
          contactpersoon: 'John Doe',
          email: 'test@example.com',
          telefoonnummer: '0612345678',
          aanmeldingsdatum: new Date().toLocaleDateString('nl-NL')
        },
        actionUrl: 'https://wasgeurtje.nl/dashboard/retailers'
      };
      
    default:
      return baseData;
  }
} 