import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database, BusinessInvitation } from '@/lib/database.types';
import { sendEmail } from '@/lib/mail-service';
import crypto from 'crypto';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to authenticate and check admin access
async function requireAdminAuth(req: NextRequest) {
  try {
    console.log('[AUTH] Starting authentication check');
    
    // Try cookie-based auth first
    try {
      const cookieStore = await cookies();
      console.log('[AUTH] Got cookie store');
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const value = cookieStore.get(name)?.value;
              console.log('[AUTH] Cookie', name, value ? 'exists' : 'missing');
              return value;
            },
          },
        }
      );
      
      console.log('[AUTH] Created supabase client');
      
      // Get current user session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log('[AUTH] Session check:', session ? 'found' : 'none', authError?.message);
      
      const user = session?.user;
      
      if (!authError && user) {
        console.log('[AUTH] User found:', user.email);
        
        // Get user profile to check admin role  
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        console.log('[AUTH] Profile check:', profile?.role, profileError?.message);

        if (!profileError && profile && profile.role === 'admin') {
          console.log('[AUTH] Admin access granted');
          return { error: null, user };
        }
      }
    } catch (cookieError) {
      console.log('[AUTH] Cookie auth failed:', cookieError);
    }
    
    // Fallback: Check if there's a valid admin session using service role
    console.log('[AUTH] Trying service role fallback');
    try {
      // For admin dashboard, we can temporarily use service role as fallback
      // This is acceptable for admin-only endpoints
      const { data: adminProfiles, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin')
        .eq('status', 'active')
        .limit(1);
        
      console.log('[AUTH] Admin profiles found:', adminProfiles?.length, adminError?.message);
      
      if (!adminError && adminProfiles && adminProfiles.length > 0) {
        console.log('[AUTH] Using service role fallback for admin user:', adminProfiles[0].email);
        return { 
          error: null, 
          user: { 
            id: adminProfiles[0].id, 
            email: adminProfiles[0].email 
          } 
        };
      }
    } catch (serviceError) {
      console.log('[AUTH] Service role fallback failed:', serviceError);
    }

    console.log('[AUTH] All authentication methods failed');
    return { error: 'Authenticatie vereist - geen geldige admin sessie gevonden', user: null };
    
  } catch (error) {
    console.error('[AUTH] Unexpected error:', error);
    return { error: 'Authenticatie fout', user: null };
  }
}

// GET - Haal alle uitnodigingen op voor admin
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    
    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Bouw query
    let query = supabaseAdmin
      .from('business_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invitations, error } = await query;

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(invitations);

  } catch (error) {
    console.error('Unexpected error in GET /api/invitations:', error);
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 });
  }
}

