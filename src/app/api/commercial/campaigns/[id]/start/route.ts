import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';

// Start campaign for specific prospects
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const campaignId = params.id;
    const { prospect_ids, segment_filter, send_immediately = false } = body;
    
    const supabase = getServiceRoleClient();
    
    // Validate campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('commercial_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('active', true)
      .single();
    
    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or inactive' },
        { status: 404 }
      );
    }
    
    // Get prospects to target
    let query = supabase
      .from('commercial_prospects')
      .select('id, business_name, email, business_segment, status')
      .eq('status', 'qualified'); // Only send to qualified prospects
    
    if (prospect_ids && Array.isArray(prospect_ids) && prospect_ids.length > 0) {
      query = query.in('id', prospect_ids);
    } else if (segment_filter) {
      query = query.eq('business_segment', segment_filter);
    } else if (campaign.business_segment) {
      query = query.eq('business_segment', campaign.business_segment);
    }
    
    const { data: prospects, error: prospectsError } = await query;
    
    if (prospectsError) {
      console.error('[CampaignAPI] Error fetching prospects:', prospectsError);
      return NextResponse.json(
        { error: 'Failed to fetch prospects' },
        { status: 500 }
      );
    }
    
    if (!prospects || prospects.length === 0) {
      return NextResponse.json(
        { error: 'No eligible prospects found' },
        { status: 400 }
      );
    }
    
    // Initialize campaign service
    const emailCampaignService = new EmailCampaignService();
    const results = [];
    
    // Schedule initial outreach for each prospect
    for (const prospect of prospects) {
      try {
        await emailCampaignService.scheduleInitialOutreach(prospect.id, campaignId);
        
        results.push({
          prospect_id: prospect.id,
          business_name: prospect.business_name,
          email: prospect.email,
          status: 'scheduled'
        });
        
        console.log(`[CampaignAPI] Scheduled outreach for ${prospect.business_name} (${prospect.email})`);
        
      } catch (error) {
        console.error(`[CampaignAPI] Failed to schedule outreach for ${prospect.id}:`, error);
        
        results.push({
          prospect_id: prospect.id,
          business_name: prospect.business_name,
          email: prospect.email,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Update campaign statistics
    const successCount = results.filter(r => r.status === 'scheduled').length;
    
    if (successCount > 0) {
      await supabase
        .from('commercial_email_campaigns')
        .update({
          total_sent: (campaign.total_sent || 0) + successCount
        })
        .eq('id', campaignId);
    }
    
    console.log(`[CampaignAPI] Campaign ${campaignId} started for ${successCount}/${prospects.length} prospects`);
    
    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      prospects_targeted: prospects.length,
      emails_scheduled: successCount,
      results
    });
    
  } catch (error) {
    console.error('[CampaignAPI] Error in POST /api/commercial/campaigns/[id]/start:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}