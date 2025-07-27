import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * POST /api/commercial/campaigns/toggle
 * Toggle email campaigns on/off with optional reason
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[EmailCampaignToggle] Toggle request received...');
    
    const body = await request.json();
    const { enabled, reason } = body;
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled parameter must be a boolean' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Create or update toggle setting
    const { data: existingSetting, error: checkError } = await supabase
      .from('commercial_automation_settings')
      .select('id')
      .eq('setting_name', 'email_campaigns')
      .single();
    
    let updateResult;
    if (existingSetting) {
      // Update existing setting
      const { data, error } = await supabase
        .from('commercial_automation_settings')
        .update({
          email_campaigns_enabled: enabled,
          last_updated: new Date().toISOString(),
          notes: reason || null
        })
        .eq('setting_name', 'email_campaigns')
        .select()
        .single();
      
      updateResult = { data, error };
    } else {
      // Create new setting
      const { data, error } = await supabase
        .from('commercial_automation_settings')
        .insert({
          setting_name: 'email_campaigns',
          email_campaigns_enabled: enabled,
          last_updated: new Date().toISOString(),
          notes: reason || null
        })
        .select()
        .single();
      
      updateResult = { data, error };
    }
    
    if (updateResult.error) {
      console.error('[EmailCampaignToggle] Database error:', updateResult.error);
      return NextResponse.json(
        { error: 'Failed to update email campaign setting' },
        { status: 500 }
      );
    }

    // If enabling campaigns, check for ready prospects and queue initial emails
    let statistics = {
      active_campaigns: 0,
      queued_emails: 0,
      prospects_ready: 0,
      last_sent: null
    };

    if (enabled) {
      console.log('[EmailCampaignToggle] Email campaigns enabled - checking for prospects to queue...');
      
      // Get prospects ready for initial outreach
      const { data: readyProspects, error: prospectsError } = await supabase
        .from('commercial_prospects')
        .select('id, business_name, business_segment, email')
        .eq('status', 'qualified')
        .is('initial_outreach_date', null)
        .limit(50); // Limit initial batch

      if (!prospectsError && readyProspects && readyProspects.length > 0) {
        console.log(`[EmailCampaignToggle] Found ${readyProspects.length} prospects ready for initial outreach`);
        
        // Get active campaigns
        const { data: campaigns, error: campaignsError } = await supabase
          .from('commercial_email_campaigns')
          .select('id, campaign_name, business_segment')
          .eq('status', 'active');

        if (!campaignsError && campaigns && campaigns.length > 0) {
          // Queue initial emails for prospects
          let emailsQueued = 0;
          
          for (const prospect of readyProspects) {
            // Find matching campaign for prospect's segment
            const campaign = campaigns.find(c => c.business_segment === prospect.business_segment);
            
            if (campaign) {
              // Schedule initial email with random delay (0-60 minutes)
              const scheduledTime = new Date();
              scheduledTime.setMinutes(scheduledTime.getMinutes() + Math.floor(Math.random() * 60));

              const { error: queueError } = await supabase
                .from('commercial_email_queue')
                .insert({
                  prospect_id: prospect.id,
                  campaign_id: campaign.id,
                  campaign_step: 'initial',
                  scheduled_at: scheduledTime.toISOString(),
                  priority: 5,
                  status: 'pending',
                  personalized_subject: `Exclusieve kans voor ${prospect.business_name}`,
                  personalized_html: `<p>Beste ${prospect.business_name},</p><p>We hebben een speciaal aanbod voor uw bedrijf...</p>`,
                  personalized_text: `Beste ${prospect.business_name}, We hebben een speciaal aanbod voor uw bedrijf...`
                });

              if (!queueError) {
                emailsQueued++;
              }
            }
          }
          
          console.log(`[EmailCampaignToggle] Queued ${emailsQueued} initial emails`);
        }
      }
    }

    // Get updated statistics
    const { data: campaigns } = await supabase
      .from('commercial_email_campaigns')
      .select('id')
      .eq('status', 'active');

    const { data: queuedEmails } = await supabase
      .from('commercial_email_queue')
      .select('id')
      .eq('status', 'pending');

    const { data: prospectsReady } = await supabase
      .from('commercial_prospects')
      .select('id')
      .eq('status', 'qualified')
      .is('initial_outreach_date', null);

    const { data: lastSent } = await supabase
      .from('commercial_email_queue')
      .select('sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    statistics = {
      active_campaigns: campaigns?.length || 0,
      queued_emails: queuedEmails?.length || 0,
      prospects_ready: prospectsReady?.length || 0,
      last_sent: lastSent?.sent_at || null
    };

    const action = enabled ? 'geactiveerd' : 'gepauzeerd';
    const message = `Email campaigns ${action}${reason ? ` (${reason})` : ''}`;
    
    console.log('[EmailCampaignToggle] Toggle completed:', {
      enabled,
      reason,
      statistics
    });

    return NextResponse.json({
      enabled,
      message,
      statistics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[EmailCampaignToggle] Error toggling campaigns:', error);
    return NextResponse.json(
      { 
        error: 'Failed to toggle email campaigns',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 