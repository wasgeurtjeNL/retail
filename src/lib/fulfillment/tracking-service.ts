// =====================================================
// FULFILLMENT TRACKING & NOTIFICATION SERVICE
// Real-time tracking and automated notifications for proefpakket deliveries
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';
import { QueueManager } from '@/lib/queue-manager';
import type { FulfillmentOrder } from './proefpakket-assignment';
import { PostDeliveryService } from '@/lib/conversion/post-delivery-service';

export interface TrackingEvent {
  id: string;
  tracking_number: string;
  order_id: string;
  event_type: 'shipped' | 'in_transit' | 'delivered' | 'delayed' | 'failed' | 'returned';
  event_description: string;
  event_timestamp: Date;
  location?: string;
  provider_reference?: string;
  metadata?: any;
  created_at: Date;
}

export interface NotificationRule {
  id: string;
  name: string;
  active: boolean;
  trigger_events: string[];
  delay_minutes?: number;
  recipient_type: 'prospect' | 'admin' | 'both';
  email_template: string;
  conditions?: {
    order_status?: string[];
    days_since_shipment?: number;
    shipping_provider?: string[];
  };
}

export interface NotificationLog {
  id: string;
  order_id: string;
  tracking_number?: string;
  notification_type: 'email' | 'sms' | 'webhook';
  recipient: string;
  template_used: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: Date;
  metadata?: any;
}

export class TrackingNotificationService {
  private supabase = getServiceRoleClient();
  private emailService: EmailCampaignService;
  private queueManager: QueueManager;
  private postDeliveryService: PostDeliveryService;

  constructor() {
    this.emailService = new EmailCampaignService();
    this.queueManager = QueueManager.getInstance();
    this.postDeliveryService = new PostDeliveryService();
    console.log('[TrackingNotification] Service initialized with conversion tracking');
  }

  // =====================================================
  // TRACKING EVENT MANAGEMENT
  // =====================================================

  /**
   * Record a new tracking event and trigger notifications
   */
  async recordTrackingEvent(event: Omit<TrackingEvent, 'id' | 'created_at'>): Promise<void> {
    try {
      console.log(`[TrackingNotification] Recording event: ${event.event_type} for ${event.tracking_number}`);

      // Insert tracking event
      const { data: trackingEvent, error: trackingError } = await this.supabase
        .from('fulfillment_tracking_events')
        .insert({
          tracking_number: event.tracking_number,
          order_id: event.order_id,
          event_type: event.event_type,
          event_description: event.event_description,
          event_timestamp: event.event_timestamp.toISOString(),
          location: event.location,
          provider_reference: event.provider_reference,
          metadata: event.metadata
        })
        .select()
        .single();

      if (trackingError) {
        throw new Error(`Failed to record tracking event: ${trackingError.message}`);
      }

      // Update order status if applicable
      await this.updateOrderFromTrackingEvent(event);

      // Trigger notifications based on event
      await this.processNotificationTriggers(event);

      console.log(`[TrackingNotification] Event recorded successfully: ${trackingEvent.id}`);
    } catch (error) {
      console.error('[TrackingNotification] Error recording tracking event:', error);
      throw error;
    }
  }

  /**
   * Process webhook data from shipping providers
   */
  async processShippingWebhook(provider: string, webhookData: any): Promise<void> {
    try {
      console.log(`[TrackingNotification] Processing ${provider} webhook`);

      let trackingEvent: Omit<TrackingEvent, 'id' | 'created_at'>;

      switch (provider.toLowerCase()) {
        case 'postnl':
          trackingEvent = await this.parsePostNLWebhook(webhookData);
          break;
        case 'dhl':
          trackingEvent = await this.parseDHLWebhook(webhookData);
          break;
        default:
          throw new Error(`Unsupported shipping provider: ${provider}`);
      }

      await this.recordTrackingEvent(trackingEvent);
    } catch (error) {
      console.error(`[TrackingNotification] Error processing ${provider} webhook:`, error);
      throw error;
    }
  }

