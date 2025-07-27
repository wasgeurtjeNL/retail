import { NextRequest, NextResponse } from 'next/server';
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
    console.log('[ONBOARDING_STEPS] Fetching active steps...');

    const supabase = getServiceRoleClient();

    // Get all active onboarding steps
    const { data: steps, error } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[ONBOARDING_STEPS] Error:', error);
      throw error;
    }

    console.log('[ONBOARDING_STEPS] Found', steps?.length || 0, 'active steps');

    return NextResponse.json({
      steps: steps || []
    });

  } catch (error) {
    console.error('[ONBOARDING_STEPS] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch onboarding steps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 