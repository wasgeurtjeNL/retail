import { getServiceRoleClient } from '@/lib/supabase';
import { QueueManager, type JobResult } from './queue-manager';
import { AIEmailOptimizer } from './ai-email-optimizer';
import { sendCommercialEmail } from './commercial-mail-service';

export interface EmailQueueItem {
  id?: string;
  prospect_id: string;
  template_id?: string;
  campaign_id: string;
  campaign_step: string;
  scheduled_at: Date;
  priority: number;
  personalized_subject: string;
  personalized_html: string;
  personalized_text?: string;
  tracking_pixel_id?: string;
  click_tracking_ids?: Record<string, string>;
  personalization_data?: Record<string, any>;
  utm_parameters?: Record<string, string>;
}

export interface CampaignStep {
  step: string;
  delay_hours: number;
  template_type: string;
  subject_template: string;
  priority: number;
  condition?: 'not_opened' | 'opened_not_clicked' | 'always';
}

export interface CommercialProspect {
  id: string;
  business_name: string;
  business_segment: string;
  contact_name?: string;
  email: string;
  phone?: string;
  city?: string;
  website?: string;
  lead_quality_score?: number;
  status: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  email_body_html: string;
  email_body_text?: string;
  business_segment: string;
  template_type: string;
  performance_score?: number;
}

export class EmailCampaignService {
  private queueManager: QueueManager;
  private aiOptimizer: AIEmailOptimizer;
  private supabase = getServiceRoleClient();

  constructor() {
    this.queueManager = QueueManager.getInstance();
    this.aiOptimizer = new AIEmailOptimizer();
  }

  /**
   * Schedule initial outreach email for a new prospect
   */
  async scheduleInitialOutreach(
    prospectId: string, 
    campaignId?: string
  ): Promise<void> {
    try {
      // Get prospect data
      const prospect = await this.getProspect(prospectId);
      if (!prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }

      // Determine campaign based on segment
      const campaign = campaignId || `default-${prospect.business_segment.replace('_', '-')}`;
      
      // Get campaign configuration
      const campaignConfig = await this.getCampaignConfig(campaign);
      if (!campaignConfig || !campaignConfig.active) {
        throw new Error(`Campaign not found or inactive: ${campaign}`);
      }

      // Get initial step
      const initialStep = campaignConfig.steps.find((step: CampaignStep) => step.step === 'initial');
      if (!initialStep) {
        throw new Error(`No initial step found in campaign: ${campaign}`);
      }

      // Calculate optimal send time
      const optimalTime = await this.calculateOptimalSendTime(prospect, campaignConfig);
      
      // Get best template for segment and step
      const template = await this.getBestTemplateForSegment(
        prospect.business_segment, 
        initialStep.template_type
      );

      // Schedule the email job
      await this.queueManager.addJob('email_campaign', prospectId, {
        action: 'send_email',
        prospectId,
        templateId: template?.id,
        campaignId: campaign,
        campaignStep: 'initial',
        scheduledFor: optimalTime.toISOString()
      }, {
        priority: initialStep.priority,
        scheduledAt: optimalTime
      });

      console.log(`[EmailCampaign] Scheduled initial outreach for ${prospect.business_name} at ${optimalTime.toISOString()}`);

    } catch (error) {
      console.error('[EmailCampaign] Error scheduling initial outreach:', error);
      throw error;
    }
  }

