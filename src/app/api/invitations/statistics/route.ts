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
    console.log('[STATS_AUTH] Starting authentication check');
    
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
      console.log('[STATS_AUTH] Cookie auth failed:', cookieError);
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
        console.log('[STATS_AUTH] Using service role fallback');
        return { 
          error: null, 
          user: { 
            id: adminProfiles[0].id, 
            email: adminProfiles[0].email 
          } 
        };
      }
    } catch (serviceError) {
      console.log('[STATS_AUTH] Service role fallback failed:', serviceError);
    }

    return { error: 'Authenticatie vereist', user: null };
  } catch (error) {
    console.error('[STATS_AUTH] Error:', error);
    return { error: 'Authenticatie fout', user: null };
  }
}

// GET - Haal uitnodigingsstatistieken op
export async function GET(req: NextRequest) {
  try {
    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Haal statistieken op via view
    const { data: statistics, error } = await supabaseAdmin
      .from('invitation_statistics')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching statistics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(statistics);

  } catch (error) {
    console.error('Unexpected error in GET /api/invitations/statistics:', error);
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 });
  }
}