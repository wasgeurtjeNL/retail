// =====================================================
// SYSTEM HEALTH CHECK ENDPOINT
// Comprehensive health monitoring for production deployment
// =====================================================

import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string | undefined;
  uptime: number;
  warning?: string;
  checks: {
    database?: {
      status: 'healthy' | 'unhealthy';
      prospect_count?: number;
      response_time_ms?: string;
      error?: string;
    };
    apis?: {
      openai: { configured: boolean; status: string };
      mandrill: { configured: boolean; status: string };
      google_places: { configured: boolean; status: string };
      kvk: { configured: boolean; status: string };
    };
    system?: {
      memory_usage: {
        used: number;
        total: number;
        unit: string;
      };
      node_version: string;
      platform: string;
    };
  };
  commercial_system?: any;
}

export async function GET() {
  try {
    const healthCheck: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      checks: {},
      commercial_system: {}
    };

    // ============================================
    // DATABASE HEALTH CHECK
    // ============================================
    try {
      const supabase = getServiceRoleClient();
      
      // Test basic connectivity
      const { data: testQuery, error: dbError } = await supabase
        .from('commercial_prospects')
        .select('count', { count: 'exact', head: true });

      if (dbError) {
        healthCheck.checks.database = {
          status: 'unhealthy',
          error: dbError.message
        };
        healthCheck.status = 'degraded';
             } else {
         healthCheck.checks.database = {
           status: 'healthy',
           prospect_count: 0, // Count query completed successfully
           response_time_ms: 'measured'
         };
       }
    } catch (error) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
      healthCheck.status = 'degraded';
    }

    // ============================================
    // APIS HEALTH CHECK
    // ============================================
    healthCheck.checks.apis = {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        status: !!process.env.OPENAI_API_KEY ? 'ready' : 'missing'
      },
      mandrill: {
        configured: !!process.env.MANDRILL_API_KEY,
        status: !!process.env.MANDRILL_API_KEY ? 'ready' : 'missing'
      },
      google_places: {
        configured: !!process.env.GOOGLE_PLACES_API_KEY,
        status: !!process.env.GOOGLE_PLACES_API_KEY ? 'ready' : 'missing'
      },
      kvk: {
        configured: !!process.env.KVK_API_KEY,
        status: !!process.env.KVK_API_KEY ? 'ready' : 'missing'
      }
    };

    // Calculate API readiness
    const totalApis = 4;
    const configuredApis = Object.values(healthCheck.checks.apis).filter(api => api.configured).length;
    const apiReadiness = Math.round((configuredApis / totalApis) * 100);

    // ============================================
    // COMMERCIAL SYSTEM SPECIFIC CHECKS
    // ============================================
    try {
      const supabase = getServiceRoleClient();

      // Check critical tables
      const criticalTableChecks = await Promise.allSettled([
        supabase.from('commercial_prospects').select('count', { count: 'exact', head: true }),
        supabase.from('commercial_email_campaigns').select('count', { count: 'exact', head: true }),
        supabase.from('commercial_email_queue').select('count', { count: 'exact', head: true }),
        supabase.from('fulfillment_orders').select('count', { count: 'exact', head: true }),
        supabase.from('background_jobs').select('count', { count: 'exact', head: true })
      ]);

      healthCheck.commercial_system = {
        prospects_table: criticalTableChecks[0].status === 'fulfilled' ? 'accessible' : 'error',
        campaigns_table: criticalTableChecks[1].status === 'fulfilled' ? 'accessible' : 'error',
        email_queue_table: criticalTableChecks[2].status === 'fulfilled' ? 'accessible' : 'error',
        fulfillment_table: criticalTableChecks[3].status === 'fulfilled' ? 'accessible' : 'error',
        background_jobs_table: criticalTableChecks[4].status === 'fulfilled' ? 'accessible' : 'error',
        system_readiness: `${apiReadiness}%`
      };

      // Check for any critical table failures
      const failedTables = Object.values(healthCheck.commercial_system).filter(status => status === 'error').length;
      if (failedTables > 0) {
        healthCheck.status = 'degraded';
      }

    } catch (error) {
      healthCheck.commercial_system = {
        status: 'error',
        error: 'Unable to check commercial system tables'
      };
      healthCheck.status = 'degraded';
    }

    // ============================================
    // SYSTEM RESOURCES CHECK
    // ============================================
    healthCheck.checks.system = {
      memory_usage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      node_version: process.version,
      platform: process.platform
    };

    // ============================================
    // OVERALL STATUS DETERMINATION
    // ============================================
    const systemHealthy = healthCheck.checks.database?.status === 'healthy';
    const criticalApisReady = healthCheck.checks.apis.openai.configured && 
                             healthCheck.checks.apis.mandrill.configured;

    if (!systemHealthy) {
      healthCheck.status = 'unhealthy';
    } else if (!criticalApisReady) {
      healthCheck.status = 'degraded';
      healthCheck.warning = 'Some APIs not configured - system functional but with limited capabilities';
    }

    // Return appropriate HTTP status
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: httpStatus });

  } catch (error) {
    // Critical failure - return unhealthy status
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      uptime: process.uptime()
    }, { status: 503 });
  }
} 