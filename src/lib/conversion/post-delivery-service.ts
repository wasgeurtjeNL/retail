// =====================================================
// POST-DELIVERY FOLLOW-UP SERVICE
// Automated follow-up communications after proefpakket delivery
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';
import { QueueManager } from '@/lib/queue-manager';

export interface ConversionJourney {
  id: string;
  prospect_id: string;
  fulfillment_order_id?: string;
  status: 'initiated' | 'proefpakket_sent' | 'delivered' | 'feedback_received' | 'follow_up_sent' | 'interested' | 'application_started' | 'application_submitted' | 'converted' | 'rejected' | 'churned';
  initiated_at: string;
  proefpakket_sent_at?: string;
  delivered_at?: string;
  feedback_received_at?: string;
  first_follow_up_at?: string;
  interest_shown_at?: string;
  application_started_at?: string;
  application_submitted_at?: string;
  conversion_completed_at?: string;
  journey_ended_at?: string;
  total_touchpoints: number;
  days_to_delivery?: number;
  days_to_conversion?: number;
  estimated_ltv?: number;
  actual_ltv?: number;
  conversion_source?: string;
  attribution_confidence: number;
  total_cost: number;
  proefpakket_cost: number;
  shipping_cost: number;
  follow_up_cost: number;
  notes?: string;
  metadata: any;
}

export interface ConversionTouchpoint {
  id: string;
  journey_id: string;
  touchpoint_type: 'proefpakket_delivered' | 'email_sent' | 'email_opened' | 'email_clicked' | 'phone_call_made' | 'phone_call_answered' | 'website_visit' | 'feedback_submitted' | 'application_viewed' | 'application_started' | 'application_submitted' | 'meeting_scheduled' | 'meeting_completed' | 'follow_up_required' | 'lost_contact';
  channel: 'email' | 'phone' | 'website' | 'linkedin' | 'whatsapp' | 'post' | 'in_person';
  subject?: string;
  content?: string;
  template_used?: string;
  sender?: string;
  recipient?: string;
  response_received: boolean;
  response_time_minutes?: number;
  response_sentiment?: 'positive' | 'neutral' | 'negative';
  response_content?: string;
  automated: boolean;
  triggered_by?: string;
  conversion_contribution: number;
  metadata: any;
}

export interface ConversionRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  priority: number;
  trigger_event: 'proefpakket_delivered' | 'feedback_received' | 'no_response_timeout' | 'positive_feedback' | 'negative_feedback' | 'high_interest_signal' | 'application_abandoned';
  trigger_conditions: any;
  action_type: 'send_email' | 'schedule_call' | 'assign_account_manager' | 'create_task' | 'send_sms' | 'linkedin_message' | 'schedule_meeting';
  action_config: any;
  delay_hours: number;
  max_executions?: number;
  executions_count: number;
  successful_conversions: number;
  conversion_rate: number;
}

export class PostDeliveryService {
  private supabase = getServiceRoleClient();
  private emailService: EmailCampaignService;
  private queueManager: QueueManager;

  constructor() {
    this.emailService = new EmailCampaignService();
    this.queueManager = QueueManager.getInstance();
    console.log('[PostDelivery] Service initialized');
  }

  // =====================================================
  // JOURNEY MANAGEMENT
  // =====================================================