  /**
   * Get tracking history for an order
   */
  async getTrackingHistory(orderId: string): Promise<TrackingEvent[]> {
    try {
      const { data: events, error } = await this.supabase
        .from('fulfillment_tracking_events')
        .select('*')
        .eq('order_id', orderId)
        .order('event_timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to get tracking history: ${error.message}`);
      }

      return events || [];
    } catch (error) {
      console.error('[TrackingNotification] Error getting tracking history:', error);
      throw error;
    }
  }

  /**
   * Get current status for multiple orders
   */
  async getBatchOrderStatus(orderIds: string[]): Promise<Map<string, string>> {
    try {
      const { data: orders, error } = await this.supabase
        .from('fulfillment_orders')
        .select('id, status')
        .in('id', orderIds);

      if (error) {
        throw new Error(`Failed to get batch order status: ${error.message}`);
      }

      const statusMap = new Map<string, string>();
      orders?.forEach(order => {
        statusMap.set(order.id, order.status);
      });

      return statusMap;
    } catch (error) {
      console.error('[TrackingNotification] Error getting batch order status:', error);
      throw error;
    }
  }

  // =====================================================
  // NOTIFICATION MANAGEMENT
  // =====================================================

  /**
   * Process notification triggers based on tracking events
   */
  private async processNotificationTriggers(event: Omit<TrackingEvent, 'id' | 'created_at'>): Promise<void> {
    try {
      // Get active notification rules that match this event
      const { data: rules, error } = await this.supabase
        .from('fulfillment_notification_rules')
        .select('*')
        .eq('active', true)
        .contains('trigger_events', [event.event_type]);

      if (error) {
        throw new Error(`Failed to get notification rules: ${error.message}`);
      }

      if (!rules || rules.length === 0) {
        console.log(`[TrackingNotification] No notification rules found for event: ${event.event_type}`);
        return;
      }

      // Get order details
      const { data: order, error: orderError } = await this.supabase
        .from('fulfillment_orders')
        .select('*, prospects(*)')
        .eq('id', event.order_id)
        .single();

      if (orderError) {
        throw new Error(`Failed to get order details: ${orderError.message}`);
      }

      // Process each applicable rule
      for (const rule of rules) {
        await this.executeNotificationRule(rule, event, order);
      }
    } catch (error) {
      console.error('[TrackingNotification] Error processing notification triggers:', error);
    }
  }

  /**
   * Execute a specific notification rule
   */
  private async executeNotificationRule(
    rule: any,
    event: Omit<TrackingEvent, 'id' | 'created_at'>,
    order: any
  ): Promise<void> {
    try {
      console.log(`[TrackingNotification] Executing rule: ${rule.name} for order ${order.id}`);

      // Check if rule conditions are met
      if (rule.conditions) {
        if (!this.checkRuleConditions(rule.conditions, event, order)) {
          console.log(`[TrackingNotification] Rule conditions not met for: ${rule.name}`);
          return;
        }
      }

      // Check if we should send to prospect
      if (rule.recipient_type === 'prospect' || rule.recipient_type === 'both') {
        if (order.prospects && order.recipient_email) {
          await this.sendNotificationToProspect(rule, event, order);
        }
      }

      // Check if we should send to admin
      if (rule.recipient_type === 'admin' || rule.recipient_type === 'both') {
        await this.sendNotificationToAdmin(rule, event, order);
      }
    } catch (error) {
      console.error(`[TrackingNotification] Error executing rule ${rule.name}:`, error);
    }
  }

