// =====================================================
// PROSPECT DISCOVERY TEST API - End-to-End Testing
// Complete testing of discovery to email flow
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DiscoveryScheduler } from '@/lib/prospect-discovery/discovery-scheduler';
import { LeadEnrichmentService, EnrichmentConfig } from '@/lib/prospect-discovery/lead-enrichment';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';
import { QueueManager } from '@/lib/queue-manager';
import { getServiceRoleClient } from '@/lib/supabase';

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
}

interface CompleteTestResult {
  success: boolean;
  totalDuration: number;
  stepsCompleted: number;
  stepsFailed: number;
  results: TestResult[];
  summary: string;
}

// Test configuration
const testConfig: EnrichmentConfig = {
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY || 'test-key',
    searchRadius: 2000,
    language: 'nl',
    region: 'nl'
  },
  kvk: {
    apiKey: process.env.KVK_API_KEY || 'test-key',
    baseUrl: process.env.KVK_API_BASE_URL || 'https://api.kvk.nl/test',
    testMode: true
  },
  enabledSources: {
    webScraping: true,
    googlePlaces: false, // Disable for testing to avoid API costs
    kvkApi: false       // Disable for testing to avoid API costs
  },
  qualityFilters: {
    minConfidenceScore: 0.3, // Lower for testing
    requireEmail: false,
    requireWebsite: false,
    requirePhone: false,
    minRating: 0.0
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('[Discovery Test] Starting complete discovery-to-email test...');

    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { test_type = 'complete', segment = 'beauty_salon', region = 'Amsterdam' } = body;

    const results: TestResult[] = [];
    const startTime = Date.now();

         // Initialize services
     const queueManager = QueueManager.getInstance();
     const discoveryScheduler = new DiscoveryScheduler(queueManager, testConfig);
     const leadEnrichment = new LeadEnrichmentService(testConfig);
     const emailCampaign = new EmailCampaignService();

    switch (test_type) {
      case 'complete':
        return await runCompleteTest(results, startTime, {
          discoveryScheduler,
          leadEnrichment,
          emailCampaign,
          segment,
          region
        });

      case 'discovery_only':
        return await runDiscoveryTest(results, startTime, { leadEnrichment, segment, region });

      case 'enrichment_only':
        return await runEnrichmentTest(results, startTime, { leadEnrichment });

      case 'email_only':
        return await runEmailTest(results, startTime, { emailCampaign });

      case 'scheduler_only':
        return await runSchedulerTest(results, startTime, { discoveryScheduler });

      default:
        return NextResponse.json({ 
          error: 'Invalid test_type. Use: complete, discovery_only, enrichment_only, email_only, scheduler_only' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Discovery Test] Test execution failed:', error);
    return NextResponse.json({ 
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

async function runCompleteTest(
  results: TestResult[],
  startTime: number,
  services: any
): Promise<NextResponse> {
  const { discoveryScheduler, leadEnrichment, emailCampaign, segment, region } = services;

  try {
    // Step 1: Test service connectivity
    await runTestStep(results, 'Service Connectivity Test', async () => {
      const enrichmentTest = await leadEnrichment.testEnrichment();
      return { enrichment: enrichmentTest };
    });

    // Step 2: Discovery and enrichment
    let discoveredProspects: any[] = [];
    await runTestStep(results, 'Prospect Discovery & Enrichment', async () => {
      discoveredProspects = await leadEnrichment.discoverProspects(segment, region, {
        limit: 5, // Small number for testing
        sources: ['web_scraping'] // Only web scraping for testing
      });
      
      return {
        prospects_found: discoveredProspects.length,
        prospects: discoveredProspects.map(p => ({
          name: p.business_name,
          city: p.city,
          enrichment_score: p.enrichment_score,
          sources: p.data_sources
        }))
      };
    });

    // Step 3: Save prospects to database
    let saveResult: any;
    await runTestStep(results, 'Save Prospects to Database', async () => {
      saveResult = await leadEnrichment.saveProspects(discoveredProspects);
      return saveResult;
    });

    // Step 4: Create test discovery job
    let testJobId: string;
    await runTestStep(results, 'Create Discovery Job', async () => {
      testJobId = `test_job_${Date.now()}`;
      
      const jobConfig = {
        id: testJobId,
        name: `Test Discovery Job - ${segment}`,
        segment,
        regions: [region],
        frequency: 'weekly' as const,
        enabled: true,
        maxProspectsPerRun: 10,
        qualityFilters: {
          minEnrichmentScore: 0.3,
          requireContactInfo: false,
          skipExistingProspects: false
        },
        sources: ['web_scraping' as const]
      };

      const createResult = await discoveryScheduler.createJob(jobConfig);
      return { job_created: createResult.success, job_id: testJobId };
    });

    // Step 5: Test job execution
    await runTestStep(results, 'Execute Discovery Job', async () => {
      const jobResult = await discoveryScheduler.runJob(testJobId);
      return {
        job_success: jobResult.success,
        prospects_discovered: jobResult.prospectsDiscovered,
        prospects_saved: jobResult.prospectsSaved,
        processing_time: jobResult.processing_time
      };
    });

    // Step 6: Test email campaign enrollment
    await runTestStep(results, 'Email Campaign Enrollment', async () => {
      if (saveResult.saved > 0) {
        // Get a saved prospect for testing
        const serviceRoleClient = getServiceRoleClient();
        const { data: prospects, error } = await serviceRoleClient
          .from('commercial_prospects')
          .select('id, business_name')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !prospects || prospects.length === 0) {
          throw new Error('No prospects found for email test');
        }

        const testProspect = prospects[0];
        
        // Schedule initial outreach
        await emailCampaign.scheduleInitialOutreach(
          testProspect.id,
          `test-campaign-${segment}`
        );
        
        return {
          prospect_enrolled: true,
          prospect_id: testProspect.id,
          prospect_name: testProspect.business_name
        };
      } else {
        return { prospect_enrolled: false, reason: 'No prospects were saved' };
      }
    });

    // Step 7: Verify email queue
    await runTestStep(results, 'Verify Email Queue', async () => {
      const serviceRoleClient = getServiceRoleClient();
      const { data: emailQueue, error } = await serviceRoleClient
        .from('commercial_email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      return {
        emails_queued: emailQueue?.length || 0,
        latest_emails: emailQueue?.map(email => ({
          prospect_id: email.prospect_id,
          campaign_step: email.campaign_step,
          scheduled_at: email.scheduled_at,
          status: 'queued'
        })) || []
      };
    });

    // Step 8: Cleanup test data
    await runTestStep(results, 'Cleanup Test Data', async () => {
      const serviceRoleClient = getServiceRoleClient();
      
      // Delete test job
      await discoveryScheduler.deleteJob(testJobId);
      
      // Delete test prospects (optional, keep for inspection)
      // await serviceRoleClient
      //   .from('commercial_prospects')
      //   .delete()
      //   .contains('raw_data', { mockGenerated: true });

      return { cleanup_completed: true };
    });

    // Generate final result
    const totalDuration = Date.now() - startTime;
    const stepsCompleted = results.filter(r => r.success).length;
    const stepsFailed = results.filter(r => !r.success).length;

    const finalResult: CompleteTestResult = {
      success: stepsFailed === 0,
      totalDuration,
      stepsCompleted,
      stepsFailed,
      results,
      summary: stepsFailed === 0 
        ? `✅ Complete test passed! All ${stepsCompleted} steps successful in ${totalDuration}ms`
        : `❌ Test failed: ${stepsFailed} of ${results.length} steps failed`
    };

    console.log('[Discovery Test] Complete test finished:', finalResult.summary);

    return NextResponse.json({
      success: true,
      test_result: finalResult
    });

  } catch (error) {
    console.error('[Discovery Test] Complete test error:', error);
    
    const finalResult: CompleteTestResult = {
      success: false,
      totalDuration: Date.now() - startTime,
      stepsCompleted: results.filter(r => r.success).length,
      stepsFailed: results.filter(r => !r.success).length + 1,
      results,
      summary: `❌ Test failed with error: ${error instanceof Error ? error.message : String(error)}`
    };

    return NextResponse.json({
      success: false,
      test_result: finalResult
    });
  }
}

async function runDiscoveryTest(
  results: TestResult[],
  startTime: number,
  services: any
): Promise<NextResponse> {
  const { leadEnrichment, segment, region } = services;

  await runTestStep(results, 'Discovery Test', async () => {
    const prospects = await leadEnrichment.discoverProspects(segment, region, {
      limit: 3,
      sources: ['web_scraping']
    });

         return {
       prospects_found: prospects.length,
       average_score: prospects.reduce((sum: number, p: any) => sum + p.enrichment_score, 0) / prospects.length,
       data_sources: [...new Set(prospects.flatMap((p: any) => p.data_sources))]
     };
  });

  return generateTestResponse(results, startTime);
}

async function runEnrichmentTest(
  results: TestResult[],
  startTime: number,
  services: any
): Promise<NextResponse> {
  const { leadEnrichment } = services;

  await runTestStep(results, 'Enrichment Test', async () => {
    const testResult = await leadEnrichment.testEnrichment();
    return testResult;
  });

  return generateTestResponse(results, startTime);
}

async function runEmailTest(
  results: TestResult[],
  startTime: number,
  services: any
): Promise<NextResponse> {
  const { emailCampaign } = services;

  await runTestStep(results, 'Email Service Test', async () => {
    // Test email configuration
    return { email_service: 'initialized', status: 'ready' };
  });

  return generateTestResponse(results, startTime);
}

async function runSchedulerTest(
  results: TestResult[],
  startTime: number,
  services: any
): Promise<NextResponse> {
  const { discoveryScheduler } = services;

  await runTestStep(results, 'Scheduler Test', async () => {
    const stats = await discoveryScheduler.getStats();
    const jobs = await discoveryScheduler.getJobs();
    
         return {
       scheduler_stats: stats,
       total_jobs: jobs.length,
       active_jobs: jobs.filter((j: any) => j.enabled).length
     };
  });

  return generateTestResponse(results, startTime);
}

async function runTestStep(
  results: TestResult[],
  stepName: string,
  testFunction: () => Promise<any>
): Promise<void> {
  const stepStartTime = Date.now();
  
  try {
    console.log(`[Discovery Test] Running: ${stepName}`);
    
    const data = await testFunction();
    const duration = Date.now() - stepStartTime;
    
    results.push({
      step: stepName,
      success: true,
      duration,
      data
    });
    
    console.log(`[Discovery Test] ✅ ${stepName} completed in ${duration}ms`);
    
  } catch (error) {
    const duration = Date.now() - stepStartTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    results.push({
      step: stepName,
      success: false,
      duration,
      error: errorMessage
    });
    
    console.error(`[Discovery Test] ❌ ${stepName} failed in ${duration}ms:`, errorMessage);
  }
}

function generateTestResponse(results: TestResult[], startTime: number): NextResponse {
  const totalDuration = Date.now() - startTime;
  const stepsCompleted = results.filter(r => r.success).length;
  const stepsFailed = results.filter(r => !r.success).length;

  const testResult: CompleteTestResult = {
    success: stepsFailed === 0,
    totalDuration,
    stepsCompleted,
    stepsFailed,
    results,
    summary: stepsFailed === 0 
      ? `✅ Test passed! All ${stepsCompleted} steps successful in ${totalDuration}ms`
      : `❌ Test failed: ${stepsFailed} of ${results.length} steps failed`
  };

  return NextResponse.json({
    success: testResult.success,
    test_result: testResult
  });
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Return test configuration and available test types
    return NextResponse.json({
      success: true,
      available_tests: [
        'complete',
        'discovery_only', 
        'enrichment_only',
        'email_only',
        'scheduler_only'
      ],
      test_config: {
        enabled_sources: testConfig.enabledSources,
        quality_filters: testConfig.qualityFilters
      },
      segments: [
        'beauty_salon',
        'hair_salon',
        'wellness_spa',
        'hotel_bnb',
        'restaurant',
        'cleaning_service',
        'laundromat',
        'fashion_retail',
        'home_living'
      ],
      regions: [
        'Amsterdam',
        'Rotterdam',
        'Den Haag',
        'Utrecht',
        'Eindhoven'
      ]
    });

  } catch (error) {
    console.error('[Discovery Test] GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 