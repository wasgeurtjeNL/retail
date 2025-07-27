// =====================================================
// COMMERCIAL FULFILLMENT SERVICE
// Automatische proefpakket verzending voor commercial prospects
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { QueueManager } from '@/lib/queue-manager';

export interface FulfillmentRequest {
  prospectId: string;
  packageType: 'basis' | 'premium' | 'business';
  priority: number;
  expedited?: boolean;
  notes?: string;
}

export interface FulfillmentResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  trackingInfo?: {
    provider: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
  };
  error?: string;
}

export interface ProefpakketOrder {
  id: string;
  order_number: string;
  prospect_id: string;
  recipient_name: string;
  recipient_company: string;
  recipient_email: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  status: string;
  priority: number;
  order_type: string;
  source_campaign?: string;
  metadata: Record<string, any>;
}

export class CommercialFulfillmentService {
  private supabase = getServiceRoleClient();
  private queueManager: QueueManager;

  constructor() {
    this.queueManager = QueueManager.getInstance();
    console.log('[CommercialFulfillment] Service initialized');
  }

  /**
   * Automatically trigger proefpakket shipment when prospect registers
   */
  async triggerAutomaticFulfillment(prospectId: string): Promise<FulfillmentResult> {
    try {
      console.log(`[CommercialFulfillment] Triggering automatic fulfillment for prospect: ${prospectId}`);

      // Get prospect data
      const { data: prospect, error: prospectError } = await this.supabase
        .from('commercial_prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (prospectError || !prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }

      // Check if prospect is eligible for proefpakket
      if (!this.isEligibleForProefpakket(prospect)) {
        console.log(`[CommercialFulfillment] Prospect ${prospectId} not eligible for proefpakket`);
        return {
          success: false,
          error: 'Prospect not eligible for proefpakket shipment'
        };
      }

      // Determine package type based on business segment
      const packageType = this.determinePackageType(prospect.business_segment);
      
      // Check if already has pending or shipped order
      const existingOrder = await this.checkExistingOrder(prospectId);
      if (existingOrder) {
        console.log(`[CommercialFulfillment] Existing order found for prospect ${prospectId}`);
        return {
          success: false,
          error: 'Prospect already has a pending or recent order'
        };
      }

      // Create fulfillment order
      const orderResult = await this.createFulfillmentOrder({
        prospectId,
        packageType,
        priority: this.calculatePriority(prospect),
        expedited: this.shouldExpedite(prospect),
        notes: `Automatic fulfillment for ${prospect.business_segment} prospect`
      });

      if (orderResult.success) {
        // Update prospect status
        await this.updateProspectStatus(prospectId, 'proefpakket_sent', {
          fulfillment_order_id: orderResult.orderId,
          fulfillment_triggered_at: new Date().toISOString()
        });

        // Schedule follow-up tracking
        await this.scheduleFollowUpTracking(prospectId, orderResult.orderId!);

        console.log(`[CommercialFulfillment] Successfully created order ${orderResult.orderNumber} for prospect ${prospectId}`);
      }

      return orderResult;

    } catch (error) {
      console.error('[CommercialFulfillment] Error triggering automatic fulfillment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create fulfillment order
   */
  async createFulfillmentOrder(request: FulfillmentRequest): Promise<FulfillmentResult> {
    try {
      // Get prospect data for shipping info
      const { data: prospect, error: prospectError } = await this.supabase
        .from('commercial_prospects')
        .select('*')
        .eq('id', request.prospectId)
        .single();

      if (prospectError || !prospect) {
        throw new Error(`Prospect not found: ${request.prospectId}`);
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Get product configuration for package type
      const productConfig = await this.getProductConfiguration(request.packageType);
      
      if (!productConfig) {
        throw new Error(`Product configuration not found for package type: ${request.packageType}`);
      }

      // Create fulfillment order
      const orderData: Partial<ProefpakketOrder> = {
        order_number: orderNumber,
        prospect_id: request.prospectId,
        recipient_name: prospect.contact_name || prospect.business_name,
        recipient_company: prospect.business_name,
        recipient_email: prospect.email,
        shipping_address_line1: prospect.address || 'Address not provided',
        shipping_city: prospect.city || 'City not provided',
        shipping_postal_code: prospect.postal_code || 'Postal code not provided',
        shipping_country: 'NL',
        status: 'pending',
        priority: request.priority,
        order_type: 'proefpakket',
        source_campaign: 'commercial_acquisition',
        metadata: {
          business_segment: prospect.business_segment,
          package_type: request.packageType,
          expedited: request.expedited || false,
          auto_triggered: true,
          notes: request.notes
        }
      };

      const { data: order, error: orderError } = await this.supabase
        .from('fulfillment_orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create fulfillment order: ${orderError.message}`);
      }

      // Create order items
      await this.createOrderItems(order.id, productConfig);

      // Reserve inventory
      const inventoryReserved = await this.reserveInventory(productConfig);
      
      if (!inventoryReserved) {
        // Mark order as failed due to inventory
        await this.supabase
          .from('fulfillment_orders')
          .update({ 
            status: 'failed',
            error_message: 'Insufficient inventory' 
          })
          .eq('id', order.id);

        throw new Error('Insufficient inventory for proefpakket');
      }

      // Queue for processing
      // Validate prospectId is a valid UUID, fallback to system UUID if needed
      const profileId = this.isValidUUID(request.prospectId) 
        ? request.prospectId 
        : '00000000-0000-0000-0000-000000000001';
        
      await this.queueManager.addJob(
        'send_fulfillment_notification',
        profileId,
        {
          action: 'process_fulfillment_order',
          orderId: order.id,
          orderNumber: orderNumber,
          priority: request.priority,
          originalProspectId: request.prospectId // Keep original for reference
        },
        { priority: request.priority }
      );

      console.log(`[CommercialFulfillment] Created order ${orderNumber} for prospect ${request.prospectId}`);

      return {
        success: true,
        orderId: order.id,
        orderNumber: orderNumber,
        trackingInfo: {
          provider: 'PostNL', // Default provider
          estimatedDelivery: this.calculateEstimatedDelivery(request.expedited)
        }
      };

    } catch (error) {
      console.error('[CommercialFulfillment] Error creating fulfillment order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process fulfillment order (called by queue processor)
   */
  async processFulfillmentOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[CommercialFulfillment] Processing fulfillment order: ${orderId}`);

      // Get order details
      const { data: order, error: orderError } = await this.supabase
        .from('fulfillment_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Update order status to processing
      await this.supabase
        .from('fulfillment_orders')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      // Create shipment record
      const shipmentResult = await this.createShipment(order);
      
      if (!shipmentResult.success) {
        throw new Error(`Failed to create shipment: ${shipmentResult.error}`);
      }

      // Update order with shipping info
      await this.supabase
        .from('fulfillment_orders')
        .update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
          shipping_provider_id: shipmentResult.providerId
        })
        .eq('id', orderId);

      // Send notification to prospect
      await this.sendShippingNotification(order, shipmentResult.trackingNumber);

      // Update conversion tracking
      await this.updateConversionTracking(order.prospect_id, {
        touchpoint_type: 'proefpakket_shipped',
        metadata: {
          order_id: orderId,
          tracking_number: shipmentResult.trackingNumber
        }
      });

      console.log(`[CommercialFulfillment] Successfully processed order ${order.order_number}`);

      return { success: true };

    } catch (error) {
      console.error('[CommercialFulfillment] Error processing fulfillment order:', error);
      
      // Mark order as failed
      await this.supabase
        .from('fulfillment_orders')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error)
        })
        .eq('id', orderId);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Private helper methods

  private isEligibleForProefpakket(prospect: any): boolean {
    // Check eligibility criteria
    return (
      prospect.status === 'qualified' &&
      prospect.email &&
      prospect.business_name &&
      prospect.enrichment_score >= 0.5 &&
      !prospect.fulfillment_sent_at
    );
  }

  private determinePackageType(businessSegment: string): 'basis' | 'premium' | 'business' {
    const premiumSegments = ['wellness_spa', 'hotel_bnb', 'restaurant'];
    const businessSegments = ['cleaning_service', 'laundromat'];
    
    if (premiumSegments.includes(businessSegment)) {
      return 'premium';
    } else if (businessSegments.includes(businessSegment)) {
      return 'business';
    } else {
      return 'basis';
    }
  }

  private calculatePriority(prospect: any): number {
    let priority = 5; // Base priority
    
    // Higher priority for better prospects
    if (prospect.enrichment_score > 0.8) priority += 2;
    if (prospect.business_segment === 'wellness_spa') priority += 1;
    if (prospect.city === 'Amsterdam' || prospect.city === 'Rotterdam') priority += 1;
    
    return Math.min(priority, 10);
  }

  private shouldExpedite(prospect: any): boolean {
    const highValueSegments = ['wellness_spa', 'hotel_bnb'];
    return (
      highValueSegments.includes(prospect.business_segment) &&
      prospect.enrichment_score > 0.8
    );
  }

  private async checkExistingOrder(prospectId: string): Promise<boolean> {
    const { data: orders, error } = await this.supabase
      .from('fulfillment_orders')
      .select('id')
      .eq('prospect_id', prospectId)
      .in('status', ['pending', 'processing', 'shipped'])
      .limit(1);

    return !error && orders && orders.length > 0;
  }

  private async generateOrderNumber(): Promise<string> {
    const prefix = 'CA'; // Commercial Acquisition
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${date}-${random}`;
  }

  private async getProductConfiguration(packageType: string) {
    const { data: product, error } = await this.supabase
      .from('proefpakket_products')
      .select('*')
      .eq('category', packageType)
      .eq('active', true)
      .single();

    return error ? null : product;
  }

  private async createOrderItems(orderId: string, product: any): Promise<void> {
    await this.supabase
      .from('fulfillment_order_items')
      .insert([{
        fulfillment_order_id: orderId,
        product_id: product.id,
        quantity: 1,
        unit_value_euros: product.value_euros,
        total_value_euros: product.value_euros
      }]);
  }

  private async reserveInventory(product: any): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('reserve_inventory', {
        p_product_id: product.id,
        p_quantity: 1
      });

    return !error && data === true;
  }

  private calculateEstimatedDelivery(expedited: boolean = false): Date {
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + (expedited ? 1 : 3)); // 1 day for expedited, 3 for normal
    return delivery;
  }

  private async createShipment(order: any): Promise<{ success: boolean; providerId?: string; trackingNumber?: string; error?: string }> {
    try {
      // Get default shipping provider (PostNL)
      const { data: provider, error: providerError } = await this.supabase
        .from('shipping_providers')
        .select('*')
        .eq('code', 'postnl')
        .eq('active', true)
        .single();

      if (providerError || !provider) {
        throw new Error('No active shipping provider found');
      }

      // Generate tracking number (mock for now)
      const trackingNumber = `3SBOL${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create shipment record
      const { data: shipment, error: shipmentError } = await this.supabase
        .from('shipments')
        .insert([{
          fulfillment_order_id: order.id,
          shipping_provider_id: provider.id,
          tracking_number: trackingNumber,
          service_type: order.metadata?.expedited ? 'express' : 'standard',
          package_type: 'package',
          weight_grams: 250, // Standard proefpakket weight
          status: 'created'
        }])
        .select()
        .single();

      if (shipmentError) {
        throw new Error(`Failed to create shipment: ${shipmentError.message}`);
      }

      return {
        success: true,
        providerId: provider.id,
        trackingNumber: trackingNumber
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async sendShippingNotification(order: any, trackingNumber?: string): Promise<void> {
    // Queue email notification
    await this.queueManager.addJob(
      'send_admin_notification',
      order.prospect_id,
      {
        action: 'send_shipping_notification',
        orderId: order.id,
        orderNumber: order.order_number,
        trackingNumber,
        recipientEmail: order.recipient_email
      },
      { priority: 6 }
    );
  }

  private async updateConversionTracking(prospectId: string, touchpoint: any): Promise<void> {
    try {
      // Find or create conversion journey
      let { data: journey, error: journeyError } = await this.supabase
        .from('conversion_journeys')
        .select('*')
        .eq('prospect_id', prospectId)
        .single();

      if (journeyError || !journey) {
        // Create new journey
        const { data: newJourney, error: createError } = await this.supabase
          .from('conversion_journeys')
          .insert([{
            prospect_id: prospectId,
            status: 'in_progress',
            first_touch_at: new Date().toISOString(),
            last_touch_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) {
          console.error('[CommercialFulfillment] Error creating conversion journey:', createError);
          return;
        }
        journey = newJourney;
      }

      // Add touchpoint
      await this.supabase
        .from('conversion_touchpoints')
        .insert([{
          journey_id: journey.id,
          prospect_id: prospectId,
          touchpoint_type: touchpoint.touchpoint_type,
          channel: 'fulfillment',
          source: 'commercial_automation',
          occurred_at: new Date().toISOString(),
          metadata: touchpoint.metadata
        }]);

      // Update journey
      await this.supabase
        .from('conversion_journeys')
        .update({
          last_touch_at: new Date().toISOString(),
          total_touchpoints: (journey.total_touchpoints || 0) + 1
        })
        .eq('id', journey.id);

    } catch (error) {
      console.error('[CommercialFulfillment] Error updating conversion tracking:', error);
    }
  }

  private async updateProspectStatus(prospectId: string, status: string, metadata: any = {}): Promise<void> {
    await this.supabase
      .from('commercial_prospects')
      .update({
        status,
        last_contact_at: new Date().toISOString(),
        metadata: metadata
      })
      .eq('id', prospectId);
  }

  private async scheduleFollowUpTracking(prospectId: string, orderId: string): Promise<void> {
    // Schedule delivery confirmation follow-up
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 5); // 5 days after shipping

    await this.queueManager.addJob(
      'email_campaign',
      prospectId,
      {
        action: 'send_delivery_followup',
        orderId,
        templateType: 'delivery_confirmation',
        scheduledFor: followUpDate.toISOString()
      },
      { 
        priority: 4,
        scheduledAt: followUpDate
      }
    );
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
} 