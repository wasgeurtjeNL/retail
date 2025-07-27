import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service client - exact same as getAllOrdersForRetailer
const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// GET profile - simple and direct like getAllOrdersForRetailer
export async function GET(req: NextRequest) {
  try {
    console.log('[PROFILE API] Starting simple profile fetch');
    
    // Get user email from query param (like getAllOrdersForRetailer uses email)
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('email');
    
    if (!userEmail) {
      console.log('[PROFILE API] No email provided');
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    console.log('[PROFILE API] Fetching profile for email:', userEmail);
    
    // Use service role client - exact same pattern as getAllOrdersForRetailer
    const adminClient = getServiceRoleClient();
    
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    console.log('[PROFILE API] Query result:', {
      hasProfile: !!profile,
      profileId: profile?.id,
      error: error?.message
    });
    
    if (error || !profile) {
      console.error('[PROFILE API] Profile not found:', error);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    console.log('[PROFILE API] Success - returning profile');
    return NextResponse.json({ profile });
    
  } catch (error) {
    console.error('[PROFILE API] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT profile update - simple version
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, ...updateData } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    
    const adminClient = getServiceRoleClient();
    
    const { data: profile, error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('email', email)
      .select()
      .single();
    
    if (error) {
      console.error('[PROFILE API] Update error:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    
    return NextResponse.json({ profile });
    
  } catch (error) {
    console.error('[PROFILE API] PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 