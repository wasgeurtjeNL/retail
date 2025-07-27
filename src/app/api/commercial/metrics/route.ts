// =====================================================
// COMMERCIAL ACQUISITION METRICS API
// Dashboard metrics voor commercial acquisition systeem
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[CommercialMetrics] Fetching commercial acquisition metrics...');

    // Check authentication - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development' || process.env.AUTOMATION_DEV_MODE === 'true') {
      console.log('[CommercialMetrics] Development mode - skipping authentication');
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

    const serviceRoleClient = getServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get metrics in parallel for performance
    const metricsPromises = [
      // Prospects discovered today
      serviceRoleClient
        .from('commercial_prospects')
        .select('count', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),

      // Qualified prospects today (graceful fallback if status column doesn't exist)
      serviceRoleClient
        .from('commercial_prospects')
        .select('count', { count: 'exact' })
        .not('email', 'is', null) // Use email as proxy for "qualified" if status column missing
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),

      // Emails sent today
      serviceRoleClient
        .from('commercial_email_queue')
        .select('count', { count: 'exact' })
        .eq('status', 'sent')
        .gte('sent_at', `${today}T00:00:00.000Z`)
        .lt('sent_at', `${today}T23:59:59.999Z`),

      // Emails opened today
      serviceRoleClient
        .from('commercial_email_tracking')
        .select('count', { count: 'exact' })
        .eq('event_type', 'opened')
        .gte('event_timestamp', `${today}T00:00:00.000Z`)
        .lt('event_timestamp', `${today}T23:59:59.999Z`),

      // Fulfillment orders today
      serviceRoleClient
        .from('fulfillment_orders')
        .select('count', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),

      // Total prospects
      serviceRoleClient
        .from('commercial_prospects')
        .select('count', { count: 'exact' }),

      // Total orders
      serviceRoleClient
        .from('fulfillment_orders')
        .select('count', { count: 'exact' }),

      // Conversion tracking for rate calculation
      serviceRoleClient
        .from('conversion_journeys')
        .select('count', { count: 'exact' })
        .eq('status', 'converted'),

      // Yesterday's metrics for comparison
      serviceRoleClient
        .from('commercial_prospects')
        .select('count', { count: 'exact' })
        .gte('created_at', `${yesterday}T00:00:00.000Z`)
        .lt('created_at', `${yesterday}T23:59:59.999Z`),

      // Email performance metrics
      serviceRoleClient
        .from('commercial_email_queue')
        .select('count', { count: 'exact' })
        .eq('status', 'sent')
        .gte('sent_at', `${yesterday}T00:00:00.000Z`)
        .lt('sent_at', `${yesterday}T23:59:59.999Z`),
    ];

    const results = await Promise.allSettled(metricsPromises);

    // Extract counts safely
    const getCounts = (index: number): number => {
      const result = results[index];
      if (result.status === 'fulfilled' && !result.value.error) {
        return result.value.count || 0;
      }
      console.warn(`[CommercialMetrics] Error fetching metric ${index}:`, 
        result.status === 'rejected' ? result.reason : result.value.error);
      return 0;
    };

    const prospectsDiscoveredToday = getCounts(0);
    const prospectsQualifiedToday = getCounts(1);
    const emailsSentToday = getCounts(2);
    const emailsOpenedToday = getCounts(3);
    const fulfillmentOrdersToday = getCounts(4);
    const totalProspects = getCounts(5);
    const totalOrders = getCounts(6);
    const totalConversions = getCounts(7);
    const prospectsDiscoveredYesterday = getCounts(8);
    const emailsSentYesterday = getCounts(9);

    // Calculate conversion rate
    const conversionRate = totalProspects > 0 ? totalConversions / totalProspects : 0;

    // Calculate growth rates
    const prospectGrowthRate = prospectsDiscoveredYesterday > 0 
      ? ((prospectsDiscoveredToday - prospectsDiscoveredYesterday) / prospectsDiscoveredYesterday) * 100 
      : 0;

    const emailGrowthRate = emailsSentYesterday > 0 
      ? ((emailsSentToday - emailsSentYesterday) / emailsSentYesterday) * 100 
      : 0;

    // Get segment performance
    const segmentPerformance = await getSegmentPerformance(serviceRoleClient, today);

    // Get recent activity
    const recentActivity = await getRecentActivity(serviceRoleClient);

    // Get campaign performance
    const campaignPerformance = await getCampaignPerformance(serviceRoleClient, today);

    const metrics = {
      // Core metrics
      prospects_discovered_today: prospectsDiscoveredToday,
      prospects_qualified_today: prospectsQualifiedToday,
      emails_sent_today: emailsSentToday,
      emails_opened_today: emailsOpenedToday,
      fulfillment_orders_today: fulfillmentOrdersToday,
      conversion_rate: conversionRate,
      total_prospects: totalProspects,
      total_orders: totalOrders,
      total_conversions: totalConversions,

      // Growth metrics
      prospect_growth_rate: prospectGrowthRate,
      email_growth_rate: emailGrowthRate,
      email_open_rate: emailsSentToday > 0 ? (emailsOpenedToday / emailsSentToday) * 100 : 0,

      // Performance metrics
      segment_performance: segmentPerformance,
      recent_activity: recentActivity,
      campaign_performance: campaignPerformance,

      // Yesterday comparison
      yesterday_metrics: {
        prospects_discovered: prospectsDiscoveredYesterday,
        emails_sent: emailsSentYesterday
      },

      // Metadata
      generated_at: new Date().toISOString(),
      period: today
    };

    console.log(`[CommercialMetrics] Generated metrics for ${today}`);

    return NextResponse.json({
      success: true,
      ...metrics
    });

  } catch (error) {
    console.error('[CommercialMetrics] Error fetching metrics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch commercial metrics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper functions

async function getSegmentPerformance(supabase: any, today: string) {
  try {
    // Try with business_segment and status columns, fallback gracefully if they don't exist
    const { data, error } = await supabase
      .from('commercial_prospects')
      .select('created_at, email, phone, website') // Select basic fields that should exist
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (error) {
      console.error('[CommercialMetrics] Error fetching segment performance:', error);
      return [];
    }

    // Group by segment and calculate metrics (fallback logic for missing columns)
    const segmentMap = new Map();
    
    data?.forEach(prospect => {
      // Use "general" segment if business_segment column doesn't exist
      const segment = 'general';
      if (!segmentMap.has(segment)) {
        segmentMap.set(segment, {
          segment,
          discovered: 0,
          qualified: 0,
          conversion_rate: 0
        });
      }
      
      const segmentData = segmentMap.get(segment);
      segmentData.discovered++;
      
      // Use email presence as proxy for "qualified" if status column missing
      if (prospect.email) {
        segmentData.qualified++;
      }
    });

    // Calculate conversion rates
    segmentMap.forEach(segmentData => {
      segmentData.conversion_rate = segmentData.discovered > 0 
        ? (segmentData.qualified / segmentData.discovered) * 100 
        : 0;
    });

    return Array.from(segmentMap.values());

  } catch (error) {
    console.error('[CommercialMetrics] Error calculating segment performance:', error);
    return [];
  }
}

async function getRecentActivity(supabase: any) {
  try {
    const { data: prospects, error: prospectsError } = await supabase
      .from('commercial_prospects')
      .select('id, business_name, business_segment, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: orders, error: ordersError } = await supabase
      .from('fulfillment_orders')
      .select('id, order_number, recipient_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: emails, error: emailsError } = await supabase
      .from('commercial_email_queue')
      .select('id, prospect_id, campaign_step, status, sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(5);

    return {
      recent_prospects: prospectsError ? [] : prospects || [],
      recent_orders: ordersError ? [] : orders || [],
      recent_emails: emailsError ? [] : emails || []
    };

  } catch (error) {
    console.error('[CommercialMetrics] Error fetching recent activity:', error);
    return {
      recent_prospects: [],
      recent_orders: [],
      recent_emails: []
    };
  }
}

async function getCampaignPerformance(supabase: any, today: string) {
  try {
    const { data, error } = await supabase
      .from('commercial_email_campaigns')
      .select(`
        id,
        campaign_name,
        business_segment,
        total_sent,
        total_opened,
        total_clicked,
        total_conversions,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[CommercialMetrics] Error fetching campaign performance:', error);
      return [];
    }

    return (data || []).map(campaign => ({
      ...campaign,
      open_rate: campaign.total_sent > 0 ? (campaign.total_opened / campaign.total_sent) * 100 : 0,
      click_rate: campaign.total_sent > 0 ? (campaign.total_clicked / campaign.total_sent) * 100 : 0,
      conversion_rate: campaign.total_sent > 0 ? (campaign.total_conversions / campaign.total_sent) * 100 : 0
    }));

  } catch (error) {
    console.error('[CommercialMetrics] Error calculating campaign performance:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    // Future: Allow triggering metric recalculation or custom date ranges
    return NextResponse.json({ 
      error: 'POST method not implemented yet' 
    }, { status: 501 });

  } catch (error) {
    console.error('[CommercialMetrics] POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 