// Sales Advice Generation API Endpoint
// Dedicated endpoint for generating sales advice

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateAndSaveSalesAdvice } from '@/lib/sales-advice-generator';

/**
 * POST /api/sales-advice/generate - Generate sales advice for a profile
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
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const profileId = body.profile_id || user.id;

    console.log(`[SALES-ADVICE-GENERATE] Starting advice generation for profile: ${profileId}`);

    // Generate and save sales advice
    const startTime = Date.now();
    const advice = await generateAndSaveSalesAdvice(profileId);
    const processingTime = Date.now() - startTime;

    console.log(`[SALES-ADVICE-GENERATE] Generated advice for profile ${profileId} in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      advice,
      processing_time_ms: processingTime,
      message: 'Sales advice generated successfully'
    });

  } catch (error) {
    console.error('[SALES-ADVICE-GENERATE] Error generating advice:', error);
    
    // Return more specific error messages based on error type
    let errorMessage = 'Failed to generate sales advice';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Geen bedrijfsgegevens beschikbaar')) {
        errorMessage = 'No business data available for generating advice. Please complete your business profile or website analysis first.';
        statusCode = 400;
      } else if (error.message.includes('Profile not found')) {
        errorMessage = 'Profile not found';
        statusCode = 404;
      } else if (error.message.includes('API key')) {
        errorMessage = 'Service configuration error';
        statusCode = 503;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: statusCode }
    );
  }
}