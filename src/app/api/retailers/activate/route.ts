import { NextRequest, NextResponse } from 'next/server';
import { getRetailerById, updateRetailerStatus, signIn } from '@/lib/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import crypto from 'crypto';
import { sendEmail } from '@/lib/mail-service';
import { getEmailTemplate, TemplateKey } from '@/lib/email-templates';

// Helper functie om een veilig wachtwoord te genereren
function generateSecurePassword() {
  // Genereer een basis wachtwoord met letters, cijfers en tekens
  const basePassword = crypto.randomBytes(8).toString('hex');
  const specialChars = '!@#$%^&*';
  const randomChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  const randomUppercase = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  
  // Combineer alles voor een sterk wachtwoord
  return `${basePassword.substring(0, 6)}${randomUppercase}${randomChar}${basePassword.substring(6, 10)}`;
}

// Helper functie om een activatietoken te genereren
function generateActivationToken() {
  // Eenvoudige implementatie - in productie zou dit complexer kunnen zijn
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  return `${random}-${timestamp}`;
}

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
    
    // 3. Genereer een veilig wachtwoord en activatietoken
    const tempPassword = generateSecurePassword();
    const activationToken = generateActivationToken();
    
    // 4. Maak een account aan als dit lokaal is (dev mode)
    // In production zou dit Supabase Admin API gebruiken
    let userId = null;
    let accountCreated = false;
    
    // Check of we in development mode zijn
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Development mode - simuleren van account aanmaken');
      
      // In development, sla het account op in localStorage via de client
      accountCreated = true;
      userId = `mock-user-${activationToken.substring(0, 8)}`;
      
      // In development bewaren we credentials in localStorage voor testen
      if (typeof window !== 'undefined') {
        const retailerAccounts = JSON.parse(localStorage.getItem('retailerAccounts') || '{}');
        retailerAccounts[retailer.email] = {
          password: tempPassword,
          activationToken,
          retailerId,
          created_at: new Date().toISOString()
        };
        localStorage.setItem('retailerAccounts', JSON.stringify(retailerAccounts));
      }
    } else {
      // In productie, gebruik Supabase Admin API om gebruiker aan te maken
      // Dit vereist server-side API calls, mogelijk via Edge Functions
      try {
        const supabase = createClientComponentClient();
        
        // Gebruik supabase.auth.admin.createUser in productie
        const { data, error: authError } = await supabase.auth.admin.createUser({
          email: retailer.email,
          password: tempPassword,
          email_confirm: true
        });
        
        if (authError) {
          console.error('[API] Fout bij het aanmaken van gebruiker:', authError);
          // Doorgaan met process ondanks fout - we kunnen de retailer later handmatig koppelen
        } else {
          accountCreated = true;
          userId = data.user.id;
          console.log(`[API] Gebruiker aangemaakt met ID: ${userId}`);
          
          // Koppel gebruiker aan retailer
          const { error: updateUserIdError } = await supabase
            .from('retailers')
            .update({ user_id: userId })
            .eq('id', retailerId);
            
          if (updateUserIdError) {
            console.error('[API] Fout bij het koppelen van gebruiker aan retailer:', updateUserIdError);
          }
          
          // Voeg retailer rol toe aan gebruiker
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'retailer' });
            
          if (roleError) {
            console.error('[API] Fout bij het toekennen van retailer rol:', roleError);
          }
        }
      } catch (adminError) {
        console.error('[API] Onverwachte fout bij het gebruiken van admin API:', adminError);
        // Doorgaan met proces ondanks de fout
      }
    }
    
    // 5. Stuur activatiemail met token en wachtwoord
    try {
      // Genereer activatie URL
      const activationUrl = `${req.nextUrl.origin}/retailer-activate/${activationToken}`;
      console.log(`[API] Activatie URL gegenereerd: ${activationUrl}`);
      
      // Haal email template op
      const templateKey: TemplateKey = 'retailer-approval';
      const template = await getEmailTemplate(templateKey);
      
      if (!template) {
        console.error('[API] Email template niet gevonden');
        // Dit is niet kritisch, ga door met het proces
      } else {
        // Stuur email met activatielink
        const emailResult = await sendEmail({
          to: retailer.email,
          subject: template.subject,
          html: template.html.replace('{{activationUrl}}', activationUrl)
                             .replace('{{contactName}}', retailer.contact_name || 'Retailer')
                             .replace('{{businessName}}', retailer.business_name || 'Uw bedrijf')
                             .replace('{{email}}', retailer.email)
                             .replace('{{tempPassword}}', tempPassword)
                             .replace('{{currentYear}}', new Date().getFullYear().toString())
                             .replace('{{logoUrl}}', `${req.nextUrl.origin}/images/logo.png`),
          text: template.text.replace('{{activationUrl}}', activationUrl)
                             .replace('{{contactName}}', retailer.contact_name || 'Retailer')
                             .replace('{{businessName}}', retailer.business_name || 'Uw bedrijf')
                             .replace('{{email}}', retailer.email)
                             .replace('{{tempPassword}}', tempPassword)
                             .replace('{{currentYear}}', new Date().getFullYear().toString())
        });
        
        if (!emailResult.success) {
          console.error('[API] Fout bij het versturen van activatiemail:', emailResult.error);
          // Dit is niet kritisch, ga door met het proces
        }
      }
    } catch (emailError) {
      console.error('[API] Onverwachte fout bij het versturen van activatiemail:', emailError);
      // Dit is niet kritisch, ga door met het proces
    }
    
    // 6. Sla activatietoken op om later te valideren
    // In dev mode is dit al gedaan via localStorage, in productie via database
    if (process.env.NODE_ENV !== 'development' && userId) {
      try {
        const supabase = createClientComponentClient();
        
        // Sla activatietoken op in 'activation_tokens' tabel
        const { error: tokenError } = await supabase
          .from('activation_tokens')
          .insert({
            token: activationToken,
            retailer_id: retailerId,
            user_id: userId,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dagen
            created_at: new Date().toISOString()
          });
          
        if (tokenError) {
          console.error('[API] Fout bij het opslaan van activatietoken:', tokenError);
        }
      } catch (tokenError) {
        console.error('[API] Onverwachte fout bij het opslaan van activatietoken:', tokenError);
      }
    }
    
    // Retourneer succes, zelfs als sommige stappen falen
    // De belangrijkste stap (status update) is gelukt
    const successResponse = {
      success: true,
      accountCreated,
      userId,
      activationToken,
      message: 'Retailer goedgekeurd en activatieproces gestart'
    };
    
    console.log('[API] Versturen succesresponse:', successResponse);
    
    return NextResponse.json(successResponse);
  } catch (error) {
    // Verbeterde error handling voor onverwachte fouten
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
    const errorStack = error instanceof Error && error.stack ? error.stack : undefined;
    
    console.error('[API] Onverwachte fout in activate endpoint:', errorMessage);
    if (errorStack) console.error('[API] Error stack:', errorStack);
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 });
  }
} 