  /**
   * Send notification to prospect
   */
  private async sendNotificationToProspect(rule: any, event: any, order: any): Promise<void> {
    try {
      const templateData = {
        prospect_name: order.recipient_name,
        company_name: order.recipient_company || '',
        tracking_number: event.tracking_number,
        order_number: order.order_number,
        status: event.event_type,
        description: event.event_description,
        estimated_delivery: order.estimated_delivery,
        shipping_address: `${order.shipping_address_line1}, ${order.shipping_city}`,
        event_timestamp: event.event_timestamp
      };

      // Queue email for sending
      await this.queueManager.addJob(
        'send_fulfillment_notification',
        order.prospect_id || 'system',
        {
          type: 'prospect_notification',
          recipient: order.recipient_email,
          template: rule.email_template,
          data: templateData,
          order_id: order.id,
          rule_id: rule.id
        },
        {
          scheduledAt: new Date(Date.now() + ((rule.delay_minutes || 0) * 60 * 1000))
        }
      );

      // Log notification
      await this.logNotification({
        order_id: order.id,
        tracking_number: event.tracking_number,
        notification_type: 'email',
        recipient: order.recipient_email,
        template_used: rule.email_template,
        status: 'pending'
      });

      console.log(`[TrackingNotification] Queued prospect notification for order ${order.id}`);
    } catch (error) {
      console.error('[TrackingNotification] Error sending prospect notification:', error);
    }
  }

