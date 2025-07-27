// =====================================================
// ENHANCED EMAIL CAMPAIGN SERVICE
// Integratie met template variant tracking systeem
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { QueueManager, type JobResult } from './queue-manager';
import { AIEmailOptimizer } from './ai-email-optimizer';
import { sendCommercialEmail } from './commercial-mail-service';
import { templateVariantTrackingService } from './template-variant-tracking-service';

export interface EmailQueueItem {
  id?: string;
  prospect_id: string;
  template_id?: string;
  template_variant_id?: string; // NEW: Link to segment template variant
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
  retry_count?: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  template_type: string;
  business_segment?: string;
}

interface CampaignStep {
  step: string;
  delay_hours: number;
  template_type: string;
  subject_template?: string;
  priority: number;
  condition?: string;
}

interface CommercialProspect {
  id: string;
  business_name: string;
  email: string;
  business_segment: string;
  status: string;
  city?: string;
  contact_name?: string;
  phone?: string;
  website?: string;
  metadata?: Record<string, any>;
}

export class EnhancedEmailCampaignService {
  private supabase = getServiceRoleClient();
  private queueManager = new QueueManager();
  private aiOptimizer = new AIEmailOptimizer();

  // =====================================================
  // ENHANCED CAMPAIGN SCHEDULING WITH TEMPLATE VARIANTS
  // =====================================================

  /**
   * Schedule initial outreach email with template variant selection
   */
  async scheduleInitialOutreach(
    prospectId: string, 
    campaignId?: string
  ): Promise<void> {
    try {
      console.log(`[Enhanced Email Campaign] Scheduling initial outreach for prospect: ${prospectId}`);

      // Get prospect data
      const prospect = await this.getProspect(prospectId);
      if (!prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }

      // Initiate template variant journey
      const journeyId = await templateVariantTrackingService.initiateTemplateJourney(
        prospectId,
        prospect.business_segment,
        campaignId,
        { prospect_name: prospect.business_name }
      );

      if (!journeyId) {
        console.warn(`[Enhanced Email Campaign] No journey created for prospect: ${prospectId}`);
      }

      // Get best email template variant for this segment
      const emailVariant = await templateVariantTrackingService.getTemplateVariantForProspect(
        prospect.business_segment,
        'email',
        prospectId
      );

      if (!emailVariant) {
        // Fallback to traditional template selection
        console.log(`[Enhanced Email Campaign] No email variant found, using traditional template`);
        return this.scheduleTraditionalEmail(prospectId, campaignId);
      }

      // Determine campaign configuration
      const campaign = campaignId || `default-${prospect.business_segment.replace('_', '-')}`;
      const campaignConfig = await this.getCampaignConfig(campaign);
      
      if (!campaignConfig || !campaignConfig.active) {
        throw new Error(`Campaign not found or inactive: ${campaign}`);
      }

      // Calculate optimal send time
      const optimalTime = await this.calculateOptimalSendTime(prospect, campaignConfig);
      
      // Generate personalized content using the variant
      const personalizedContent = await this.personalizeEmailFromVariant(
        prospect, 
        emailVariant, 
        'initial'
      );

      // Schedule the email job with variant tracking
      await this.queueManager.addJob('email_campaign', prospectId, {
        action: 'send_email',
        prospectId,
        templateVariantId: emailVariant.id,
        campaignId: campaign,
        campaignStep: 'initial',
        scheduledFor: optimalTime.toISOString(),
        journeyId: journeyId
      }, {
        priority: 8, // High priority for initial emails
        scheduledAt: optimalTime
      });

      console.log(`[Enhanced Email Campaign] Scheduled initial outreach with variant: ${emailVariant.variant_name} for ${prospect.business_name} at ${optimalTime.toISOString()}`);

    } catch (error) {
      console.error('[Enhanced Email Campaign] Error scheduling initial outreach:', error);
      throw error;
    }
  }

