// =====================================================
// PUPPETEER DISCOVERY API - Advanced Web Scraping
// Google Maps, Yelp, Facebook Business scraping
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PuppeteerBusinessScraper, createScrapingTarget, ScrapingTarget } from '@/lib/prospect-discovery/puppeteer-scraper';
import { getServiceRoleClient } from '@/lib/supabase';

interface PuppeteerRequest {
  action: 'scrape' | 'test' | 'batch_scrape';
  targets?: ScrapingTarget[];
  target?: ScrapingTarget;
  saveToDatabase?: boolean;
}

interface PuppeteerResponse {
  success: boolean;
  data?: any;
  error?: string;
  timing?: {
    started: string;
    completed: string;
    duration: number;
  };
}

/**
 * GET /api/commercial/discovery/puppeteer
 * Get scraping status and capabilities
 */
export async function GET(request: NextRequest): Promise<NextResponse<PuppeteerResponse>> {
  const startTime = Date.now();
  
  try {
    console.log('[Puppeteer API] GET request received');
    
    // Authentication check - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[Puppeteer API] Development mode - skipping authentication');
    } else {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Get scraping statistics from database
    const serviceSupabase = getServiceRoleClient();
    
    const { data: prospects, error: prospectsError } = await serviceSupabase
      .from('commercial_prospects')
      .select('discovery_source')
      .like('discovery_source', '%puppeteer%');

    if (prospectsError) {
      console.error('[Puppeteer API] Error fetching prospects:', prospectsError);
    }

    const puppeteerProspects = prospects?.filter(p => 
      p.discovery_source.includes('puppeteer')
    ) || [];

    const stats = {
      totalProspectsFound: puppeteerProspects.length,
      sourceBreakdown: {
        google_maps: puppeteerProspects.filter(p => p.discovery_source.includes('google_maps')).length,
        yelp: puppeteerProspects.filter(p => p.discovery_source.includes('yelp')).length,
        facebook: puppeteerProspects.filter(p => p.discovery_source.includes('facebook')).length,
        yellow_pages: puppeteerProspects.filter(p => p.discovery_source.includes('yellow_pages')).length
      },
      capabilities: {
        platforms: ['google_maps', 'yelp', 'facebook_business', 'yellow_pages'],
        features: [
          'Advanced business data extraction',
          'Rating and review analysis',
          'Contact information discovery',
          'Category and service detection',
          'Automated filtering',
          'Batch processing'
        ]
      }
    };

    const endTime = Date.now();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timing: {
        started: new Date(startTime).toISOString(),
        completed: new Date(endTime).toISOString(),
        duration: endTime - startTime
      }
    });

  } catch (error) {
    console.error('[Puppeteer API] GET error:', error);
    
    const endTime = Date.now();
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timing: {
          started: new Date(startTime).toISOString(),
          completed: new Date(endTime).toISOString(),
          duration: endTime - startTime
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commercial/discovery/puppeteer
 * Execute Puppeteer scraping tasks
 */
export async function POST(request: NextRequest): Promise<NextResponse<PuppeteerResponse>> {
  const startTime = Date.now();
  
  try {
    console.log('[Puppeteer API] POST request received');
    
    // Authentication check - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[Puppeteer API] Development mode - skipping authentication');
    } else {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body: PuppeteerRequest = await request.json();
    const { action, target, targets, saveToDatabase = true } = body;

    console.log(`[Puppeteer API] Action: ${action}`);

    const scraper = new PuppeteerBusinessScraper({
      headless: true,
      timeout: 30000,
      enableImages: false
    });

    let result: any = {};

    switch (action) {
      case 'test':
        console.log('[Puppeteer API] Running scraper test...');
        result = await scraper.testScraper();
        break;

      case 'scrape':
        if (!target) {
          return NextResponse.json(
            { success: false, error: 'Target configuration required for scraping' },
            { status: 400 }
          );
        }

        console.log(`[Puppeteer API] Single scraping: ${target.platform} - ${target.query}`);
        const scrapedBusinesses = await scraper.scrapeBusinesses(target);
        
        if (saveToDatabase && scrapedBusinesses.length > 0) {
          const savedCount = await saveProspectsToDatabase(scrapedBusinesses);
          result = {
            businessesFound: scrapedBusinesses.length,
            businessesSaved: savedCount,
            businesses: scrapedBusinesses
          };
        } else {
          result = {
            businessesFound: scrapedBusinesses.length,
            businesses: scrapedBusinesses
          };
        }
        break;

      case 'batch_scrape':
        if (!targets || targets.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Targets array required for batch scraping' },
            { status: 400 }
          );
        }

        console.log(`[Puppeteer API] Batch scraping: ${targets.length} targets`);
        const batchResults = [];
        let totalFound = 0;
        let totalSaved = 0;

        for (const batchTarget of targets) {
          try {
            const batchBusinesses = await scraper.scrapeBusinesses(batchTarget);
            totalFound += batchBusinesses.length;

            if (saveToDatabase && batchBusinesses.length > 0) {
              const savedCount = await saveProspectsToDatabase(batchBusinesses);
              totalSaved += savedCount;
            }

            batchResults.push({
              target: batchTarget,
              businessesFound: batchBusinesses.length,
              businesses: batchBusinesses.slice(0, 5) // Only return first 5 for preview
            });

          } catch (error) {
            console.error(`[Puppeteer API] Error processing target ${batchTarget.platform}:`, error);
            batchResults.push({
              target: batchTarget,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        result = {
          totalBusinessesFound: totalFound,
          totalBusinessesSaved: totalSaved,
          targetResults: batchResults
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported action: ${action}` },
          { status: 400 }
        );
    }

    // Cleanup browser
    await scraper.cleanup();

    const endTime = Date.now();
    
    return NextResponse.json({
      success: true,
      data: result,
      timing: {
        started: new Date(startTime).toISOString(),
        completed: new Date(endTime).toISOString(),
        duration: endTime - startTime
      }
    });

  } catch (error) {
    console.error('[Puppeteer API] POST error:', error);
    
    const endTime = Date.now();
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timing: {
          started: new Date(startTime).toISOString(),
          completed: new Date(endTime).toISOString(),
          duration: endTime - startTime
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Save discovered prospects to database
 */
async function saveProspectsToDatabase(prospects: any[]): Promise<number> {
  try {
    console.log(`[Puppeteer API] Attempting to save ${prospects.length} prospects to database`);
    const serviceSupabase = getServiceRoleClient();
    
    const prospectsToSave = prospects.map(prospect => ({
      business_name: prospect.business_name,
      business_address: prospect.business_address,
      business_phone: prospect.business_phone,
      business_email: prospect.business_email,
      website_url: prospect.website_url,
      business_segment: prospect.business_segment,
      discovery_source: prospect.discovery_source,
      estimated_annual_revenue: prospect.estimated_annual_revenue || 0,
      employee_count: prospect.employee_count || 0,
      potential_score: prospect.potential_score || 50,
      last_contact_attempt: null,
      status: 'new',
      data_sources: [prospect.platform_source],
      enrichment_data: {
        rating: prospect.rating,
        review_count: prospect.review_count,
        price_range: prospect.price_range,
        category: prospect.category,
        verified: prospect.verified,
        platform_source: prospect.platform_source
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('[Puppeteer API] Sample prospect data:', JSON.stringify(prospectsToSave[0], null, 2));

    const { data, error } = await serviceSupabase
      .from('commercial_prospects')
      .insert(prospectsToSave)
      .select();

    if (error) {
      console.error('[Puppeteer API] Database error details:', error);
      
      // Try graceful fallback - insert one by one
      let savedCount = 0;
      for (const prospect of prospectsToSave) {
        try {
          const { error: singleError } = await serviceSupabase
            .from('commercial_prospects')
            .insert(prospect);
          
          if (!singleError) {
            savedCount++;
          } else {
            console.warn('[Puppeteer API] Failed to save individual prospect:', singleError.message);
          }
        } catch (individualError) {
          console.warn('[Puppeteer API] Individual prospect save error:', individualError);
        }
      }
      return savedCount;
    }

    console.log(`[Puppeteer API] Successfully saved ${data?.length || 0} prospects to database`);
    return data?.length || 0;

  } catch (error) {
    console.error('[Puppeteer API] Error in saveProspectsToDatabase:', error);
    return 0;
  }
}

/**
 * PUT /api/commercial/discovery/puppeteer  
 * Update scraping configurations
 */
export async function PUT(request: NextRequest): Promise<NextResponse<PuppeteerResponse>> {
  return NextResponse.json(
    { success: false, error: 'Configuration updates not implemented yet' },
    { status: 501 }
  );
}

/**
 * DELETE /api/commercial/discovery/puppeteer
 * Cleanup resources
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<PuppeteerResponse>> {
  try {
    console.log('[Puppeteer API] DELETE request received');
    
    // Authentication check - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[Puppeteer API] Development mode - skipping authentication');
    } else {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Cleanup any running browser instances
    // This is handled automatically by the scraper class

    return NextResponse.json({
      success: true,
      data: { message: 'Puppeteer resources cleaned up' }
    });

  } catch (error) {
    console.error('[Puppeteer API] DELETE error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 