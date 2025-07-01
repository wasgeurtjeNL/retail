import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Get the current user
    const { user, error: userError } = await getCurrentUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authenticatie vereist' 
      }, { status: 401 });
    }
    
    // Parse the request body
    const { newPassword } = await req.json();
    
    // Validate the new password
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Nieuw wachtwoord moet minimaal 8 tekens bevatten' 
      }, { status: 400 });
    }
    
    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      console.error('Error updating password:', error);
      return NextResponse.json({ 
        error: 'Fout bij wijzigen van wachtwoord: ' + error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Wachtwoord succesvol bijgewerkt' 
    });
  } catch (error: any) {
    console.error('Error in password update endpoint:', error);
    return NextResponse.json({ 
      error: 'Er is een onverwachte fout opgetreden bij het bijwerken van het wachtwoord' 
    }, { status: 500 });
  }
} 