  /**
   * Initialize a new conversion journey for a prospect
   */
  async initializeJourney(prospectId: string, fulfillmentOrderId?: string): Promise<ConversionJourney> {
    try {
      console.log(`[PostDelivery] Initializing journey for prospect ${prospectId}`);

      // Get prospect details for cost estimation
      const { data: prospect, error: prospectError } = await this.supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (prospectError) {
        throw new Error(`Failed to get prospect: ${prospectError.message}`);
      }

      // Calculate estimated costs
      const proefpakketCost = 25.00; // Base proefpakket cost
      const shippingCost = prospect.country === 'NL' ? 6.95 : 12.95;
      const estimatedLTV = this.calculateEstimatedLTV(prospect);

      const journey = {
        prospect_id: prospectId,
        fulfillment_order_id: fulfillmentOrderId,
        status: fulfillmentOrderId ? 'proefpakket_sent' : 'initiated',
        proefpakket_sent_at: fulfillmentOrderId ? new Date().toISOString() : null,
        estimated_ltv: estimatedLTV,
        proefpakket_cost: proefpakketCost,
        shipping_cost: shippingCost,
        total_cost: proefpakketCost + shippingCost,
        attribution_confidence: 1.0,
        total_touchpoints: 0,
        metadata: {
          prospect_company: prospect.company_name,
          prospect_country: prospect.country,
          enrichment_score: prospect.enrichment_score
        }
      };

      const { data: newJourney, error } = await this.supabase
        .from('conversion_journeys')
        .insert([journey])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create journey: ${error.message}`);
      }

      console.log(`[PostDelivery] Journey initialized: ${newJourney.id}`);
      return newJourney;

    } catch (error) {
      console.error('[PostDelivery] Error initializing journey:', error);
      throw error;
    }
  }

  /**
   * Process delivery event and trigger follow-up workflows
   */
  async processDeliveryEvent(fulfillmentOrderId: string): Promise<void> {
    try {
      console.log(`[PostDelivery] Processing delivery event for order ${fulfillmentOrderId}`);

      // Find or create journey
      let { data: journey, error } = await this.supabase
        .from('conversion_journeys')
        .select('*')
        .eq('fulfillment_order_id', fulfillmentOrderId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Journey doesn't exist, create it
        const { data: order } = await this.supabase
          .from('fulfillment_orders')
          .select('prospect_id')
          .eq('id', fulfillmentOrderId)
          .single();

        if (order) {
          journey = await this.initializeJourney(order.prospect_id, fulfillmentOrderId);
        } else {
          throw new Error(`Order ${fulfillmentOrderId} not found`);
        }
      } else if (error) {
        throw new Error(`Failed to get journey: ${error.message}`);
      }

      // Update journey status to delivered
      await this.updateJourneyStatus(journey.id, 'delivered', {
        delivered_at: new Date().toISOString(),
        days_to_delivery: this.calculateDaysBetween(journey.initiated_at, new Date().toISOString())
      });

      // Record delivery touchpoint
      await this.recordTouchpoint(journey.id, {
        touchpoint_type: 'proefpakket_delivered',
        channel: 'post',
        subject: 'Proefpakket delivered',
        content: 'Proefpakket successfully delivered to prospect',
        automated: true,
        triggered_by: 'delivery_event'
      });

      // Trigger follow-up rules
      await this.triggerFollowUpRules(journey.id, 'proefpakket_delivered');

      console.log(`[PostDelivery] Delivery processed for journey ${journey.id}`);

    } catch (error) {
      console.error('[PostDelivery] Error processing delivery event:', error);
      throw error;
    }
  }

  /**
   * Process feedback submission
   */
  async processFeedbackSubmission(journeyId: string, feedbackData: any): Promise<void> {
    try {
      console.log(`[PostDelivery] Processing feedback for journey ${journeyId}`);

      // Store feedback
      const feedback = {
        journey_id: journeyId,
        overall_rating: feedbackData.overall_rating,
        product_quality_rating: feedbackData.product_quality_rating,
        packaging_rating: feedbackData.packaging_rating,
        delivery_rating: feedbackData.delivery_rating,
        liked_most: feedbackData.liked_most,
        improvement_suggestions: feedbackData.improvement_suggestions,
        additional_comments: feedbackData.additional_comments,
        interested_in_partnership: feedbackData.interested_in_partnership,
        ready_for_follow_up: feedbackData.ready_for_follow_up,
        preferred_contact_method: feedbackData.preferred_contact_method,
        best_contact_time: feedbackData.best_contact_time,
        current_supplier: feedbackData.current_supplier,
        monthly_volume_estimate: feedbackData.monthly_volume_estimate,
        decision_maker: feedbackData.decision_maker,
        decision_timeline: feedbackData.decision_timeline,
        feedback_source: feedbackData.source || 'web_form',
        ip_address: feedbackData.ip_address,
        user_agent: feedbackData.user_agent
      };

      const { error: feedbackError } = await this.supabase
        .from('proefpakket_feedback')
        .insert([feedback]);

      if (feedbackError) {
        throw new Error(`Failed to store feedback: ${feedbackError.message}`);
      }

      // Record feedback touchpoint
      await this.recordTouchpoint(journeyId, {
        touchpoint_type: 'feedback_submitted',
        channel: 'website',
        subject: 'Feedback submitted',
        content: `Overall rating: ${feedbackData.overall_rating}/5, Interested: ${feedbackData.interested_in_partnership}`,
        response_received: true,
        response_sentiment: feedbackData.overall_rating >= 4 ? 'positive' : feedbackData.overall_rating >= 3 ? 'neutral' : 'negative',
        automated: false,
        conversion_contribution: feedbackData.interested_in_partnership ? 0.8 : 0.2
      });

      // Update journey status
      await this.updateJourneyStatus(journeyId, 'feedback_received', {
        feedback_received_at: new Date().toISOString()
      });

      // Trigger follow-up based on feedback sentiment
      const triggerEvent = feedbackData.overall_rating >= 4 || feedbackData.interested_in_partnership 
        ? 'positive_feedback' 
        : 'negative_feedback';

      await this.triggerFollowUpRules(journeyId, triggerEvent);

      console.log(`[PostDelivery] Feedback processed for journey ${journeyId}`);

    } catch (error) {
      console.error('[PostDelivery] Error processing feedback:', error);
      throw error;
    }
  }

  // =====================================================
  // FOLLOW-UP AUTOMATION
  // =====================================================

  /**
   * Trigger follow-up rules based on events
   */
  private async triggerFollowUpRules(journeyId: string, triggerEvent: string): Promise<void> {
    try {
      // Get active rules for this trigger event
      const { data: rules, error } = await this.supabase
        .from('conversion_rules')
        .select('*')
        .eq('active', true)
        .eq('trigger_event', triggerEvent)
        .order('priority', { ascending: false });

      if (error) {
        throw new Error(`Failed to get rules: ${error.message}`);
      }

      if (!rules || rules.length === 0) {
        console.log(`[PostDelivery] No rules found for trigger: ${triggerEvent}`);
        return;
      }

      // Get journey and prospect details
      const { data: journey, error: journeyError } = await this.supabase
        .from('conversion_journeys')
        .select(`
          *,
          prospects (
            id,
            company_name,
            contact_name,
            email,
            phone,
            enrichment_score
          )
        `)
        .eq('id', journeyId)
        .single();

      if (journeyError) {
        throw new Error(`Failed to get journey: ${journeyError.message}`);
      }

      // Execute applicable rules
      for (const rule of rules) {
        await this.executeFollowUpRule(rule, journey);
      }

    } catch (error) {
      console.error('[PostDelivery] Error triggering follow-up rules:', error);
    }
  }

  /**
   * Execute a specific follow-up rule
   */
  private async executeFollowUpRule(rule: ConversionRule, journey: any): Promise<void> {
    try {
      console.log(`[PostDelivery] Executing rule: ${rule.name} for journey ${journey.id}`);

      // Check if rule has reached max executions
      if (rule.max_executions && rule.executions_count >= rule.max_executions) {
        console.log(`[PostDelivery] Rule ${rule.name} has reached max executions`);
        return;
      }

      // Check trigger conditions
      if (rule.trigger_conditions && !this.checkTriggerConditions(rule.trigger_conditions, journey)) {
        console.log(`[PostDelivery] Rule conditions not met for: ${rule.name}`);
        return;
      }

      // Execute action based on type
      switch (rule.action_type) {
        case 'send_email':
          await this.executeEmailAction(rule, journey);
          break;
        case 'assign_account_manager':
          await this.executeAccountManagerAction(rule, journey);
          break;
        case 'create_task':
          await this.executeTaskAction(rule, journey);
          break;
        case 'schedule_call':
          await this.executeCallAction(rule, journey);
          break;
        default:
          console.warn(`[PostDelivery] Unknown action type: ${rule.action_type}`);
      }

      // Update rule execution count
      await this.supabase
        .from('conversion_rules')
        .update({ 
          executions_count: rule.executions_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rule.id);

    } catch (error) {
      console.error(`[PostDelivery] Error executing rule ${rule.name}:`, error);
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(rule: ConversionRule, journey: any): Promise<void> {
    try {
      const config = rule.action_config;
      const prospect = journey.prospects;

      if (!prospect.email) {
        console.warn(`[PostDelivery] No email address for prospect ${prospect.id}`);
        return;
      }

      // Prepare template data
      const templateData = {
        prospect_name: prospect.contact_name,
        company_name: prospect.company_name,
        journey_id: journey.id,
        days_since_delivery: journey.days_to_delivery || 0,
        feedback_link: `${process.env.NEXT_PUBLIC_BASE_URL}/feedback/${journey.id}`,
        unsubscribe_link: `${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe/${journey.id}`
      };

      // Queue email for sending
      await this.queueManager.addJob(
        'send_fulfillment_notification',
        journey.prospect_id,
        {
          type: 'conversion_follow_up',
          recipient: prospect.email,
          template: config.template,
          data: templateData,
          journey_id: journey.id,
          rule_id: rule.id
        },
        {
          scheduledAt: new Date(Date.now() + (rule.delay_hours * 60 * 60 * 1000))
        }
      );

      // Record touchpoint
      await this.recordTouchpoint(journey.id, {
        touchpoint_type: 'email_sent',
        channel: 'email',
        subject: `Follow-up email - ${rule.name}`,
        content: `Template: ${config.template}`,
        template_used: config.template,
        recipient: prospect.email,
        automated: true,
        triggered_by: rule.id
      });

      console.log(`[PostDelivery] Email queued for journey ${journey.id}`);

    } catch (error) {
      console.error('[PostDelivery] Error executing email action:', error);
    }
  }

  /**
   * Execute account manager assignment action
   */
  private async executeAccountManagerAction(rule: ConversionRule, journey: any): Promise<void> {
    try {
      const config = rule.action_config;

      // Record touchpoint
      await this.recordTouchpoint(journey.id, {
        touchpoint_type: 'follow_up_required',
        channel: 'in_person',
        subject: 'Account manager assigned',
        content: `Priority: ${config.priority}, Department: ${config.department}`,
        automated: true,
        triggered_by: rule.id,
        conversion_contribution: 0.9 // High contribution for personal follow-up
      });

      // Update journey status if high interest
      if (config.priority === 'urgent') {
        await this.updateJourneyStatus(journey.id, 'interested', {
          interest_shown_at: new Date().toISOString()
        });
      }

      console.log(`[PostDelivery] Account manager assigned for journey ${journey.id}`);

    } catch (error) {
      console.error('[PostDelivery] Error executing account manager action:', error);
    }
  }

  /**
   * Execute task creation action
   */
  private async executeTaskAction(rule: ConversionRule, journey: any): Promise<void> {
    try {
      const config = rule.action_config;

      // Record touchpoint
      await this.recordTouchpoint(journey.id, {
        touchpoint_type: 'follow_up_required',
        channel: 'in_person',
        subject: config.task_title || 'Follow-up task created',
        content: config.task_description || `Follow-up required for ${journey.prospects.company_name}`,
        automated: true,
        triggered_by: rule.id
      });

      console.log(`[PostDelivery] Task created for journey ${journey.id}`);

    } catch (error) {
      console.error('[PostDelivery] Error executing task action:', error);
    }
  }

  /**
   * Execute call scheduling action
   */
  private async executeCallAction(rule: ConversionRule, journey: any): Promise<void> {
    try {
      // Record touchpoint
      await this.recordTouchpoint(journey.id, {
        touchpoint_type: 'follow_up_required',
        channel: 'phone',
        subject: 'Call scheduled',
        content: `Phone call to be scheduled with ${journey.prospects.contact_name}`,
        automated: true,
        triggered_by: rule.id
      });

      console.log(`[PostDelivery] Call scheduled for journey ${journey.id}`);

    } catch (error) {
      console.error('[PostDelivery] Error executing call action:', error);
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Update journey status and metadata
   */
  private async updateJourneyStatus(journeyId: string, status: string, updates: any = {}): Promise<void> {
    try {
      await this.supabase
        .from('conversion_journeys')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', journeyId);

    } catch (error) {
      console.error('[PostDelivery] Error updating journey status:', error);
    }
  }

  /**
   * Record a touchpoint
   */
  private async recordTouchpoint(journeyId: string, touchpoint: Partial<ConversionTouchpoint>): Promise<void> {
    try {
      const touchpointData = {
        journey_id: journeyId,
        response_received: false,
        automated: false,
        conversion_contribution: 0.0,
        metadata: {},
        ...touchpoint
      };

      await this.supabase
        .from('conversion_touchpoints')
        .insert([touchpointData]);

      // Increment touchpoint count on journey
      await this.supabase
        .from('conversion_journeys')
        .update({
          total_touchpoints: this.supabase.rpc('increment_touchpoints', { journey_id: journeyId })
        })
        .eq('id', journeyId);

    } catch (error) {
      console.error('[PostDelivery] Error recording touchpoint:', error);
    }
  }

  /**
   * Check if trigger conditions are met
   */
  private checkTriggerConditions(conditions: any, journey: any): boolean {
    // Basic condition checking - can be expanded
    if (conditions.min_enrichment_score && journey.prospects.enrichment_score < conditions.min_enrichment_score) {
      return false;
    }

    if (conditions.countries && !conditions.countries.includes(journey.prospects.country)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate estimated LTV based on prospect data
   */
  private calculateEstimatedLTV(prospect: any): number {
    let baseLTV = 1200; // Base annual value

    // Adjust based on enrichment score
    if (prospect.enrichment_score >= 90) baseLTV *= 1.5;
    else if (prospect.enrichment_score >= 80) baseLTV *= 1.3;
    else if (prospect.enrichment_score >= 70) baseLTV *= 1.1;

    // Adjust based on country
    if (prospect.country === 'NL') baseLTV *= 1.2; // Domestic advantage
    else if (['DE', 'BE', 'FR'].includes(prospect.country)) baseLTV *= 1.1;

    return Math.round(baseLTV);
  }

  /**
   * Calculate days between dates
   */
  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  // =====================================================
  // ANALYTICS & REPORTING
  // =====================================================

  /**
   * Get conversion metrics for a time period
   */
  async getConversionMetrics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const { data: metrics, error } = await this.supabase
        .rpc('calculate_conversion_metrics', {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        });

      if (error) {
        throw new Error(`Failed to get metrics: ${error.message}`);
      }

      return metrics[0];

    } catch (error) {
      console.error('[PostDelivery] Error getting conversion metrics:', error);
      throw error;
    }
  }

  /**
   * Get journey performance stats
   */
  async getJourneyStats(): Promise<any> {
    try {
      const { data: stats, error } = await this.supabase
        .from('conversion_journeys')
        .select('status')
        .gte('initiated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw new Error(`Failed to get journey stats: ${error.message}`);
      }

      const statusCounts = stats?.reduce((acc: any, journey: any) => {
        acc[journey.status] = (acc[journey.status] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        total_journeys: stats?.length || 0,
        status_breakdown: statusCounts,
        conversion_rate: statusCounts.converted ? (statusCounts.converted / (stats?.length || 1)) * 100 : 0
      };

    } catch (error) {
      console.error('[PostDelivery] Error getting journey stats:', error);
      throw error;
    }
  }
} 