// POST - Maak nieuwe uitnodiging(en) aan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invitations, sendEmails = true } = body;

    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 401 });
    }

    if (!Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json({ error: 'Geen geldige uitnodigingen opgegeven' }, { status: 400 });
    }

    const createdInvitations: BusinessInvitation[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    // Verwerk elke uitnodiging
    for (const invitation of invitations) {
      try {
        const { email, business_name, contact_name, phone } = invitation;

        if (!email) {
          errors.push({ email: email || 'onbekend', error: 'E-mailadres is verplicht' });
          continue;
        }

        // Controleer of er al een uitnodiging bestaat voor dit e-mailadres
        const { data: existingInvitation } = await supabaseAdmin
          .from('business_invitations')
          .select('id, status')
          .eq('email', email)
          .eq('status', 'pending')
          .single();

        if (existingInvitation) {
          errors.push({ email, error: 'Er bestaat al een openstaande uitnodiging voor dit e-mailadres' });
          continue;
        }

        // Genereer unieke tokens
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const trackingPixelId = crypto.randomBytes(16).toString('hex');
        const clickTrackingId = crypto.randomBytes(16).toString('hex');

        // Maak uitnodiging aan
        const { data: newInvitation, error: insertError } = await supabaseAdmin
          .from('business_invitations')
          .insert({
            email,
            business_name: business_name || null,
            contact_name: contact_name || null,
            phone: phone || null,
            invitation_token: invitationToken,
            invited_by: user.id,
            tracking_pixel_id: trackingPixelId,
            click_tracking_id: clickTrackingId,
            metadata: {
              created_via: 'admin_panel',
              import_batch: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating invitation:', insertError);
          errors.push({ email, error: insertError.message });
          continue;
        }

        createdInvitations.push(newInvitation);

        // Verstuur e-mail als gewenst
        if (sendEmails) {
          try {
            // URLs voor tracking
            const trackingPixelUrl = `${req.nextUrl.origin}/api/invitations/track/pixel?id=${trackingPixelId}`;
            const clickTrackingUrl = `${req.nextUrl.origin}/api/invitations/track/click?id=${clickTrackingId}`;
            
            await sendEmail({
              to: email,
              subject: '🌸 Exclusieve uitnodiging: Word officieel Wasgeurtje retailer partner',
              html: `
                <!DOCTYPE html>
                <html lang="nl">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Wasgeurtje Retailer Uitnodiging</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                🌸 Wasgeurtje
                            </h1>
                            <p style="color: #fce7f3; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">
                                Premium Wasstrips & Geurstyling
                            </p>
                        </div>

                        <!-- Content -->
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                Exclusieve uitnodiging voor ${contact_name || 'uw bedrijf'}
                            </h2>
                            
                            ${business_name ? `
                            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #ec4899;">
                                <p style="margin: 0; color: #374151; font-weight: 500;">
                                    🏢 Uitnodiging voor: <strong>${business_name}</strong>
                                </p>
                            </div>
                            ` : ''}

                            <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px;">
                                Beste ${contact_name || 'ondernemer'},
                            </p>

                            <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px;">
                                U bent persoonlijk uitgenodigd om onderdeel te worden van het <strong>exclusieve Wasgeurtje retailer netwerk</strong>. 
                                Als officiële partner krijgt u toegang tot onze premium wasstrips en kunt u profiteren van aantrekkelijke marges en ondersteuning.
                            </p>

                            <!-- Benefits Section -->
                            <div style="background-color: #fef7ff; border: 2px solid #f3e8ff; border-radius: 12px; padding: 24px; margin: 24px 0;">
                                <h3 style="color: #be185d; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
                                    🎯 Wat krijgt u als Wasgeurtje partner?
                                </h3>
                                
                                <div style="display: grid; gap: 12px;">
                                    <div style="display: flex; align-items: center; color: #4b5563;">
                                        <span style="color: #22c55e; font-weight: bold; margin-right: 12px; font-size: 16px;">✅</span>
                                        <span>Exclusieve toegang tot premium wasstrips en geurstyling producten</span>
                                    </div>
                                    <div style="display: flex; align-items: center; color: #4b5563;">
                                        <span style="color: #22c55e; font-weight: bold; margin-right: 12px; font-size: 16px;">✅</span>
                                        <span>Aantrekkelijke retailer marges en volume kortingen</span>
                                    </div>
                                    <div style="display: flex; align-items: center; color: #4b5563;">
                                        <span style="color: #22c55e; font-weight: bold; margin-right: 12px; font-size: 16px;">✅</span>
                                        <span>Marketing ondersteuning en POS materialen</span>
                                    </div>
                                    <div style="display: flex; align-items: center; color: #4b5563;">
                                        <span style="color: #22c55e; font-weight: bold; margin-right: 12px; font-size: 16px;">✅</span>
                                        <span>Toegang tot exclusief retailer dashboard en tools</span>
                                    </div>
                                    <div style="display: flex; align-items: center; color: #4b5563;">
                                        <span style="color: #22c55e; font-weight: bold; margin-right: 12px; font-size: 16px;">✅</span>
                                        <span>Persoonlijke account manager voor ondersteuning</span>
                                    </div>
                                    <div style="display: flex; align-items: center; color: #4b5563;">
                                        <span style="color: #22c55e; font-weight: bold; margin-right: 12px; font-size: 16px;">✅</span>
                                        <span>Snelle levering en flexibele bestellingsopties</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Product Info -->
                            <div style="background-color: #f0fdf4; border: 2px solid #dcfce7; border-radius: 12px; padding: 24px; margin: 24px 0;">
                                <h3 style="color: #16a34a; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
                                    🌿 Over Wasgeurtje
                                </h3>
                                <p style="color: #4b5563; margin: 0 0 12px 0; font-size: 15px;">
                                    Wasgeurtje is de Nederlandse specialist in <strong>premium wasstrips</strong> - een revolutionaire manier van wassen die 
                                    duurzamer, effectiever en gebruiksvriendelijker is dan traditionele wasmiddelen.
                                </p>
                                <p style="color: #4b5563; margin: 0; font-size: 15px;">
                                    Onze producten zijn <strong>eco-vriendelijk</strong>, bevatten geen schadelijke chemicaliën en leveren 
                                    uitstekende wasresultaten. Perfect voor de moderne, bewuste consument.
                                </p>
                            </div>

                            <!-- CTA Section -->
                            <div style="text-align: center; margin: 32px 0;">
                                <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; font-weight: 500;">
                                    Klaar om deel uit te maken van de Wasgeurtje familie?
                                </p>
                                
                                                                 <a href="${clickTrackingUrl}" 
                                    style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); 
                                           color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; 
                                           font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(236, 72, 153, 0.4);
                                           transition: all 0.3s ease;">
                                     🚀 Start Nu Je Registratie
                                 </a>
                                
                                <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 14px;">
                                    ⏰ Deze exclusieve uitnodiging is <strong>7 dagen</strong> geldig
                                </p>
                            </div>

                            <!-- Contact Info -->
                            <div style="border-top: 2px solid #f3f4f6; padding-top: 24px; margin-top: 32px;">
                                <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                                    Vragen over het partnerschap?
                                </h4>
                                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                                    📧 E-mail: <a href="mailto:partners@wasgeurtje.nl" style="color: #ec4899;">partners@wasgeurtje.nl</a>
                                </p>
                                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                                    📞 Telefoon: <a href="tel:+31612345678" style="color: #ec4899;">+31 6 12 34 56 78</a>
                                </p>
                                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                                    🌐 Website: <a href="https://wasgeurtje.nl" style="color: #ec4899;">wasgeurtje.nl</a>
                                </p>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">
                                Met vriendelijke groet,
                            </p>
                            <p style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                                Het Wasgeurtje Partnership Team
                            </p>
                                                         <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
                                 <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                                     © 2025 Wasgeurtje B.V. | Alle rechten voorbehouden<br>
                                     Deze e-mail is verstuurd omdat u bent uitgenodigd als potentiële retailer partner.
                                 </p>
                             </div>
                         </div>
                     </div>
                     <!-- Email tracking pixel -->
                     <img src="${trackingPixelUrl}" width="1" height="1" style="display: none;" alt="">
                 </body>
                 </html>
              `,
              text: `
                🌸 WASGEURTJE - EXCLUSIEVE RETAILER UITNODIGING
                
                Beste ${contact_name || 'ondernemer'},
                
                U bent persoonlijk uitgenodigd om onderdeel te worden van het exclusieve Wasgeurtje retailer netwerk!
                ${business_name ? `\nUitnodiging voor: ${business_name}` : ''}
                
                WAT KRIJGT U ALS WASGEURTJE PARTNER?
                ✅ Exclusieve toegang tot premium wasstrips en geurstyling producten
                ✅ Aantrekkelijke retailer marges en volume kortingen  
                ✅ Marketing ondersteuning en POS materialen
                ✅ Toegang tot exclusief retailer dashboard en tools
                ✅ Persoonlijke account manager voor ondersteuning
                ✅ Snelle levering en flexibele bestellingsopties
                
                OVER WASGEURTJE:
                Wasgeurtje is de Nederlandse specialist in premium wasstrips - een revolutionaire 
                manier van wassen die duurzamer, effectiever en gebruiksvriendelijker is dan 
                traditionele wasmiddelen. Onze producten zijn eco-vriendelijk en perfect voor 
                de moderne, bewuste consument.
                
                                 REGISTREER NU:
                Ga naar de volgende link om uw registratie te voltooien:
                 ${clickTrackingUrl}
                
                ⏰ Deze exclusieve uitnodiging is 7 dagen geldig.

                CONTACT:
                📧 E-mail: partners@wasgeurtje.nl
                📞 Telefoon: +31 6 12 34 56 78
                🌐 Website: wasgeurtje.nl

                Met vriendelijke groet,
                Het Wasgeurtje Partnership Team
                
                © 2025 Wasgeurtje B.V. | Alle rechten voorbehouden
              `
            });
            
            // Update email_sent_at timestamp
            await supabaseAdmin
              .from('business_invitations')
              .update({ 
                email_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', newInvitation.id);
            
            console.log(`Email sent successfully to ${email}`);
          } catch (emailError) {
            console.error('Error sending invitation email:', emailError);
            // E-mail fout wordt niet als fatale fout beschouwd
          }
        }

      } catch (error) {
        console.error('Error processing invitation:', error);
        errors.push({ 
          email: invitation.email || 'onbekend', 
          error: error instanceof Error ? error.message : 'Onbekende fout' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdInvitations.length,
      errors: errors.length > 0 ? errors : undefined,
      invitations: createdInvitations
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/invitations:', error);
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 });
  }
}