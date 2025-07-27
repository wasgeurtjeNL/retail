// =====================================================
// CONVERSION ANALYTICS API - ROI & Performance Metrics
// Comprehensive analytics for conversion tracking and optimization
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { PostDeliveryService } from '@/lib/conversion/post-delivery-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'overview';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period') || 'month';

    console.log(`[Conversion Analytics API] Request: ${action}, period: ${period}`);

    switch (action) {
      case 'overview':
        return await getConversionOverview(startDate, endDate);
      
      case 'roi_metrics':
        return await getROIMetrics(startDate, endDate);
      
      case 'journey_performance':
        return await getJourneyPerformance(period);
      
      case 'touchpoint_analysis':
        return await getTouchpointAnalysis(startDate, endDate);
      
      case 'conversion_funnel':
        return await getConversionFunnel(startDate, endDate);
      
      case 'feedback_insights':
        return await getFeedbackInsights(startDate, endDate);
      
      case 'rule_performance':
        return await getRulePerformance();
      
      case 'cohort_analysis':
        return await getCohortAnalysis(period);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Conversion Analytics API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    console.log(`[Conversion Analytics API] POST action: ${action}`);

    switch (action) {
      case 'calculate_custom_metrics':
        return await calculateCustomMetrics(params);
      
      case 'export_data':
        return await exportAnalyticsData(params);
      
      case 'update_analytics_cache':
        return await updateAnalyticsCache(params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Conversion Analytics API] Error in POST:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process analytics request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// ANALYTICS FUNCTIONS
// =====================================================

async function getConversionOverview(startDate?: string | null, endDate?: string | null) {
  try {
    const supabase = getServiceRoleClient();
    const postDeliveryService = new PostDeliveryService();

    // Set default date range if not provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    // Get basic journey stats
    const journeyStats = await postDeliveryService.getJourneyStats();

    // Get conversion metrics
    const conversionMetrics = await postDeliveryService.getConversionMetrics(start, end);

    // Get recent journeys for trend analysis
    const { data: recentJourneys, error: journeyError } = await supabase
      .from('conversion_journeys')
      .select('*')
      .gte('initiated_at', start.toISOString())
      .lte('initiated_at', end.toISOString())
      .order('initiated_at', { ascending: false });

    if (journeyError) {
      throw new Error(`Failed to get recent journeys: ${journeyError.message}`);
    }

    // Calculate additional metrics
    const totalInvestment = recentJourneys?.reduce((sum, journey) => sum + (journey.total_cost || 0), 0) || 0;
    const totalRevenue = recentJourneys?.filter(j => j.status === 'converted').reduce((sum, journey) => sum + (journey.actual_ltv || 0), 0) || 0;
    const avgDaysToConversion = recentJourneys?.filter(j => j.days_to_conversion).reduce((sum, journey, _, arr) => sum + journey.days_to_conversion / arr.length, 0) || 0;

    // Get feedback stats
    const { data: feedbackStats, error: feedbackError } = await supabase
      .from('proefpakket_feedback')
      .select('overall_rating, interested_in_partnership')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (feedbackError) {
      console.warn('Failed to get feedback stats:', feedbackError);
    }

    const avgFeedbackRating = feedbackStats?.length 
      ? feedbackStats.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / feedbackStats.length 
      : 0;

    const interestRate = feedbackStats?.length 
      ? (feedbackStats.filter(f => f.interested_in_partnership).length / feedbackStats.length) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
            days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          },
          totals: {
            journeys: recentJourneys?.length || 0,
            proefpakketten_sent: recentJourneys?.filter(j => j.proefpakket_sent_at).length || 0,
            delivered: recentJourneys?.filter(j => j.status === 'delivered' || j.delivered_at).length || 0,
            feedback_received: recentJourneys?.filter(j => j.feedback_received_at).length || 0,
            conversions: recentJourneys?.filter(j => j.status === 'converted').length || 0,
            total_investment: totalInvestment,
            total_revenue: totalRevenue
          },
          rates: {
            delivery_rate: conversionMetrics?.delivery_rate || 0,
            feedback_rate: feedbackStats?.length && recentJourneys?.length 
              ? (feedbackStats.length / recentJourneys.length) * 100 
              : 0,
            conversion_rate: conversionMetrics?.conversion_rate || 0,
            interest_rate: interestRate,
            roi_percentage: conversionMetrics?.roi_percentage || 0
          },
          averages: {
            days_to_delivery: conversionMetrics?.avg_days_to_conversion || 0,
            days_to_conversion: avgDaysToConversion,
            feedback_rating: avgFeedbackRating,
            ltv_per_conversion: recentJourneys?.filter(j => j.status === 'converted').length 
              ? totalRevenue / recentJourneys.filter(j => j.status === 'converted').length 
              : 0,
            cost_per_conversion: recentJourneys?.filter(j => j.status === 'converted').length 
              ? totalInvestment / recentJourneys.filter(j => j.status === 'converted').length 
              : 0
          }
        },
        journey_stats: journeyStats,
        conversion_metrics: conversionMetrics
      }
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting overview:', error);
    throw error;
  }
}

