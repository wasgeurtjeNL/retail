// =====================================================
// TEMPLATE VARIANT TRACKING SERVICE
// Integratie tussen bestaande commercial systeem en nieuwe template tracking
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';

export interface TemplateVariantJourney {
  prospect_id: string;
  email_template_id?: string;
  landing_template_id?: string;
  campaign_id?: string;
  segment: string;
  status: string;
  metadata?: Record<string, any>;
}

export interface TrackingEvent {
  journey_id: string;
  template_id?: string;
  touchpoint_type: string;
  channel: string;
  element_id?: string;
  element_text?: string;
  page_url?: string;
  referrer_url?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export class TemplateVariantTrackingService {
  private supabase = getServiceRoleClient();

  // =====================================================
  // JOURNEY MANAGEMENT
  // =====================================================

  /**
   * Initiate template variant journey voor nieuwe prospect
   */
  async initiateTemplateJourney(
    prospectId: string,
    segment: string,
    campaignId?: string,
    metadata: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      console.log(`[Template Tracking] Initiating journey for prospect: ${prospectId}, segment: ${segment}`);

      // Get active email and landing page templates for this segment
      const emailTemplate = await this.getActiveTemplate(segment, 'email');
      const landingTemplate = await this.getActiveTemplate(segment, 'landing_page');

      if (!emailTemplate && !landingTemplate) {
        console.log(`[Template Tracking] No active templates found for segment: ${segment}`);
        return null;
      }

      // Create journey record
      const { data: journey, error } = await this.supabase
        .from('segment_template_journeys')
        .insert([{
          prospect_id: prospectId,
          email_template_id: emailTemplate?.id || null,
          landing_template_id: landingTemplate?.id || null,
          campaign_id: campaignId,
          status: 'initiated',
          initiated_at: new Date().toISOString(),
          metadata: {
            segment: segment,
            email_template_variant: emailTemplate?.variant_name,
            landing_template_variant: landingTemplate?.variant_name,
            ...metadata
          }
        }])
        .select()
        .single();

      if (error) {
        console.error('[Template Tracking] Error creating journey:', error);
        return null;
      }

      console.log(`[Template Tracking] Journey created: ${journey.id}`);
      return journey.id;

    } catch (error) {
      console.error('[Template Tracking] Error initiating journey:', error);
      return null;
    }
  }

