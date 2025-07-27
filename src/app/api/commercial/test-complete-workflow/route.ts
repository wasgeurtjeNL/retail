// =====================================================
// COMPLETE WORKFLOW TEST - End-to-End Commercial Acquisition
// Tests the entire pipeline: Discovery → Enrichment → Campaigns → Fulfillment
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

// Service imports
import { LeadEnrichmentService } from '@/lib/prospect-discovery/lead-enrichment';
import { PuppeteerBusinessScraper, createScrapingTarget } from '@/lib/prospect-discovery/puppeteer-scraper';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';
import { getCampaignScheduler } from '@/lib/campaign-scheduler';
import { QueueManager } from '@/lib/queue-manager';

interface WorkflowStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started?: string;
  completed?: string;
  duration?: number;
  data?: any;
  error?: string;
}

interface WorkflowTestResult {
  success: boolean;
  totalDuration: number;
  stepsCompleted: number;
  stepsFailed: number;
  steps: WorkflowStep[];
  summary: {
    prospectsDiscovered: number;
    prospectsEnriched: number;
    emailsCampaignCreated: number;
    campaignsScheduled: number;
    overallHealthScore: number;
  };
}

/**
 * POST /api/commercial/test-complete-workflow
 * Execute complete end-to-end workflow test
 */