async function getROIMetrics(startDate?: string | null, endDate?: string | null) {
  try {
    const supabase = getServiceRoleClient();

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get detailed ROI breakdown
    const { data: journeys, error } = await supabase
      .from('conversion_journeys')
      .select(`
        *,
        prospects (
          enrichment_score,
          country
        )
      `)
      .gte('initiated_at', start.toISOString())
      .lte('initiated_at', end.toISOString());

    if (error) {
      throw new Error(`Failed to get journeys for ROI: ${error.message}`);
    }

    // Calculate ROI metrics by various dimensions
    const roiByStatus = calculateROIByDimension(journeys || [], 'status');
    const roiByCountry = calculateROIByDimension(journeys || [], 'country');
    const roiByEnrichmentScore = calculateROIByEnrichmentScore(journeys || []);
    const roiByTimeframe = calculateROIByTimeframe(journeys || []);

    // Calculate overall ROI metrics
    const totalInvestment = journeys?.reduce((sum, j) => sum + (j.total_cost || 0), 0) || 0;
    const totalRevenue = journeys?.filter(j => j.status === 'converted').reduce((sum, j) => sum + (j.actual_ltv || 0), 0) || 0;
    const netProfit = totalRevenue - totalInvestment;
    const roiPercentage = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_investment: totalInvestment,
          total_revenue: totalRevenue,
          net_profit: netProfit,
          roi_percentage: roiPercentage,
          conversion_count: journeys?.filter(j => j.status === 'converted').length || 0,
          total_journeys: journeys?.length || 0
        },
        breakdowns: {
          by_status: roiByStatus,
          by_country: roiByCountry,
          by_enrichment_score: roiByEnrichmentScore,
          by_timeframe: roiByTimeframe
        },
        cost_analysis: {
          avg_proefpakket_cost: journeys?.length ? journeys.reduce((sum, j) => sum + (j.proefpakket_cost || 0), 0) / journeys.length : 0,
          avg_shipping_cost: journeys?.length ? journeys.reduce((sum, j) => sum + (j.shipping_cost || 0), 0) / journeys.length : 0,
          avg_follow_up_cost: journeys?.length ? journeys.reduce((sum, j) => sum + (j.follow_up_cost || 0), 0) / journeys.length : 0,
          cost_per_conversion: journeys?.filter(j => j.status === 'converted').length 
            ? totalInvestment / journeys.filter(j => j.status === 'converted').length 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting ROI metrics:', error);
    throw error;
  }
}

