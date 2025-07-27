// =====================================================
// PROEFPAKKET ASSIGNMENT SYSTEM - Core Automation
// Automatic assignment and fulfillment of proefpakketten
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { InventoryManager } from './inventory-manager';
import { PostNLProvider } from './shipping-providers/postnl-provider';
import { DHLProvider } from './shipping-providers/dhl-provider';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';
import { QueueManager } from '@/lib/queue-manager';
import type { EnrichedProspect } from '@/lib/prospect-discovery/lead-enrichment';
import { PostDeliveryService } from '@/lib/conversion/post-delivery-service';

export interface AssignmentRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  priority: number;
  trigger_conditions: {
    segments?: string[];
    countries?: string[];
    min_enrichment_score?: number;
    max_enrichment_score?: number;
    business_type?: string[];
    exclude_if_contacted?: boolean;
    exclude_if_ordered?: boolean;
  };
  assignment_config: {
    product_sku: string;
    shipping_service: 'standard' | 'express' | 'economy';
    delay_hours?: number;
    include_marketing_materials?: boolean;
    custom_message?: string;
  };
  limits: {
    max_uses_per_day?: number;
    max_uses_per_prospect: number;
    valid_from?: string;
    valid_until?: string;
  };
}

export interface AssignmentRequest {
  prospect_id: string;
  trigger_source: 'discovery' | 'manual' | 'campaign' | 'webhook';
  override_rules?: boolean;
  force_product_sku?: string;
  force_shipping_service?: string;
  custom_notes?: string;
}

export interface AssignmentResult {
  success: boolean;
  prospect_id: string;
  order_id?: string;
  tracking_number?: string;
  product_assigned?: string;
  shipping_service?: string;
  estimated_delivery?: Date;
  rule_applied?: string;
  error?: string;
  warnings: string[];
  actions_taken: string[];
}

export interface FulfillmentOrder {
  id: string;
  order_number: string;
  prospect_id: string;
  status: 'pending' | 'processing' | 'picked' | 'packed' | 'shipped' | 'delivered' | 'failed' | 'cancelled';
  recipient_name: string;
  recipient_company?: string;
  recipient_email?: string;
  recipient_phone?: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_provider_id?: string;
  shipping_service_type?: string;
  source_campaign?: string;
  notes?: string;
  created_at: string;
}

export class ProefpakketAssignmentService {
  private supabase = getServiceRoleClient();
  private inventoryManager: InventoryManager;
  private postnlProvider: PostNLProvider;
  private dhlProvider: DHLProvider;
  private emailService: EmailCampaignService;
  private queueManager: QueueManager;
  private postDeliveryService: PostDeliveryService;

  constructor() {
    this.inventoryManager = new InventoryManager();
    
    // Initialize shipping providers with environment config
    this.postnlProvider = new PostNLProvider({
      api_key: process.env.POSTNL_API_KEY,
      customer_number: process.env.POSTNL_CUSTOMER_NUMBER,
      customer_code: process.env.POSTNL_CUSTOMER_CODE,
      test_mode: process.env.NODE_ENV === 'development'
    });

    this.dhlProvider = new DHLProvider({
      api_key: process.env.DHL_API_KEY,
      account_number: process.env.DHL_ACCOUNT_NUMBER,
      test_mode: process.env.NODE_ENV === 'development'
    });

    this.emailService = new EmailCampaignService();
    this.queueManager = QueueManager.getInstance();
    this.postDeliveryService = new PostDeliveryService();

    console.log('[ProefpakketAssignment] Service initialized with conversion tracking');
  }

  // =====================================================
  // MAIN ASSIGNMENT FLOW
  // =====================================================

