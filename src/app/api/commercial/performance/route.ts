// =====================================================
// PERFORMANCE MONITORING API
// Real-time metrics, alerts, en system health
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getPerformanceMonitor } from '@/lib/performance-monitor';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[Performance API] GET request received');

    // Check authentication - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[Performance API] Development mode - skipping authentication');
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

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'dashboard';
    const timeframe = url.searchParams.get('timeframe') || '24h';

    const performanceMonitor = getPerformanceMonitor();

    switch (action) {
      case 'dashboard':
        const dashboardData = await performanceMonitor.getDashboardData();
        return NextResponse.json({
          success: true,
          data: dashboardData,
          timestamp: new Date().toISOString()
        });

      case 'metrics':
        const metricName = url.searchParams.get('metric');
        const category = url.searchParams.get('category');
        
        const serviceSupabase = getServiceRoleClient();
        let query = serviceSupabase
          .from('performance_metrics')
          .select('*')
          .order('recorded_at', { ascending: false });

        // Apply filters
        if (metricName) {
          query = query.eq('metric_name', metricName);
        }
        if (category) {
          query = query.eq('category', category);
        }

        // Apply timeframe
        const timeframeDates = getTimeframeFilter(timeframe);
        if (timeframeDates.start) {
          query = query.gte('recorded_at', timeframeDates.start);
        }

        const { data: metrics, error: metricsError } = await query.limit(1000);

        if (metricsError) {
          throw new Error(`Database error: ${metricsError.message}`);
        }

        return NextResponse.json({
          success: true,
          data: {
            metrics: metrics || [],
            timeframe,
            filters: { metric: metricName, category }
          }
        });

      case 'alerts':
        const severity = url.searchParams.get('severity');
        const status = url.searchParams.get('status') || 'active';

        const serviceSupabase2 = getServiceRoleClient();
        let alertQuery = serviceSupabase2
          .from('system_alerts')
          .select('*')
          .eq('status', status)
          .order('triggered_at', { ascending: false });

        if (severity) {
          alertQuery = alertQuery.eq('severity', severity);
        }

        const { data: alerts, error: alertsError } = await alertQuery.limit(100);

        if (alertsError) {
          throw new Error(`Database error: ${alertsError.message}`);
        }

        return NextResponse.json({
          success: true,
          data: {
            alerts: alerts || [],
            filters: { severity, status }
          }
        });

      case 'health':
        // Get system health components
        const healthData = await getSystemHealthDetails();
        return NextResponse.json({
          success: true,
          data: healthData
        });

      case 'trends':
        const metric = url.searchParams.get('metric') || 'prospects_discovered_per_hour';
        const trendData = await getTrendAnalysis(metric, timeframe);
        return NextResponse.json({
          success: true,
          data: trendData
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: ['dashboard', 'metrics', 'alerts', 'health', 'trends']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Performance API] Error:', error);
    return NextResponse.json({
      error: 'Failed to get performance data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Performance API] POST request received');

    // Check authentication - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[Performance API] Development mode - skipping authentication');
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

    const body = await request.json();
    const { action, data } = body;

    const performanceMonitor = getPerformanceMonitor();

    switch (action) {
      case 'record_metric':
        const { metric_name, metric_value, metric_unit, category, tags } = data;
        
        if (!metric_name || metric_value === undefined || !metric_unit || !category) {
          return NextResponse.json({
            error: 'Missing required fields: metric_name, metric_value, metric_unit, category'
          }, { status: 400 });
        }

        await performanceMonitor.recordMetric({
          metric_name,
          metric_value,
          metric_unit,
          category,
          tags
        });

        return NextResponse.json({
          success: true,
          message: 'Metric recorded successfully'
        });

      case 'acknowledge_alert':
        const { alert_id } = data;
        
        if (!alert_id) {
          return NextResponse.json({
            error: 'alert_id is required'
          }, { status: 400 });
        }

        const serviceSupabase = getServiceRoleClient();
        const { error: updateError } = await serviceSupabase
          .from('system_alerts')
          .update({
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', alert_id);

        if (updateError) {
          throw new Error(`Failed to acknowledge alert: ${updateError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });

      case 'resolve_alert':
        const { alert_id: resolveAlertId } = data;
        
        if (!resolveAlertId) {
          return NextResponse.json({
            error: 'alert_id is required'
          }, { status: 400 });
        }

        const serviceSupabase2 = getServiceRoleClient();
        const { error: resolveError } = await serviceSupabase2
          .from('system_alerts')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', resolveAlertId);

        if (resolveError) {
          throw new Error(`Failed to resolve alert: ${resolveError.message}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Alert resolved successfully'
        });

      case 'test_metrics':
        // Generate test metrics for demonstration
        await generateTestMetrics(performanceMonitor);
        
        return NextResponse.json({
          success: true,
          message: 'Test metrics generated successfully'
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: ['record_metric', 'acknowledge_alert', 'resolve_alert', 'test_metrics']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Performance API] POST Error:', error);
    return NextResponse.json({
      error: 'Failed to process performance request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper functions

function getTimeframeFilter(timeframe: string): { start?: string; end?: string } {
  const now = new Date();
  
  switch (timeframe) {
    case '1h':
      return {
        start: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      };
    case '24h':
      return {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      };
    case '7d':
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    case '30d':
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    default:
      return {};
  }
}

async function getSystemHealthDetails() {
  try {
    const serviceSupabase = getServiceRoleClient();
    
    // Get recent metrics by category
    const { data: recentMetrics } = await serviceSupabase
      .from('performance_metrics')
      .select('category, metric_name, metric_value, recorded_at')
      .gte('recorded_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    // Group by category and calculate health scores
    const categoryHealth: Record<string, any> = {};
    
    if (recentMetrics) {
      const grouped = recentMetrics.reduce((acc, metric) => {
        if (!acc[metric.category]) {
          acc[metric.category] = [];
        }
        acc[metric.category].push(metric);
        return acc;
      }, {} as Record<string, any[]>);

      for (const [category, metrics] of Object.entries(grouped)) {
        const latestMetrics = metrics.slice(0, 10); // Last 10 metrics
        
        let healthScore = 50; // Default moderate health
        let status = 'unknown';
        let details: Record<string, any> = {};

        // Calculate category-specific health
        switch (category) {
          case 'discovery':
            const discoveryRate = latestMetrics
              .filter(m => m.metric_name === 'prospects_discovered_per_hour')
              .map(m => m.metric_value)[0] || 0;
            healthScore = Math.min((discoveryRate / 10) * 100, 100);
            status = discoveryRate >= 5 ? 'healthy' : discoveryRate >= 2 ? 'warning' : 'critical';
            details = { discovery_rate: discoveryRate, target: 10 };
            break;

          case 'email':
            const openRate = latestMetrics
              .filter(m => m.metric_name === 'email_open_rate')
              .map(m => m.metric_value)[0] || 0;
            healthScore = Math.min((openRate / 35) * 100, 100);
            status = openRate >= 25 ? 'healthy' : openRate >= 15 ? 'warning' : 'critical';
            details = { open_rate: openRate, target: 35 };
            break;

          case 'system':
            const errorRate = latestMetrics
              .filter(m => m.metric_name === 'error_rate_percentage')
              .map(m => m.metric_value)[0] || 0;
            healthScore = Math.max(100 - (errorRate * 20), 0);
            status = errorRate <= 2 ? 'healthy' : errorRate <= 5 ? 'warning' : 'critical';
            details = { error_rate: errorRate, threshold: 5 };
            break;

          case 'api':
            const successRate = latestMetrics
              .filter(m => m.metric_name === 'api_success_rate')
              .map(m => m.metric_value)[0] || 100;
            healthScore = successRate;
            status = successRate >= 95 ? 'healthy' : successRate >= 90 ? 'warning' : 'critical';
            details = { success_rate: successRate, target: 95 };
            break;
        }

        categoryHealth[category] = {
          health_score: Math.round(healthScore),
          status,
          details,
          last_updated: latestMetrics[0]?.recorded_at,
          metric_count: latestMetrics.length
        };
      }
    }

    // Calculate overall health
    const healthScores = Object.values(categoryHealth).map((cat: any) => cat.health_score);
    const overallHealth = healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length)
      : 50;

    return {
      overall_health: overallHealth,
      category_health: categoryHealth,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Performance API] Error getting health details:', error);
    return {
      overall_health: 50,
      category_health: {},
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function getTrendAnalysis(metric: string, timeframe: string) {
  try {
    const serviceSupabase = getServiceRoleClient();
    const timeframeDates = getTimeframeFilter(timeframe);
    
    let query = serviceSupabase
      .from('performance_metrics')
      .select('metric_value, recorded_at')
      .eq('metric_name', metric)
      .order('recorded_at', { ascending: true });

    if (timeframeDates.start) {
      query = query.gte('recorded_at', timeframeDates.start);
    }

    const { data: metrics } = await query.limit(1000);

    if (!metrics || metrics.length === 0) {
      return {
        metric_name: metric,
        timeframe,
        trend: 'stable',
        data_points: [],
        summary: { min: 0, max: 0, avg: 0, latest: 0 }
      };
    }

    const values = metrics.map(m => m.metric_value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];

    // Calculate trend
    let trend = 'stable';
    if (metrics.length >= 3) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const change = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (change > 5) trend = 'increasing';
      else if (change < -5) trend = 'decreasing';
    }

    return {
      metric_name: metric,
      timeframe,
      trend,
      data_points: metrics.map(m => ({
        value: m.metric_value,
        timestamp: m.recorded_at
      })),
      summary: {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        latest: Math.round(latest * 100) / 100
      }
    };

  } catch (error) {
    console.error('[Performance API] Error getting trend analysis:', error);
    return {
      metric_name: metric,
      timeframe,
      trend: 'unknown',
      data_points: [],
      summary: { min: 0, max: 0, avg: 0, latest: 0 },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function generateTestMetrics(performanceMonitor: any) {
  // Generate some test metrics for demonstration
  const testMetrics = [
    { name: 'prospects_discovered_per_hour', value: Math.floor(Math.random() * 15) + 5, category: 'discovery' },
    { name: 'email_open_rate', value: Math.random() * 20 + 25, category: 'email' },
    { name: 'email_click_rate', value: Math.random() * 5 + 2, category: 'email' },
    { name: 'api_response_time_ms', value: Math.random() * 1000 + 500, category: 'system' },
    { name: 'error_rate_percentage', value: Math.random() * 3, category: 'system' },
    { name: 'queue_pending_jobs', value: Math.floor(Math.random() * 50), category: 'system' },
    { name: 'api_success_rate', value: Math.random() * 5 + 95, category: 'api' },
    { name: 'conversion_rate_percentage', value: Math.random() * 3 + 2, category: 'fulfillment' }
  ];

  for (const metric of testMetrics) {
    await performanceMonitor.recordMetric({
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.name.includes('rate') ? 'percentage' : 
                   metric.name.includes('time') ? 'milliseconds' : 'count',
      category: metric.category,
      tags: { test: 'true', generated: 'api' }
    });
  }
} 