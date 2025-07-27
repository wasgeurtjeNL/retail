import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { notifyAchievementUnlocked } from '@/lib/sales-notification-service';

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

    const { profile_id, step_key, step_data } = await request.json();
    const targetProfileId = profile_id || user.id;

    console.log('[COMPLETE_STEP] Completing step:', step_key, 'for profile:', targetProfileId);

    const supabase = getServiceRoleClient();

    // Call the database function to complete the step
    const { data: result, error } = await supabase
      .rpc('complete_onboarding_step', {
        p_profile_id: targetProfileId,
        p_step_key: step_key,
        p_step_data: step_data || null
      });

    if (error) {
      console.error('[COMPLETE_STEP] Error:', error);
      throw error;
    }

    console.log('[COMPLETE_STEP] Result:', result);

    // If points were earned, send achievement notification
    if (result.points_earned > 0) {
      await notifyAchievementUnlocked(targetProfileId, {
        title: `Onboarding Stap Voltooid: ${step_key}`,
        points_value: result.points_earned
      });
    }

    // Special handling for website analysis step
    if (step_key === 'website_analysis') {
      // Trigger website analysis
      const analysisResponse = await fetch(`${request.nextUrl.origin}/api/analyze-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: targetProfileId })
      });

      if (!analysisResponse.ok) {
        console.error('[COMPLETE_STEP] Failed to trigger website analysis');
      }
    }

    // Special handling for first advice step
    if (step_key === 'first_advice' && result.all_required_complete) {
      // Generate initial advice bundle
      const adviceResponse = await fetch(`${request.nextUrl.origin}/api/sales-advice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: targetProfileId })
      });

      if (!adviceResponse.ok) {
        console.error('[COMPLETE_STEP] Failed to generate initial advice');
      }
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[COMPLETE_STEP] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to complete onboarding step',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 