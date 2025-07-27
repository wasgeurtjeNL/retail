// =====================================================
// COMMERCIAL SYSTEM STATUS API
// Get current status of commercial acquisition system
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getCommercialConfig } from '@/lib/commercial-config';

export async function GET(request: NextRequest) {
  try {
    console.log('[CommercialStatus] GET request received');

    // Check authentication - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[CommercialStatus] Development mode - skipping authentication');
    } else {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
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
    }

    // Get commercial configuration and system status
    const commercialConfig = await getCommercialConfig();
    
    // Check actual API key availability
    const apiKeysConfigured = {
      google_places: !!process.env.GOOGLE_PLACES_API_KEY,
      kvk_api: !!process.env.KVK_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      mandrill: !!process.env.MANDRILL_API_KEY
    };

    // Calculate system readiness based on configured APIs
    const configuredCount = Object.values(apiKeysConfigured).filter(Boolean).length;
    const systemReadiness = (configuredCount / 4) * 100; // 4 total APIs

    // Determine queue manager status based on system readiness
    const queueManagerStatus = systemReadiness >= 25 ? 'running' : 'offline';
    
    const systemStatus = {
      automation_running: systemReadiness >= 75, // Need most APIs for automation
      api_keys_configured: apiKeysConfigured,
      enabled_sources: commercialConfig.enabledSources,
      queue_manager_status: queueManagerStatus,
      system_readiness: Math.round(systemReadiness),
      recommendations: [] as string[],
      web_scraping_available: commercialConfig.enabledSources.webScraping,
      puppeteer_status: commercialConfig.enabledSources.webScraping ? 'available' : 'disabled',
      configuration: {
        kvk_api_configured: !!process.env.KVK_API_KEY,
        kvk_api_enabled: commercialConfig.enabledSources.kvkApi,
        system_operational: systemReadiness >= 50
      },
      status_message: getStatusMessage(systemReadiness, configuredCount)
    };

    // Add recommendations based on configuration
    if (!systemStatus.api_keys_configured.google_places) {
      systemStatus.recommendations.push('Configure Google Places API key in .env.local for business discovery');
    }
    if (!systemStatus.api_keys_configured.kvk_api) {
      systemStatus.recommendations.push('Configure KvK API key in .env.local for Dutch business data');
    }
    if (!systemStatus.api_keys_configured.openai) {
      systemStatus.recommendations.push('Configure OpenAI API key in .env.local for AI optimization');
    }
    if (!systemStatus.api_keys_configured.mandrill) {
      systemStatus.recommendations.push('Configure Mandrill API key in .env.local for email sending');
    }

    // Add setup instructions if no APIs are configured
    if (configuredCount === 0) {
      systemStatus.recommendations.unshift('Create .env.local file with API keys to enable Commercial Acquisition System');
    }

    console.log('[CommercialStatus] System status generated successfully', {
      readiness: systemReadiness,
      configured: configuredCount,
      status: queueManagerStatus
    });

    return NextResponse.json(systemStatus);

  } catch (error) {
    console.error('[CommercialStatus] Error:', error);
    return NextResponse.json({
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : String(error),
      queue_manager_status: 'error',
      system_readiness: 0,
      status_message: 'System error - check logs for details'
    }, { status: 500 });
  }
}

/**
 * Generate human-readable status message based on system readiness
 */
function getStatusMessage(readiness: number, configuredApis: number): string {
  if (readiness >= 90) {
    return 'System fully operational - all APIs configured';
  } else if (readiness >= 75) {
    return 'System operational - minor APIs missing';
  } else if (readiness >= 50) {
    return 'System partially operational - configure additional APIs';
  } else if (readiness >= 25) {
    return 'System limited - configure more APIs for full functionality';
  } else if (configuredApis > 0) {
    return 'System minimal - most APIs not configured';
  } else {
    return 'System offline - no APIs configured. Create .env.local file';
  }
} 