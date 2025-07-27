import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Service role client voor database operaties
function getServiceRoleClient() {
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
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await request.json();
    const targetProfileId = profile_id || user.id;

    console.log('[SKIP_ONBOARDING] Skipping for profile:', targetProfileId);

    const supabase = getServiceRoleClient();

    // Update onboarding progress to skipped
    const { error } = await supabase
      .from('onboarding_progress')
      .update({
        skipped_at: new Date().toISOString(),
        is_active: false
      })
      .eq('profile_id', targetProfileId);

    if (error) {
      console.error('[SKIP_ONBOARDING] Error:', error);
      throw error;
    }

    console.log('[SKIP_ONBOARDING] Successfully skipped onboarding');

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('[SKIP_ONBOARDING] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to skip onboarding',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 