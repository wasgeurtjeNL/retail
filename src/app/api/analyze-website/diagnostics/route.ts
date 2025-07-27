/**
 * Website Analysis Diagnostics API
 * GET /api/analyze-website/diagnostics - Controleer configuratie en systeem status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getSafeEnvironmentConfig } from '@/lib/env';

interface DiagnosticsResponse {
  success: boolean;
  data?: {
    config: any;
    status: {
      openaiConfigured: boolean;
      analysisEnabled: boolean;
      supabaseConnected: boolean;
      tablesExist: boolean;
    };
    recommendations: string[];
  };
  error?: string;
}

/**
 * GET /api/analyze-website/diagnostics
 * Controleer website analysis configuratie
 */
export async function GET(request: NextRequest): Promise<NextResponse<DiagnosticsResponse>> {
  try {
    console.log('[DIAGNOSTICS] Running website analysis diagnostics');

    // Check environment config
    const config = getSafeEnvironmentConfig();
    const recommendations: string[] = [];

    // Check OpenAI configuration
    const openaiConfigured = Boolean(config?.openai.apiKey && 
                            config.openai.apiKey !== 'not-configured' && 
                            config.openai.apiKey.startsWith('sk-'));

    if (!openaiConfigured) {
      recommendations.push('Configureer OPENAI_API_KEY in .env.local met een geldige OpenAI API key');
    }

    // Check analysis enabled
    const analysisEnabled = Boolean(config?.rateLimit.enabled === true);
    if (!analysisEnabled) {
      recommendations.push('Zet WEBSITE_ANALYSIS_ENABLED=true in .env.local');
    }

    // Check Supabase connection
    let supabaseConnected = false;
    let tablesExist = false;
    
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (!authError) {
        supabaseConnected = true;
        
        // Check if website analysis table exists
        const { data, error: tableError } = await supabase
          .from('profile_website_analysis')
          .select('id')
          .limit(1);
          
        if (!tableError) {
          tablesExist = true;
        } else {
          recommendations.push('Voer database migratie uit voor profile_website_analysis tabel');
        }
      } else {
        recommendations.push('Configureer Supabase credentials in .env.local');
      }
    } catch (error) {
      recommendations.push('Controleer Supabase configuratie');
    }

    // Additional recommendations
    if (!config?.openai.model) {
      recommendations.push('Zet OPENAI_MODEL=gpt-4o-mini in .env.local');
    }

    if (!config?.app.url) {
      recommendations.push('Zet NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env.local');
    }

    const status = {
      openaiConfigured,
      analysisEnabled,
      supabaseConnected,
      tablesExist
    };

    const isFullyConfigured = openaiConfigured && analysisEnabled && supabaseConnected && tablesExist;

    return NextResponse.json({
      success: true,
      data: {
        config: config ? {
          openai: {
            model: config.openai.model,
            hasApiKey: !!config.openai.apiKey && config.openai.apiKey !== 'not-configured',
            hasOrganization: !!config.openai.organizationId
          },
          rateLimit: config.rateLimit,
          security: config.security,
          app: config.app
        } : null,
        status,
        recommendations: isFullyConfigured ? ['✅ Website analysis is volledig geconfigureerd!'] : recommendations
      }
    });

  } catch (error) {
    console.error('[DIAGNOSTICS] Error running diagnostics:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during diagnostics'
    }, { status: 500 });
  }
} 