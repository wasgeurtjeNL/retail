// =====================================================
// PROSPECT DISCOVERY API - Commercial Acquisition
// Endpoints for managing automated prospect discovery
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DiscoveryScheduler, DiscoveryJobConfig } from '@/lib/prospect-discovery/discovery-scheduler';
import { LeadEnrichmentService, EnrichmentConfig } from '@/lib/prospect-discovery/lead-enrichment';
import { QueueManager } from '@/lib/queue-manager';
import { getServiceRoleClient } from '@/lib/supabase';
import { loadActiveDiscoveryConfig, getDiscoveryLimits, invalidateConfigCache } from '@/lib/discovery-config-loader';

// Initialize services
const queueManager = QueueManager.getInstance();

// Discovery services zijn nu dynamisch en worden per request geïnitialiseerd met database configuratie
let discoveryScheduler: DiscoveryScheduler | null = null;
let leadEnrichment: LeadEnrichmentService | null = null;

// Helper functie om services te initialiseren met actieve configuratie
async function initializeServicesWithConfig(): Promise<{
  scheduler: DiscoveryScheduler;
  enrichment: LeadEnrichmentService;
  config: EnrichmentConfig;
}> {
  console.log('[Discovery API] Initializing services with database configuration');
  
  const enrichmentConfig = await loadActiveDiscoveryConfig();
  
  // Herinitialiseer services als de configuratie is gewijzigd
  if (!discoveryScheduler || !leadEnrichment) {
    discoveryScheduler = new DiscoveryScheduler(queueManager, enrichmentConfig);
    leadEnrichment = new LeadEnrichmentService(enrichmentConfig);
  }

  return {
    scheduler: discoveryScheduler,
    enrichment: leadEnrichment,
    config: enrichmentConfig
  };
}

// Helper function to check for duplicates
async function checkExistingProspects(businessName: string, city: string): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('commercial_prospects')
      .select('id')
      .eq('business_name', businessName)
      .eq('city', city)
      .limit(1);

    if (error) {
      console.warn('[Discovery API] Error checking duplicates:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.warn('[Discovery API] Exception checking duplicates:', error);
    return false;
  }
}