async function getJourneyPerformance(period: string) {
  try {
    const supabase = getServiceRoleClient();

    // Get journey performance over time
    const { data: journeys, error } = await supabase
      .from('conversion_journeys')
      .select('*')
      .gte('initiated_at', getDateForPeriod(period))
      .order('initiated_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get journey performance: ${error.message}`);
    }

    // Group by time periods
    const performanceData = groupJourneysByPeriod(journeys || [], period);

    return NextResponse.json({
      success: true,
      data: {
        period,
        performance_timeline: performanceData,
        summary: {
          total_periods: performanceData.length,
          avg_journeys_per_period: performanceData.length 
            ? performanceData.reduce((sum, p) => sum + p.total_journeys, 0) / performanceData.length 
            : 0,
          avg_conversion_rate: performanceData.length 
            ? performanceData.reduce((sum, p) => sum + p.conversion_rate, 0) / performanceData.length 
            : 0,
          best_performing_period: performanceData.sort((a, b) => b.conversion_rate - a.conversion_rate)[0] || null,
          trend: calculateTrend(performanceData)
        }
      }
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting journey performance:', error);
    throw error;
  }
}

async function getTouchpointAnalysis(startDate?: string | null, endDate?: string | null) {
  try {
    const supabase = getServiceRoleClient();

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get touchpoint data
    const { data: touchpoints, error } = await supabase
      .from('conversion_touchpoints')
      .select(`
        *,
        conversion_journeys (
          status,
          conversion_completed_at
        )
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      throw new Error(`Failed to get touchpoints: ${error.message}`);
    }

    // Analyze touchpoint effectiveness
    const touchpointAnalysis = analyzeTouchpointEffectiveness(touchpoints || []);

    return NextResponse.json({
      success: true,
      data: touchpointAnalysis
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting touchpoint analysis:', error);
    throw error;
  }
}

async function getConversionFunnel(startDate?: string | null, endDate?: string | null) {
  try {
    const supabase = getServiceRoleClient();

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get funnel data
    const { data: journeys, error } = await supabase
      .from('conversion_journeys')
      .select('status, initiated_at, delivered_at, feedback_received_at, conversion_completed_at')
      .gte('initiated_at', start.toISOString())
      .lte('initiated_at', end.toISOString());

    if (error) {
      throw new Error(`Failed to get funnel data: ${error.message}`);
    }

    // Calculate funnel metrics
    const funnelSteps = calculateFunnelSteps(journeys || []);

    return NextResponse.json({
      success: true,
      data: {
        funnel_steps: funnelSteps,
        conversion_rates: calculateFunnelConversionRates(funnelSteps),
        drop_off_analysis: calculateDropOffAnalysis(funnelSteps)
      }
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting conversion funnel:', error);
    throw error;
  }
}

async function getFeedbackInsights(startDate?: string | null, endDate?: string | null) {
  try {
    const supabase = getServiceRoleClient();

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get feedback data
    const { data: feedback, error } = await supabase
      .from('proefpakket_feedback')
      .select(`
        *,
        conversion_journeys (
          status,
          conversion_completed_at,
          prospects (
            country,
            enrichment_score
          )
        )
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      throw new Error(`Failed to get feedback: ${error.message}`);
    }

    // Analyze feedback patterns
    const feedbackInsights = analyzeFeedbackPatterns(feedback || []);

    return NextResponse.json({
      success: true,
      data: feedbackInsights
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting feedback insights:', error);
    throw error;
  }
}

async function getRulePerformance() {
  try {
    const supabase = getServiceRoleClient();

    // Get rule performance data
    const { data: rules, error } = await supabase
      .from('conversion_rules')
      .select('*')
      .order('conversion_rate', { ascending: false });

    if (error) {
      throw new Error(`Failed to get rule performance: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        rules: rules || [],
        top_performing_rules: rules?.slice(0, 5) || [],
        rules_needing_optimization: rules?.filter(r => r.executions_count > 10 && r.conversion_rate < 5) || []
      }
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting rule performance:', error);
    throw error;
  }
}

async function getCohortAnalysis(period: string) {
  try {
    const supabase = getServiceRoleClient();

    // Get cohort data (simplified cohort analysis)
    const { data: journeys, error } = await supabase
      .from('conversion_journeys')
      .select('initiated_at, status, conversion_completed_at, days_to_conversion')
      .gte('initiated_at', getDateForPeriod(period))
      .order('initiated_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get cohort data: ${error.message}`);
    }

    // Calculate cohort analysis
    const cohortData = calculateCohortAnalysis(journeys || [], period);

    return NextResponse.json({
      success: true,
      data: cohortData
    });

  } catch (error) {
    console.error('[Conversion Analytics] Error getting cohort analysis:', error);
    throw error;
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function calculateROIByDimension(journeys: any[], dimension: string): any[] {
  const groups = journeys.reduce((acc, journey) => {
    let key;
    if (dimension === 'status') {
      key = journey.status;
    } else if (dimension === 'country') {
      key = journey.prospects?.country || 'Unknown';
    }
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(journey);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(groups).map(([key, groupJourneys]) => {
    const totalCost = groupJourneys.reduce((sum, j) => sum + (j.total_cost || 0), 0);
    const totalRevenue = groupJourneys.filter(j => j.status === 'converted').reduce((sum, j) => sum + (j.actual_ltv || 0), 0);
    const netProfit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      [dimension]: key,
      journey_count: groupJourneys.length,
      total_cost: totalCost,
      total_revenue: totalRevenue,
      net_profit: netProfit,
      roi_percentage: roi,
      conversion_count: groupJourneys.filter(j => j.status === 'converted').length,
      conversion_rate: (groupJourneys.filter(j => j.status === 'converted').length / groupJourneys.length) * 100
    };
  });
}

function calculateROIByEnrichmentScore(journeys: any[]): any[] {
  const scoreRanges = [
    { min: 90, max: 100, label: '90-100' },
    { min: 80, max: 89, label: '80-89' },
    { min: 70, max: 79, label: '70-79' },
    { min: 0, max: 69, label: '0-69' }
  ];

  return scoreRanges.map(range => {
    const rangeJourneys = journeys.filter(j => {
      const score = j.prospects?.enrichment_score || 0;
      return score >= range.min && score <= range.max;
    });

    const totalCost = rangeJourneys.reduce((sum, j) => sum + (j.total_cost || 0), 0);
    const totalRevenue = rangeJourneys.filter(j => j.status === 'converted').reduce((sum, j) => sum + (j.actual_ltv || 0), 0);
    const netProfit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      enrichment_score_range: range.label,
      journey_count: rangeJourneys.length,
      total_cost: totalCost,
      total_revenue: totalRevenue,
      net_profit: netProfit,
      roi_percentage: roi,
      conversion_count: rangeJourneys.filter(j => j.status === 'converted').length,
      conversion_rate: rangeJourneys.length > 0 ? (rangeJourneys.filter(j => j.status === 'converted').length / rangeJourneys.length) * 100 : 0
    };
  });
}

function calculateROIByTimeframe(journeys: any[]): any[] {
  // Group by month
  const monthlyData = journeys.reduce((acc, journey) => {
    const month = new Date(journey.initiated_at).toISOString().slice(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(journey);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(monthlyData).map(([month, monthJourneys]) => {
    const totalCost = monthJourneys.reduce((sum, j) => sum + (j.total_cost || 0), 0);
    const totalRevenue = monthJourneys.filter(j => j.status === 'converted').reduce((sum, j) => sum + (j.actual_ltv || 0), 0);
    const netProfit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      month,
      journey_count: monthJourneys.length,
      total_cost: totalCost,
      total_revenue: totalRevenue,
      net_profit: netProfit,
      roi_percentage: roi,
      conversion_count: monthJourneys.filter(j => j.status === 'converted').length,
      conversion_rate: (monthJourneys.filter(j => j.status === 'converted').length / monthJourneys.length) * 100
    };
  }).sort((a, b) => a.month.localeCompare(b.month));
}

function getDateForPeriod(period: string): string {
  const now = new Date();
  let daysBack = 30;

  switch (period) {
    case 'week':
      daysBack = 7;
      break;
    case 'month':
      daysBack = 30;
      break;
    case 'quarter':
      daysBack = 90;
      break;
    case 'year':
      daysBack = 365;
      break;
  }

  const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function groupJourneysByPeriod(journeys: any[], period: string): any[] {
  // Simplified grouping by period
  const groups = journeys.reduce((acc, journey) => {
    let key;
    const date = new Date(journey.initiated_at);
    
    if (period === 'day') {
      key = date.toISOString().slice(0, 10);
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = date.toISOString().slice(0, 7);
    }

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(journey);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(groups).map(([period, periodJourneys]) => {
    const conversions = periodJourneys.filter(j => j.status === 'converted').length;
    const conversionRate = periodJourneys.length > 0 ? (conversions / periodJourneys.length) * 100 : 0;

    return {
      period,
      total_journeys: periodJourneys.length,
      conversions,
      conversion_rate: conversionRate,
      avg_days_to_conversion: periodJourneys.filter(j => j.days_to_conversion).length > 0 
        ? periodJourneys.filter(j => j.days_to_conversion).reduce((sum, j) => sum + j.days_to_conversion, 0) / periodJourneys.filter(j => j.days_to_conversion).length 
        : 0
    };
  }).sort((a, b) => a.period.localeCompare(b.period));
}

function calculateTrend(data: any[]): string {
  if (data.length < 2) return 'insufficient_data';
  
  const recent = data.slice(-3);
  const earlier = data.slice(0, Math.max(1, data.length - 3));
  
  const recentAvg = recent.reduce((sum, d) => sum + d.conversion_rate, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + d.conversion_rate, 0) / earlier.length;
  
  if (recentAvg > earlierAvg * 1.1) return 'improving';
  if (recentAvg < earlierAvg * 0.9) return 'declining';
  return 'stable';
}

function analyzeTouchpointEffectiveness(touchpoints: any[]): any {
  // Group touchpoints by type and analyze their effectiveness
  const touchpointGroups = touchpoints.reduce((acc, tp) => {
    if (!acc[tp.touchpoint_type]) {
      acc[tp.touchpoint_type] = [];
    }
    acc[tp.touchpoint_type].push(tp);
    return acc;
  }, {} as Record<string, any[]>);

  const analysis = Object.entries(touchpointGroups).map(([type, typeTouchpoints]) => {
    const withResponse = typeTouchpoints.filter(tp => tp.response_received);
    const leadingToConversion = typeTouchpoints.filter(tp => 
      tp.conversion_journeys?.status === 'converted'
    );

    return {
      touchpoint_type: type,
      total_touchpoints: typeTouchpoints.length,
      response_rate: typeTouchpoints.length > 0 ? (withResponse.length / typeTouchpoints.length) * 100 : 0,
      conversion_rate: typeTouchpoints.length > 0 ? (leadingToConversion.length / typeTouchpoints.length) * 100 : 0,
      avg_conversion_contribution: typeTouchpoints.length > 0 
        ? typeTouchpoints.reduce((sum, tp) => sum + (tp.conversion_contribution || 0), 0) / typeTouchpoints.length 
        : 0,
      avg_response_time: withResponse.length > 0 
        ? withResponse.reduce((sum, tp) => sum + (tp.response_time_minutes || 0), 0) / withResponse.length 
        : null
    };
  });

  return {
    by_type: analysis,
    summary: {
      total_touchpoints: touchpoints.length,
      overall_response_rate: touchpoints.length > 0 
        ? (touchpoints.filter(tp => tp.response_received).length / touchpoints.length) * 100 
        : 0,
      most_effective_type: analysis.sort((a, b) => b.conversion_rate - a.conversion_rate)[0]?.touchpoint_type || null,
      least_effective_type: analysis.sort((a, b) => a.conversion_rate - b.conversion_rate)[0]?.touchpoint_type || null
    }
  };
}

function calculateFunnelSteps(journeys: any[]): any[] {
  const steps = [
    { name: 'Initiated', filter: (j: any) => true },
    { name: 'Proefpakket Sent', filter: (j: any) => j.proefpakket_sent_at },
    { name: 'Delivered', filter: (j: any) => j.delivered_at || j.status === 'delivered' },
    { name: 'Feedback Received', filter: (j: any) => j.feedback_received_at },
    { name: 'Interested', filter: (j: any) => ['interested', 'application_started', 'application_submitted', 'converted'].includes(j.status) },
    { name: 'Application Started', filter: (j: any) => ['application_started', 'application_submitted', 'converted'].includes(j.status) },
    { name: 'Converted', filter: (j: any) => j.status === 'converted' }
  ];

  return steps.map(step => ({
    step_name: step.name,
    count: journeys.filter(step.filter).length,
    percentage: journeys.length > 0 ? (journeys.filter(step.filter).length / journeys.length) * 100 : 0
  }));
}

function calculateFunnelConversionRates(steps: any[]): any[] {
  return steps.map((step, index) => {
    if (index === 0) {
      return { ...step, conversion_rate_from_previous: 100 };
    }
    
    const previousStep = steps[index - 1];
    const conversionRate = previousStep.count > 0 ? (step.count / previousStep.count) * 100 : 0;
    
    return {
      ...step,
      conversion_rate_from_previous: conversionRate
    };
  });
}

function calculateDropOffAnalysis(steps: any[]): any[] {
  return steps.map((step, index) => {
    if (index === steps.length - 1) {
      return { ...step, drop_off_count: 0, drop_off_rate: 0 };
    }
    
    const nextStep = steps[index + 1];
    const dropOffCount = step.count - nextStep.count;
    const dropOffRate = step.count > 0 ? (dropOffCount / step.count) * 100 : 0;
    
    return {
      ...step,
      drop_off_count: dropOffCount,
      drop_off_rate: dropOffRate
    };
  });
}

function analyzeFeedbackPatterns(feedback: any[]): any {
  const totalFeedback = feedback.length;
  
  const avgRatings = {
    overall: feedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / totalFeedback || 0,
    product_quality: feedback.reduce((sum, f) => sum + (f.product_quality_rating || 0), 0) / totalFeedback || 0,
    packaging: feedback.reduce((sum, f) => sum + (f.packaging_rating || 0), 0) / totalFeedback || 0,
    delivery: feedback.reduce((sum, f) => sum + (f.delivery_rating || 0), 0) / totalFeedback || 0
  };

  const interestStats = {
    interested_count: feedback.filter(f => f.interested_in_partnership).length,
    interest_rate: totalFeedback > 0 ? (feedback.filter(f => f.interested_in_partnership).length / totalFeedback) * 100 : 0
  };

  const sentimentAnalysis = {
    positive: feedback.filter(f => (f.overall_rating || 0) >= 4).length,
    neutral: feedback.filter(f => (f.overall_rating || 0) === 3).length,
    negative: feedback.filter(f => (f.overall_rating || 0) <= 2).length
  };

  return {
    summary: {
      total_feedback: totalFeedback,
      avg_ratings: avgRatings,
      interest_stats: interestStats,
      sentiment_distribution: sentimentAnalysis
    },
    conversion_correlation: {
      high_rating_conversion_rate: calculateConversionRateByRating(feedback, 4, 5),
      medium_rating_conversion_rate: calculateConversionRateByRating(feedback, 3, 3),
      low_rating_conversion_rate: calculateConversionRateByRating(feedback, 1, 2)
    }
  };
}

function calculateConversionRateByRating(feedback: any[], minRating: number, maxRating: number): number {
  const filteredFeedback = feedback.filter(f => 
    (f.overall_rating || 0) >= minRating && (f.overall_rating || 0) <= maxRating
  );
  
  const conversions = filteredFeedback.filter(f => 
    f.conversion_journeys?.status === 'converted'
  ).length;
  
  return filteredFeedback.length > 0 ? (conversions / filteredFeedback.length) * 100 : 0;
}

function calculateCohortAnalysis(journeys: any[], period: string): any {
  // Simplified cohort analysis - group by initiation month and track conversion over time
  const cohorts = journeys.reduce((acc, journey) => {
    const cohortMonth = new Date(journey.initiated_at).toISOString().slice(0, 7);
    if (!acc[cohortMonth]) {
      acc[cohortMonth] = [];
    }
    acc[cohortMonth].push(journey);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(cohorts).map(([month, cohortJourneys]) => {
    const totalJourneys = cohortJourneys.length;
    const conversions = cohortJourneys.filter(j => j.status === 'converted').length;
    const avgDaysToConversion = cohortJourneys.filter(j => j.days_to_conversion).length > 0
      ? cohortJourneys.filter(j => j.days_to_conversion).reduce((sum, j) => sum + j.days_to_conversion, 0) / cohortJourneys.filter(j => j.days_to_conversion).length
      : null;

    return {
      cohort_month: month,
      total_journeys: totalJourneys,
      conversions,
      conversion_rate: totalJourneys > 0 ? (conversions / totalJourneys) * 100 : 0,
      avg_days_to_conversion: avgDaysToConversion
    };
  }).sort((a, b) => a.cohort_month.localeCompare(b.cohort_month));
}

// Placeholder functions for POST actions
async function calculateCustomMetrics(params: any) {
  return NextResponse.json({
    success: true,
    message: 'Custom metrics calculation not yet implemented',
    data: params
  });
}

async function exportAnalyticsData(params: any) {
  return NextResponse.json({
    success: true,
    message: 'Data export not yet implemented',
    data: params
  });
}

async function updateAnalyticsCache(params: any) {
  return NextResponse.json({
    success: true,
    message: 'Analytics cache update not yet implemented',
    data: params
  });
} 