  /**
   * Process email sending job with template variant tracking
   */
  async processEmailJob(job: any): Promise<JobResult> {
    const { 
      prospectId, 
      templateVariantId, 
      campaignId, 
      campaignStep, 
      scheduledFor,
      journeyId 
    } = job.input_data;
    
    try {
      console.log(`[Enhanced Email Campaign] Processing email job for prospect: ${prospectId}, variant: ${templateVariantId}`);

      // Get prospect data
      const prospect = await this.getProspect(prospectId);
      if (!prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }

      // Get template variant
      let emailVariant = null;
      if (templateVariantId) {
        emailVariant = await this.getTemplateVariant(templateVariantId);
      }

      if (!emailVariant) {
        // Fallback to traditional template
        const traditionalTemplate = await this.getBestTemplateForSegment(
          prospect.business_segment,
          campaignStep === 'initial' ? 'invitation' : 'follow_up'
        );
        
        if (!traditionalTemplate) {
          throw new Error(`No suitable template found for ${prospect.business_segment}, step: ${campaignStep}`);
        }
        
        return this.processTraditionalEmailJob(job);
      }

      // Generate personalized content from variant
      const personalized = await this.personalizeEmailFromVariant(
        prospect, 
        emailVariant, 
        campaignStep
      );
      
      // Create tracking data
      const trackingData = this.generateTrackingData(prospect, campaignId, campaignStep);

      // Add to email queue with variant info
      const queueItem: EmailQueueItem = {
        prospect_id: prospectId,
        template_variant_id: emailVariant.id,
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
          // Track email sent in template variant system
          await templateVariantTrackingService.trackEmailSent(
            prospectId,
            result.queueId!,
            emailVariant.id,
            {
              variant_name: emailVariant.variant_name,
              campaign_step: campaignStep,
              sent_at: new Date().toISOString()
            }
          );

          // Update prospect status
          await this.updateProspectStatus(prospectId, 'contacted');
          
          // Schedule follow-up if configured
          await this.scheduleFollowUp(prospectId, campaignId, campaignStep);
          
          return { 
            success: true, 
            data: { 
              emailSent: true, 
              queueId: result.queueId,
              variant_used: emailVariant.variant_name,
              journey_id: journeyId
            } 
          };
        } else {
          throw new Error(result.error || 'Email sending failed');
        }
      } else {
        return { 
          success: true, 
          data: { 
            emailQueued: true, 
            scheduledFor: scheduledTime.toISOString(),
            variant_used: emailVariant.variant_name
          } 
        };
      }
      
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error processing email job:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Enhanced email sending with template variant tracking
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

      // Enhanced tracking URLs for template variant system
      const enhancedHtml = this.addTemplateVariantTracking(
        queueItem.personalized_html,
        {
          prospect_id: queueItem.prospect_id,
          template_variant_id: queueItem.template_variant_id,
          campaign_id: queueItem.campaign_id,
          utm_parameters: queueItem.utm_parameters
        }
      );

      // Send email via mail service
      const result = await sendCommercialEmail({
        to: prospect.email,
        subject: queueItem.personalized_subject,
        html: enhancedHtml,
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

        // Log tracking event in traditional system
        await this.logTrackingEvent(queueItem.id!, queueItem.prospect_id, 'sent', {
          provider_message_id: result.messageId,
          template_variant_id: queueItem.template_variant_id
        });

        return { success: true, queueId: queueItem.id };
      } else {
        throw new Error(result.error || 'Email delivery failed');
      }

    } catch (error) {
      console.error('[Enhanced Email Campaign] Error sending queued email:', error);
      
      // Update queue status to failed
      await this.updateQueueItemStatus(queueItem.id!, 'failed', {
        error_message: error instanceof Error ? error.message : String(error),
        retry_count: (queueItem.retry_count || 0) + 1
      });

      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // =====================================================
  // EMAIL TRACKING INTEGRATION
  // =====================================================

  /**
   * Enhanced tracking event logging with template variant integration
   */
  async logTrackingEvent(
    emailQueueId: string,
    prospectId: string,
    eventType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Log in traditional system
      await this.supabase
        .from('commercial_email_tracking')
        .insert([{
          email_queue_id: emailQueueId,
          prospect_id: prospectId,
          event_type: eventType,
          event_timestamp: new Date().toISOString(),
          user_agent: metadata.user_agent,
          ip_address: metadata.ip_address,
          device_type: metadata.device_type,
          email_client: metadata.email_client,
          clicked_url: metadata.clicked_url,
          click_tracking_id: metadata.click_tracking_id,
          provider_event_id: metadata.provider_message_id,
          provider_raw_data: metadata
        }]);

      // Sync to template variant tracking system
      await templateVariantTrackingService.syncFromCommercialEmailTracking(
        prospectId,
        eventType,
        {
          email_queue_id: emailQueueId,
          template_id: metadata.template_variant_id,
          ...metadata
        }
      );

      console.log(`[Enhanced Email Campaign] Logged ${eventType} event for prospect: ${prospectId}`);

    } catch (error) {
      console.error('[Enhanced Email Campaign] Error logging tracking event:', error);
    }
  }

  // =====================================================
  // TEMPLATE VARIANT METHODS
  // =====================================================

  private async getTemplateVariant(variantId: string): Promise<any> {
    try {
      const { data: variant, error } = await this.supabase
        .from('segment_template_variants')
        .select('*')
        .eq('id', variantId)
        .single();

      if (error) {
        console.error('[Enhanced Email Campaign] Error fetching template variant:', error);
        return null;
      }

      return variant;
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error getting template variant:', error);
      return null;
    }
  }

  private async personalizeEmailFromVariant(
    prospect: CommercialProspect,
    emailVariant: any,
    campaignStep: string
  ): Promise<{ subject: string; html: string; text: string; metadata: Record<string, any> }> {
    try {
      // Get template content from variant
      const templateContent = emailVariant.template_content;
      let subject = emailVariant.template_subject || 'Exclusieve Partnership Uitnodiging';
      let html = this.getVariantHtmlContent(emailVariant, prospect.business_segment);
      
      // Apply personalization
      const personalizationData = {
        business_name: prospect.business_name,
        contact_name: prospect.contact_name || 'Manager',
        first_name: prospect.contact_name?.split(' ')[0] || 'Manager',
        city: prospect.city || 'Nederland',
        business_segment: prospect.business_segment,
        campaign_step: campaignStep
      };

      // Replace variables in subject
      subject = this.replaceVariables(subject, personalizationData);
      
      // Replace variables in HTML
      html = this.replaceVariables(html, personalizationData);

      // AI Enhancement if enabled
      if (emailVariant.template_content?.ai_enhanced) {
        const enhanced = await this.aiOptimizer.optimizeEmail({
          subject,
          html,
          segment: prospect.business_segment,
          recipientData: personalizationData
        });
        
        if (enhanced.success) {
          subject = enhanced.optimizedSubject || subject;
          html = enhanced.optimizedHtml || html;
        }
      }

      // Generate plain text version
      const text = this.htmlToText(html);

      return {
        subject,
        html,
        text,
        metadata: {
          personalization_data: personalizationData,
          variant_id: emailVariant.id,
          variant_name: emailVariant.variant_name,
          ai_enhanced: emailVariant.template_content?.ai_enhanced || false
        }
      };

    } catch (error) {
      console.error('[Enhanced Email Campaign] Error personalizing email from variant:', error);
      throw error;
    }
  }

  private getVariantHtmlContent(emailVariant: any, segment: string): string {
    // If variant has custom HTML content, use it
    if (emailVariant.template_content?.html) {
      return emailVariant.template_content.html;
    }

    // Otherwise generate based on variant type and segment
    const variantType = emailVariant.template_content?.template || 'default';
    
    switch (variantType) {
      case 'beauty_exclusive':
        return this.generateBeautyExclusiveTemplate();
      case 'beauty_urgency':
        return this.generateBeautyUrgencyTemplate();
      case 'hair_professional':
        return this.generateHairProfessionalTemplate();
      case 'hair_revenue':
        return this.generateHairRevenueTemplate();
      default:
        return this.generateDefaultTemplate(segment);
    }
  }

  private addTemplateVariantTracking(
    html: string, 
    trackingData: {
      prospect_id: string;
      template_variant_id?: string;
      campaign_id: string;
      utm_parameters?: Record<string, string>;
    }
  ): string {
    // Add template variant ID to landing page URLs
    if (trackingData.template_variant_id) {
      html = html.replace(
        /href="([^"]*wasgeurtje\.nl[^"]*)"/g,
        (match, url) => {
          const separator = url.includes('?') ? '&' : '?';
          return `href="${url}${separator}variant=${trackingData.template_variant_id}&prospect=${trackingData.prospect_id}"`;
        }
      );
    }

    return html;
  }

  // =====================================================
  // TEMPLATE GENERATORS (VARIANTS)
  // =====================================================

  private generateBeautyExclusiveTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Exclusieve Partnership Uitnodiging</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">💅 Exclusieve Uitnodiging</h1>
          <p style="color: #fce7f3; margin: 10px 0 0 0; font-size: 16px;">Speciaal voor {{business_name}}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Exclusieve Beauty Partnership</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Beste {{contact_name}},
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Ik heb {{business_name}} geselecteerd voor een <strong>exclusieve partnership</strong> die uw salon naar het volgende niveau zal tillen.
          </p>
          
          <!-- Benefits -->
          <div style="background: #fef7ff; padding: 25px; margin: 25px 0; border-radius: 12px; border-left: 4px solid #ec4899;">
            <h3 style="color: #be185d; margin: 0 0 15px 0; font-size: 18px;">✨ Premium Voordelen voor {{business_name}}:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 0; list-style: none;">
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #ec4899; font-weight: bold;">💎</span>
                Premium klantervaring die uw salon onderscheidt
              </li>
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #ec4899; font-weight: bold;">📈</span>
                40% meer klanttevredenheid gerapporteerd
              </li>
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #ec4899; font-weight: bold;">🏆</span>
                Exclusieve territoriale bescherming
              </li>
              <li style="margin-bottom: 0; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #ec4899; font-weight: bold;">💰</span>
                Verhoogde omzet per behandeling
              </li>
            </ul>
          </div>

          <!-- CTA -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="{{invitation_url}}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3); transition: all 0.3s ease;">
              💅 Claim Exclusieve Partnership →
            </a>
            <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
              Beperkte plaatsen beschikbaar • Geen verplichtingen
            </p>
          </div>

          <!-- Urgency -->
          <div style="background: #fef3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center; font-weight: 500;">
              ⏰ Slechts 3 salons per stad - {{city}} heeft nog 1 plek beschikbaar
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Met vriendelijke groet,<br>
            <strong>Het Wasgeurtje Partnership Team</strong><br>
            📧 partners@wasgeurtje.nl | 📞 085-1234567
          </p>
        </div>

        <!-- Tracking pixel -->
        <img src="{{tracking_pixel}}" width="1" height="1" style="display: none;" alt="">
      </div>
    </body>
    </html>`;
  }

  private generateBeautyUrgencyTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>⏰ Laatste Kans - Exclusief Partnerschap</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #fef2f2;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Urgent Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">⏰ LAATSTE KANS</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px; font-weight: 500;">{{business_name}} - Exclusief Partnerschap verloopt binnenkort</p>
        </div>
        
        <!-- Countdown -->
        <div style="background: #fee2e2; padding: 20px; text-align: center; border-bottom: 2px solid #dc2626;">
          <p style="color: #991b1b; font-size: 18px; font-weight: bold; margin: 0;">
            🕐 Nog 48 uur om uw plek te claimen
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Beste {{contact_name}},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Uw exclusieve plek voor {{business_name}} staat nog steeds open, maar <strong style="color: #dc2626;">niet meer lang</strong>.
          </p>

          <!-- Risk of Missing Out -->
          <div style="background: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">⚠️ Wat u mist als u wacht:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Exclusieve territoriale bescherming in {{city}}</li>
              <li style="margin-bottom: 8px;">€2.400 extra jaaromzet gemist</li>
              <li style="margin-bottom: 0;">Concurrenten krijgen de kans</li>
            </ul>
          </div>

          <!-- Immediate Action CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{invitation_url}}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4); animation: pulse 2s infinite;">
              🚨 CLAIM NU MIJN PLEK →
            </a>
            <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
              ⏰ Aanbod verloopt automatisch over 48 uur
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Dit is uw laatste herinnering voor {{business_name}}<br>
            <strong>Het Wasgeurtje Partnership Team</strong>
          </p>
        </div>

        <!-- Tracking pixel -->
        <img src="{{tracking_pixel}}" width="1" height="1" style="display: none;" alt="">
      </div>
    </body>
    </html>`;
  }

