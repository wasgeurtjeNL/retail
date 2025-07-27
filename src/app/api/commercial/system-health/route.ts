// =====================================================
// SYSTEM HEALTH CHECK - Commercial Acquisition
// Comprehensive test van alle system componenten  
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';
import { OpenAITestService } from '../../../../lib/openai-test-service';
import { SYSTEM_UUID } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    console.log('[SystemHealth] Starting comprehensive health check...');

    // Check authentication - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[SystemHealth] Development mode - skipping authentication');
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

    const healthReport = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      components: {},
      recommendations: [],
      next_steps: []
    };

    // 1. Database Health Check
    console.log('[SystemHealth] Checking database connectivity...');
    try {
      const serviceSupabase = getServiceRoleClient();
      
      // Test basic connectivity
      const { data: testQuery } = await serviceSupabase
        .from('commercial_prospects')
        .select('count', { count: 'exact', head: true });

      // Test critical tables
      const tableChecks = await Promise.all([
        serviceSupabase.from('commercial_prospects').select('count', { count: 'exact', head: true }),
        serviceSupabase.from('commercial_email_templates').select('count', { count: 'exact', head: true }),
        serviceSupabase.from('commercial_email_campaigns').select('count', { count: 'exact', head: true }),
        serviceSupabase.from('background_jobs').select('count', { count: 'exact', head: true })
      ]);

      healthReport.components.database = {
        status: 'healthy',
        details: {
          connectivity: 'ok',
          tables_accessible: tableChecks.every(check => !check.error),
          prospect_count: testQuery?.count || 0
        }
      };

    } catch (error) {
      healthReport.components.database = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 2. Queue Manager Health
    console.log('[SystemHealth] Checking queue manager...');
    try {
      const { QueueManager } = await import('@/lib/queue-manager');
      const queueManager = QueueManager.getInstance();
      
      // Test adding a dummy job with system UUID
      const testJobId = await queueManager.addJob('ai_optimization', SYSTEM_UUID, {
        test: true,
        timestamp: Date.now(),
        healthCheck: true
      });

      healthReport.components.queue_manager = {
        status: 'healthy',
        details: {
          instance_running: !!queueManager,
          test_job_created: !!testJobId
        }
      };

    } catch (error) {
      healthReport.components.queue_manager = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 3. API Configuration Check
    console.log('[SystemHealth] Checking API configurations...');
    const apiConfig = {
      google_places: !!process.env.GOOGLE_PLACES_API_KEY,
      kvk_api: !!process.env.KVK_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      mandrill: !!process.env.MANDRILL_API_KEY
    };

    // Test OpenAI if configured
    let openaiTest = null;
    if (apiConfig.openai) {
      try {
        openaiTest = await OpenAITestService.testConfiguration();
      } catch (error) {
        openaiTest = { success: false, errors: [String(error)] };
      }
    }

    healthReport.components.api_configuration = {
      status: Object.values(apiConfig).some(Boolean) ? 'partial' : 'missing',
      details: {
        configured_apis: apiConfig,
        openai_test: openaiTest
      }
    };

    // 4. Email System Health
    console.log('[SystemHealth] Checking email system...');
    try {
      // Test email template access
      const serviceSupabase = getServiceRoleClient();
      const { data: templates, error: templateError } = await serviceSupabase
        .from('commercial_email_templates')
        .select('id, name, performance_metrics')
        .limit(5);

      healthReport.components.email_system = {
        status: templateError ? 'error' : 'healthy',
        details: {
          templates_available: templates?.length || 0,
          mandrill_configured: apiConfig.mandrill,
          error: templateError?.message
        }
      };

    } catch (error) {
      healthReport.components.email_system = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 5. Discovery Services Health
    console.log('[SystemHealth] Checking discovery services...');
    try {
      const { DiscoveryScheduler } = await import('@/lib/prospect-discovery/discovery-scheduler');
      
      // Test scheduler instantiation
      const enrichmentConfig = {
        googlePlaces: {
          apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
          searchRadius: 5000,
          language: 'nl',
          region: 'nl'
        },
        kvk: {
          apiKey: process.env.KVK_API_KEY || '',
          baseUrl: 'https://api.kvk.nl/api/v1/nhr-data-v2',
          testMode: true
        },
        enabledSources: {
          webScraping: true,
          googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY,
          kvkApi: !!process.env.KVK_API_KEY
        },
        qualityFilters: {
          minConfidenceScore: 0.6,
          requireEmail: false,
          requireWebsite: false,
          requirePhone: false,
          minRating: 3.0
        }
      };

      const { QueueManager } = await import('@/lib/queue-manager');
      const queueManager = QueueManager.getInstance();
      const scheduler = new DiscoveryScheduler(queueManager, enrichmentConfig);

      healthReport.components.discovery_services = {
        status: 'healthy',
        details: {
          scheduler_instantiated: !!scheduler,
          enabled_sources: enrichmentConfig.enabledSources,
          api_keys_configured: {
            google_places: !!process.env.GOOGLE_PLACES_API_KEY,
            kvk: !!process.env.KVK_API_KEY
          }
        }
      };

    } catch (error) {
      healthReport.components.discovery_services = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 6. Campaign System Health
    console.log('[SystemHealth] Checking campaign system...');
    try {
      const { EmailCampaignService } = await import('@/lib/commercial-email-campaign');
      const { CampaignScheduler } = await import('@/lib/campaign-scheduler');
      
      const campaignService = new EmailCampaignService();
      const campaignScheduler = new CampaignScheduler();

      healthReport.components.campaign_system = {
        status: 'healthy',
        details: {
          email_service_instantiated: !!campaignService,
          scheduler_instantiated: !!campaignScheduler,
          can_send_emails: apiConfig.mandrill
        }
      };

    } catch (error) {
      healthReport.components.campaign_system = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // 7. AI Optimization Health
    console.log('[SystemHealth] Checking AI optimization...');
    try {
      const { AIEmailOptimizer } = await import('@/lib/ai-email-optimizer');
      
      // Test instantiation
      const optimizer = new AIEmailOptimizer();
      
      healthReport.components.ai_optimization = {
        status: apiConfig.openai ? 'healthy' : 'limited',
        details: {
          optimizer_available: !!optimizer,
          openai_configured: apiConfig.openai,
          test_result: openaiTest
        }
      };

    } catch (error) {
      healthReport.components.ai_optimization = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Generate Overall Status
    const componentStatuses = Object.values(healthReport.components)
      .map((comp: any) => comp.status);
    
    const errorCount = componentStatuses.filter(status => status === 'error').length;
    const healthyCount = componentStatuses.filter(status => status === 'healthy').length;
    const totalComponents = componentStatuses.length;

    if (errorCount === 0) {
      healthReport.overall_status = 'healthy';
    } else if (errorCount < totalComponents / 2) {
      healthReport.overall_status = 'degraded';
    } else {
      healthReport.overall_status = 'critical';
    }

    // Generate Recommendations
    if (!apiConfig.google_places) {
      healthReport.recommendations.push('Configure Google Places API for automated business discovery');
    }
    if (!apiConfig.kvk_api) {
      healthReport.recommendations.push('Configure KvK API for Dutch business data verification');
    }
    if (!apiConfig.openai) {
      healthReport.recommendations.push('Configure OpenAI API for AI email optimization');
    }
    if (!apiConfig.mandrill) {
      healthReport.recommendations.push('Configure Mandrill API for email sending (may already be set up)');
    }

    // Generate Next Steps
    if (healthReport.overall_status === 'healthy') {
      healthReport.next_steps.push('System is ready for production use');
      healthReport.next_steps.push('Run test automation to verify end-to-end functionality');
      healthReport.next_steps.push('Monitor performance metrics in the dashboard');
    } else {
      healthReport.next_steps.push('Address critical errors first');
      healthReport.next_steps.push('Configure missing API keys');
      healthReport.next_steps.push('Re-run health check after fixes');
    }

    console.log(`[SystemHealth] Health check completed. Status: ${healthReport.overall_status}`);

    return NextResponse.json(healthReport);

  } catch (error) {
    console.error('[SystemHealth] Health check failed:', error);
    return NextResponse.json({
      error: 'System health check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 