  /**
   * Process a new prospect for automatic proefpakket assignment
   */
  async processProspectAssignment(request: AssignmentRequest): Promise<AssignmentResult> {
    const startTime = Date.now();
    const result: AssignmentResult = {
      success: false,
      prospect_id: request.prospect_id,
      warnings: [],
      actions_taken: []
    };

    try {
      console.log(`[ProefpakketAssignment] Processing assignment for prospect ${request.prospect_id}`);
      result.actions_taken.push('Started assignment process');

      // Get prospect details
      const prospect = await this.getProspectDetails(request.prospect_id);
      if (!prospect) {
        result.error = 'Prospect not found';
        return result;
      }

      result.actions_taken.push('Retrieved prospect details');

      // Check if prospect is eligible for assignment
      const eligibilityCheck = await this.checkEligibility(prospect);
      if (!eligibilityCheck.eligible) {
        result.error = eligibilityCheck.reason;
        result.warnings.push(...eligibilityCheck.warnings);
        return result;
      }

      result.actions_taken.push('Eligibility check passed');

      // Find applicable assignment rule
      const assignmentRule = request.override_rules ? 
        await this.getDefaultRule() : 
        await this.findApplicableRule(prospect);

      if (!assignmentRule) {
        result.error = 'No applicable assignment rule found';
        return result;
      }

      result.rule_applied = assignmentRule.name;
      result.actions_taken.push(`Applied rule: ${assignmentRule.name}`);

      // Determine product and shipping service
      const productSku = request.force_product_sku || assignmentRule.assignment_config.product_sku;
      const shippingService = request.force_shipping_service || assignmentRule.assignment_config.shipping_service;

      result.product_assigned = productSku;
      result.shipping_service = shippingService;

      // Check inventory availability
      const product = await this.inventoryManager.getProductBySku(productSku);
      if (!product) {
        result.error = `Product not found: ${productSku}`;
        return result;
      }

      const hasInventory = await this.inventoryManager.checkAvailability(product.id, 1);
      if (!hasInventory) {
        result.error = `Insufficient inventory for product: ${productSku}`;
        result.warnings.push('Low inventory alert sent to admin');
        await this.sendLowInventoryAlert(product);
        return result;
      }

      result.actions_taken.push('Inventory availability confirmed');

      // Reserve inventory
      const reservationResult = await this.inventoryManager.reserveInventory({
        product_id: product.id,
        quantity: 1,
        reference_id: prospect.id,
        reference_type: 'prospect_assignment'
      });

      if (!reservationResult.success) {
        result.error = `Failed to reserve inventory: ${reservationResult.error}`;
        return result;
      }

      result.actions_taken.push('Inventory reserved');

      // Create fulfillment order
      const orderResult = await this.createFulfillmentOrder(prospect, product, assignmentRule, request);
      if (!orderResult.success) {
        // Release inventory reservation
        await this.inventoryManager.releaseReservation(product.id, 1, 'Order creation failed');
        result.error = `Failed to create order: ${orderResult.error}`;
        return result;
      }

      result.order_id = orderResult.order_id;
      result.actions_taken.push(`Fulfillment order created: ${orderResult.order_id}`);

      // Initialize conversion journey
      try {
        const journey = await this.postDeliveryService.initializeJourney(
          request.prospect_id, 
          orderResult.order_id!
        );
        result.actions_taken.push(`Conversion journey initialized: ${journey.id}`);
        console.log(`[ProefpakketAssignment] Conversion journey started: ${journey.id}`);
      } catch (journeyError) {
        console.warn('[ProefpakketAssignment] Failed to initialize conversion journey:', journeyError);
        result.warnings.push('Conversion journey initialization failed');
      }

      // Create shipment
      const shipmentResult = await this.createShipment(orderResult.order!, product, shippingService);
      if (shipmentResult.success) {
        result.tracking_number = shipmentResult.tracking_number;
        result.estimated_delivery = shipmentResult.estimated_delivery;
        result.actions_taken.push(`Shipment created: ${shipmentResult.tracking_number}`);

        // Confirm inventory shipment
        await this.inventoryManager.confirmShipment(product.id, 1, shipmentResult.shipment_id!);
        result.actions_taken.push('Inventory shipment confirmed');

        // Update order status
        await this.updateOrderStatus(orderResult.order_id!, 'shipped', {
          tracking_number: shipmentResult.tracking_number,
          estimated_delivery: shipmentResult.estimated_delivery
        });

      } else {
        result.warnings.push(`Shipment creation failed: ${shipmentResult.error}`);
        // Keep order in 'pending' status for manual processing
      }

      // Schedule follow-up communications
      await this.scheduleFollowUpCommunications(prospect, orderResult.order_id!, assignmentRule);
      result.actions_taken.push('Follow-up communications scheduled');

      // Update assignment rule usage
      await this.updateRuleUsage(assignmentRule.id);
      result.actions_taken.push('Rule usage updated');

      result.success = true;
      console.log(`[ProefpakketAssignment] Assignment completed successfully in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('[ProefpakketAssignment] Assignment failed:', error);
      result.error = error instanceof Error ? error.message : String(error);
      result.actions_taken.push('Assignment failed with error');
    }

    return result;
  }

  /**
   * Bulk process multiple prospects for assignment
   */
  async bulkProcessAssignments(requests: AssignmentRequest[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: AssignmentResult[];
  }> {
    console.log(`[ProefpakketAssignment] Starting bulk assignment for ${requests.length} prospects`);

    const results: AssignmentResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const request of requests) {
      try {
        const result = await this.processProspectAssignment(request);
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        // Small delay to prevent overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[ProefpakketAssignment] Bulk assignment error for ${request.prospect_id}:`, error);
        results.push({
          success: false,
          prospect_id: request.prospect_id,
          error: error instanceof Error ? error.message : String(error),
          warnings: [],
          actions_taken: ['Bulk processing failed']
        });
        failed++;
      }
    }