export async function POST(request: NextRequest): Promise<NextResponse<WorkflowTestResult>> {
  const workflowStartTime = Date.now();
  
  try {
    console.log('[Workflow Test] Starting complete commercial acquisition workflow test');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          totalDuration: 0,
          stepsCompleted: 0,
          stepsFailed: 1,
          steps: [{ step: 'Authentication', status: 'failed', error: 'Unauthorized' }],
          summary: {
            prospectsDiscovered: 0,
            prospectsEnriched: 0,
            emailsCampaignCreated: 0,
            campaignsScheduled: 0,
            overallHealthScore: 0
          }
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      testScope = 'full', // 'full', 'discovery_only', 'campaigns_only'
      testData = {
        location: 'Amsterdam',
        businessTypes: ['restaurant', 'kappers'],
        maxProspectsPerType: 3
      }
    } = body;

    const steps: WorkflowStep[] = [];
    let prospectsDiscovered = 0;
    let prospectsEnriched = 0;
    let emailsCampaignCreated = 0;
    let campaignsScheduled = 0;

    // ============================================
    // STEP 1: SERVICE INITIALIZATION
    // ============================================
    
    const step1: WorkflowStep = {
      step: 'Service Initialization',
      status: 'running',
      started: new Date().toISOString()
    };
    steps.push(step1);

    try {
      const serviceSupabase = getServiceRoleClient();
      
      // Initialize services
      const enrichmentService = new LeadEnrichmentService({
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
          googlePlaces: false, // Disable for testing
          kvkApi: false       // Disable for testing
        }
      });

      const emailCampaignService = new EmailCampaignService();
      const campaignScheduler = getCampaignScheduler();
      const queueManager = new QueueManager();

      step1.status = 'completed';
      step1.completed = new Date().toISOString();
      step1.duration = Date.now() - new Date(step1.started!).getTime();
      step1.data = { servicesInitialized: ['enrichment', 'emailCampaign', 'scheduler', 'queue'] };

    } catch (error) {
      step1.status = 'failed';
      step1.error = error instanceof Error ? error.message : String(error);
      step1.completed = new Date().toISOString();
      step1.duration = Date.now() - new Date(step1.started!).getTime();
    }

    // ============================================
    // STEP 2: PROSPECT DISCOVERY
    // ============================================
    
    if (testScope === 'full' || testScope === 'discovery_only') {
      const step2: WorkflowStep = {
        step: 'Prospect Discovery',
        status: 'running',
        started: new Date().toISOString()
      };
      steps.push(step2);

      try {
        const puppeteerScraper = new PuppeteerBusinessScraper({
          headless: true,
          timeout: 20000,
          enableImages: false
        });

        const allDiscoveredProspects = [];

        // Test each business type
        for (const businessType of testData.businessTypes) {
          const scrapingTarget = createScrapingTarget(
            'google_maps',
            businessType,
            testData.location,
            { maxResults: testData.maxProspectsPerType }
          );

          const prospects = await puppeteerScraper.scrapeBusinesses(scrapingTarget);
          allDiscoveredProspects.push(...prospects);
        }

        await puppeteerScraper.cleanup();
        prospectsDiscovered = allDiscoveredProspects.length;

        // Save to database
        if (allDiscoveredProspects.length > 0) {
          const serviceSupabase = getServiceRoleClient();
          
          const prospectsToSave = allDiscoveredProspects.map(prospect => ({
            business_name: prospect.business_name,
            business_address: prospect.business_address,
            business_phone: prospect.business_phone,
            business_email: prospect.business_email,
            website_url: prospect.website_url,
            business_segment: prospect.business_segment,
            discovery_source: prospect.discovery_source + '_workflow_test',
            estimated_annual_revenue: prospect.estimated_annual_revenue || 0,
            employee_count: prospect.employee_count || 0,
            potential_score: prospect.potential_score || 50,
            status: 'new',
            data_sources: [prospect.platform_source],
            enrichment_data: {
              platform_source: prospect.platform_source,
              rating: prospect.rating,
              review_count: prospect.review_count
            }
          }));

          const { data: savedProspects, error: saveError } = await serviceSupabase
            .from('commercial_prospects')
            .upsert(prospectsToSave, {
              onConflict: 'business_name,business_address',
              ignoreDuplicates: false
            })
            .select();

          if (saveError) {
            throw new Error(`Failed to save prospects: ${saveError.message}`);
          }
        }

        step2.status = 'completed';
        step2.completed = new Date().toISOString();
        step2.duration = Date.now() - new Date(step2.started!).getTime();
        step2.data = {
          prospectsDiscovered,
          businessTypes: testData.businessTypes,
          location: testData.location
        };

      } catch (error) {
        step2.status = 'failed';
        step2.error = error instanceof Error ? error.message : String(error);
        step2.completed = new Date().toISOString();
        step2.duration = Date.now() - new Date(step2.started!).getTime();
      }
    }

    // ============================================
    // STEP 3: LEAD ENRICHMENT
    // ============================================
    
    if (testScope === 'full' || testScope === 'discovery_only') {
      const step3: WorkflowStep = {
        step: 'Lead Enrichment',
        status: 'running',
        started: new Date().toISOString()
      };
      steps.push(step3);

      try {
        const serviceSupabase = getServiceRoleClient();
        
        // Get recently discovered prospects for enrichment
        const { data: recentProspects, error: fetchError } = await serviceSupabase
          .from('commercial_prospects')
          .select('*')
          .like('discovery_source', '%workflow_test%')
          .limit(5);

        if (fetchError) {
          throw new Error(`Failed to fetch prospects: ${fetchError.message}`);
        }

        if (recentProspects && recentProspects.length > 0) {
          // Mock enrichment process (to avoid API costs)
          for (const prospect of recentProspects) {
            const enrichedData = {
              ...prospect.enrichment_data,
              enriched_at: new Date().toISOString(),
              enrichment_quality: 'high',
              contact_score: Math.floor(Math.random() * 100),
              industry_match: true
            };

            await serviceSupabase
              .from('commercial_prospects')
              .update({ enrichment_data: enrichedData })
              .eq('id', prospect.id);

            prospectsEnriched++;
          }
        }

        step3.status = 'completed';
        step3.completed = new Date().toISOString();
        step3.duration = Date.now() - new Date(step3.started!).getTime();
        step3.data = { prospectsEnriched };

      } catch (error) {
        step3.status = 'failed';
        step3.error = error instanceof Error ? error.message : String(error);
        step3.completed = new Date().toISOString();
        step3.duration = Date.now() - new Date(step3.started!).getTime();
      }
    }

    // ============================================
    // STEP 4: EMAIL CAMPAIGN CREATION
    // ============================================
    
    if (testScope === 'full' || testScope === 'campaigns_only') {
      const step4: WorkflowStep = {
        step: 'Email Campaign Creation',
        status: 'running',
        started: new Date().toISOString()
      };
      steps.push(step4);

      try {
        const serviceSupabase = getServiceRoleClient();
        
        // Create test email campaign
        const testCampaign = {
          name: `Workflow Test Campaign - ${new Date().toISOString().split('T')[0]}`,
          description: 'Auto-generated test campaign for workflow validation',
          target_segment: 'restaurant',
          status: 'active',
          email_templates: {
            initial_outreach: {
              subject: 'Test Outreach - Wasgeurtje Partnership',
              content: 'Dit is een test email voor workflow validatie.'
            }
          },
          campaign_rules: {
            max_emails_per_day: 5,
            follow_up_days: [3, 7, 14],
            qualification_criteria: {
              min_potential_score: 40
            }
          }
        };

        const { data: campaignData, error: campaignError } = await serviceSupabase
          .from('commercial_email_campaigns')
          .insert(testCampaign)
          .select()
          .single();

        if (campaignError) {
          throw new Error(`Failed to create campaign: ${campaignError.message}`);
        }

        emailsCampaignCreated = 1;

        step4.status = 'completed';
        step4.completed = new Date().toISOString();
        step4.duration = Date.now() - new Date(step4.started!).getTime();
        step4.data = { 
          campaignId: campaignData.id,
          campaignName: campaignData.name
        };

      } catch (error) {
        step4.status = 'failed';
        step4.error = error instanceof Error ? error.message : String(error);
        step4.completed = new Date().toISOString();
        step4.duration = Date.now() - new Date(step4.started!).getTime();
      }
    }

    // ============================================
    // STEP 5: CAMPAIGN SCHEDULING
    // ============================================
    
    if (testScope === 'full' || testScope === 'campaigns_only') {
      const step5: WorkflowStep = {
        step: 'Campaign Scheduling',
        status: 'running',
        started: new Date().toISOString()
      };
      steps.push(step5);

      try {
        const campaignScheduler = getCampaignScheduler();
        
        // Start the scheduler (mock operation)
        await campaignScheduler.start();
        
        // Schedule test campaigns for eligible prospects
        const serviceSupabase = getServiceRoleClient();
        
        const { data: eligibleProspects } = await serviceSupabase
          .from('commercial_prospects')
          .select('*')
          .like('discovery_source', '%workflow_test%')
          .eq('status', 'new')
          .limit(3);

        if (eligibleProspects && eligibleProspects.length > 0) {
          for (const prospect of eligibleProspects) {
            // Mock campaign enrollment
            await serviceSupabase
              .from('commercial_prospects')
              .update({ 
                status: 'in_campaign',
                last_contact_attempt: new Date().toISOString()
              })
              .eq('id', prospect.id);

            campaignsScheduled++;
          }
        }

        step5.status = 'completed';
        step5.completed = new Date().toISOString();
        step5.duration = Date.now() - new Date(step5.started!).getTime();
        step5.data = { campaignsScheduled };

      } catch (error) {
        step5.status = 'failed';
        step5.error = error instanceof Error ? error.message : String(error);
        step5.completed = new Date().toISOString();
        step5.duration = Date.now() - new Date(step5.started!).getTime();
      }
    }

    // ============================================
    // STEP 6: SYSTEM HEALTH CHECK
    // ============================================
    
    const step6: WorkflowStep = {
      step: 'System Health Check',
      status: 'running',
      started: new Date().toISOString()
    };
    steps.push(step6);

    try {
      const serviceSupabase = getServiceRoleClient();
      
      // Check database connectivity
      const { data: dbCheck } = await serviceSupabase
        .from('commercial_prospects')
        .select('count')
        .limit(1);

      // Check email queue
      const { data: queueCheck } = await serviceSupabase
        .from('commercial_email_queue')
        .select('count')
        .limit(1);

      // Check campaigns
      const { data: campaignCheck } = await serviceSupabase
        .from('commercial_email_campaigns')
        .select('count')
        .limit(1);

      const healthChecks = {
        database: !!dbCheck,
        emailQueue: !!queueCheck,
        campaigns: !!campaignCheck,
        services: true
      };

      const healthScore = Object.values(healthChecks).filter(Boolean).length / Object.keys(healthChecks).length * 100;

      step6.status = 'completed';
      step6.completed = new Date().toISOString();
      step6.duration = Date.now() - new Date(step6.started!).getTime();
      step6.data = { 
        healthChecks,
        healthScore: Math.round(healthScore)
      };

    } catch (error) {
      step6.status = 'failed';
      step6.error = error instanceof Error ? error.message : String(error);
      step6.completed = new Date().toISOString();
      step6.duration = Date.now() - new Date(step6.started!).getTime();
    }

    // ============================================
    // WORKFLOW COMPLETION
    // ============================================

    const workflowEndTime = Date.now();
    const totalDuration = workflowEndTime - workflowStartTime;
    
    const stepsCompleted = steps.filter(step => step.status === 'completed').length;
    const stepsFailed = steps.filter(step => step.status === 'failed').length;
    
    const overallHealthScore = Math.round(
      (prospectsDiscovered > 0 ? 25 : 0) +
      (prospectsEnriched > 0 ? 25 : 0) +
      (emailsCampaignCreated > 0 ? 25 : 0) +
      (campaignsScheduled > 0 ? 25 : 0)
    );

    const success = stepsFailed === 0 && stepsCompleted > 0;

    console.log(`[Workflow Test] Completed in ${totalDuration}ms - ${stepsCompleted} success, ${stepsFailed} failed`);

    return NextResponse.json({
      success,
      totalDuration,
      stepsCompleted,
      stepsFailed,
      steps,
      summary: {
        prospectsDiscovered,
        prospectsEnriched,
        emailsCampaignCreated,
        campaignsScheduled,
        overallHealthScore
      }
    });

  } catch (error) {
    console.error('[Workflow Test] Critical error:', error);
    
    const workflowEndTime = Date.now();
    const totalDuration = workflowEndTime - workflowStartTime;

    return NextResponse.json(
      {
        success: false,
        totalDuration,
        stepsCompleted: 0,
        stepsFailed: 1,
        steps: [{
          step: 'Workflow Execution',
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        }],
        summary: {
          prospectsDiscovered: 0,
          prospectsEnriched: 0,
          emailsCampaignCreated: 0,
          campaignsScheduled: 0,
          overallHealthScore: 0
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commercial/test-complete-workflow
 * Get workflow test status and recent results
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Workflow Test] GET request for test status');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceSupabase = getServiceRoleClient();

    // Get workflow test prospects
    const { data: testProspects } = await serviceSupabase
      .from('commercial_prospects')
      .select('*')
      .like('discovery_source', '%workflow_test%')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get test campaigns
    const { data: testCampaigns } = await serviceSupabase
      .from('commercial_email_campaigns')
      .select('*')
      .like('name', '%Workflow Test%')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get email queue for test prospects
    const { data: testEmails } = await serviceSupabase
      .from('commercial_email_queue')
      .select('*')
      .in('prospect_id', testProspects?.map(p => p.id) || [])
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        testProspects: testProspects || [],
        testCampaigns: testCampaigns || [],
        testEmails: testEmails || [],
        statistics: {
          totalTestProspects: testProspects?.length || 0,
          activeTestCampaigns: testCampaigns?.filter(c => c.status === 'active').length || 0,
          queuedEmails: testEmails?.filter(e => e.status === 'queued').length || 0
        }
      }
    });

  } catch (error) {
    console.error('[Workflow Test] GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 