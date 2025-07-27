// =====================================================
// CAMPAIGN SCHEDULER - Automated Email Sequences
// Handles scheduling and automation of email campaigns
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { EmailCampaignService } from './commercial-email-campaign';
import { QueueManager } from './queue-manager';

export interface SchedulerOptions {
  checkInterval: number; // in milliseconds
  maxProcessingTime: number; // in milliseconds
  batchSize: number; // number of prospects to process at once
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'new_prospect' | 'time_based' | 'behavior_based' | 'segment_change';
  conditions: Record<string, any>;
  actions: AutomationAction[];
  created_at: string;
}

export interface AutomationAction {
  type: 'send_email' | 'delay' | 'update_status' | 'add_to_campaign';
  parameters: Record<string, any>;
  delay_hours?: number;
}

export class CampaignScheduler {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private queueManager: QueueManager;
  private emailCampaignService: EmailCampaignService;
  private options: SchedulerOptions;
  
  constructor(options: Partial<SchedulerOptions> = {}) {
    this.options = {
      checkInterval: 60000, // 1 minute
      maxProcessingTime: 300000, // 5 minutes
      batchSize: 10,
      ...options
    };
    
    this.queueManager = QueueManager.getInstance();
    this.emailCampaignService = new EmailCampaignService();
    
    console.log('[CampaignScheduler] Initialized with options:', this.options);
  }

  /**
   * Start the campaign scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[CampaignScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[CampaignScheduler] Starting automated campaign scheduler');

    // Start periodic check
    this.intervalId = setInterval(async () => {
      try {
        await this.processScheduledCampaigns();
      } catch (error) {
        console.error('[CampaignScheduler] Error in scheduled processing:', error);
      }
    }, this.options.checkInterval);

    // Run initial check
    await this.processScheduledCampaigns();
    
    console.log('[CampaignScheduler] Scheduler started successfully');
  }

  /**
   * Stop the campaign scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('[CampaignScheduler] Not running');
      return;
    }

    this.isRunning = false;
    console.log('[CampaignScheduler] Stopping scheduler');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('[CampaignScheduler] Scheduler stopped');
  }

  /**
   * Process scheduled campaigns and automation rules
   */
  private async processScheduledCampaigns(): Promise<void> {
    const startTime = Date.now();
    console.log('[CampaignScheduler] Starting scheduled campaign processing');

    try {
      const supabase = getServiceRoleClient();
      
      // 1. Process new prospects for automatic enrollment
      await this.processNewProspects();
      
      // 2. Process follow-up sequences
      await this.processFollowUpSequences();
      
      // 3. Process behavior-based triggers
      await this.processBehaviorTriggers();
      
      // 4. Process time-based automation rules
      await this.processAutomationRules();
      
      const processingTime = Date.now() - startTime;
      console.log(`[CampaignScheduler] Completed processing in ${processingTime}ms`);
      
    } catch (error) {
      console.error('[CampaignScheduler] Error processing scheduled campaigns:', error);
    }
  }

  /**
   * Process new prospects for automatic campaign enrollment
   */
  private async processNewProspects(): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Get prospects that are qualified but haven't been contacted yet
      const { data: prospects, error } = await supabase
        .from('commercial_prospects')
        .select('id, business_name, business_segment, email, created_at')
        .eq('status', 'qualified')
        .is('last_contact_at', null)
        .order('created_at', { ascending: true })
        .limit(this.options.batchSize);
      
      if (error) {
        console.error('[CampaignScheduler] Error fetching new prospects:', error);
        return;
      }
      
      if (!prospects || prospects.length === 0) {
        return;
      }
      
      console.log(`[CampaignScheduler] Processing ${prospects.length} new prospects`);
      
