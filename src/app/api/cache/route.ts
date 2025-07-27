/**
 * Cache Management API Endpoints
 * GET /api/cache - Haal cache statistieken op
 * POST /api/cache - Cache management operaties (clear, warm, invalidate)
 * DELETE /api/cache - Clear alle caches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  getCacheManager, 
  formatCacheMetrics, 
  checkCacheHealth,
  type CacheMetrics 
} from '@/lib/analysis-cache';

interface CacheResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

interface CacheOperationRequest {
  operation: 'clear' | 'warm' | 'invalidate' | 'status';
  target?: 'all' | 'scraped' | 'ai' | 'analysis';
  urls?: string[];
  options?: any;
}

/**
 * Valideer admin access
 */
async function validateAdminAccess(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[CACHE_API] Error checking admin access:', error);
      return false;
    }

    return profile?.role === 'admin';
  } catch (error) {
    console.error('[CACHE_API] Admin validation error:', error);
    return false;
  }
}

/**
 * GET /api/cache
 * Haal cache statistieken en status op
 */
export async function GET(request: NextRequest): Promise<NextResponse<CacheResponse>> {
  try {
    console.log('[CACHE_API] Getting cache statistics');

    // Check authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await validateAdminAccess(supabase, session.user.id);
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Get cache manager and metrics
    const cacheManager = getCacheManager();
    const metrics = cacheManager.getMetrics();
    const status = cacheManager.getStatus();
    const health = checkCacheHealth(metrics);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const detailed = searchParams.get('detailed') === 'true';

    // Prepare response data
    const responseData = {
      status: {
        isInitialized: status.isInitialized,
        uptime: status.uptime,
        config: status.config
      },
      metrics: detailed ? metrics : {
        overall: metrics.overall,
        summary: formatCacheMetrics(metrics)
      },
      health: {
        isHealthy: health.isHealthy,
        warnings: health.warnings,
        recommendations: health.recommendations
      },
      timestamp: new Date().toISOString()
    };

    // Return formatted response
    if (format === 'summary') {
      return NextResponse.json({
        success: true,
        data: {
          summary: formatCacheMetrics(metrics),
          isHealthy: health.isHealthy,
          warnings: health.warnings.length,
          recommendations: health.recommendations.length
        },
        message: 'Cache summary retrieved successfully'
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Cache statistics retrieved successfully'
    });

  } catch (error) {
    console.error('[CACHE_API] Error getting cache statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve cache statistics'
    }, { status: 500 });
  }
}

/**
 * POST /api/cache
 * Cache management operaties
 */
