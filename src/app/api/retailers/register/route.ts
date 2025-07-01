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
        status: 'pending'  // Start als 'pending' voor admin goedkeuring
      });

    if (profileError) {
      console.error('Fout bij aanmaken van profiel:', profileError);
      // Optioneel: verwijder de aangemaakte auth user als het profiel niet kan worden aangemaakt
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 4. Maak een wasstrips aanvraag aan indien aangevinkt
    if (wasstripsOptin) {
      const { error: wasstripsError } = await supabaseAdmin
        .from('wasstrips_applications')
        .insert({
          profile_id: userId,
          status: 'pending', // Start als 'pending' voor admin goedkeuring
          metadata: {
            deposit_agreed: wasstripsDepositAgreed,
            application_source: 'RegistrationForm'
          },
          created_at: new Date().toISOString() // Expliciet tijdstip van opslaan
        });

      if (wasstripsError) {
        // Log de fout, maar laat de registratie doorgaan.
        // Dit is geen kritieke fout die de hele flow moet stoppen.
        console.error('Fout bij aanmaken van wasstrips aanvraag:', wasstripsError);
      }
    }

    // TODO: Stuur e-mails voor activatie en notificatie

    return NextResponse.json({ success: true, message: 'Registratie succesvol ontvangen.' });

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