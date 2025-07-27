// Sales Advice Analytics API
// Provides analytics data for the sales analytics dashboard

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Service client for backend operations
const getSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

/**
 * GET /api/sales-advice/analytics - Get analytics data for sales advice
 */
export async function GET(request: NextRequest) {
  console.log('[SALES-ADVICE-ANALYTICS] GET request received');
  
  try {
    // Use the proper route handler client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[SALES-ADVICE-ANALYTICS] Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can view analytics)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[SALES-ADVICE-ANALYTICS] Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Error checking user permissions' }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      console.log('[SALES-ADVICE-ANALYTICS] Access denied - not admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[SALES-ADVICE-ANALYTICS] Generating analytics data...');
    
    // Use service client for analytics queries
    const serviceClient = getSupabaseServiceClient();
    
    // Generate overview metrics
    const overview = await generateOverviewMetrics(serviceClient);
    const adviceMetrics = await generateAdviceMetrics(serviceClient);
    const engagementTrend = await generateEngagementTrend(serviceClient);
    const categoryPerformance = await generateCategoryPerformance(serviceClient);
    const activityHeatmap = generateActivityHeatmap();

    const analyticsData = {
      overview,
      advice_metrics: adviceMetrics,
      engagement_trend: engagementTrend,
      category_performance: categoryPerformance,
      activity_heatmap: activityHeatmap,
      last_updated: new Date().toISOString()
    };

    console.log('[SALES-ADVICE-ANALYTICS] Analytics data generated successfully');
    
    return NextResponse.json(analyticsData, { status: 200 });

  } catch (error) {
    console.error('[SALES-ADVICE-ANALYTICS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

/**
 * Generate overview metrics
 */
async function generateOverviewMetrics(supabase: any) {
  try {
    // Count total retailers
    const { count: totalRetailers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'retailer');

    // Count active retailers (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: activeLast7Days } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'retailer')
      .gte('last_sign_in_at', sevenDaysAgo.toISOString());

    // Count active retailers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeLast30Days } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'retailer')
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

    // Calculate engagement rate
    const engagementRate7Days = totalRetailers > 0 ? (activeLast7Days / totalRetailers) * 100 : 0;

    // Mock data for revenue impact and ROI (replace with actual data when available)
    const totalRevenueImpact = 125000;
    const avgRoiPerRetailer = 2.4;
    const totalActions = 342;
    const completionRate = "78.5%";

    return {
      total_retailers: totalRetailers || 0,
      active_last_7_days: activeLast7Days || 0,
      active_last_30_days: activeLast30Days || 0,
      engagement_rate_7_days: Math.round(engagementRate7Days * 10) / 10,
      total_revenue_impact: totalRevenueImpact,
      avg_roi_per_retailer: avgRoiPerRetailer,
      total_actions: totalActions,
      completion_rate: completionRate
    };

  } catch (error) {
    console.error('[SALES-ADVICE-ANALYTICS] Error generating overview metrics:', error);
    return {
      total_retailers: 0,
      active_last_7_days: 0,
      active_last_30_days: 0,
      engagement_rate_7_days: 0,
      total_revenue_impact: 0,
      avg_roi_per_retailer: 0,
      total_actions: 0,
      completion_rate: "0%"
    };
  }
}

/**
 * Generate advice metrics
 */
async function generateAdviceMetrics(supabase: any) {
  // Mock data for advice metrics (replace with actual data when sales_advice table exists)
  return [
    {
      advice_type: "Product Positioning",
      category: "Marketing",
      total_advice: 45,
      viewed_count: 42,
      started_count: 38,
      completed_count: 32,
      skipped_count: 6,
      avg_completed_roi: 3.2,
      avg_hours_to_complete: 2.5
    },
    {
      advice_type: "Customer Engagement",
      category: "Sales",
      total_advice: 38,
      viewed_count: 35,
      started_count: 30,
      completed_count: 26,
      skipped_count: 4,
      avg_completed_roi: 2.8,
      avg_hours_to_complete: 1.8
    },
    {
      advice_type: "Inventory Management",
      category: "Operations",
      total_advice: 28,
      viewed_count: 25,
      started_count: 22,
      completed_count: 18,
      skipped_count: 4,
      avg_completed_roi: 2.1,
      avg_hours_to_complete: 3.2
    },
    {
      advice_type: "Digital Marketing",
      category: "Marketing",
      total_advice: 33,
      viewed_count: 31,
      started_count: 27,
      completed_count: 23,
      skipped_count: 4,
      avg_completed_roi: 4.1,
      avg_hours_to_complete: 2.8
    }
  ];
}

/**
 * Generate engagement trend data
 */
async function generateEngagementTrend(supabase: any) {
  const trend = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Mock data for engagement trend (replace with actual data)
    const activeUsers = Math.floor(Math.random() * 15) + 5;
    const completions = Math.floor(Math.random() * 8) + 2;
    const revenueImpact = Math.floor(Math.random() * 5000) + 1000;
    
    trend.push({
      date: date.toISOString().split('T')[0],
      active_users: activeUsers,
      completions: completions,
      revenue_impact: revenueImpact
    });
  }
  
  return trend;
}

/**
 * Generate category performance data
 */
async function generateCategoryPerformance(supabase: any) {
  // Mock data for category performance (replace with actual data)
  return [
    {
      category: "Marketing",
      total_advice: 78,
      advice_with_actions: 65,
      completed_advice: 55,
      avg_roi: 3.6,
      total_revenue_impact: 45000
    },
    {
      category: "Sales",
      total_advice: 52,
      advice_with_actions: 48,
      completed_advice: 38,
      avg_roi: 2.9,
      total_revenue_impact: 32000
    },
    {
      category: "Operations",
      total_advice: 35,
      advice_with_actions: 28,
      completed_advice: 22,
      avg_roi: 2.2,
      total_revenue_impact: 18000
    },
    {
      category: "Customer Service",
      total_advice: 41,
      advice_with_actions: 35,
      completed_advice: 28,
      avg_roi: 3.1,
      total_revenue_impact: 25000
    }
  ];
}

/**
 * Generate activity heatmap data
 */
function generateActivityHeatmap() {
  // Generate 53 weeks x 7 days heatmap data
  const heatmap = [];
  
  for (let week = 0; week < 53; week++) {
    const weekData = [];
    for (let day = 0; day < 7; day++) {
      // Mock activity level (0-4)
      const activityLevel = Math.floor(Math.random() * 5);
      weekData.push(activityLevel);
    }
    heatmap.push(weekData);
  }
  
  return heatmap;
} 