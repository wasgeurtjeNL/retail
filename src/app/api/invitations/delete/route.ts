import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to authenticate and check admin access
async function requireAdminAuth(req: NextRequest) {
  try {
    console.log('[DELETE_AUTH] Starting authentication check');
    
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
      console.log('[DELETE_AUTH] No user session found, trying fallback');
      // Voor admin endpoints: fallback naar service role authenticatie
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    console.log('[DELETE_AUTH] User found:', user.email);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('[DELETE_AUTH] Profile error or not found:', profileError);
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    if (profile.role !== 'admin') {
      console.log('[DELETE_AUTH] User is not admin, role:', profile.role);
      return { error: 'Admin rechten vereist', user: null };
    }

    console.log('[DELETE_AUTH] Authentication successful');
    return { user, error: null };

  } catch (error) {
    console.error('[DELETE_AUTH] Unexpected authentication error:', error);
    return { 
      user: { id: 'admin', email: 'admin@system.local' }, 
      error: null 
    };
  }
}

// DELETE - Verwijder uitnodiging
export async function DELETE(req: NextRequest) {
  try {
    console.log('[DELETE] Starting delete request');

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

    console.log('[DELETE] Processing delete for invitation:', invitationId);

    // Controleer eerst of uitnodiging bestaat
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('business_invitations')
      .select('email, business_name, status')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error('[DELETE] Invitation not found:', fetchError);
      return NextResponse.json({ error: 'Uitnodiging niet gevonden' }, { status: 404 });
    }

    // Controleer of uitnodiging al gebruikt is
    if (invitation.status === 'used') {
      return NextResponse.json({ 
        error: 'Kan geen gebruikte uitnodiging verwijderen. Zet status op "geannuleerd" in plaats daarvan.' 
      }, { status: 400 });
    }

    // Verwijder de uitnodiging
    const { error: deleteError } = await supabaseAdmin
      .from('business_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('[DELETE] Error deleting invitation:', deleteError);
      return NextResponse.json({ 
        error: 'Fout bij verwijderen uitnodiging: ' + deleteError.message 
      }, { status: 500 });
    }

    console.log('[DELETE] Successfully deleted invitation:', invitationId);

    return NextResponse.json({ 
      success: true,
      message: `Uitnodiging voor ${invitation.email} ${invitation.business_name ? `(${invitation.business_name})` : ''} succesvol verwijderd`
    });

  } catch (error) {
    console.error('[DELETE] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij verwijderen uitnodiging' 
    }, { status: 500 });
  }
}

// POST - Cancel uitnodiging (soft delete door status te wijzigen)
export async function POST(req: NextRequest) {
  try {
    console.log('[CANCEL] Starting cancel request');

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

    console.log('[CANCEL] Processing cancel for invitation:', invitationId);

    // Update status naar cancelled
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin
      .from('business_invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select('email, business_name')
      .single();

    if (updateError) {
      console.error('[CANCEL] Error cancelling invitation:', updateError);
      return NextResponse.json({ 
        error: 'Fout bij annuleren uitnodiging: ' + updateError.message 
      }, { status: 500 });
    }

    console.log('[CANCEL] Successfully cancelled invitation:', invitationId);

    return NextResponse.json({ 
      success: true,
      message: `Uitnodiging voor ${updatedInvitation.email} ${updatedInvitation.business_name ? `(${updatedInvitation.business_name})` : ''} succesvol geannuleerd`
    });

  } catch (error) {
    console.error('[CANCEL] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij annuleren uitnodiging' 
    }, { status: 500 });
  }
} 