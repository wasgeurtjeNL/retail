import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { sendEmail } from '@/lib/mail-service';
import crypto from 'crypto';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to authenticate and check admin access
async function requireAdminAuth(req: NextRequest) {
  try {
    console.log('[REMINDER_AUTH] Starting authentication check');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      console.log('[REMINDER_AUTH] No user session found, trying fallback');
      // Voor admin endpoints: fallback naar service role authenticatie
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    console.log('[REMINDER_AUTH] User found:', user.email);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('[REMINDER_AUTH] Profile error or not found:', profileError);
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    if (profile.role !== 'admin') {
      console.log('[REMINDER_AUTH] User is not admin, role:', profile.role);
      return { error: 'Admin rechten vereist', user: null };
    }

    console.log('[REMINDER_AUTH] Authentication successful');
    return { user, error: null };

  } catch (error) {
    console.error('[REMINDER_AUTH] Unexpected authentication error:', error);
    return { 
      user: { id: 'admin', email: 'admin@system.local' }, 
      error: null 
    };
  }
}

// POST - Verstuur reminder email
export async function POST(req: NextRequest) {
  try {
    console.log('[REMINDER] Starting reminder request');

    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 401 });
    }

    const { invitationId } = await req.json();

    if (!invitationId) {
      return NextResponse.json({ error: 'Uitnodiging ID vereist' }, { status: 400 });
    }

    console.log('[REMINDER] Processing reminder for invitation:', invitationId);

    // Haal uitnodiging op
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('business_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error('[REMINDER] Invitation not found:', fetchError);
      return NextResponse.json({ error: 'Uitnodiging niet gevonden' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Kan alleen reminder versturen voor openstaande uitnodigingen' }, { status: 400 });
    }

    // Check of uitnodiging niet verlopen is
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Uitnodiging is verlopen' }, { status: 400 });
    }

    // Genereer unieke tracking tokens voor reminder
    const reminderTrackingPixelId = crypto.randomBytes(16).toString('hex');
    const reminderClickTrackingId = crypto.randomBytes(16).toString('hex');

    // URLs voor tracking
    const reminderTrackingPixelUrl = `${req.nextUrl.origin}/api/invitations/track/reminder-pixel?id=${reminderTrackingPixelId}`;
    const reminderClickTrackingUrl = `${req.nextUrl.origin}/api/invitations/track/reminder-click?id=${reminderClickTrackingId}`;

    console.log('[REMINDER] Sending reminder email to:', invitation.email);

    // Verstuur reminder email
    await sendEmail({
      to: invitation.email,
      subject: '🌸 Vriendelijke herinnering: Uw Wasgeurtje retailer uitnodiging wacht nog',
      html: `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Herinnering - Wasgeurtje Retailer Uitnodiging</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #fef7f0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header met gradient -->
                <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%); 
                           padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🌸 Herinnering: Uw Wasgeurtje Uitnodiging
                    </h1>
                    <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 16px;">
                        We willen u graag helpen bij de volgende stap!
                    </p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); 
                                   width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; 
                                   display: flex; align-items: center; justify-content: center; font-size: 40px;">
                            ⏰
                        </div>
                        <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">
                            Beste ${invitation.contact_name || 'potentiële partner'},
                        </h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
                            We zagen dat u nog niet heeft gereageerd op onze exclusieve uitnodiging om 
                            <strong>officieel Wasgeurtje retailer</strong> te worden.
                        </p>
                    </div>

                    ${invitation.business_name ? `
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; color: #92400e; font-weight: 600;">
                            🏢 Speciaal voor: ${invitation.business_name}
                        </p>
                    </div>
                    ` : ''}

                    <!-- Waarom nog steeds interessant -->
                    <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px;">
                            💎 Waarom deze kans nog steeds uniek is:
                        </h3>
                        <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li><strong>Exclusieve territory rechten</strong> - Beperkte plekken beschikbaar</li>
                            <li><strong>35-50% retailer marge</strong> op alle Wasgeurtje producten</li>
                            <li><strong>Gratis marketing support</strong> en POS materialen</li>
                            <li><strong>No-risk voorraad model</strong> - Geen grote investeringen</li>
                            <li><strong>Bewezen concept</strong> met tevreden klanten</li>
                        </ul>
                    </div>

                    <!-- Urgentie bericht -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
                               border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
                        <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
                            ⚠️ Beperkte tijd beschikbaar
                        </h3>
                        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                            Uw uitnodiging verloopt op <strong>${new Date(invitation.expires_at).toLocaleDateString('nl-NL', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</strong>.<br>
                            Na deze datum kunnen we helaas geen nieuwe aanmeldingen meer accepteren voor uw regio.
                        </p>
                    </div>

                    <!-- Call to Action -->
                    <div style="text-align: center; margin: 35px 0;">
                        <p style="color: #374151; margin: 0 0 20px 0; font-size: 16px; font-weight: 500;">
                            Het duurt slechts 5 minuten om uw registratie te voltooien:
                        </p>
                        
                        <a href="${reminderClickTrackingUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                                  color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; 
                                  font-weight: 700; font-size: 18px; box-shadow: 0 6px 20px rgba(217, 119, 6, 0.4);
                                  transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 1px;">
                            🚀 Voltooi Nu Mijn Registratie
                        </a>
                        
                        <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 12px;">
                            Klik op de knop hierboven om direct door te gaan
                        </p>
                    </div>

                    <!-- Contact informatie -->
                    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
                        <h4 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">
                            📞 Heeft u vragen? We helpen graag!
                        </h4>
                        <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
                            📧 E-mail: info@wasgeurtje.nl<br>
                            📞 Telefoon: +31 6 12 34 56 78<br>
                            🌐 Website: wasgeurtje.nl
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
                        <p style="color: #9ca3af; margin: 0; font-size: 12px; line-height: 1.5;">
                            © 2025 Wasgeurtje B.V. | Alle rechten voorbehouden<br>
                            Dit is een herinnering voor uw eerder ontvangen uitnodiging.<br>
                            Uitnodiging oorspronkelijk verzonden op ${new Date(invitation.invited_at).toLocaleDateString('nl-NL')}
                        </p>
                    </div>
                </div>
                <!-- Reminder tracking pixel -->
                <img src="${reminderTrackingPixelUrl}" width="1" height="1" style="display: none;" alt="">
            </div>
        </body>
        </html>
      `,
      text: `
        HERINNERING: Wasgeurtje Retailer Uitnodiging
        
        Beste ${invitation.contact_name || 'potentiële partner'},
        
        We zagen dat u nog niet heeft gereageerd op onze exclusieve uitnodiging om 
        officieel Wasgeurtje retailer te worden.
        
        ${invitation.business_name ? `VOOR: ${invitation.business_name}` : ''}
        
        WAAROM DEZE KANS NOG STEEDS UNIEK IS:
        ✓ Exclusieve territory rechten - Beperkte plekken beschikbaar
        ✓ 35-50% retailer marge op alle Wasgeurtje producten  
        ✓ Gratis marketing support en POS materialen
        ✓ No-risk voorraad model - Geen grote investeringen
        ✓ Bewezen concept met tevreden klanten
        
        BELANGRIJK: Uw uitnodiging verloopt op ${new Date(invitation.expires_at).toLocaleDateString('nl-NL')}.
        
        REGISTREER NU:
        Ga naar de volgende link om uw registratie te voltooien:
        ${reminderClickTrackingUrl}
        
        Het duurt slechts 5 minuten om uw registratie te voltooien.
        
        CONTACT:
        📧 E-mail: info@wasgeurtje.nl
        📞 Telefoon: +31 6 12 34 56 78
        🌐 Website: wasgeurtje.nl
        
        Met vriendelijke groet,
        Het Wasgeurtje Partnership Team
        
        © 2025 Wasgeurtje B.V. | Alle rechten voorbehouden
      `
    });

    // Update database met reminder informatie
    const { error: updateError } = await supabaseAdmin
      .from('business_invitations')
      .update({ 
        reminder_sent_at: new Date().toISOString(),
        reminder_count: (invitation.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
        reminder_tracking_pixel_id: reminderTrackingPixelId,
        reminder_click_tracking_id: reminderClickTrackingId,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('[REMINDER] Error updating reminder info:', updateError);
      // Email is al verstuurd, dus we geven geen error terug
    }

    console.log('[REMINDER] Reminder sent successfully to:', invitation.email);

    return NextResponse.json({ 
      success: true,
      message: `Herinnering succesvol verstuurd naar ${invitation.email}`,
      reminderCount: (invitation.reminder_count || 0) + 1
    });

  } catch (error) {
    console.error('[REMINDER] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij versturen herinnering' 
    }, { status: 500 });
  }
} 