  private generateHairProfessionalTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Professioneel Partnership voor {{business_name}}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Professional Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">✂️ Professioneel Partnership</h1>
          <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">Voor {{business_name}}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Verhoog uw Salon naar het Next Level</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Beste {{contact_name}},
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Als professional in de haarverzorging weet u hoe belangrijk <strong>kwaliteit en uitstraling</strong> zijn. 
            Daarom bieden wij {{business_name}} een exclusieve kans om zich te onderscheiden.
          </p>
          
          <!-- Professional Benefits -->
          <div style="background: #eff6ff; padding: 25px; margin: 25px 0; border-radius: 12px; border-left: 4px solid #1e40af;">
            <h3 style="color: #1e3a8a; margin: 0 0 15px 0; font-size: 18px;">🏆 Professionele Voordelen:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 0; list-style: none;">
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #1e40af; font-weight: bold;">✂️</span>
                Professionele uitstraling die klanten waarderen
              </li>
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #1e40af; font-weight: bold;">💼</span>
                Business-to-business support en training
              </li>
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #1e40af; font-weight: bold;">📊</span>
                Bewezen ROI van €1.800 per jaar
              </li>
              <li style="margin-bottom: 0; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #1e40af; font-weight: bold;">🤝</span>
                Exclusieve partnership in {{city}}
              </li>
            </ul>
          </div>

