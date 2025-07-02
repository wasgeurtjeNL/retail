import { NextRequest, NextResponse } from 'next/server';
import { getRetailerByToken, markTokenAsUsed, getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  console.log('[API] Account activation request ontvangen');
  
  try {
    const body = await req.json();
    const { token, password } = body;
    
    if (!token || !password) {
      return NextResponse.json({
        success: false,
        error: 'Token en wachtwoord zijn verplicht'
      }, { status: 400 });
    }
    
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Wachtwoord moet minimaal 8 tekens lang zijn'
      }, { status: 400 });
    }
    
    console.log(`[API] Activating account with token: ${token}`);
    
    // 1. Valideer token en haal retailer op
    const { retailer, error: tokenError } = await getRetailerByToken(token);
    
    if (tokenError || !retailer) {
      console.error('[API] Invalid or expired token:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Ongeldige of verlopen activatielink'
      }, { status: 400 });
    }
    
    console.log(`[API] Token valid for retailer: ${retailer.email}`);
    
    // 2. Update wachtwoord in Supabase Auth (gebruik service role voor admin functies)
    const supabase = getServiceRoleClient();
    
    try {
      // Probeer de gebruiker te updaten met het nieuwe wachtwoord
      // Dit werkt alleen als de gebruiker al bestaat in Supabase Auth
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(retailer.id);
      
      if (getUserError || !authUser.user) {
        // Gebruiker bestaat nog niet in Auth, maak deze aan
        console.log('[API] Creating new auth user for retailer');
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: retailer.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: retailer.contact_name,
            company_name: retailer.business_name,
            role: 'retailer'
          }
        });
        
        if (createError || !newUser.user) {
          console.error('[API] Error creating auth user:', createError);
          return NextResponse.json({
            success: false,
            error: 'Fout bij het aanmaken van gebruikersaccount'
          }, { status: 500 });
        }
        
        console.log(`[API] Auth user created with ID: ${newUser.user.id}`);
        
        // Update profile met auth user ID als deze verschilt
        if (newUser.user.id !== retailer.id) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ id: newUser.user.id })
            .eq('id', retailer.id);
            
          if (updateError) {
            console.warn('[API] Could not update profile ID:', updateError);
          }
        }
      } else {
        // Gebruiker bestaat al, update het wachtwoord
        console.log('[API] Updating password for existing auth user');
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          authUser.user.id,
          { password: password }
        );
        
        if (updateError) {
          console.error('[API] Error updating password:', updateError);
          return NextResponse.json({
            success: false,
            error: 'Fout bij het bijwerken van wachtwoord'
          }, { status: 500 });
        }
      }
    } catch (authError) {
      console.error('[API] Auth operation failed:', authError);
      return NextResponse.json({
        success: false,
        error: 'Fout bij het configureren van authenticatie'
      }, { status: 500 });
    }
    
    // 3. Markeer token als gebruikt
    const { error: markError } = await markTokenAsUsed(token);
    
    if (markError) {
      console.warn('[API] Could not mark token as used:', markError);
      // Dit is niet kritisch, ga door
    }
    
    console.log(`[API] Account successfully activated for: ${retailer.email}`);
    
    return NextResponse.json({
      success: true,
      message: 'Account succesvol geactiveerd',
      retailer: {
        email: retailer.email,
        business_name: retailer.business_name
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
    console.error('[API] Unexpected error in account activation:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Er is een onverwachte fout opgetreden'
    }, { status: 500 });
  }
} 