  /**
   * Update journey status wanneer email wordt verzonden
   */
  async trackEmailSent(
    prospectId: string,
    emailQueueId: string,
    templateId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      console.log(`[Template Tracking] Tracking email sent for prospect: ${prospectId}`);

      // Find existing journey
      const journey = await this.findJourneyByProspectId(prospectId);
      if (!journey) {
        console.log(`[Template Tracking] No journey found for prospect: ${prospectId}`);
        return;
      }

      // Update journey status
      await this.supabase
        .from('segment_template_journeys')
        .update({
          status: 'email_sent',
          email_sent_at: new Date().toISOString(),
          total_touchpoints: (journey.total_touchpoints || 0) + 1,
          metadata: {
            ...journey.metadata,
            email_queue_id: emailQueueId,
            ...metadata
          }
        })
        .eq('id', journey.id);

      // Add touchpoint record
      await this.addTouchpoint(journey.id, {
        template_id: templateId || journey.email_template_id,
        touchpoint_type: 'email_sent',
        channel: 'email',
        metadata: {
          email_queue_id: emailQueueId,
          ...metadata
        }
      });

      // Update template variant performance counter
      if (templateId || journey.email_template_id) {
        await this.updateTemplateEmailCounter(templateId || journey.email_template_id);
      }

      console.log(`[Template Tracking] Email sent tracked for journey: ${journey.id}`);

    } catch (error) {
      console.error('[Template Tracking] Error tracking email sent:', error);
    }
  }

  /**
   * Track email opened event
   */
  async trackEmailOpened(
    prospectId: string,
    trackingPixelId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      console.log(`[Template Tracking] Tracking email opened for prospect: ${prospectId}`);

      const journey = await this.findJourneyByProspectId(prospectId);
      if (!journey) return;

      // Calculate time to open
      const timeToOpen = journey.email_sent_at 
        ? Math.floor((Date.now() - new Date(journey.email_sent_at).getTime()) / (1000 * 60))
        : 0;

      // Update journey
      await this.supabase
        .from('segment_template_journeys')
        .update({
          status: 'email_opened',
          email_opened_at: new Date().toISOString(),
          time_to_open_minutes: timeToOpen,
          total_touchpoints: (journey.total_touchpoints || 0) + 1
        })
        .eq('id', journey.id);

      // Add touchpoint
      await this.addTouchpoint(journey.id, {
        template_id: journey.email_template_id,
        touchpoint_type: 'email_opened',
        channel: 'email',
        metadata: {
          tracking_pixel_id: trackingPixelId,
          time_to_open_minutes: timeToOpen,
          ...metadata
        }
      });

    } catch (error) {
      console.error('[Template Tracking] Error tracking email opened:', error);
    }
  }

  /**
   * Track email clicked event
   */
  async trackEmailClicked(
    prospectId: string,
    clickedUrl: string,
    clickTrackingId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      console.log(`[Template Tracking] Tracking email clicked for prospect: ${prospectId}`);

      const journey = await this.findJourneyByProspectId(prospectId);
      if (!journey) return;

      // Calculate time to click
      const timeToClick = journey.email_sent_at 
        ? Math.floor((Date.now() - new Date(journey.email_sent_at).getTime()) / (1000 * 60))
        : 0;

      // Update journey
      await this.supabase
        .from('segment_template_journeys')
        .update({
          status: 'email_clicked',
          email_clicked_at: new Date().toISOString(),
          time_to_click_minutes: timeToClick,
          total_touchpoints: (journey.total_touchpoints || 0) + 1
        })
        .eq('id', journey.id);

      // Add touchpoint
      await this.addTouchpoint(journey.id, {
        template_id: journey.email_template_id,
        touchpoint_type: 'email_clicked',
        channel: 'email',
        metadata: {
          clicked_url: clickedUrl,
          click_tracking_id: clickTrackingId,
          time_to_click_minutes: timeToClick,
          ...metadata
        }
      });

    } catch (error) {
      console.error('[Template Tracking] Error tracking email clicked:', error);
    }
  }

  /**
   * Track landing page visited
   */
  async trackLandingPageVisited(
    prospectId: string,
    pageUrl: string,
    variantId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      console.log(`[Template Tracking] Tracking landing page visited for prospect: ${prospectId}`);

      const journey = await this.findJourneyByProspectId(prospectId);
      if (!journey) return;

      // Calculate time to visit
      const timeToVisit = journey.email_clicked_at || journey.email_sent_at
        ? Math.floor((Date.now() - new Date(journey.email_clicked_at || journey.email_sent_at).getTime()) / (1000 * 60))
        : 0;

      // Update journey
      await this.supabase
        .from('segment_template_journeys')
        .update({
          status: 'landing_visited',
          landing_visited_at: new Date().toISOString(),
          time_to_visit_minutes: timeToVisit,
          total_touchpoints: (journey.total_touchpoints || 0) + 1,
          landing_template_id: variantId || journey.landing_template_id // Update if specific variant
        })
        .eq('id', journey.id);

      // Add touchpoint
      await this.addTouchpoint(journey.id, {
        template_id: variantId || journey.landing_template_id,
        touchpoint_type: 'landing_page_visited',
        channel: 'website',
        page_url: pageUrl,
        metadata: {
          time_to_visit_minutes: timeToVisit,
          variant_id: variantId,
          ...metadata
        }
      });

    } catch (error) {
      console.error('[Template Tracking] Error tracking landing page visited:', error);
    }
  }

  /**
   * Track form submission (conversion)
   */
  async trackFormSubmission(
    prospectId: string,
    formData: Record<string, any>,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      console.log(`[Template Tracking] Tracking form submission for prospect: ${prospectId}`);

      const journey = await this.findJourneyByProspectId(prospectId);
      if (!journey) return;

      // Calculate time to conversion
      const timeToConversion = journey.initiated_at 
        ? Math.floor((Date.now() - new Date(journey.initiated_at).getTime()) / (1000 * 60))
        : 0;

      // Update journey to completed
      await this.supabase
        .from('segment_template_journeys')
        .update({
          status: 'conversion_completed',
          form_submitted_at: new Date().toISOString(),
          conversion_completed_at: new Date().toISOString(),
          time_to_conversion_minutes: timeToConversion,
          total_touchpoints: (journey.total_touchpoints || 0) + 1,
          conversion_value: 1800.00, // Estimated LTV for new partner
          metadata: {
            ...journey.metadata,
            form_data: formData,
            ...metadata
          }
        })
        .eq('id', journey.id);

      // Add touchpoint
      await this.addTouchpoint(journey.id, {
        template_id: journey.landing_template_id,
        touchpoint_type: 'form_submitted',
        channel: 'website',
        metadata: {
          form_data: formData,
          time_to_conversion_minutes: timeToConversion,
          ...metadata
        }
      });

      // Update template variant conversion counters
      await Promise.all([
        journey.email_template_id ? this.updateTemplateConversionCounter(journey.email_template_id) : null,
        journey.landing_template_id ? this.updateTemplateConversionCounter(journey.landing_template_id) : null
      ]);

      console.log(`[Template Tracking] Conversion tracked for journey: ${journey.id}`);

    } catch (error) {
      console.error('[Template Tracking] Error tracking form submission:', error);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async getActiveTemplate(segment: string, templateType: 'email' | 'landing_page') {
    try {
      const { data: template, error } = await this.supabase
        .from('segment_template_variants')
        .select('*')
        .eq('segment', segment)
        .eq('template_type', templateType)
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`[Template Tracking] Error fetching active ${templateType} template:`, error);
      }

      return template;
    } catch (error) {
      console.error(`[Template Tracking] Error getting active template:`, error);
      return null;
    }
  }

  private async findJourneyByProspectId(prospectId: string) {
    try {
      const { data: journey, error } = await this.supabase
        .from('segment_template_journeys')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Template Tracking] Error finding journey:', error);
      }

      return journey;
    } catch (error) {
      console.error('[Template Tracking] Error finding journey:', error);
      return null;
    }
  }

  private async addTouchpoint(journeyId: string, touchpoint: Partial<TrackingEvent>) {
    try {
      await this.supabase
        .from('segment_template_touchpoints')
        .insert([{
          journey_id: journeyId,
          ...touchpoint,
          occurred_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('[Template Tracking] Error adding touchpoint:', error);
    }
  }

  private async updateTemplateEmailCounter(templateId: string) {
    try {
      // Increment emails_sent counter
      await this.supabase
        .rpc('increment_template_emails_sent', {
          template_id: templateId
        });
    } catch (error) {
      console.error('[Template Tracking] Error updating email counter:', error);
      
      // Fallback: manual update
      try {
        const { data: template } = await this.supabase
          .from('segment_template_variants')
          .select('emails_sent')
          .eq('id', templateId)
          .single();

        if (template) {
          await this.supabase
            .from('segment_template_variants')
            .update({
              emails_sent: (template.emails_sent || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', templateId);
        }
      } catch (fallbackError) {
        console.error('[Template Tracking] Fallback email counter update failed:', fallbackError);
      }
    }
  }

  private async updateTemplateConversionCounter(templateId: string) {
    try {
      // Get current stats
      const { data: template } = await this.supabase
        .from('segment_template_variants')
        .select('emails_sent, conversions')
        .eq('id', templateId)
        .single();

      if (template) {
        const newConversions = (template.conversions || 0) + 1;
        const newConversionRate = template.emails_sent > 0 
          ? (newConversions / template.emails_sent) * 100 
          : 0;

        await this.supabase
          .from('segment_template_variants')
          .update({
            conversions: newConversions,
            current_conversion_rate: newConversionRate,
            last_performance_check: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId);
      }
    } catch (error) {
      console.error('[Template Tracking] Error updating conversion counter:', error);
    }
  }

  // =====================================================
  // INTEGRATION WITH EXISTING COMMERCIAL SYSTEM
  // =====================================================

  /**
   * Hook into existing commercial email tracking
   * Call this from existing commercial email tracking events
   */
  async syncFromCommercialEmailTracking(
    prospectId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      switch (eventType) {
        case 'sent':
          await this.trackEmailSent(
            prospectId, 
            eventData.email_queue_id, 
            eventData.template_id,
            eventData
          );
          break;
        
        case 'opened':
          await this.trackEmailOpened(
            prospectId,
            eventData.tracking_pixel_id,
            eventData
          );
          break;
        
        case 'clicked':
          await this.trackEmailClicked(
            prospectId,
            eventData.clicked_url,
            eventData.click_tracking_id,
            eventData
          );
          break;
      }
    } catch (error) {
      console.error('[Template Tracking] Error syncing from commercial tracking:', error);
    }
  }

  /**
   * Get template variant for prospect based on segment and A/B test settings
   */
  async getTemplateVariantForProspect(
    segment: string,
    templateType: 'email' | 'landing_page',
    prospectId?: string
  ): Promise<any> {
    try {
      // For now, just get the active template
      // TODO: Implement A/B testing logic with traffic split
      const activeTemplate = await this.getActiveTemplate(segment, templateType);
      
      if (activeTemplate) {
        console.log(`[Template Tracking] Selected ${templateType} variant: ${activeTemplate.variant_name} for segment: ${segment}`);
      }
      
      return activeTemplate;
    } catch (error) {
      console.error('[Template Tracking] Error getting template variant:', error);
      return null;
    }
  }

  /**
   * Check if optimization should be triggered
   */
  async checkOptimizationTrigger(segment: string): Promise<void> {
    try {
      // Run optimization check for this segment
      const response = await fetch('/api/commercial/templates/optimization-check?' + new URLSearchParams({
        segment: segment
      }));
      
      if (response.ok) {
        const { recommendations } = await response.json();
        
        // Check if auto-switching should happen
        if (recommendations.email?.should_switch || recommendations.landing_page?.should_switch) {
          console.log(`[Template Tracking] Optimization recommended for segment: ${segment}`);
          
          // Trigger optimization run
          await fetch('/api/commercial/templates/optimization-run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              segment: segment,
              auto_apply: true 
            })
          });
        }
      }
    } catch (error) {
      console.error('[Template Tracking] Error checking optimization trigger:', error);
    }
  }
}

// Singleton instance
export const templateVariantTrackingService = new TemplateVariantTrackingService(); 