export async function POST(request: NextRequest): Promise<NextResponse<CacheResponse>> {
  try {
    console.log('[CACHE_API] Processing cache operation');

    // Check authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await validateAdminAccess(supabase, session.user.id);
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Parse request body
    let body: CacheOperationRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { operation, target = 'all', urls = [], options = {} } = body;

    // Get cache manager
    const cacheManager = getCacheManager();

    // Process cache operation
    switch (operation) {
      case 'clear':
        await handleClearOperation(cacheManager, target);
        return NextResponse.json({
          success: true,
          message: `Cache cleared successfully (target: ${target})`
        });

      case 'warm':
        if (urls.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'URLs required for warm operation'
          }, { status: 400 });
        }
        await handleWarmOperation(cacheManager, urls, options);
        return NextResponse.json({
          success: true,
          message: `Cache warming initiated for ${urls.length} URLs`
        });

      case 'invalidate':
        if (urls.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'URLs required for invalidate operation'
          }, { status: 400 });
        }
        await handleInvalidateOperation(cacheManager, urls);
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for ${urls.length} URLs`
        });

      case 'status':
        const metrics = cacheManager.getMetrics();
        const health = checkCacheHealth(metrics);
        return NextResponse.json({
          success: true,
          data: {
            metrics: metrics.overall,
            health,
            summary: formatCacheMetrics(metrics)
          },
          message: 'Cache status retrieved successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown operation: ${operation}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[CACHE_API] Error processing cache operation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process cache operation'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/cache
 * Clear alle caches
 */
export async function DELETE(request: NextRequest): Promise<NextResponse<CacheResponse>> {
  try {
    console.log('[CACHE_API] Clearing all caches');

    // Check authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await validateAdminAccess(supabase, session.user.id);
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Get cache manager and clear all caches
    const cacheManager = getCacheManager();
    const beforeMetrics = cacheManager.getMetrics();
    
    cacheManager.clearAll();
    
    const afterMetrics = cacheManager.getMetrics();

    return NextResponse.json({
      success: true,
      data: {
        cleared: {
          entries: beforeMetrics.overall.totalEntries,
          size: beforeMetrics.overall.memoryUsage
        },
        remaining: {
          entries: afterMetrics.overall.totalEntries,
          size: afterMetrics.overall.memoryUsage
        }
      },
      message: 'All caches cleared successfully'
    });

  } catch (error) {
    console.error('[CACHE_API] Error clearing caches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear caches'
    }, { status: 500 });
  }
}

// === CACHE OPERATION HANDLERS ===

/**
 * Handle clear operation
 */
async function handleClearOperation(cacheManager: any, target: string): Promise<void> {
  switch (target) {
    case 'all':
      cacheManager.clearAll();
      break;
    case 'scraped':
      // Clear only scraped content cache
      // Note: This would require extending the cache manager with selective clearing
      console.log('[CACHE_API] Selective cache clearing not yet implemented');
      break;
    case 'ai':
      // Clear only AI analysis cache
      console.log('[CACHE_API] Selective cache clearing not yet implemented');
      break;
    case 'analysis':
      // Clear only final analysis cache
      console.log('[CACHE_API] Selective cache clearing not yet implemented');
      break;
    default:
      throw new Error(`Invalid clear target: ${target}`);
  }
}

/**
 * Handle warm operation
 */
async function handleWarmOperation(cacheManager: any, urls: string[], options: any): Promise<void> {
  console.log(`[CACHE_API] Warming cache for ${urls.length} URLs`);
  
  // This would typically involve pre-fetching and caching content
  // For now, we'll just log the operation
  for (const url of urls) {
    console.log(`[CACHE_API] Would warm cache for: ${url}`);
  }
  
  // TODO: Implement actual cache warming logic
  // - Pre-scrape websites
  // - Pre-analyze content
  // - Cache results
}

/**
 * Handle invalidate operation
 */
async function handleInvalidateOperation(cacheManager: any, urls: string[]): Promise<void> {
  console.log(`[CACHE_API] Invalidating cache for ${urls.length} URLs`);
  
  for (const url of urls) {
    cacheManager.invalidateUrl(url);
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Format cache metrics voor API response
 */
function formatCacheMetricsForAPI(metrics: CacheMetrics): any {
  return {
    overall: {
      totalEntries: metrics.overall.totalEntries,
      memoryUsage: Math.round(metrics.overall.memoryUsage * 100) / 100,
      hitRate: Math.round(metrics.overall.hitRate * 100) / 100,
      totalRequests: metrics.overall.hitCount + metrics.overall.missCount
    },
    breakdown: {
      scraped: {
        entries: metrics.scrapeCache.totalEntries,
        hitRate: Math.round(metrics.scrapeCache.hitRate * 100) / 100,
        size: Math.round(metrics.scrapeCache.memoryUsage * 100) / 100
      },
      ai: {
        entries: metrics.aiCache.totalEntries,
        hitRate: Math.round(metrics.aiCache.hitRate * 100) / 100,
        size: Math.round(metrics.aiCache.memoryUsage * 100) / 100
      },
      analysis: {
        entries: metrics.analysisCache.totalEntries,
        hitRate: Math.round(metrics.analysisCache.hitRate * 100) / 100,
        size: Math.round(metrics.analysisCache.memoryUsage * 100) / 100
      }
    }
  };
} 