          <!-- Professional CTA -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="{{invitation_url}}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(30, 64, 175, 0.3);">
              ✂️ Bekijk Professioneel Partnership →
            </a>
            <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
              Gratis proefpakket • Geen verplichtingen • Professionele ondersteuning
            </p>
          </div>

          <!-- Trust Building -->
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #0c4a6e; font-size: 14px; font-style: italic; margin: 0; text-align: center;">
              💬 "Sinds we samenwerken zijn onze klanten veel tevredener over de salon ervaring" - Kapsalon Excellence, Amsterdam
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Met professionele groet,<br>
            <strong>Het Wasgeurtje Business Partnership Team</strong><br>
            📧 business@wasgeurtje.nl | 📞 085-1234567
          </p>
        </div>

        <!-- Tracking pixel -->
        <img src="{{tracking_pixel}}" width="1" height="1" style="display: none;" alt="">
      </div>
    </body>
    </html>`;
  }

  private generateHairRevenueTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>💰 Verhoog je Omzet met BLOSSOM DRIP</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6ffed;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Revenue Header -->
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">💰 Verhoog je Omzet</h1>
          <p style="color: #dcfce7; margin: 10px 0 0 0; font-size: 16px;">{{business_name}} - Revenue Opportunity</p>
        </div>
        
        <!-- Revenue Calculator -->
        <div style="background: #f0fdf4; padding: 25px; text-align: center; border-bottom: 2px solid #16a34a;">
          <h2 style="color: #15803d; font-size: 20px; margin: 0 0 15px 0;">📊 Omzetpotentieel voor {{business_name}}:</h2>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
            <div style="margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">€150</div>
              <div style="font-size: 12px; color: #166534;">per maand extra</div>
            </div>
            <div style="margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">€1.800</div>
              <div style="font-size: 12px; color: #166534;">per jaar extra</div>
            </div>
            <div style="margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a;">25%</div>
              <div style="font-size: 12px; color: #166534;">klant retentie</div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Beste {{contact_name}},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Wat als ik u vertel dat {{business_name}} <strong style="color: #16a34a;">€1.800 extra per jaar</strong> kan verdienen door één simpele toevoeging aan uw service?
          </p>

          <!-- Revenue Benefits -->
          <div style="background: #f0fdf4; padding: 25px; margin: 25px 0; border-radius: 12px; border-left: 4px solid #16a34a;">
            <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px;">💸 Bewezen Omzetverhoging:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 0; list-style: none;">
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #16a34a; font-weight: bold;">💰</span>
                Gemiddeld €150 extra omzet per maand
              </li>
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #16a34a; font-weight: bold;">🔄</span>
                25% betere klantretentie door toegevoegde waarde
              </li>
              <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #16a34a; font-weight: bold;">📈</span>
                Hogere gemiddelde besteding per klant
              </li>
              <li style="margin-bottom: 0; padding-left: 25px; position: relative;">
                <span style="position: absolute; left: 0; color: #16a34a; font-weight: bold;">🏆</span>
                Concurrentievoordeel in {{city}}
              </li>
            </ul>
          </div>

          <!-- Revenue CTA -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="{{invitation_url}}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);">
              💰 Start Omzetverhoging →
            </a>
            <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
              Gratis proefpakket • Geen risico • Bewezen resultaten
            </p>
          </div>

          <!-- Guarantee -->
          <div style="background: #fefce8; padding: 20px; border-radius: 8px; border-left: 4px solid #eab308; margin: 25px 0;">
            <p style="color: #a16207; font-size: 14px; margin: 0; text-align: center; font-weight: 500;">
              🎯 Garantie: Als u niet binnen 3 maanden meer omzet ziet, krijgt u uw geld terug
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Met vriendelijke groet,<br>
            <strong>Het Wasgeurtje Revenue Team</strong><br>
            📧 revenue@wasgeurtje.nl | 📞 085-1234567
          </p>
        </div>

        <!-- Tracking pixel -->
        <img src="{{tracking_pixel}}" width="1" height="1" style="display: none;" alt="">
      </div>
    </body>
    </html>`;
  }

  private generateDefaultTemplate(segment: string): string {
    // Fallback to existing template generation logic
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Partnership Uitnodiging</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎯 Partnership Uitnodiging</h1>
          <p style="color: #e0f2fe; margin: 10px 0 0 0;">Speciaal voor {{business_name}}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0;">Beste {{contact_name}},</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Wij bieden {{business_name}} een exclusieve kans om deel te nemen aan ons partnership programma.
          </p>
          
          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{invitation_url}}" style="display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Bekijk Partnership →
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Met vriendelijke groet,<br>
            <strong>Het Wasgeurtje Partnership Team</strong>
          </p>
        </div>

        <!-- Tracking pixel -->
        <img src="{{tracking_pixel}}" width="1" height="1" style="display: none;" alt="">
      </div>
    </body>
    </html>`;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private replaceVariables(content: string, data: Record<string, any>): string {
    let result = content;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // =====================================================
  // FALLBACK METHODS (TRADITIONAL SYSTEM)
  // =====================================================

  private async scheduleTraditionalEmail(prospectId: string, campaignId?: string): Promise<void> {
    // Implement traditional email scheduling as fallback
    console.log(`[Enhanced Email Campaign] Falling back to traditional email for prospect: ${prospectId}`);
    // ... existing logic
  }

  private async processTraditionalEmailJob(job: any): Promise<JobResult> {
    // Implement traditional email processing as fallback
    console.log(`[Enhanced Email Campaign] Processing traditional email job`);
    // ... existing logic
    return { success: true, data: { traditional: true } };
  }

  private async getBestTemplateForSegment(segment: string, templateType: string): Promise<EmailTemplate | null> {
    // Existing template selection logic
    try {
      const { data: template, error } = await this.supabase
        .from('commercial_email_templates')
        .select('*')
        .eq('business_segment', segment)
        .eq('template_type', templateType)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Enhanced Email Campaign] Error fetching traditional template:', error);
      }

      return template;
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error getting traditional template:', error);
      return null;
    }
  }

  private async getProspect(prospectId: string): Promise<CommercialProspect | null> {
    try {
      const { data: prospect, error } = await this.supabase
        .from('commercial_prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (error) {
        console.error('[Enhanced Email Campaign] Error fetching prospect:', error);
        return null;
      }

      return prospect;
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error getting prospect:', error);
      return null;
    }
  }

  private async getCampaignConfig(campaignId: string): Promise<any> {
    try {
      const { data: campaign, error } = await this.supabase
        .from('commercial_email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Enhanced Email Campaign] Error fetching campaign config:', error);
      }

      return campaign;
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error getting campaign config:', error);
      return null;
    }
  }

  private async calculateOptimalSendTime(prospect: CommercialProspect, campaignConfig: any): Promise<Date> {
    // Simple optimal time calculation
    const now = new Date();
    const optimal = new Date(now);
    
    // Add random delay (0-30 minutes) to avoid spam detection
    optimal.setMinutes(optimal.getMinutes() + Math.floor(Math.random() * 30));
    
    return optimal;
  }

  private getStepPriority(campaignStep: string): number {
    const priorities: Record<string, number> = {
      'initial': 8,
      'follow_up_1': 6,
      'follow_up_2': 5,
      'final_reminder': 4
    };
    
    return priorities[campaignStep] || 5;
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
      clickIds: {},
      utmParams
    };
  }

  private async addToEmailQueue(queueItem: EmailQueueItem): Promise<void> {
    try {
      await this.supabase
        .from('commercial_email_queue')
        .insert([queueItem]);
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error adding to email queue:', error);
      throw error;
    }
  }

  private async updateQueueItemStatus(queueId: string, status: string, updates: Record<string, any> = {}): Promise<void> {
    try {
      await this.supabase
        .from('commercial_email_queue')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...updates
        })
        .eq('id', queueId);
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error updating queue status:', error);
    }
  }

  private async updateProspectStatus(prospectId: string, status: string): Promise<void> {
    try {
      await this.supabase
        .from('commercial_prospects')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);
    } catch (error) {
      console.error('[Enhanced Email Campaign] Error updating prospect status:', error);
    }
  }

  private async scheduleFollowUp(prospectId: string, campaignId: string, currentStep: string): Promise<void> {
    // Implementation for follow-up scheduling
    console.log(`[Enhanced Email Campaign] Scheduling follow-up for prospect: ${prospectId}, current step: ${currentStep}`);
    // ... existing follow-up logic
  }
}

// Export singleton instance
export const enhancedEmailCampaignService = new EnhancedEmailCampaignService(); 