  /**
   * Send notification to admin
   */
  private async sendNotificationToAdmin(rule: any, event: any, order: any): Promise<void> {
    try {
      // Get admin email from settings
      const { data: settings } = await this.supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'fulfillment_notification_email')
        .single();

      const adminEmail = settings?.value || process.env.ADMIN_EMAIL;
      if (!adminEmail) {
        console.warn('[TrackingNotification] No admin email configured for notifications');
        return;
      }

      const templateData = {
        order_number: order.order_number,
        prospect_name: order.recipient_name,
        company_name: order.recipient_company || '',
        tracking_number: event.tracking_number,
        status: event.event_type,
        description: event.event_description,
        location: event.location,
        event_timestamp: event.event_timestamp,
        order_details: order
      };

      // Queue admin email
      await this.queueManager.addJob(
        'send_admin_notification',
        'admin',
        {
          type: 'admin_fulfillment_alert',
          recipient: adminEmail,
          template: 'admin_fulfillment_update',
          data: templateData,
          order_id: order.id,
          rule_id: rule.id
        }
      );

      console.log(`[TrackingNotification] Queued admin notification for order ${order.id}`);
    } catch (error) {
      console.error('[TrackingNotification] Error sending admin notification:', error);
    }
  }

  // =====================================================
  // WEBHOOK PARSERS
  // =====================================================

  /**
   * Parse PostNL webhook data
   */
  private async parsePostNLWebhook(webhookData: any): Promise<Omit<TrackingEvent, 'id' | 'created_at'>> {
    // Get order from tracking number
    const { data: order } = await this.supabase
      .from('fulfillment_orders')
      .select('id')
      .eq('tracking_number', webhookData.barcode)
      .single();

    if (!order) {
      throw new Error(`Order not found for tracking number: ${webhookData.barcode}`);
    }

    return {
      tracking_number: webhookData.barcode,
      order_id: order.id,
      event_type: this.mapPostNLStatus(webhookData.status),
      event_description: webhookData.description || webhookData.status,
      event_timestamp: new Date(webhookData.timeStamp),
      location: webhookData.location?.city,
      provider_reference: webhookData.reference,
      metadata: webhookData
    };
  }

  /**
   * Parse DHL webhook data
   */
  private async parseDHLWebhook(webhookData: any): Promise<Omit<TrackingEvent, 'id' | 'created_at'>> {
    // Get order from tracking number
    const { data: order } = await this.supabase
      .from('fulfillment_orders')
      .select('id')
      .eq('tracking_number', webhookData.trackingNumber)
      .single();

    if (!order) {
      throw new Error(`Order not found for tracking number: ${webhookData.trackingNumber}`);
    }

    return {
      tracking_number: webhookData.trackingNumber,
      order_id: order.id,
      event_type: this.mapDHLStatus(webhookData.status),
      event_description: webhookData.description || webhookData.statusDescription,
      event_timestamp: new Date(webhookData.timestamp),
      location: webhookData.location?.address?.addressLocality,
      provider_reference: webhookData.reference,
      metadata: webhookData
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Update order status based on tracking event
   */
  private async updateOrderFromTrackingEvent(event: Omit<TrackingEvent, 'id' | 'created_at'>): Promise<void> {
    try {
      let newStatus: string;
      let updateData: any = {
        updated_at: new Date().toISOString()
      };

      switch (event.event_type) {
        case 'shipped':
          newStatus = 'shipped';
          updateData.shipped_at = event.event_timestamp.toISOString();
          break;
        case 'delivered':
          newStatus = 'delivered';
          updateData.delivered_at = event.event_timestamp.toISOString();
          
          // Trigger post-delivery conversion tracking
          try {
            await this.postDeliveryService.processDeliveryEvent(event.order_id);
            console.log(`[TrackingNotification] Post-delivery conversion tracking triggered for order ${event.order_id}`);
          } catch (conversionError) {
            console.warn('[TrackingNotification] Failed to trigger conversion tracking:', conversionError);
          }
          
          break;
        case 'failed':
        case 'returned':
          newStatus = 'failed';
          break;
        default:
          return; // Don't update status for other events
      }

      updateData.status = newStatus;

      await this.supabase
        .from('fulfillment_orders')
        .update(updateData)
        .eq('id', event.order_id);

      console.log(`[TrackingNotification] Updated order ${event.order_id} status to: ${newStatus}`);
    } catch (error) {
      console.error('[TrackingNotification] Error updating order status:', error);
    }
  }

  /**
   * Check if rule conditions are met
   */
  private checkRuleConditions(conditions: any, event: any, order: any): boolean {
    if (conditions.order_status && !conditions.order_status.includes(order.status)) {
      return false;
    }

    if (conditions.shipping_provider) {
      const orderProvider = order.shipping_provider_id?.toLowerCase();
      if (!conditions.shipping_provider.some((p: string) => p.toLowerCase() === orderProvider)) {
        return false;
      }
    }

    if (conditions.days_since_shipment && order.shipped_at) {
      const daysSince = Math.floor((Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < conditions.days_since_shipment) {
        return false;
      }
    }

    return true;
  }

  /**
   * Map PostNL status codes to our event types
   */
  private mapPostNLStatus(status: string): TrackingEvent['event_type'] {
    const statusMap: Record<string, TrackingEvent['event_type']> = {
      '3S': 'shipped',
      '7S': 'in_transit',
      '11S': 'delivered',
      '8S': 'failed',
      '9S': 'returned'
    };
    return statusMap[status] || 'in_transit';
  }

  /**
   * Map DHL status codes to our event types
   */
  private mapDHLStatus(status: string): TrackingEvent['event_type'] {
    const statusMap: Record<string, TrackingEvent['event_type']> = {
      'transit': 'in_transit',
      'delivered': 'delivered',
      'failure': 'failed',
      'returned-to-sender': 'returned'
    };
    return statusMap[status] || 'in_transit';
  }

  /**
   * Log notification attempt
   */
  private async logNotification(log: Omit<NotificationLog, 'id'>): Promise<void> {
    try {
      await this.supabase
        .from('fulfillment_notification_logs')
        .insert(log);
    } catch (error) {
      console.error('[TrackingNotification] Error logging notification:', error);
    }
  }

  // =====================================================
  // MONITORING & ANALYTICS
  // =====================================================

  /**
   * Get tracking statistics
   */
  async getTrackingStats(startDate: Date, endDate: Date): Promise<any> {
    try {
      const { data: stats, error } = await this.supabase
        .rpc('get_fulfillment_tracking_stats', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

      if (error) {
        throw new Error(`Failed to get tracking stats: ${error.message}`);
      }

      return stats;
    } catch (error) {
      console.error('[TrackingNotification] Error getting tracking stats:', error);
      throw error;
    }
  }

  /**
   * Get delivery performance metrics
   */
  async getDeliveryMetrics(period: 'day' | 'week' | 'month'): Promise<any> {
    try {
      const { data: metrics, error } = await this.supabase
        .rpc('get_delivery_performance_metrics', { time_period: period });

      if (error) {
        throw new Error(`Failed to get delivery metrics: ${error.message}`);
      }

      return metrics;
    } catch (error) {
      console.error('[TrackingNotification] Error getting delivery metrics:', error);
      throw error;
    }
  }
} 