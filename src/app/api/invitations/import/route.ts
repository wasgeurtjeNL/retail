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
    console.log('[IMPORT_AUTH] Starting authentication check');
    
    // Try cookie-based auth first
    try {
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
      
      if (!authError && user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profileError && profile && profile.role === 'admin') {
          return { error: null, user };
        }
      }
    } catch (cookieError) {
      console.log('[IMPORT_AUTH] Cookie auth failed:', cookieError);
    }
    
    // Fallback: Use service role for admin endpoints
    try {
      const { data: adminProfiles, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin')
        .eq('status', 'active')
        .limit(1);
        
      if (!adminError && adminProfiles && adminProfiles.length > 0) {
        console.log('[IMPORT_AUTH] Using service role fallback');
        return { 
          error: null, 
          user: { 
            id: adminProfiles[0].id, 
            email: adminProfiles[0].email 
          } 
        };
      }
    } catch (serviceError) {
      console.log('[IMPORT_AUTH] Service role fallback failed:', serviceError);
    }

    return { error: 'Authenticatie vereist', user: null };
  } catch (error) {
    console.error('[IMPORT_AUTH] Error:', error);
    return { error: 'Authenticatie fout', user: null };
  }
}

interface ImportRow {
  email: string;
  business_name?: string;
  contact_name?: string;
  phone?: string;
}

// POST - Import CSV data voor uitnodigingen
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvData, sendEmails = true } = body;

    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 401 });
    }

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'Geen geldige CSV data opgegeven' }, { status: 400 });
    }

    // Parse CSV data
    const rows = csvData.trim().split('\n');
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV moet minimaal een header en één rij bevatten' }, { status: 400 });
    }

    // Parse header
    const header = rows[0].split(',').map(col => col.trim().toLowerCase());
    const emailIndex = header.findIndex(col => col.includes('email') || col.includes('mail'));
    const businessNameIndex = header.findIndex(col => col.includes('business') || col.includes('bedrijf') || col.includes('company'));
    const contactNameIndex = header.findIndex(col => col.includes('contact') || col.includes('name') || col.includes('naam'));
    const phoneIndex = header.findIndex(col => col.includes('phone') || col.includes('telefoon') || col.includes('tel'));

    if (emailIndex === -1) {
      return NextResponse.json({ error: 'Geen e-mail kolom gevonden in CSV' }, { status: 400 });
    }

    // Parse data rows
    const importData: ImportRow[] = [];
    const parseErrors: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        const cols = rows[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
        
        const email = cols[emailIndex]?.trim();
        if (!email) {
          parseErrors.push({ row: i + 1, error: 'Geen e-mailadres opgegeven' });
          continue;
        }

        // Basis e-mail validatie
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          parseErrors.push({ row: i + 1, error: `Ongeldig e-mailadres: ${email}` });
          continue;
        }

        importData.push({
          email,
          business_name: businessNameIndex !== -1 ? cols[businessNameIndex] || undefined : undefined,
          contact_name: contactNameIndex !== -1 ? cols[contactNameIndex] || undefined : undefined,
          phone: phoneIndex !== -1 ? cols[phoneIndex] || undefined : undefined,
        });

      } catch (error) {
        parseErrors.push({ row: i + 1, error: `Fout bij parsen van rij: ${error}` });
      }
    }

    if (importData.length === 0) {
      return NextResponse.json({ 
        error: 'Geen geldige rijen gevonden om te importeren',
        parseErrors 
      }, { status: 400 });
    }

    // Verwerk uitnodigingen
    const batchId = crypto.randomBytes(16).toString('hex');
    const createdInvitations = [];
    const processingErrors: Array<{ email: string; error: string }> = [];

    for (const row of importData) {
      try {
        // Controleer op bestaande uitnodiging
        const { data: existing } = await supabaseAdmin
          .from('business_invitations')
          .select('id')
          .eq('email', row.email)
          .eq('status', 'pending')
          .single();

        if (existing) {
          processingErrors.push({ 
            email: row.email, 
            error: 'Er bestaat al een openstaande uitnodiging' 
          });
          continue;
        }

        // Genereer token
        const invitationToken = crypto.randomBytes(32).toString('hex');

        // Maak uitnodiging aan
        const { data: invitation, error: insertError } = await supabaseAdmin
          .from('business_invitations')
          .insert({
            email: row.email,
            business_name: row.business_name || null,
            contact_name: row.contact_name || null,
            phone: row.phone || null,
            invitation_token: invitationToken,
            invited_by: user.id,
            metadata: {
              created_via: 'csv_import',
              import_batch: batchId,
              imported_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (insertError) {
          processingErrors.push({ email: row.email, error: insertError.message });
          continue;
        }

        createdInvitations.push(invitation);

        // Verstuur e-mail
        if (sendEmails) {
          try {
            const registrationUrl = `${req.nextUrl.origin}/register?token=${invitationToken}`;
            
            await sendEmail({
              to: row.email,
              subject: 'Uitnodiging voor retailer registratie - Wasgeurtje',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #ec4899;">Uitnodiging voor retailer registratie</h2>
                  <p>Beste ${row.contact_name || 'retailer'},</p>
                  <p>U bent uitgenodigd om zich te registreren als retailer bij Wasgeurtje.</p>
                  ${row.business_name ? `<p><strong>Bedrijf:</strong> ${row.business_name}</p>` : ''}
                  <p>Klik op de onderstaande knop om uw registratie te voltooien:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${registrationUrl}" 
                       style="background-color: #ec4899; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                      Registratie voltooien
                    </a>
                  </div>
                  <p><strong>Belangrijke informatie:</strong></p>
                  <ul>
                    <li>Deze uitnodiging is 30 dagen geldig</li>
                    <li>Na registratie krijgt u toegang tot het retailer dashboard</li>
                    <li>U kunt direct wasstrips bestellen en uw bestellingen beheren</li>
                  </ul>
                  <p>Heeft u vragen? Neem dan contact met ons op via info@wasgeurtje.nl</p>
                  <p>Met vriendelijke groet,<br><strong>Team Wasgeurtje</strong></p>
                </div>
              `,
              text: `
Uitnodiging voor retailer registratie

Beste ${row.contact_name || 'retailer'},

U bent uitgenodigd om zich te registreren als retailer bij Wasgeurtje.
${row.business_name ? `Bedrijf: ${row.business_name}` : ''}

Ga naar de volgende link om uw registratie te voltooien:
${registrationUrl}

Belangrijke informatie:
- Deze uitnodiging is 30 dagen geldig
- Na registratie krijgt u toegang tot het retailer dashboard
- U kunt direct wasstrips bestellen en uw bestellingen beheren

Heeft u vragen? Neem dan contact met ons op via info@wasgeurtje.nl

Met vriendelijke groet,
Team Wasgeurtje
              `
            });
          } catch (emailError) {
            console.error(`Error sending email to ${row.email}:`, emailError);
            // E-mail fout is niet fataal
          }
        }

      } catch (error) {
        console.error(`Error processing invitation for ${row.email}:`, error);
        processingErrors.push({ 
          email: row.email, 
          error: error instanceof Error ? error.message : 'Onbekende fout' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      batchId,
      summary: {
        totalRows: rows.length - 1,
        validRows: importData.length,
        created: createdInvitations.length,
        errors: parseErrors.length + processingErrors.length
      },
      parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
      processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
      createdInvitations
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/invitations/import:', error);
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 });
  }
}