  /**
   * Process email sending job
   */
  async processEmailJob(job: any): Promise<JobResult> {
    const { prospectId, templateId, campaignId, campaignStep, scheduledFor } = job.input_data;
    
    try {
      // Get prospect and template data
      const prospect = await this.getProspect(prospectId);
      if (!prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }

      let template: EmailTemplate | null = null;
      if (templateId) {
        template = await this.getTemplate(templateId);
      } else {
        // Get best template for this step
        template = await this.getBestTemplateForSegment(
          prospect.business_segment,
          campaignStep === 'initial' ? 'invitation' : 'follow_up'
        );
      }

      if (!template) {
        throw new Error(`No suitable template found for ${prospect.business_segment}, step: ${campaignStep}`);
      }

      // Generate personalized content
      const personalized = await this.personalizeEmail(prospect, template, campaignStep);
      
      // Create tracking data
      const trackingData = this.generateTrackingData(prospect, campaignId, campaignStep);

      // Add to email queue
      const queueItem: EmailQueueItem = {
        prospect_id: prospectId,
        template_id: template.id,
        campaign_id: campaignId,
        campaign_step: campaignStep,
        scheduled_at: new Date(scheduledFor || Date.now()),
        priority: this.getStepPriority(campaignStep),
        personalized_subject: personalized.subject,
        personalized_html: personalized.html,
        personalized_text: personalized.text,
        tracking_pixel_id: trackingData.pixelId,
        click_tracking_ids: trackingData.clickIds,
        personalization_data: personalized.metadata,
        utm_parameters: trackingData.utmParams
      };

      await this.addToEmailQueue(queueItem);
      
      // Send email immediately if scheduled for now
      const now = new Date();
      const scheduledTime = new Date(scheduledFor || now);
      
      if (scheduledTime <= now) {
        const result = await this.sendQueuedEmail(queueItem);
        
        if (result.success) {
          // Update prospect status
          await this.updateProspectStatus(prospectId, 'contacted');
          
          // Schedule follow-up if configured
          await this.scheduleFollowUp(prospectId, campaignId, campaignStep);
          
          return { success: true, data: { emailSent: true, queueId: result.queueId } };
        } else {
          throw new Error(result.error || 'Email sending failed');
        }
      } else {
        return { success: true, data: { emailQueued: true, scheduledFor: scheduledTime.toISOString() } };
      }
      
    } catch (error) {
      console.error('[EmailCampaign] Error processing email job:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Send a queued email
   */
  private async sendQueuedEmail(queueItem: EmailQueueItem): Promise<{ success: boolean; error?: string; queueId?: string }> {
    try {
      // Update queue status to sending
      await this.updateQueueItemStatus(queueItem.id!, 'sending');

      // Get prospect for email address
      const prospect = await this.getProspect(queueItem.prospect_id);
      if (!prospect) {
        throw new Error('Prospect not found');
      }

      // Send email via mail service
      const result = await sendCommercialEmail({
        to: prospect.email,
        subject: queueItem.personalized_subject,
        html: queueItem.personalized_html,
        text: queueItem.personalized_text,
        trackingPixelId: queueItem.tracking_pixel_id,
        clickTrackingIds: queueItem.click_tracking_ids,
        utmParameters: queueItem.utm_parameters,
        campaignId: queueItem.campaign_id,
        prospectId: queueItem.prospect_id
      });

      if (result.success) {
        // Update queue status to sent
        await this.updateQueueItemStatus(queueItem.id!, 'sent', {
          sent_at: new Date(),
          provider_message_id: result.messageId
        });

        // Log tracking event
        await this.logTrackingEvent(queueItem.id!, queueItem.prospect_id, 'sent', {
          provider_message_id: result.messageId
        });

        return { success: true, queueId: queueItem.id };
      } else {
        throw new Error(result.error || 'Email delivery failed');
      }

    } catch (error) {
      console.error('[EmailCampaign] Error sending queued email:', error);
      
      // Update queue status to failed
      await this.updateQueueItemStatus(queueItem.id!, 'failed', {
        error_message: error instanceof Error ? error.message : String(error),
        retry_count: (queueItem.retry_count || 0) + 1
      });

      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Personalize email content for prospect
   */
  private async personalizeEmail(
    prospect: CommercialProspect, 
    template: EmailTemplate,
    campaignStep: string
  ): Promise<{ subject: string; html: string; text: string; metadata: Record<string, any> }> {
    try {
      // Basic template variable substitution
      let subject = template.subject;
      let html = template.email_body_html;
      let text = template.email_body_text || '';

      // Replace basic variables
      const variables = {
        business_name: prospect.business_name,
        contact_name: prospect.contact_name || 'daar',
        city: prospect.city || 'uw regio',
        business_segment: prospect.business_segment,
        first_name: prospect.contact_name?.split(' ')[0] || 'daar'
      };

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        html = html.replace(regex, value);
        text = text.replace(regex, value);
      }

      // AI enhancement for higher-value prospects or underperforming templates
      const shouldEnhance = prospect.lead_quality_score && prospect.lead_quality_score > 0.7;
      
      if (shouldEnhance) {
        try {
          const aiEnhanced = await this.aiOptimizer.personalizeContent(
            prospect,
            { subject, html, text },
            campaignStep
          );
          
          if (aiEnhanced.subject) subject = aiEnhanced.subject;
          if (aiEnhanced.html) html = aiEnhanced.html;
          if (aiEnhanced.text) text = aiEnhanced.text;
        } catch (aiError) {
          console.warn('[EmailCampaign] AI personalization failed, using template:', aiError);
        }
      }

      return {
        subject,
        html,
        text,
        metadata: {
          template_id: template.id,
          prospect_segment: prospect.business_segment,
          campaign_step: campaignStep,
          ai_enhanced: shouldEnhance,
          variables_used: variables
        }
      };

    } catch (error) {
      console.error('[EmailCampaign] Error personalizing email:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal send time based on prospect and campaign settings
   */
  private async calculateOptimalSendTime(
    prospect: CommercialProspect, 
    campaignConfig: any
  ): Promise<Date> {
    const now = new Date();
    let optimalTime = new Date(now);

    // Business segment optimal times
    const segmentOptimalHours: Record<string, number[]> = {
      'beauty_salon': [10, 14, 16], // Mid-morning, early afternoon, late afternoon
      'hair_salon': [9, 13, 15],
      'hotel_bnb': [9, 14, 17], // Morning check-in prep, afternoon, early evening
      'restaurant': [11, 15], // Between service times
      'wellness_spa': [10, 14, 16],
      'cleaning_service': [8, 13, 17], // Early morning, lunch, end of day
      'laundromat': [9, 14, 18],
      'fashion_retail': [10, 13, 16],
      'home_living': [10, 14, 16]
    };

    const optimalHours = segmentOptimalHours[prospect.business_segment] || [10, 14, 16];
    
    // Find next optimal hour
    const currentHour = now.getHours();
    let targetHour = optimalHours.find(hour => hour > currentHour);
    
    if (!targetHour) {
      // Next day, first optimal hour
      optimalTime.setDate(optimalTime.getDate() + 1);
      targetHour = optimalHours[0];
    }

    optimalTime.setHours(targetHour, 0, 0, 0);

    // Skip weekends if configured
    if (campaignConfig.respect_business_hours) {
      const dayOfWeek = optimalTime.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        // Move to Monday
        const daysToAdd = dayOfWeek === 0 ? 1 : 2;
        optimalTime.setDate(optimalTime.getDate() + daysToAdd);
        optimalTime.setHours(optimalHours[0], 0, 0, 0);
      }
    }

    return optimalTime;
  }

  /**
   * Schedule follow-up emails based on campaign configuration
   */
  private async scheduleFollowUp(
    prospectId: string, 
    campaignId: string, 
    currentStep: string
  ): Promise<void> {
    try {
      const campaignConfig = await this.getCampaignConfig(campaignId);
      if (!campaignConfig) return;

      const nextSteps = campaignConfig.steps.filter((step: CampaignStep) => 
        step.step !== currentStep && step.step !== 'initial'
      );

      for (const step of nextSteps) {
        const scheduledTime = new Date();
        scheduledTime.setHours(scheduledTime.getHours() + step.delay_hours);

        await this.queueManager.addJob('email_campaign', prospectId, {
          action: 'send_email',
          prospectId,
          campaignId,
          campaignStep: step.step,
          scheduledFor: scheduledTime.toISOString(),
          condition: step.condition
        }, {
          priority: step.priority,
          scheduledAt: scheduledTime
        });
      }

    } catch (error) {
      console.error('[EmailCampaign] Error scheduling follow-up:', error);
    }
  }

  // Helper methods
  private async getProspect(id: string): Promise<CommercialProspect | null> {
    const { data, error } = await this.supabase
      .from('commercial_prospects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[EmailCampaign] Error fetching prospect:', error);
      return null;
    }

    return data;
  }

  private async getTemplate(id: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('commercial_email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[EmailCampaign] Error fetching template:', error);
      return null;
    }

    return data;
  }

  private async getBestTemplateForSegment(
    segment: string, 
    templateType: string
  ): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('commercial_email_templates')
      .select('*')
      .eq('business_segment', segment)
      .eq('template_type', templateType)
      .eq('active', true)
      .order('performance_score', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[EmailCampaign] Error fetching best template:', error);
      return null;
    }

    return data;
  }

  private async getCampaignConfig(campaignId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('commercial_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('[EmailCampaign] Error fetching campaign config:', error);
      return null;
    }

    return data;
  }

  private async addToEmailQueue(queueItem: EmailQueueItem): Promise<string> {
    const { data, error } = await this.supabase
      .from('commercial_email_queue')
      .insert(queueItem)
      .select('id')
      .single();

    if (error) {
      console.error('[EmailCampaign] Error adding to email queue:', error);
      throw error;
    }

    return data.id;
  }

  private async updateQueueItemStatus(
    queueId: string, 
    status: string, 
    additionalData?: Record<string, any>
  ): Promise<void> {
    const updateData = { status, ...additionalData };
    
    const { error } = await this.supabase
      .from('commercial_email_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      console.error('[EmailCampaign] Error updating queue status:', error);
      throw error;
    }
  }

  private async updateProspectStatus(prospectId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('commercial_prospects')
      .update({ status })
      .eq('id', prospectId);

    if (error) {
      console.error('[EmailCampaign] Error updating prospect status:', error);
    }
  }

  private async logTrackingEvent(
    queueId: string,
    prospectId: string, 
    eventType: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('commercial_email_tracking')
      .insert({
        email_queue_id: queueId,
        prospect_id: prospectId,
        event_type: eventType,
        provider_raw_data: metadata
      });

    if (error) {
      console.error('[EmailCampaign] Error logging tracking event:', error);
    }
  }

  private generateTrackingData(
    prospect: CommercialProspect, 
    campaignId: string, 
    campaignStep: string
  ): { pixelId: string; clickIds: Record<string, string>; utmParams: Record<string, string> } {
    const pixelId = `${prospect.id}-${Date.now()}`;
    
    const utmParams = {
      utm_source: 'email',
      utm_medium: 'commercial_campaign',
      utm_campaign: campaignId,
      utm_content: campaignStep,
      utm_term: prospect.business_segment
    };

    return {
      pixelId,
      clickIds: {}, // Will be populated by mail service
      utmParams
    };
  }

  private getStepPriority(step: string): number {
    const priorities: Record<string, number> = {
      'initial': 8,
      'follow_up_1': 6,
      'follow_up_2': 5,
      'final_reminder': 4
    };
    return priorities[step] || 5;
  }
}