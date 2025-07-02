import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, sendAdminNotificationEmail } from '@/lib/mail-service';

// Gebruik admin client voor server-side operaties
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      businessName, 
      contactName, 
      email, 
      phone, 
      address, 
      city, 
      postalCode, 
      country,
      wasstripsOptin,
      wasstripsDepositAgreed,
      message,
      // Andere velden worden genegeerd voor nu
    } = body;

    // 1. Valideer de input
    if (!businessName || !contactName || !email || !phone) {
      return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 });
    }

    // 2. Maak de gebruiker aan in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8), // Genereer een tijdelijk, willekeurig wachtwoord
      email_confirm: true, // Markeer e-mail aápils bevestigd, activatie gebeurt later
    });

    if (authError) {
      console.error('Fout bij aanmaken van auth user:', authError);
      // Geef een gebruiksvriendelijke foutmelding
      if (authError.message.includes('unique constraint')) {
        return NextResponse.json({ error: 'Een gebruiker met dit e-mailadres bestaat al.' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user.id;

    // 3. Maak het profiel aan in de 'profiles' tabel
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: contactName,
        company_name: businessName,
        phone,
        address,
        city,
        postal_code: postalCode,
        country,
        role: 'retailer', // Standaardrol voor nieuwe registraties
        status: 'pending',  // Start als 'pending' voor admin goedkeuring
        metadata: message ? { message } : {} // <-- Sla extra info op in metadata
      });

    if (profileError) {
      console.error('Fout bij aanmaken van profiel:', profileError);
      // Optioneel: verwijder de aangemaakte auth user als het profiel niet kan worden aangemaakt
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 4. Maak een wasstrips aanvraag aan indien aangevinkt
    let wasstripsApplicationResult = null;
    if (wasstripsOptin) {
      const { data: wasstripsData, error: wasstripsError } = await supabaseAdmin
        .from('wasstrips_applications')
        .insert({
          profile_id: userId,
          status: 'pending', // Start als 'pending' voor admin goedkeuring
          metadata: {
            deposit_agreed: wasstripsDepositAgreed,
            application_source: 'RegistrationForm'
          },
          created_at: new Date().toISOString() // Expliciet tijdstip van opslaan
        })
        .select();

      if (wasstripsError) {
        // Geef een duidelijke foutmelding terug en stop de registratie
        console.error('Fout bij aanmaken van wasstrips aanvraag:', wasstripsError);
        // Optioneel: verwijder de aangemaakte auth user en profiel
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        return NextResponse.json({ error: 'Fout bij aanmaken van wasstrips aanvraag: ' + wasstripsError.message }, { status: 500 });
      }
      wasstripsApplicationResult = wasstripsData ? wasstripsData[0] : null;
    }

    // --- NIEUW: Verstuur bevestigingsmail naar retailer en notificatie naar admin ---
    // Haal e-mailtemplate op en verstuur bevestiging naar de nieuwe retailer
    try {
      // Importeer dynamisch om circular imports te voorkomen
      const { getEmailTemplate, compileTemplate } = await import('@/lib/email-templates');
      // Haal de template op voor registratiebevestiging
      const template = await getEmailTemplate('retailer-registration-confirmation');
      if (template) {
        // Verstuur bevestigingsmail naar retailer
        await sendEmail({
          to: email,
          subject: template.subject,
          html: compileTemplate(template.html, {
            contactName,
            businessName,
            email,
            phone,
            currentYear: new Date().getFullYear().toString(),
            logoUrl: `${req.nextUrl.origin}/images/logo.png`
          }),
          text: compileTemplate(template.text, {
            contactName,
            businessName,
            email,
            phone,
            currentYear: new Date().getFullYear().toString()
          })
        });
      } else {
        console.warn('Geen e-mailtemplate gevonden voor retailer registratie bevestiging.');
      }
    } catch (mailError) {
      // Log alleen, want registratie moet altijd doorgaan
      console.error('Fout bij versturen van registratiebevestiging:', mailError);
    }

    // Stuur notificatie naar admin (optioneel: pas e-mailadres aan indien gewenst)
    try {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@wasgeurtje.nl';
      const { getEmailTemplate, compileTemplate } = await import('@/lib/email-templates');
      const adminTemplate = await getEmailTemplate('admin-notification');
      if (adminTemplate) {
        await sendEmail({
          to: adminEmail,
          subject: '[Nieuwe retailer registratie] ' + businessName,
          html: compileTemplate(adminTemplate.html, {
            notificationType: 'Nieuwe retailer registratie',
            date: new Date().toLocaleDateString('nl-NL'),
            details: {
              bedrijfsnaam: businessName,
              contactpersoon: contactName,
              email,
              telefoonnummer: phone
            },
            actionUrl: `${req.nextUrl.origin}/dashboard/retailers`,
            currentYear: new Date().getFullYear().toString(),
            logoUrl: `${req.nextUrl.origin}/images/logo.png`
          }),
          text: compileTemplate(adminTemplate.text, {
            notificationType: 'Nieuwe retailer registratie',
            date: new Date().toLocaleDateString('nl-NL'),
            details: {
              bedrijfsnaam: businessName,
              contactpersoon: contactName,
              email,
              telefoonnummer: phone
            },
            actionUrl: `${req.nextUrl.origin}/dashboard/retailers`,
            currentYear: new Date().getFullYear().toString()
          })
        });
      }
    } catch (adminMailError) {
      console.error('Fout bij versturen van admin notificatie:', adminMailError);
    }
    // --- EINDE NIEUW ---

    return NextResponse.json({ 
      success: true, 
      message: 'Registratie succesvol ontvangen.',
      wasstripsApplication: wasstripsApplicationResult
    });

  } catch (error) {
    console.error('Onverwachte fout in registratie API:', error);
    return NextResponse.json(
      { error: 'Er is een onverwachte fout opgetreden.' }, 
      { status: 500 }
    );
  }
}

// For dev mode and testing
export async function GET() {
  return NextResponse.json({ message: 'Use POST to register a retailer' });
} 