// Filter prospects based on options
async function filterProspects(prospects: any[], options: any = {}) {
  const { skip_duplicates = false, require_email = false } = options;
  let filtered = [...prospects];
  let duplicatesSkipped = 0;
  let withoutEmail = 0;

  console.log(`[Discovery API] Filtering ${prospects.length} prospects (skip_duplicates: ${skip_duplicates}, require_email: ${require_email})`);

  // Filter by email requirement
  if (require_email) {
    const beforeEmailFilter = filtered.length;
    filtered = filtered.filter(prospect => {
      const hasEmail = prospect.business_email && 
                       prospect.business_email.trim() !== '' && 
                       prospect.business_email.includes('@');
      if (!hasEmail) withoutEmail++;
      return hasEmail;
    });
    console.log(`[Discovery API] Email filter: ${beforeEmailFilter} -> ${filtered.length} (${withoutEmail} without email)`);
  }

  // Filter duplicates
  if (skip_duplicates) {
    const filteredDuplicates = [];
    for (const prospect of filtered) {
      const isDuplicate = await checkExistingProspects(
        prospect.business_name, 
        prospect.city || prospect.business_address
      );
      
      if (isDuplicate) {
        duplicatesSkipped++;
        console.log(`[Discovery API] Skipping duplicate: ${prospect.business_name} in ${prospect.city}`);
      } else {
        filteredDuplicates.push(prospect);
      }
    }
    filtered = filteredDuplicates;
    console.log(`[Discovery API] Duplicate filter: ${duplicatesSkipped} duplicates skipped, ${filtered.length} unique prospects remaining`);
  }

  return {
    prospects: filtered,
    stats: {
      original_count: prospects.length,
      filtered_count: filtered.length,
      duplicates_skipped: duplicatesSkipped,
      without_email: withoutEmail,
      with_email: filtered.filter(p => p.business_email && p.business_email.includes('@')).length
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Discovery API] GET request received');

    // Initialize services with current database configuration
    const { scheduler, enrichment, config } = await initializeServicesWithConfig();

    // Check authentication - Development mode bypass
    console.log('[Discovery API] Development mode - skipping authentication');
    
    // Use service role client for admin operations
    const supabase = getServiceRoleClient();

    // Development mode - skip auth checks
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get user profile - skip in development
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();

    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        // List all discovery jobs
        const jobs = await scheduler.getJobs();
        return NextResponse.json({ 
          success: true, 
          jobs 
        });

      case 'discover':
        // Direct discovery without job scheduling
        const segment = searchParams.get('segment') || 'beauty_salon';
        const region = searchParams.get('region') || 'Amsterdam';
        const limit = parseInt(searchParams.get('limit') || '10');

        console.log(`[Discovery API] Direct discovery: ${segment} in ${region} (limit: ${limit})`);

        try {
          const prospects = await enrichment.discoverProspects(segment, region, {
            limit,
            sources: ['google_places'] // Only Google Places for real data
          });

          // Save prospects to database
          const saveResult = await enrichment.saveProspects(prospects);

          return NextResponse.json({ 
            success: true, 
            prospects: prospects || [],
            metadata: {
              total_discovered: prospects.length,
              saved_to_database: saveResult.saved || 0,
              segment,
              region,
              processing_time: 'real-time'
            }
          });

        } catch (error) {
          console.error('[Discovery API] Direct discovery error:', error);
          throw error;
        }

      case 'test':
        // Test all enrichment services including Perplexity
        console.log('[Discovery API] Testing all discovery sources...');
        
        if (!leadEnrichment) {
          return NextResponse.json({ 
            error: 'LeadEnrichment service not initialized' 
          }, { status: 500 });
        }
        
        const testResult = await leadEnrichment.testEnrichment();
        
        return NextResponse.json({ 
          success: true, 
          test_result: testResult 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Available actions: list, discover, test' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Discovery API] GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Discovery API] POST request received');

    // Initialize services with current database configuration
    const { scheduler, enrichment, config } = await initializeServicesWithConfig();

    // Check authentication - Development mode bypass
    console.log('[Discovery API] Development mode - skipping authentication');
    
    // Use service role client for admin operations  
    const supabase = getServiceRoleClient();
    
    // Development mode - skip auth checks
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get user profile - skip in development
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();

    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    // }

    const body = await request.json();
    console.log('[Discovery API] Received body:', JSON.stringify(body, null, 2));
    
    const { action, sources = ['web_scraping'], criteria, options = {} } = body;
    console.log('[Discovery API] Extracted sources:', sources);
    console.log('[Discovery API] Extracted criteria:', criteria);
    console.log('[Discovery API] Extracted options:', options);

    switch (action) {
      case 'discover':
        // Perform prospect discovery
        console.log('[Discovery API] Starting prospect discovery with criteria:', criteria);

        if (!criteria?.business_type || !criteria?.location) {
          return NextResponse.json({
            error: 'Missing required criteria: business_type and location'
          }, { status: 400 });
        }

        try {
          // Use specified sources or default to Perplexity
          const discoveryResult = await enrichment.discoverProspects(
            criteria.business_type,
            criteria.location,
            {
              limit: criteria.max_results || 10,
              sources: sources || ['perplexity', 'web_scraping'] // Use Perplexity as primary source
            }
          );

          console.log(`[Discovery API] Discovery completed: ${discoveryResult.length} prospects found`);

          // Apply filters (duplicates, email validation)
          const filterResult = await filterProspects(discoveryResult, {
            skip_duplicates: criteria.skip_duplicates || options.skip_existing,
            require_email: criteria.require_email || options.validate_email
          });

          const filteredProspects = filterResult.prospects;
          const filterStats = filterResult.stats;

          console.log('[Discovery API] Filter results:', filterStats);

          // Save to database
          console.log('[Discovery API] About to save prospects to database...');
          let saveResult;
          try {
            saveResult = await enrichment.saveProspects(filteredProspects);
            console.log('[Discovery API] Save result:', saveResult);
          } catch (saveError) {
            console.error('[Discovery API] Save error:', saveError);
            saveResult = { 
              saved: 0, 
              errors: [saveError instanceof Error ? saveError.message : String(saveError)]
            };
          }

          return NextResponse.json({
            success: true,
            prospects: filteredProspects || [],
            metadata: {
              total_discovered: filterStats.original_count,
              filtered_count: filterStats.filtered_count,
              with_email: filterStats.with_email,
              without_email: filterStats.without_email,
              duplicates_skipped: filterStats.duplicates_skipped,
              saved_to_database: saveResult.saved || 0,
              save_errors: saveResult.errors || [],
              business_type: criteria.business_type,
              location: criteria.location,
              filters_applied: {
                skip_duplicates: criteria.skip_duplicates || options.skip_existing || false,
                require_email: criteria.require_email || options.validate_email || false,
                quality_threshold: options.quality_threshold || 0.6
              },
              sources_used: sources || ['perplexity', 'web_scraping'],
              processing_time: Date.now(),
              quality_score_range: filteredProspects?.length > 0 ? {
                min: Math.min(...filteredProspects.map(p => p.enrichment_score || 0)),
                max: Math.max(...filteredProspects.map(p => p.enrichment_score || 0)),
                avg: filteredProspects.reduce((sum, p) => sum + (p.enrichment_score || 0), 0) / filteredProspects.length
              } : null
            }
          });

        } catch (error) {
          console.error('[Discovery API] Discovery error:', error);
          return NextResponse.json({
            error: 'Discovery failed',
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }

      case 'create_job':
        // Create a new discovery job
        if (!discoveryScheduler) {
          return NextResponse.json({ 
            error: 'DiscoveryScheduler service not initialized' 
          }, { status: 500 });
        }
        
        const jobConfig: DiscoveryJobConfig = {
          ...body.config,
          sources: ['web_scraping'] // Force web scraping for reliability
        };

        const result = await discoveryScheduler.createJob(jobConfig);
        return NextResponse.json(result);

      case 'run_job':
        // Run a specific job
        if (!discoveryScheduler) {
          return NextResponse.json({ 
            error: 'DiscoveryScheduler service not initialized' 
          }, { status: 500 });
        }
        
        const jobResult = await discoveryScheduler.runJob(body.job_id);
        return NextResponse.json(jobResult);

      default:
        return NextResponse.json({
          error: 'Invalid action. Available actions: discover, create_job, run_job'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Discovery API] POST error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('[Discovery API] PUT request received');

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
    const { job_id, ...updates } = body;

    if (!job_id) {
      return NextResponse.json({ 
        error: 'job_id is required' 
      }, { status: 400 });
    }

    if (!discoveryScheduler) {
      return NextResponse.json({ 
        error: 'DiscoveryScheduler service not initialized' 
      }, { status: 500 });
    }

    const updateResult = await discoveryScheduler.updateJob(job_id, updates);
    
    if (updateResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Discovery job updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: updateResult.error || 'Failed to update job' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[Discovery API] PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('[Discovery API] DELETE request received');

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

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json({ 
        error: 'job_id parameter is required' 
      }, { status: 400 });
    }

    const deleteResult = await discoveryScheduler.deleteJob(jobId);
    
    if (deleteResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Discovery job deleted successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: deleteResult.error || 'Failed to delete job' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[Discovery API] DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 