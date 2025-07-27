import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    );
    
    // Get current user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      return NextResponse.json({ 
        authenticated: false,
        error: authError?.message || 'Not authenticated'
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, status, company_name')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile || null,
      isAdmin: profile?.role === 'admin',
      isRetailer: profile?.role === 'retailer'
    });
    
  } catch (error) {
    console.error('[Auth Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check auth status' },
      { status: 500 }
    );
  }
} 