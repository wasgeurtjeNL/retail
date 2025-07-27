// =====================================================
// COMPLETE COMMERCIAL ACQUISITION FLOW TEST
// End-to-end test van discovery tot fulfillment
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('[CompleteFlowTest] Starting end-to-end commercial acquisition test...');

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

    const body = await request.json();
    const { 
      testMode = 'full',
      segment = 'beauty_salon',
      region = 'Amsterdam'
    } = body;

    const testResults = {
      success: true,
      timestamp: new Date().toISOString(),
      test_mode: testMode,
      steps: [],
      errors: [],
      warnings: [],
      summary: {}
    };

    const serviceRoleClient = getServiceRoleClient();

    try {
      // Step 1: Test Prospect Discovery
      console.log('[CompleteFlowTest] Step 1: Testing prospect discovery...');
      const discoveryTest = await testProspectDiscovery(segment, region);
      testResults.steps.push({
        step: 1,
        name: 'Prospect Discovery',
        status: discoveryTest.success ? 'passed' : 'failed',
        duration_ms: discoveryTest.duration,
        data: discoveryTest.data,
        error: discoveryTest.error
      });

      if (!discoveryTest.success) {
        testResults.errors.push(`Step 1 failed: ${discoveryTest.error}`);
      }

      // Step 2: Test Email Campaign Automation
      if (discoveryTest.success && discoveryTest.data?.prospects?.length > 0) {
        console.log('[CompleteFlowTest] Step 2: Testing email campaign automation...');
        const prospectId = discoveryTest.data.prospects[0].id;
        
        const emailTest = await testEmailCampaign(prospectId);
        testResults.steps.push({
          step: 2,
          name: 'Email Campaign Automation',
          status: emailTest.success ? 'passed' : 'failed',
          duration_ms: emailTest.duration,
          data: emailTest.data,
          error: emailTest.error
        });

        if (!emailTest.success) {
          testResults.errors.push(`Step 2 failed: ${emailTest.error}`);
        }

        // Step 3: Test Fulfillment Automation
        if (emailTest.success) {
          console.log('[CompleteFlowTest] Step 3: Testing fulfillment automation...');
          
          const fulfillmentTest = await testFulfillmentAutomation(prospectId);
          testResults.steps.push({
            step: 3,
            name: 'Fulfillment Automation',
            status: fulfillmentTest.success ? 'passed' : 'failed',
            duration_ms: fulfillmentTest.duration,
            data: fulfillmentTest.data,
            error: fulfillmentTest.error
          });

          if (!fulfillmentTest.success) {
            testResults.errors.push(`Step 3 failed: ${fulfillmentTest.error}`);
          }

          // Step 4: Test Conversion Tracking
          if (fulfillmentTest.success) {
            console.log('[CompleteFlowTest] Step 4: Testing conversion tracking...');
            
            const trackingTest = await testConversionTracking(prospectId);
            testResults.steps.push({
              step: 4,
              name: 'Conversion Tracking',
              status: trackingTest.success ? 'passed' : 'failed',
              duration_ms: trackingTest.duration,
              data: trackingTest.data,
              error: trackingTest.error
            });

            if (!trackingTest.success) {
              testResults.errors.push(`Step 4 failed: ${trackingTest.error}`);
            }
          }
        }
      } else {
        testResults.warnings.push('Skipping email and fulfillment tests - no prospects discovered');
      }

      // Step 5: Test System Performance
      console.log('[CompleteFlowTest] Step 5: Testing system performance...');
      const performanceTest = await testSystemPerformance();
      testResults.steps.push({
        step: 5,
        name: 'System Performance',
        status: performanceTest.success ? 'passed' : 'failed',
        duration_ms: performanceTest.duration,
        data: performanceTest.data,
        error: performanceTest.error
      });

      // Calculate summary
      const passedSteps = testResults.steps.filter(s => s.status === 'passed').length;
      const totalSteps = testResults.steps.length;
      const totalDuration = testResults.steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

      testResults.summary = {
        total_steps: totalSteps,
        passed_steps: passedSteps,
        failed_steps: totalSteps - passedSteps,
        success_rate: `${Math.round((passedSteps / totalSteps) * 100)}%`,
        total_duration_ms: totalDuration,
        total_errors: testResults.errors.length,
        total_warnings: testResults.warnings.length
      };

      testResults.success = testResults.errors.length === 0;

      console.log(`[CompleteFlowTest] Test completed: ${passedSteps}/${totalSteps} steps passed`);

      return NextResponse.json(testResults);

    } catch (error) {
      console.error('[CompleteFlowTest] Fatal error during testing:', error);
      testResults.success = false;
      testResults.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
      
      return NextResponse.json(testResults, { status: 500 });
    }

  } catch (error) {
    console.error('[CompleteFlowTest] Error in test setup:', error);
    return NextResponse.json({ 
      error: 'Test setup failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Test Functions

async function testProspectDiscovery(segment: string, region: string) {
  const startTime = Date.now();
  
  try {
    const { LeadEnrichmentService } = await import('@/lib/prospect-discovery/lead-enrichment');
    
    const config = {
      googlePlaces: {
        apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
        searchRadius: 2000,
        language: 'nl',
        region: 'nl'
      },
      kvk: {
        apiKey: process.env.KVK_API_KEY || '',
        baseUrl: process.env.KVK_API_BASE_URL || 'https://api.kvk.nl/test',
        testMode: true
      },
      enabledSources: {
        webScraping: true,
        googlePlaces: false, // Disabled for testing
        kvkApi: false       // Disabled for testing
      },
      qualityFilters: {
        minConfidenceScore: 0.3,
        requireEmail: false,
        requireWebsite: false,
        requirePhone: false,
        minRating: 0.0
      }
    };

    const enrichmentService = new LeadEnrichmentService(config);
    
    const prospects = await enrichmentService.discoverProspects(segment, region, {
      limit: 3,
      sources: ['web_scraping']
    });

    const saveResult = await enrichmentService.saveProspects(prospects);

    return {
      success: true,
      duration: Date.now() - startTime,
      data: {
        prospects_discovered: prospects.length,
        prospects_saved: saveResult.saved,
        prospects: prospects.map(p => ({
          id: p.id,
          business_name: p.business_name,
          city: p.city,
          segment: p.business_segment,
          enrichment_score: p.enrichment_score
        }))
      }
    };

  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testEmailCampaign(prospectId: string) {
  const startTime = Date.now();
  
  try {
    const { EmailCampaignService } = await import('@/lib/commercial-email-campaign');
    
    const emailService = new EmailCampaignService();
    
    // Schedule initial outreach
    await emailService.scheduleInitialOutreach(prospectId);

    // Check if email was queued
    const serviceRoleClient = getServiceRoleClient();
    const { data: queuedEmails, error } = await serviceRoleClient
      .from('commercial_email_queue')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return {
      success: true,
      duration: Date.now() - startTime,
      data: {
        emails_queued: queuedEmails?.length || 0,
        latest_email: queuedEmails?.[0] ? {
          campaign_step: queuedEmails[0].campaign_step,
          status: queuedEmails[0].status,
          scheduled_at: queuedEmails[0].scheduled_at
        } : null
      }
    };

  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testFulfillmentAutomation(prospectId: string) {
  const startTime = Date.now();
  
  try {
    const { CommercialFulfillmentService } = await import('@/lib/commercial-fulfillment-service');
    
    const fulfillmentService = new CommercialFulfillmentService();
    
    // Test eligibility check first
    const serviceRoleClient = getServiceRoleClient();
    const { data: prospect, error: prospectError } = await serviceRoleClient
      .from('commercial_prospects')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError) {
      throw prospectError;
    }

    // Update prospect to qualified status for testing
    await serviceRoleClient
      .from('commercial_prospects')
      .update({
        status: 'qualified',
        enrichment_score: 0.8
      })
      .eq('id', prospectId);

    // Trigger fulfillment
    const result = await fulfillmentService.triggerAutomaticFulfillment(prospectId);

    return {
      success: result.success,
      duration: Date.now() - startTime,
      data: {
        fulfillment_triggered: result.success,
        order_id: result.orderId,
        order_number: result.orderNumber,
        tracking_info: result.trackingInfo,
        error: result.error
      }
    };

  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testConversionTracking(prospectId: string) {
  const startTime = Date.now();
  
  try {
    const serviceRoleClient = getServiceRoleClient();
    
    // Check conversion journeys
    const { data: journeys, error: journeyError } = await serviceRoleClient
      .from('conversion_journeys')
      .select(`
        *,
        conversion_touchpoints (*)
      `)
      .eq('prospect_id', prospectId);

    if (journeyError) {
      throw journeyError;
    }

    // Check email tracking
    const { data: emailTracking, error: trackingError } = await serviceRoleClient
      .from('commercial_email_tracking')
      .select('*')
      .eq('prospect_id', prospectId);

    if (trackingError) {
      throw trackingError;
    }

    return {
      success: true,
      duration: Date.now() - startTime,
      data: {
        conversion_journeys: journeys?.length || 0,
        total_touchpoints: journeys?.reduce((sum, j) => sum + (j.conversion_touchpoints?.length || 0), 0) || 0,
        email_tracking_events: emailTracking?.length || 0,
        journey_details: journeys?.map(j => ({
          id: j.id,
          status: j.status,
          touchpoints: j.conversion_touchpoints?.length || 0,
          first_touch: j.first_touch_at,
          last_touch: j.last_touch_at
        })) || []
      }
    };

  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testSystemPerformance() {
  const startTime = Date.now();
  
  try {
    const serviceRoleClient = getServiceRoleClient();
    
    // Check database performance
    const queries = [
      serviceRoleClient.from('commercial_prospects').select('count', { count: 'exact' }),
      serviceRoleClient.from('commercial_email_queue').select('count', { count: 'exact' }),
      serviceRoleClient.from('fulfillment_orders').select('count', { count: 'exact' }),
      serviceRoleClient.from('conversion_journeys').select('count', { count: 'exact' })
    ];

    const results = await Promise.all(queries);
    
    // Check for any query errors
    const errors = results.filter(r => r.error).map(r => r.error);
    
    if (errors.length > 0) {
      throw new Error(`Database queries failed: ${errors.map(e => e?.message).join(', ')}`);
    }

    const counts = results.map(r => r.count || 0);

    return {
      success: true,
      duration: Date.now() - startTime,
      data: {
        database_responsive: true,
        query_performance_ms: Date.now() - startTime,
        record_counts: {
          prospects: counts[0],
          email_queue: counts[1],
          fulfillment_orders: counts[2],
          conversion_journeys: counts[3]
        },
        api_keys_configured: {
          google_places: !!process.env.GOOGLE_PLACES_API_KEY,
          kvk_api: !!process.env.KVK_API_KEY,
          openai: !!process.env.OPENAI_API_KEY
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 