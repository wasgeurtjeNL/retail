import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * GET /api/commercial/campaigns/toggle-status
 * Returns current email campaign toggle status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[EmailCampaignToggle] Getting campaign toggle status...');
    
    const supabase = getServiceRoleClient();
    
    // Check if email campaigns are enabled in settings
    const { data: settings, error: settingsError } = await supabase
      .from('commercial_discovery_settings')
      .select('auto_discovery_enabled, discovery_frequency')
      .eq('is_active', true)
      .single();

    if (settingsError) {
      console.error('[EmailCampaignToggle] Settings error:', settingsError);
    }

    // Get email campaign toggle status from database
    const { data: toggleStatus, error: toggleError } = await supabase
      .from('commercial_automation_settings')
      .select('email_campaigns_enabled, last_updated, notes')
      .eq('setting_name', 'email_campaigns')
      .single();

    const emailCampaignsEnabled = toggleStatus?.email_campaigns_enabled ?? false;

    // Get active campaigns count
    const { data: campaigns, error: campaignsError } = await supabase
      .from('commercial_email_campaigns')
      .select('id, campaign_name, status')
      .eq('status', 'active');

    // Get queued emails count
    const { data: queuedEmails, error: queueError } = await supabase
      .from('commercial_email_queue')
      .select('id')
      .eq('status', 'pending');

    // Get prospects ready for email campaigns
    const { data: prospectsReady, error: prospectsError } = await supabase
      .from('commercial_prospects')
      .select('id')
      .eq('status', 'qualified')
      .is('initial_outreach_date', null);

    // Get last sent email timestamp
    const { data: lastSent, error: lastSentError } = await supabase
      .from('commercial_email_queue')
      .select('sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    const statistics = {
      active_campaigns: campaigns?.length || 0,
      queued_emails: queuedEmails?.length || 0,
      prospects_ready: prospectsReady?.length || 0,
      last_sent: lastSent?.sent_at || null
    };

    console.log('[EmailCampaignToggle] Status retrieved:', {
      enabled: emailCampaignsEnabled,
      campaigns_configured: (campaigns?.length || 0) > 0,
      statistics
    });

    return NextResponse.json({
      enabled: emailCampaignsEnabled,
      campaigns_configured: (campaigns?.length || 0) > 0,
      statistics,
      last_updated: toggleStatus?.last_updated || null,
      notes: toggleStatus?.notes || null
    });

  } catch (error) {
    console.error('[EmailCampaignToggle] Error getting toggle status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get email campaign toggle status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 