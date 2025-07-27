/**
 * Website Analysis API Endpoints
 * POST /api/analyze-website - Start nieuwe website analyse
 * GET /api/analyze-website - Haal bestaande analyse op
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import validator from 'validator';

import { WebsiteScraper } from '@/lib/website-scraper';
import { AIAnalyzer } from '@/lib/ai-analyzer';
import { getEnvironmentConfig, getSafeEnvironmentConfig, isDomainAllowed } from '@/lib/env';
import { getServiceRoleClient } from '@/lib/supabase';
import { queueWebsiteAnalysis, queueManager } from '@/lib/queue-manager';
import { getCacheManager, formatCacheMetrics } from '@/lib/analysis-cache';

// Rate limiting setup
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

interface AnalyzeWebsiteRequest {
  websiteUrl: string;
  options?: {
    forceReanalyze?: boolean;
    includeRecommendations?: boolean;
    includeCompetitorAnalysis?: boolean;
    priority?: number;
  };
}

interface AnalyzeWebsiteResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  rateLimitInfo?: {
    remaining: number;
    resetTime: number;
  };
}

/**
 * Rate limiting check
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = userRequestCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

/**
 * Valideer website URL
 */
function validateWebsiteUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Website URL is required' };
  }

  if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    if (!isDomainAllowed(domain)) {
      return { isValid: false, error: 'Domain not allowed for analysis' };
    }

    // Blokkeer lokale/interne IP adressen
    if (domain.match(/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost)/)) {
      return { isValid: false, error: 'Local/internal URLs not allowed' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * POST /api/analyze-website
 * Start nieuwe website analyse
 */
export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeWebsiteResponse>> {
  const startTime = Date.now();

  try {
    console.log('[API] Starting website analysis request');

    // Check environment config
    const config = getSafeEnvironmentConfig();
    if (!config || !config.rateLimit.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Website analysis is currently disabled or not configured'
      }, { status: 503 });
    }

    // Parse request body
    let body: AnalyzeWebsiteRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    // Valideer input
    const urlValidation = validateWebsiteUrl(body.websiteUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: urlValidation.error
      }, { status: 400 });
    }

    // Get user from Supabase auth
    const cookieStore = await cookies();
    const userClient = createServerClient( // Rename to userClient to avoid confusion
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
    const { data: { session }, error: authError } = await userClient.auth.getSession();
    
    // Get service role client for database operations
    const supabase = getServiceRoleClient();

    // DEVELOPMENT BYPASS: Use hardcoded user ID for testing
    let userId = session?.user?.id;
    if (!userId && process.env.NODE_ENV === 'development') {
      console.log('[API] Using development bypass - hardcoded user ID');
      userId = '21826307-f364-48d0-9a5f-9cba5742b8ee'; // Test retailer user
    }

    if (authError || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        rateLimitInfo: {
          remaining: 0,
          resetTime: Date.now() + RATE_LIMIT_WINDOW
        }
      }, { status: 429 });
    }

    // === SYNC MODE: Execute immediately ===
    console.log(`[API] Processing sync analysis for ${body.websiteUrl}`);
    try {
        const supabase = getServiceRoleClient();
        const cache = getCacheManager();

        // Stap 1: Deactiveer oude analyses
        console.log(`[API] Deactivating previous analyses for ${body.websiteUrl}`);
        await supabase
            .from('profile_website_analysis')
            .update({ is_active: false })
            .eq('profile_id', userId)
            .eq('is_active', true);

        // Stap 2: Scrape website (gebruik cache)
        let scrapedContent = await cache.getScrapedContent(body.websiteUrl);
        if (!scrapedContent) {
            console.log(`[API] Cache miss for scraped content: ${body.websiteUrl}`);
            const scraper = new WebsiteScraper();
            scrapedContent = await scraper.scrapeWebsite(body.websiteUrl); // Corrected method name
            await cache.cacheScrapedContent(body.websiteUrl, scrapedContent); // Corrected method name
        } else {
            console.log(`[API] Cache hit for scraped content: ${body.websiteUrl}`);
        }

        // Stap 3: Analyseer met AI (gebruik cache)
        let analysisResult = await cache.getAIAnalysis(body.websiteUrl);
        if (!analysisResult) {
            console.log(`[API] Cache miss for AI analysis: ${body.websiteUrl}`);
            const analyzer = new AIAnalyzer();
            analysisResult = await analyzer.analyzeWebsite(scrapedContent); // Corrected method name
            await cache.cacheAIAnalysis(body.websiteUrl, analysisResult); // Corrected method name
        } else {
            console.log(`[API] Cache hit for AI analysis: ${body.websiteUrl}`);
        }

        // Stap 4: Sla de VOLLEDIGE en VOLTOOIDE analyse op
        const finalAnalysisRecord = {
            profile_id: userId,
            website_url: body.websiteUrl,
            status: 'completed' as const,
            analysis_data: analysisResult,
            analyzed_at: new Date().toISOString(),
            is_active: true,
        };

        const { data: savedAnalysis, error: saveError } = await supabase
            .from('profile_website_analysis')
            .insert(finalAnalysisRecord)
            .select()
            .single();

        if (saveError) {
            throw new Error(`Failed to save final analysis: ${saveError.message}`);
        }
        
        console.log(`[API] Analysis completed and saved successfully`);
        return NextResponse.json({
            success: true,
            data: savedAnalysis,
            message: 'Analysis completed successfully',
        });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during synchronous analysis';
      console.error('[API] Synchronous analysis execution failed:', errorMessage);
      return NextResponse.json({
        success: false,
        error: errorMessage,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[API] Unhandled error in POST handler:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An internal server error occurred' 
    }, { status: 500 });
  }
}


