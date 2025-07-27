import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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

export async function GET(request: NextRequest) {
  try {
    // Auth check
    // Snapshot cookies voordat we async operaties starten
    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          }
        }
      }
    );
    const { data: { session }, error: authError } = await supabaseAuth.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get('profile_id') || user.id;

    console.log('[ONBOARDING_PROGRESS] Fetching for profile:', profileId);

    const supabase = getServiceRoleClient();

    // Get or create progress
    const { data: progress, error: progressError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .single();

    if (progressError && progressError.code !== 'PGRST116') { // Ignore not found
      console.error('[ONBOARDING_PROGRESS] Error:', progressError);
      throw progressError;
    }

    // If no progress exists, create one
    if (!progress) {
      const { data: newProgress, error: createError } = await supabase
        .from('onboarding_progress')
        .insert({
          profile_id: profileId,
          current_step: 1,
          total_steps: 5,
          steps_completed: {},
          onboarding_data: {}
        })
        .select()
        .single();

      if (createError) {
        console.error('[ONBOARDING_PROGRESS] Error creating progress:', createError);
        throw createError;
      }

      return NextResponse.json({ 
        progress: newProgress,
        needs_onboarding: true 
      });
    }

    // Check if onboarding is needed
    const needsOnboarding = !progress.completed_at && !progress.skipped_at;

    return NextResponse.json({
      progress,
      needs_onboarding: needsOnboarding
    });

  } catch (error) {
    console.error('[ONBOARDING_PROGRESS] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch onboarding progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 