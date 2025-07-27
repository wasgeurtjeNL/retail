import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check actual environment variables
    const apiStatus = {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        name: 'OpenAI API',
        description: 'AI email optimization',
        keyLength: process.env.OPENAI_API_KEY?.length || 0
      },
      google: {
        configured: !!process.env.GOOGLE_PLACES_API_KEY,
        name: 'Google Places API',
        description: 'Business discovery',
        keyLength: process.env.GOOGLE_PLACES_API_KEY?.length || 0
      },
      kvk: {
        configured: !!process.env.KVK_API_KEY,
        name: 'KvK API',  
        description: 'Nederlandse bedrijfsdata',
        keyLength: process.env.KVK_API_KEY?.length || 0
      },
      mandrill: {
        configured: !!process.env.MANDRILL_API_KEY,
        name: 'Mandrill API',
        description: 'Email delivery service',
        keyLength: process.env.MANDRILL_API_KEY?.length || 0
      }
    };

    // Calculate overall system readiness
    const configuredCount = Object.values(apiStatus).filter(api => api.configured).length;
    const totalApis = Object.keys(apiStatus).length;
    const systemReadiness = Math.round((configuredCount / totalApis) * 100);

    return NextResponse.json({
      success: true,
      data: {
        apis: apiStatus,
        summary: {
          configuredCount,
          totalApis,
          systemReadiness: `${systemReadiness}%`,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('[API] Error checking API status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check API status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 