      for (const prospect of prospects) {
        try {
          // Find appropriate campaign for this prospect's segment
          const { data: campaign } = await supabase
            .from('commercial_email_campaigns')
            .select('id, name')
            .eq('business_segment', prospect.business_segment)
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (campaign) {
            // Schedule initial outreach
            await this.emailCampaignService.scheduleInitialOutreach(
              prospect.id, 
              campaign.id
            );
            
            // Update prospect status
            await supabase
              .from('commercial_prospects')
              .update({ 
                status: 'contacted',
                last_contact_at: new Date().toISOString()
              })
              .eq('id', prospect.id);
            
            console.log(`[CampaignScheduler] Enrolled ${prospect.business_name} in campaign ${campaign.name}`);
          } else {
            console.warn(`[CampaignScheduler] No active campaign found for segment: ${prospect.business_segment}`);
          }
          
        } catch (error) {
          console.error(`[CampaignScheduler] Error processing prospect ${prospect.id}:`, error);
        }
      }
      
    } catch (error) {
      console.error('[CampaignScheduler] Error in processNewProspects:', error);
    }
  }

  /**
   * Process follow-up email sequences based on prospect behavior
   */
  private async processFollowUpSequences(): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Find prospects that need follow-up emails
      // 1. Email sent but not opened after 3 days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: unopenedEmails, error: unopenedError } = await supabase
        .from('commercial_email_queue')
        .select('prospect_id, campaign_id, campaign_step, sent_at')
        .eq('status', 'sent')
        .is('opened_at', null)
        .lt('sent_at', threeDaysAgo)
        .eq('campaign_step', 'initial')
        .limit(this.options.batchSize);
      
      if (unopenedError) {
        console.error('[CampaignScheduler] Error fetching unopened emails:', unopenedError);
      } else if (unopenedEmails && unopenedEmails.length > 0) {
        console.log(`[CampaignScheduler] Processing ${unopenedEmails.length} unopened email follow-ups`);
        
        for (const email of unopenedEmails) {
          try {
            // Schedule follow-up email with different subject line
            await this.queueManager.addJob('email_campaign', email.prospect_id, {
              action: 'send_email',
              prospectId: email.prospect_id,
              campaignId: email.campaign_id,
              campaignStep: 'follow_up_1',
              trigger: 'no_open_3_days'
            }, {
              priority: 6
            });
            
            // Mark original email as processed for follow-up
            await supabase
              .from('commercial_email_queue')
              .update({ status: 'follow_up_scheduled' })
              .eq('prospect_id', email.prospect_id)
              .eq('campaign_step', 'initial');
            
          } catch (error) {
            console.error(`[CampaignScheduler] Error scheduling follow-up for prospect ${email.prospect_id}:`, error);
          }
        }
      }
      
      // 2. Email opened but not clicked after 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: unclickedEmails, error: unclickedError } = await supabase
        .from('commercial_email_queue')
        .select('prospect_id, campaign_id, campaign_step, opened_at')
        .eq('status', 'opened')
        .is('clicked_at', null)
        .lt('opened_at', sevenDaysAgo)
        .in('campaign_step', ['initial', 'follow_up_1'])
        .limit(this.options.batchSize);
      
      if (unclickedError) {
        console.error('[CampaignScheduler] Error fetching unclicked emails:', unclickedError);
      } else if (unclickedEmails && unclickedEmails.length > 0) {
        console.log(`[CampaignScheduler] Processing ${unclickedEmails.length} unclicked email follow-ups`);
        
        for (const email of unclickedEmails) {
          try {
            // Schedule social proof email
            await this.queueManager.addJob('email_campaign', email.prospect_id, {
              action: 'send_email',
              prospectId: email.prospect_id,
              campaignId: email.campaign_id,
              campaignStep: 'follow_up_2',
              trigger: 'opened_no_click_7_days'
            }, {
              priority: 5
            });
            
            // Mark original email as processed
            await supabase
              .from('commercial_email_queue')
              .update({ status: 'social_proof_scheduled' })
              .eq('prospect_id', email.prospect_id)
              .eq('campaign_step', email.campaign_step);
            
          } catch (error) {
            console.error(`[CampaignScheduler] Error scheduling social proof email for prospect ${email.prospect_id}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error('[CampaignScheduler] Error in processFollowUpSequences:', error);
    }
  }

  /**
   * Process behavior-based triggers
   */
  private async processBehaviorTriggers(): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Find prospects who clicked but didn't visit landing page
      const { data: clickedProspects, error: clickError } = await supabase
        .from('commercial_email_tracking')
        .select(`
          prospect_id,
          event_timestamp,
          commercial_prospects!inner(status, business_name)
        `)
        .eq('event_type', 'clicked')
        .eq('commercial_prospects.status', 'contacted')
        .gte('event_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(this.options.batchSize);
      
      if (clickError) {
        console.error('[CampaignScheduler] Error fetching clicked prospects:', clickError);
      } else if (clickedProspects && clickedProspects.length > 0) {
        console.log(`[CampaignScheduler] Processing ${clickedProspects.length} clicked prospect triggers`);
        
        for (const click of clickedProspects) {
          try {
            // Update prospect status to show interest
            await supabase
              .from('commercial_prospects')
              .update({ 
                status: 'interested',
                notes: 'Clicked email link - showing interest'
              })
              .eq('id', click.prospect_id);
            
            console.log(`[CampaignScheduler] Updated prospect ${click.prospect_id} status to interested`);
            
          } catch (error) {
            console.error(`[CampaignScheduler] Error processing click trigger for prospect ${click.prospect_id}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error('[CampaignScheduler] Error in processBehaviorTriggers:', error);
    }
  }

  /**
   * Process time-based automation rules
   */
  private async processAutomationRules(): Promise<void> {
    try {
      // This could be extended to process custom automation rules
      // For now, we handle the basic time-based sequences
      console.log('[CampaignScheduler] Processing automation rules (placeholder)');
      
    } catch (error) {
      console.error('[CampaignScheduler] Error in processAutomationRules:', error);
    }
  }

  /**
   * Get scheduler status and statistics
   */
  getStatus(): { isRunning: boolean; options: SchedulerOptions } {
    return {
      isRunning: this.isRunning,
      options: this.options
    };
  }

  /**
   * Schedule a prospect for immediate campaign enrollment
   */
  async enrollProspectInCampaign(prospectId: string, campaignId?: string): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Get prospect details
      const { data: prospect, error: prospectError } = await supabase
        .from('commercial_prospects')
        .select('business_segment, business_name')
        .eq('id', prospectId)
        .single();
      
      if (prospectError || !prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }
      
      // Determine campaign
      let targetCampaignId = campaignId;
      
      if (!targetCampaignId) {
        const { data: campaign } = await supabase
          .from('commercial_email_campaigns')
          .select('id')
          .eq('business_segment', prospect.business_segment)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        targetCampaignId = campaign?.id;
      }
      
      if (!targetCampaignId) {
        throw new Error(`No active campaign found for segment: ${prospect.business_segment}`);
      }
      
      // Schedule initial outreach
      await this.emailCampaignService.scheduleInitialOutreach(prospectId, targetCampaignId);
      
      console.log(`[CampaignScheduler] Manually enrolled ${prospect.business_name} in campaign ${targetCampaignId}`);
      
    } catch (error) {
      console.error('[CampaignScheduler] Error enrolling prospect in campaign:', error);
      throw error;
    }
  }
}

// Singleton instance
let campaignSchedulerInstance: CampaignScheduler | null = null;

export function getCampaignScheduler(options?: Partial<SchedulerOptions>): CampaignScheduler {
  if (!campaignSchedulerInstance) {
    campaignSchedulerInstance = new CampaignScheduler(options);
  }
  return campaignSchedulerInstance;
}

// Helper functions
export async function startCampaignScheduler(options?: Partial<SchedulerOptions>): Promise<void> {
  const scheduler = getCampaignScheduler(options);
  await scheduler.start();
}

export async function stopCampaignScheduler(): Promise<void> {
  if (campaignSchedulerInstance) {
    await campaignSchedulerInstance.stop();
  }
}