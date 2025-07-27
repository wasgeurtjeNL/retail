// Sales Advice Metrics API
// Provides metrics data for the sales metrics dashboard

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
 * GET /api/sales-advice/metrics - Get metrics data for sales advice dashboard
 */
export async function GET(request: NextRequest) {
  console.log('[SALES-ADVICE-METRICS] GET request received');
  
  try {
    // Use the proper route handler client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[SALES-ADVICE-METRICS] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.log('[SALES-ADVICE-METRICS] Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can view metrics)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('[SALES-ADVICE-METRICS] Profile check:', { 
      hasProfile: !!profile, 
      role: profile?.role, 
      profileError: profileError?.message 
    });

    if (profileError) {
      console.error('[SALES-ADVICE-METRICS] Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Error checking user permissions' }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      console.log('[SALES-ADVICE-METRICS] Access denied - not admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[SALES-ADVICE-METRICS] Generating metrics data...');
    
    // Use service client for metrics queries
    const serviceClient = getSupabaseServiceClient();
    
    // Generate comprehensive metrics
    const overview = await generateOverviewMetrics(serviceClient);
    const engagement = await generateEngagementMetrics(serviceClient);
    const topPerformers = await generateTopPerformers(serviceClient);
    const achievements = await generateAchievements(serviceClient);
    const advicePerformance = await generateAdvicePerformance(serviceClient);
    const streaks = await generateStreaks(serviceClient);
    const revenueImpact = await generateRevenueImpact(serviceClient);

    const metricsData = {
      overview,
      engagement,
      top_performers: topPerformers,
      achievements,
      advice_performance: advicePerformance,
      streaks,
      revenue_impact: revenueImpact,
      last_updated: new Date().toISOString()
    };

    console.log('[SALES-ADVICE-METRICS] Metrics data generated successfully');
    
    return NextResponse.json(metricsData, { status: 200 });

  } catch (error) {
    console.error('[SALES-ADVICE-METRICS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics data' },
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
    
    const { count: activeRetailersWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'retailer')
      .gte('last_sign_in_at', sevenDaysAgo.toISOString());

    // Mock data for advice metrics (replace with actual data when available)
    const totalAdviceGenerated = 234;
    const totalAdviceCompleted = 187;
    const completionRate = "79.9%";

    return {
      total_retailers: totalRetailers || 0,
      active_retailers_week: activeRetailersWeek || 0,
      total_advice_generated: totalAdviceGenerated,
      total_advice_completed: totalAdviceCompleted,
      completion_rate: completionRate
    };

  } catch (error) {
    console.error('[SALES-ADVICE-METRICS] Error generating overview metrics:', error);
    return {
      total_retailers: 0,
      active_retailers_week: 0,
      total_advice_generated: 0,
      total_advice_completed: 0,
      completion_rate: "0%"
    };
  }
}

/**
 * Generate engagement metrics
 */
async function generateEngagementMetrics(supabase: any) {
  // Mock data for engagement metrics
  return {
    actions_last_month: 156,
    by_type: {
      "advice_viewed": 89,
      "advice_started": 67,
      "advice_completed": 45,
      "tips_applied": 38
    },
    daily_activity: {
      "Monday": 28,
      "Tuesday": 31,
      "Wednesday": 25,
      "Thursday": 29,
      "Friday": 26,
      "Saturday": 15,
      "Sunday": 12
    }
  };
}

/**
 * Generate top performers
 */
async function generateTopPerformers(supabase: any) {
  // Mock data for top performers (replace with actual retailer data)
  return [
    {
      business_name: "Beauty Salon Amsterdam",
      city: "Amsterdam",
      points: 1250,
      level: 5,
      advice_completed: 23,
      revenue_impact: 8500
    },
    {
      business_name: "Hair Studio Utrecht",
      city: "Utrecht",
      points: 1180,
      level: 4,
      advice_completed: 21,
      revenue_impact: 7800
    },
    {
      business_name: "Wellness Spa Rotterdam",
      city: "Rotterdam",
      points: 1095,
      level: 4,
      advice_completed: 18,
      revenue_impact: 6900
    },
    {
      business_name: "Kapsalon De Luxe",
      city: "Den Haag",
      points: 980,
      level: 3,
      advice_completed: 16,
      revenue_impact: 5600
    },
    {
      business_name: "Beautique Eindhoven",
      city: "Eindhoven",
      points: 875,
      level: 3,
      advice_completed: 14,
      revenue_impact: 4900
    }
  ];
}

/**
 * Generate achievements metrics
 */
async function generateAchievements(supabase: any) {
  return {
    total_unlocked: 67,
    by_type: {
      "first_steps": 15,
      "consistency": 22,
      "expertise": 18,
      "innovation": 12
    }
  };
}

/**
 * Generate advice performance metrics
 */
async function generateAdvicePerformance(supabase: any) {
  return {
    "Product Marketing": {
      total: 45,
      completed: 38,
      avg_rating: 4.3,
      avg_impact: 2.8
    },
    "Customer Service": {
      total: 32,
      completed: 26,
      avg_rating: 4.1,
      avg_impact: 2.4
    },
    "Sales Techniques": {
      total: 28,
      completed: 22,
      avg_rating: 4.5,
      avg_impact: 3.2
    },
    "Digital Marketing": {
      total: 35,
      completed: 29,
      avg_rating: 4.2,
      avg_impact: 3.1
    }
  };
}

/**
 * Generate streaks metrics
 */
async function generateStreaks(supabase: any) {
  return {
    active_streaks: 34,
    avg_current_streak: 7.2,
    longest_streak: 28
  };
}

/**
 * Generate revenue impact metrics
 */
async function generateRevenueImpact(supabase: any) {
  return {
    total_impact: 142500,
    avg_impact_per_retailer: 2850
  };
} 