    console.log(`[ProefpakketAssignment] Bulk assignment completed: ${successful}/${requests.length} successful`);

    return {
      total: requests.length,
      successful,
      failed,
      results
    };
  }

  // =====================================================
  // RULE MANAGEMENT
  // =====================================================

  /**
   * Get all active assignment rules
   */
  async getAssignmentRules(): Promise<AssignmentRule[]> {
    try {
      const { data, error } = await this.supabase
        .from('fulfillment_rules')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(this.parseRuleFromDb);

    } catch (error) {
      console.error('[ProefpakketAssignment] Error getting assignment rules:', error);
      return [];
    }
  }

  /**
   * Find the best applicable rule for a prospect
   */
  async findApplicableRule(prospect: EnrichedProspect): Promise<AssignmentRule | null> {
    const rules = await this.getAssignmentRules();
    
    for (const rule of rules) {
      if (await this.evaluateRuleConditions(rule, prospect)) {
        // Check if rule usage limits are met
        const canUseRule = await this.checkRuleUsageLimits(rule);
        if (canUseRule) {
          return rule;
        }
      }
    }

    return null;
  }

  /**
   * Evaluate if a rule's conditions match a prospect
   */
  private async evaluateRuleConditions(rule: AssignmentRule, prospect: EnrichedProspect): Promise<boolean> {
    const conditions = rule.trigger_conditions;

    // Check business segment
    if (conditions.segments && !conditions.segments.includes(prospect.business_segment)) {
      return false;
    }

    // Check country
    if (conditions.countries && !conditions.countries.includes(prospect.shipping_country || prospect.country || 'NL')) {
      return false;
    }

    // Check enrichment score
    if (conditions.min_enrichment_score && prospect.enrichment_score < conditions.min_enrichment_score) {
      return false;
    }

    if (conditions.max_enrichment_score && prospect.enrichment_score > conditions.max_enrichment_score) {
      return false;
    }

    // Check if prospect was already contacted
    if (conditions.exclude_if_contacted) {
      const wasContacted = await this.checkIfProspectWasContacted(prospect.id);
      if (wasContacted) {
        return false;
      }
    }

    // Check if prospect already has an order
    if (conditions.exclude_if_ordered) {
      const hasOrder = await this.checkIfProspectHasOrder(prospect.id);
      if (hasOrder) {
        return false;
      }
    }

    return true;
  }

  // =====================================================
  // FULFILLMENT OPERATIONS
  // =====================================================

  /**
   * Create a fulfillment order
   */
  private async createFulfillmentOrder(
    prospect: EnrichedProspect, 
    product: any, 
    rule: AssignmentRule,
    request: AssignmentRequest
  ): Promise<{ success: boolean; order_id?: string; order?: FulfillmentOrder; error?: string }> {
    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      const orderData = {
        order_number: orderNumber,
        prospect_id: prospect.id,
        status: 'pending',
        recipient_name: prospect.business_name,
        recipient_company: prospect.business_name,
        recipient_email: prospect.email,
        recipient_phone: prospect.phone,
        shipping_address_line1: prospect.address || 'Address not provided',
        shipping_address_line2: prospect.address_line2,
        shipping_city: prospect.city || 'City not provided',
        shipping_postal_code: prospect.postal_code || '1000 AA',
        shipping_country: prospect.country || 'NL',
        source_campaign: `rule_${rule.id}`,
        notes: request.custom_notes || `Automatically assigned via rule: ${rule.name}`,
        created_at: new Date().toISOString(),
        metadata: {
          rule_applied: rule.id,
          assignment_trigger: request.trigger_source,
          prospect_enrichment_score: prospect.enrichment_score
        }
      };

      // Insert fulfillment order
      const { data: orderResult, error: orderError } = await this.supabase
        .from('fulfillment_orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create fulfillment order: ${orderError.message}`);
      }

      // Insert order items
      const { error: itemError } = await this.supabase
        .from('fulfillment_order_items')
        .insert([{
          fulfillment_order_id: orderResult.id,
          product_id: product.id,
          quantity: 1,
          unit_value_euros: product.value_euros,
          total_value_euros: product.value_euros
        }]);

      if (itemError) {
        throw itemError;
      }

      return {
        success: true,
        order_id: orderResult.id,
        order: orderResult
      };

    } catch (error) {
      console.error('[ProefpakketAssignment] Error creating fulfillment order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create shipment with appropriate provider
   */
  private async createShipment(
    order: FulfillmentOrder, 
    product: any, 
    shippingService: string
  ): Promise<{
    success: boolean;
    shipment_id?: string;
    tracking_number?: string;
    estimated_delivery?: Date;
    error?: string;
  }> {
    try {
      // Determine shipping provider based on country
      const provider = order.shipping_country === 'NL' ? this.postnlProvider : this.dhlProvider;
      
      // Build shipment request
      const shipmentRequest = {
        sender: {
          name: 'Wasgeurtje.nl',
          company: 'Wasgeurtje.nl',
          address_line1: 'Bedrijfsstraat 1',
          city: 'Amsterdam',
          postal_code: '1012 AB',
          country: 'NL',
          phone: '+31201234567',
          email: 'info@wasgeurtje.nl'
        },
        recipient: {
          name: order.recipient_name,
          company: order.recipient_company,
          address_line1: order.shipping_address_line1,
          address_line2: order.shipping_address_line2,
          city: order.shipping_city,
          postal_code: order.shipping_postal_code,
          country: order.shipping_country,
          phone: order.recipient_phone,
          email: order.recipient_email
        },
        packages: [{
          weight_grams: product.weight_grams,
          length_cm: product.dimensions_length_cm,
          width_cm: product.dimensions_width_cm,
          height_cm: product.dimensions_height_cm,
          value_euros: product.value_euros,
          description: product.description
        }],
        service_type: shippingService,
        reference: order.order_number
      };

      // Create shipment
      const shipmentResponse = await provider.createShipment(shipmentRequest);

      if (shipmentResponse.success) {
        // Save shipment to database
        const { data: shipmentData, error } = await this.supabase
          .from('shipments')
          .insert([{
            fulfillment_order_id: order.id,
            shipping_provider_id: provider.getProviderCode(),
            tracking_number: shipmentResponse.tracking_number,
            service_type: shippingService,
            weight_grams: product.weight_grams,
            shipping_cost_euros: shipmentResponse.cost_euros,
            total_cost_euros: shipmentResponse.cost_euros,
            shipping_label_url: shipmentResponse.label_url,
            status: 'created',
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return {
          success: true,
          shipment_id: shipmentData.id,
          tracking_number: shipmentResponse.tracking_number,
          estimated_delivery: shipmentResponse.estimated_delivery_date
        };
      } else {
        return {
          success: false,
          error: shipmentResponse.error
        };
      }

    } catch (error) {
      console.error('[ProefpakketAssignment] Error creating shipment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async getProspectDetails(prospectId: string): Promise<EnrichedProspect | null> {
    try {
      const { data, error } = await this.supabase
        .from('commercial_prospects')
        .select('*')
        .eq('id', prospectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;

    } catch (error) {
      console.error('[ProefpakketAssignment] Error getting prospect details:', error);
      return null;
    }
  }

  private async checkEligibility(prospect: EnrichedProspect): Promise<{
    eligible: boolean;
    reason?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Check if prospect has required address information
    if (!prospect.address || !prospect.city || !prospect.postal_code) {
      return {
        eligible: false,
        reason: 'Prospect missing required address information',
        warnings
      };
    }

    // Check if prospect was recently processed
    const recentOrder = await this.checkIfProspectHasRecentOrder(prospect.id, 30); // 30 days
    if (recentOrder) {
      return {
        eligible: false,
        reason: 'Prospect has received a proefpakket within the last 30 days',
        warnings
      };
    }

    // Check enrichment score threshold
    if (prospect.enrichment_score < 0.3) {
      warnings.push('Low enrichment score - assignment may be risky');
    }

    return {
      eligible: true,
      warnings
    };
  }

  private async getDefaultRule(): Promise<AssignmentRule | null> {
    const rules = await this.getAssignmentRules();
    return rules.find(rule => rule.name.includes('Default')) || rules[0] || null;
  }

  private async generateOrderNumber(): Promise<string> {
    // Generate order number in format: WG-YYYYMMDD-XXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WG-${today}-${random}`;
  }

  private async scheduleFollowUpCommunications(
    prospect: EnrichedProspect, 
    orderId: string, 
    rule: AssignmentRule
  ): Promise<void> {
    try {
      // Schedule shipment confirmation email
      await this.emailService.scheduleInitialOutreach(
        prospect.id,
        'proefpakket_shipment_confirmation'
      );

      // Schedule delivery confirmation email (3 days later)
      const deliveryFollowUp = new Date();
      deliveryFollowUp.setDate(deliveryFollowUp.getDate() + 3);

      await this.queueManager.addJob(
        'email_campaign',
        'system',
        {
          action: 'send_email',
          prospect_id: prospect.id,
          template_type: 'proefpakket_delivery_followup',
          order_id: orderId
        },
        {
          priority: 5,
          scheduledAt: deliveryFollowUp
        }
      );

    } catch (error) {
      console.error('[ProefpakketAssignment] Error scheduling follow-up communications:', error);
    }
  }

  // Utility methods
  private async checkIfProspectWasContacted(prospectId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('commercial_email_queue')
        .select('id')
        .eq('prospect_id', prospectId)
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  private async checkIfProspectHasOrder(prospectId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('fulfillment_orders')
        .select('id')
        .eq('prospect_id', prospectId)
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  private async checkIfProspectHasRecentOrder(prospectId: string, days: number): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('fulfillment_orders')
        .select('id')
        .eq('prospect_id', prospectId)
        .gte('created_at', cutoffDate.toISOString())
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  private async checkRuleUsageLimits(rule: AssignmentRule): Promise<boolean> {
    // Check daily usage limit
    if (rule.limits.max_uses_per_day) {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await this.supabase
        .from('fulfillment_orders')
        .select('id', { count: 'exact' })
        .eq('source_campaign', `rule_${rule.id}`)
        .gte('created_at', today);

      if (count && count >= rule.limits.max_uses_per_day) {
        return false;
      }
    }

    // Check date validity
    if (rule.limits.valid_until) {
      const validUntil = new Date(rule.limits.valid_until);
      if (new Date() > validUntil) {
        return false;
      }
    }

    return true;
  }

  private async updateRuleUsage(ruleId: string): Promise<void> {
    try {
      await this.supabase
        .from('fulfillment_rules')
        .update({
          times_triggered: this.supabase.sql`times_triggered + 1`,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', ruleId);
    } catch (error) {
      console.error('[ProefpakketAssignment] Error updating rule usage:', error);
    }
  }

  private async updateOrderStatus(orderId: string, status: string, metadata?: any): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      }

      if (metadata) {
        updateData.metadata = metadata;
      }

      await this.supabase
        .from('fulfillment_orders')
        .update(updateData)
        .eq('id', orderId);
    } catch (error) {
      console.error('[ProefpakketAssignment] Error updating order status:', error);
    }
  }

  private async sendLowInventoryAlert(product: any): Promise<void> {
    try {
      // This would send an alert to administrators
      console.log(`[ProefpakketAssignment] LOW INVENTORY ALERT: ${product.name} (${product.sku})`);
      
      // In a real implementation, this would send an email or notification
      // await this.emailService.sendAdminAlert('low_inventory', { product });
    } catch (error) {
      console.error('[ProefpakketAssignment] Error sending low inventory alert:', error);
    }
  }

  private parseRuleFromDb(data: any): AssignmentRule {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      active: data.active,
      priority: data.priority,
      trigger_conditions: data.trigger_conditions || {},
      assignment_config: data.action_config || {},
      limits: {
        max_uses_per_day: data.max_uses_per_day,
        max_uses_per_prospect: data.max_uses_per_prospect || 1,
        valid_from: data.valid_from,
        valid_until: data.valid_until
      }
    };
  }
} 