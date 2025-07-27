import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// POST - Valideer uitnodigingstoken
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Geen token opgegeven' 
      }, { status: 400 });
    }

    // Gebruik database functie voor validatie
    const { data, error } = await supabaseAdmin
      .rpc('validate_invitation_token', { token_input: token });

    if (error) {
      console.error('Error validating token:', error);
      return NextResponse.json({ 
        valid: false, 
        error: 'Fout bij valideren van token' 
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token ongeldig of verlopen' 
      });
    }

    const invitation = data[0];

    // Controleer of er al een gebruiker bestaat met dit e-mailadres
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === invitation.email);

    if (userExists) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Er bestaat al een account met dit e-mailadres' 
      });
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        business_name: invitation.business_name,
        contact_name: invitation.contact_name,
        phone: invitation.phone,
        expires_at: invitation.expires_at
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/invitations/validate:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Interne serverfout' 
    }, { status: 500 });
  }
}

// GET - Valideer token via query parameter (voor directe links)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Geen token opgegeven' 
      }, { status: 400 });
    }

    // Hergebruik POST logica
    return POST(req);

  } catch (error) {
    console.error('Unexpected error in GET /api/invitations/validate:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Interne serverfout' 
    }, { status: 500 });
  }
}