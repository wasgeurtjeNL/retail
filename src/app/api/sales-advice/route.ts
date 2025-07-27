// Sales Advice API Routes
// Handles generating and retrieving sales advice for retailers

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { 
  generateAndSaveSalesAdvice, 
  getLatestSalesAdvice,
  checkNeedsSalesAdvice
} from '@/lib/sales-advice-generator';

// Service client for backend operations
const getSupabaseServiceClient = () => {
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

/**
 * GET /api/sales-advice - Get latest sales advice for authenticated user
 */
export async function GET(request: NextRequest) {
  console.log('[SALES-ADVICE-API] GET request received');
  
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
    
    console.log('[SALES-ADVICE-API] Checking authentication...');
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    
    console.log('[SALES-ADVICE-API] Auth result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });

    // Get profile ID from query params first, then fallback to auth user or development bypass
    const { searchParams } = new URL(request.url);
    let profileId = searchParams.get('profile_id');
    
    // If no profile_id in query, use authenticated user
    if (!profileId) {
      let userId = user?.id;
      
      if (authError || !userId) {
        console.log('[SALES-ADVICE-API] Unauthorized access attempt');
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      profileId = userId;
    }
    
    console.log('[SALES-ADVICE-API] Profile ID:', profileId);

    // Get latest sales advice
    console.log('[SALES-ADVICE-API] Getting latest sales advice...');
    const advice = await getLatestSalesAdvice(profileId);
    console.log('[SALES-ADVICE-API] Advice result:', advice ? 'found' : 'not found');

    if (!advice) {
      // Check if user needs advice generation
      console.log('[SALES-ADVICE-API] Checking if needs advice generation...');
      const needsAdvice = await checkNeedsSalesAdvice(profileId);
      console.log('[SALES-ADVICE-API] Needs advice:', needsAdvice);
      
      return NextResponse.json({
        advice: null,
        needs_generation: needsAdvice,
        message: needsAdvice ? 
          'Sales advice can be generated for this profile' : 
          'No data available for sales advice generation'
      });
    }

    console.log('[SALES-ADVICE-API] Returning advice');
    return NextResponse.json({
      advice,
      needs_generation: false
    });

  } catch (error) {
    console.error('[SALES-ADVICE-API] Error getting advice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve sales advice',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales-advice - Generate new sales advice for authenticated user
 */
export async function POST(request: NextRequest) {
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
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;

    const body = await request.json().catch(() => ({}));
    let profileId = body.profile_id;
    
    console.log('[SALES-ADVICE-API] POST - Request body:', { 
      profile_id: body.profile_id, 
      hasProfileId: !!profileId,
      authUserId: user?.id 
    });
    
    // If no profile_id in body, use authenticated user
    if (!profileId) {
      let userId = user?.id;

      if (authError || !userId) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      profileId = userId;
    }
    
    console.log('[SALES-ADVICE-API] POST - Final profileId:', profileId);

    // Check if user needs advice generation
    const needsAdvice = await checkNeedsSalesAdvice(profileId);
    if (!needsAdvice) {
      return NextResponse.json(
        { 
          error: 'No data available for sales advice generation',
          message: 'Please complete your business profile or website analysis first'
        }, 
        { status: 400 }
      );
    }

    // Generate and save sales advice
    const advice = await generateAndSaveSalesAdvice(profileId);

    return NextResponse.json({
      success: true,
      advice,
      message: 'Sales advice generated successfully'
    });

  } catch (error) {
    console.error('[SALES-ADVICE-API] Error generating advice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate sales advice',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sales-advice - Update business summary and regenerate advice
 */
export async function PUT(request: NextRequest) {
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
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;

    const body = await request.json();
    const { manual_business_summary, profile_id } = body;
    let effectiveProfileId = profile_id;
    
    // If no profile_id in body, use authenticated user
    if (!effectiveProfileId) {
      let userId = user?.id;

      if (authError || !userId) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        );
      }
      
      effectiveProfileId = userId;
    }
    
    if (!manual_business_summary || manual_business_summary.trim().length === 0) {
      return NextResponse.json(
        { error: 'Business summary is required' }, 
        { status: 400 }
      );
    }

    const profileIdToUpdate = effectiveProfileId;

    // Update profile with manual business summary
    const serviceSupabase = getSupabaseServiceClient();
    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({ manual_business_summary: manual_business_summary.trim() })
      .eq('id', profileIdToUpdate);

    if (updateError) {
      console.error('[SALES-ADVICE-API] Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update business summary' }, 
        { status: 500 }
      );
    }

    // Generate new sales advice based on updated summary
    const advice = await generateAndSaveSalesAdvice(profileIdToUpdate);

    return NextResponse.json({
      success: true,
      advice,
      message: 'Business summary updated and sales advice regenerated'
    });

  } catch (error) {
    console.error('[SALES-ADVICE-API] Error updating and regenerating advice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update business summary and regenerate advice',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}