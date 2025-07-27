import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

// Get campaign statistics and performance
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceRoleClient();
    const campaignId = params.id;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, all
    
    // Get campaign basic info
    const { data: campaign, error: campaignError } = await supabase
      .from('commercial_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    // Calculate date filter based on period
    let dateFilter = '';
    const now = new Date();
    
    switch (period) {
      case '1d':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        dateFilter = '1900-01-01'; // All time
    }
    
    // Get email queue statistics
    const { data: queueStats, error: queueError } = await supabase
      .from('commercial_email_queue')
      .select('status, sent_at, opened_at, clicked_at, unsubscribed_at')
      .eq('campaign_id', campaignId)
      .gte('created_at', dateFilter);
    
    if (queueError) {
      console.error('[CampaignAPI] Error fetching queue stats:', queueError);
      return NextResponse.json(
        { error: 'Failed to fetch campaign statistics' },
        { status: 500 }
      );
    }
    
    // Calculate metrics
    const totalEmails = queueStats?.length || 0;
    const sentEmails = queueStats?.filter(email => email.sent_at).length || 0;
    const openedEmails = queueStats?.filter(email => email.opened_at).length || 0;
    const clickedEmails = queueStats?.filter(email => email.clicked_at).length || 0;
    const unsubscribedEmails = queueStats?.filter(email => email.unsubscribed_at).length || 0;
    
    // Calculate rates
    const deliveryRate = sentEmails > 0 ? (sentEmails / totalEmails) * 100 : 0;
    const openRate = sentEmails > 0 ? (openedEmails / sentEmails) * 100 : 0;
    const clickRate = sentEmails > 0 ? (clickedEmails / sentEmails) * 100 : 0;
    const unsubscribeRate = sentEmails > 0 ? (unsubscribedEmails / sentEmails) * 100 : 0;
    
    // Get tracking events for detailed analytics
    const { data: trackingEvents, error: trackingError } = await supabase
      .from('commercial_email_tracking')
      .select('event_type, event_timestamp, device_type, email_client')
      .in('email_queue_id', queueStats?.map(q => q.id) || [])
      .gte('event_timestamp', dateFilter)
      .order('event_timestamp', { ascending: false });
    
    // Get daily performance data for charts
    const { data: dailyPerformance, error: dailyError } = await supabase
      .from('commercial_campaign_performance')
      .select('*')
      .eq('campaign_id', campaignId)
      .gte('date', dateFilter.split('T')[0]) // Date only
      .order('date', { ascending: true });
    
    // Process tracking events by type
    const eventsByType = trackingEvents?.reduce((acc: any, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {}) || {};
    
    // Process events by device type
    const eventsByDevice = trackingEvents?.reduce((acc: any, event) => {
      if (event.device_type) {
        acc[event.device_type] = (acc[event.device_type] || 0) + 1;
      }
      return acc;
    }, {}) || {};
    
    // Process events by email client
    const eventsByClient = trackingEvents?.reduce((acc: any, event) => {
      if (event.email_client) {
        acc[event.email_client] = (acc[event.email_client] || 0) + 1;
      }
      return acc;
    }, {}) || {};
    
    // Calculate conversions (prospects that clicked and went to landing page)
    const { data: conversions, error: conversionError } = await supabase
      .from('commercial_prospects')
      .select('id, status')
      .eq('status', 'registered') // Assuming 'registered' means they converted
      .in('id', queueStats?.map(q => q.prospect_id) || []);
    
    const conversionCount = conversions?.length || 0;
    const conversionRate = sentEmails > 0 ? (conversionCount / sentEmails) * 100 : 0;
    
    const stats = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        business_segment: campaign.business_segment,
        active: campaign.active,
        created_at: campaign.created_at
      },
      period,
      overview: {
        total_emails: totalEmails,
        sent_emails: sentEmails,
        opened_emails: openedEmails,
        clicked_emails: clickedEmails,
        unsubscribed_emails: unsubscribedEmails,
        conversions: conversionCount
      },
      rates: {
        delivery_rate: Math.round(deliveryRate * 100) / 100,
        open_rate: Math.round(openRate * 100) / 100,
        click_rate: Math.round(clickRate * 100) / 100,
        unsubscribe_rate: Math.round(unsubscribeRate * 100) / 100,
        conversion_rate: Math.round(conversionRate * 100) / 100
      },
      breakdown: {
        by_event_type: eventsByType,
        by_device: eventsByDevice,
        by_email_client: eventsByClient
      },
      daily_performance: dailyPerformance || [],
      recent_events: trackingEvents?.slice(0, 20) || []
    };
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('[CampaignAPI] Error in GET /api/commercial/campaigns/[id]/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}