/**
 * GET /api/analyze-website
 * Haal bestaande of lopende analyse op
 */
export async function GET(request: NextRequest): Promise<NextResponse<AnalyzeWebsiteResponse>> {
  console.log('[API] GET function called - route is working');
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const isAdmin = searchParams.get('admin') === 'true';

  if (!url && !isAdmin) {
    return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const supabase = getServiceRoleClient();

    // Admin route: haal alle analyses op
    if (isAdmin) {
        console.log('[API] Admin request: fetching all analyses');
        const { data, error } = await supabase
            .from('profile_website_analysis')
            .select(`
                *,
                profile:profiles (id, full_name, company_name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    }

    // User route: haal specifieke analyse op
    const cookieStore = await cookies();
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );
    const { data: { session } } = await userClient.auth.getSession();
    
    let userId = session?.user?.id;
    if (!userId && process.env.NODE_ENV === 'development') {
        console.log('[API] Using development bypass - hardcoded user ID');
        userId = '21826307-f364-48d0-9a5f-9cba5742b8ee';
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    
    console.log(`[API] Querying database for analysis of ${url} for profile ${userId}`);

    const { data: analysis, error } = await supabase
      .from('profile_website_analysis')
      .select('*')
      .eq('profile_id', userId)
      .eq('website_url', url)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'exact one row' error
      console.error('[API] Database query error:', error);
      throw error;
    }

    if (!analysis) {
      return NextResponse.json({ success: false, message: 'No analysis found' }, { status: 404 });
    }

    // Behandel verschillende statussen
    switch (analysis.status) {
      case 'completed':
        console.log(`[API] Returning completed analysis for ${url}`);
        return NextResponse.json({ success: true, data: analysis });
      
      case 'processing':
      case 'pending':
        console.log(`[API] Analysis for ${url} is still ${analysis.status}`);
        return NextResponse.json({ 
          success: true, 
          data: { status: analysis.status, message: 'Analysis in progress' } 
        }, { status: 202 });

      case 'failed':
        console.log(`[API] Analysis for ${url} failed`);
        return NextResponse.json({ 
          success: false, 
          error: analysis.error_message || 'Analysis failed with an unknown error',
          data: analysis
        }, { status: 500 });

      default:
        console.warn(`[API] Analysis for ${url} has an unknown status: ${analysis.status}`);
        return NextResponse.json({ 
          success: false, 
          error: `Unknown analysis status: ${analysis.status}` 
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] Unhandled error in GET handler:', error);
    return NextResponse.json({ success: false, error: error.message || 'An internal server error occurred' }, { status: 500 });
  }
} 