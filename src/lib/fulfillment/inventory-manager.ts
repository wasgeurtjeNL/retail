// =====================================================
// INVENTORY MANAGER - Proefpakket Stock Management
// Automated inventory control with reservations and reordering
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  weight_grams: number;
  dimensions_length_cm?: number;
  dimensions_width_cm?: number;
  dimensions_height_cm?: number;
  value_euros: number;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  location: string;
  quantity_total: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_shipped: number;
  reorder_level: number;
  max_stock_level: number;
  last_restock_date?: string;
  product?: Product;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'incoming' | 'outgoing' | 'reserved' | 'shipped' | 'returned' | 'adjustment';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string; // Order ID, shipment ID, etc.
  reference_type?: string;
  reason: string;
  location: string;
  created_by?: string;
  created_at: string;
}

export interface InventoryStats {
  total_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_value_euros: number;
  total_reserved_value_euros: number;
  total_available_value_euros: number;
  movements_today: number;
  reorder_alerts: number;
}

export interface ReservationRequest {
  product_id: string;
  quantity: number;
  reference_id: string;
  reference_type: string;
  expires_at?: Date;
}

export interface ReservationResult {
  success: boolean;
  reservation_id?: string;
  error?: string;
  quantity_reserved?: number;
  expires_at?: Date;
}

export interface StockAlert {
  product_id: string;
  product_name: string;
  sku: string;
  current_quantity: number;
  reorder_level: number;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
  severity: 'warning' | 'critical';
  created_at: string;
}

export class InventoryManager {
  private supabase = getServiceRoleClient();

  constructor() {
    console.log('[InventoryManager] Inventory management system initialized');
  }

  // =====================================================
  // PRODUCT MANAGEMENT
  // =====================================================

  /**
   * Get all products with their inventory status
   */
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_products')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('[InventoryManager] Error getting products:', error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_products')
        .select('*')
        .eq('sku', sku)
        .eq('active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      return data;

    } catch (error) {
      console.error('[InventoryManager] Error getting product by SKU:', error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create initial inventory record
      await this.supabase
        .from('proefpakket_inventory')
        .insert([{
          product_id: data.id,
          location: 'warehouse_main',
          quantity_total: 0,
          quantity_available: 0,
          quantity_reserved: 0,
          quantity_shipped: 0,
          reorder_level: 10,
          max_stock_level: 1000
        }]);

      console.log(`[InventoryManager] Created product: ${data.name} (${data.sku})`);
      return data;

    } catch (error) {
      console.error('[InventoryManager] Error creating product:', error);
      throw error;
    }
  }

  // =====================================================
  // INVENTORY MANAGEMENT
  // =====================================================

  /**
   * Get inventory status for all products
   */
  async getInventoryStatus(): Promise<InventoryItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_inventory')
        .select(`
          *,
          product:proefpakket_products(*)
        `)
        .order('created_at');

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('[InventoryManager] Error getting inventory status:', error);
      throw error;
    }
  }

  /**
   * Get inventory for specific product
   */
  async getProductInventory(productId: string): Promise<InventoryItem | null> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_inventory')
        .select(`
          *,
          product:proefpakket_products(*)
        `)
        .eq('product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;

    } catch (error) {
      console.error('[InventoryManager] Error getting product inventory:', error);
      throw error;
    }
  }

  /**
   * Check if product has sufficient stock
   */
  async checkAvailability(productId: string, quantity: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_inventory')
        .select('quantity_available')
        .eq('product_id', productId)
        .single();

      if (error) {
        throw error;
      }

      return data.quantity_available >= quantity;

    } catch (error) {
      console.error('[InventoryManager] Error checking availability:', error);
      return false;
    }
  }

  // =====================================================
  // RESERVATION SYSTEM
  // =====================================================

  /**
   * Reserve inventory for an order
   */
  async reserveInventory(request: ReservationRequest): Promise<ReservationResult> {
    try {
      console.log(`[InventoryManager] Reserving ${request.quantity} units of product ${request.product_id}`);

      // Use database function for atomic reservation
      const { data, error } = await this.supabase
        .rpc('reserve_inventory', {
          p_product_id: request.product_id,
          p_quantity: request.quantity
        });

      if (error) {
        throw error;
      }

      if (data) {
        // Record the stock movement
        await this.recordStockMovement({
          product_id: request.product_id,
          movement_type: 'reserved',
          quantity_change: -request.quantity,
          reference_id: request.reference_id,
          reference_type: request.reference_type,
          reason: `Reserved for ${request.reference_type} ${request.reference_id}`,
          location: 'warehouse_main'
        });

        return {
          success: true,
          reservation_id: `res_${Date.now()}`,
          quantity_reserved: request.quantity,
          expires_at: request.expires_at
        };
      } else {
        return {
          success: false,
          error: 'Insufficient inventory available'
        };
      }

    } catch (error) {
      console.error('[InventoryManager] Error reserving inventory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Confirm shipment (move from reserved to shipped)
   */
  async confirmShipment(productId: string, quantity: number, shipmentId: string): Promise<boolean> {
    try {
      console.log(`[InventoryManager] Confirming shipment of ${quantity} units of product ${productId}`);

      // Use database function for atomic confirmation
      const { data, error } = await this.supabase
        .rpc('confirm_shipment', {
          p_product_id: productId,
          p_quantity: quantity
        });

      if (error) {
        throw error;
      }

      if (data) {
        // Record the stock movement
        await this.recordStockMovement({
          product_id: productId,
          movement_type: 'shipped',
          quantity_change: -quantity,
          reference_id: shipmentId,
          reference_type: 'shipment',
          reason: `Shipped via shipment ${shipmentId}`,
          location: 'warehouse_main'
        });

        return true;
      }

      return false;

    } catch (error) {
      console.error('[InventoryManager] Error confirming shipment:', error);
      return false;
    }
  }

  /**
   * Release reservation (return reserved to available)
   */
  async releaseReservation(productId: string, quantity: number, reason: string): Promise<boolean> {
    try {
      console.log(`[InventoryManager] Releasing reservation of ${quantity} units of product ${productId}`);

      const { error } = await this.supabase
        .from('proefpakket_inventory')
        .update({
          quantity_available: this.supabase.sql`quantity_available + ${quantity}`,
          quantity_reserved: this.supabase.sql`quantity_reserved - ${quantity}`,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', productId)
        .gte('quantity_reserved', quantity);

      if (error) {
        throw error;
      }

      // Record the stock movement
      await this.recordStockMovement({
        product_id: productId,
        movement_type: 'adjustment',
        quantity_change: quantity,
        reason: `Released reservation: ${reason}`,
        location: 'warehouse_main'
      });

      return true;

    } catch (error) {
      console.error('[InventoryManager] Error releasing reservation:', error);
      return false;
    }
  }

  // =====================================================
  // STOCK MOVEMENTS
  // =====================================================

  /**
   * Add incoming stock (receiving)
   */
  async addStock(productId: string, quantity: number, reason: string, referenceId?: string): Promise<boolean> {
    try {
      console.log(`[InventoryManager] Adding ${quantity} units to product ${productId}`);

      // Get current inventory
      const inventory = await this.getProductInventory(productId);
      if (!inventory) {
        throw new Error('Product inventory not found');
      }

      const previousTotal = inventory.quantity_total;
      const newTotal = previousTotal + quantity;

      // Update inventory
      const { error } = await this.supabase
        .from('proefpakket_inventory')
        .update({
          quantity_total: newTotal,
          quantity_available: this.supabase.sql`quantity_available + ${quantity}`,
          last_restock_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('product_id', productId);

      if (error) {
        throw error;
      }

      // Record the stock movement
      await this.recordStockMovement({
        product_id: productId,
        movement_type: 'incoming',
        quantity_change: quantity,
        previous_quantity: previousTotal,
        new_quantity: newTotal,
        reference_id: referenceId,
        reference_type: 'restock',
        reason,
        location: 'warehouse_main'
      });

      console.log(`[InventoryManager] Stock added successfully: ${quantity} units of ${productId}`);
      return true;

    } catch (error) {
      console.error('[InventoryManager] Error adding stock:', error);
      return false;
    }
  }

  /**
   * Adjust stock (inventory correction)
   */
  async adjustStock(productId: string, newQuantity: number, reason: string): Promise<boolean> {
    try {
      console.log(`[InventoryManager] Adjusting stock for product ${productId} to ${newQuantity}`);

      // Get current inventory
      const inventory = await this.getProductInventory(productId);
      if (!inventory) {
        throw new Error('Product inventory not found');
      }

      const previousQuantity = inventory.quantity_total;
      const quantityChange = newQuantity - previousQuantity;

      // Calculate new available quantity
      const reservedAndShipped = inventory.quantity_reserved + inventory.quantity_shipped;
      const newAvailable = Math.max(0, newQuantity - reservedAndShipped);

      // Update inventory
      const { error } = await this.supabase
        .from('proefpakket_inventory')
        .update({
          quantity_total: newQuantity,
          quantity_available: newAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', productId);

      if (error) {
        throw error;
      }

      // Record the stock movement
      await this.recordStockMovement({
        product_id: productId,
        movement_type: 'adjustment',
        quantity_change: quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reason,
        location: 'warehouse_main'
      });

      console.log(`[InventoryManager] Stock adjusted successfully: ${productId} from ${previousQuantity} to ${newQuantity}`);
      return true;

    } catch (error) {
      console.error('[InventoryManager] Error adjusting stock:', error);
      return false;
    }
  }

  /**
   * Record stock movement for audit trail
   */
  private async recordStockMovement(movement: Omit<StockMovement, 'id' | 'created_at' | 'previous_quantity' | 'new_quantity'>): Promise<void> {
    try {
      // Get current quantity for audit trail
      const inventory = await this.getProductInventory(movement.product_id);
      const currentQuantity = inventory?.quantity_total || 0;

      const movementRecord = {
        product_id: movement.product_id,
        movement_type: movement.movement_type,
        quantity_change: movement.quantity_change,
        previous_quantity: movement.previous_quantity || currentQuantity - movement.quantity_change,
        new_quantity: movement.new_quantity || currentQuantity,
        reference_id: movement.reference_id,
        reference_type: movement.reference_type,
        reason: movement.reason,
        location: movement.location,
        created_by: movement.created_by,
        created_at: new Date().toISOString()
      };

      // Note: We would need to create a stock_movements table for this
      // For now, we'll log it
      console.log('[InventoryManager] Stock movement recorded:', movementRecord);

    } catch (error) {
      console.error('[InventoryManager] Error recording stock movement:', error);
    }
  }

  // =====================================================
  // ALERTS AND MONITORING
  // =====================================================

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(): Promise<StockAlert[]> {
    try {
      const { data, error } = await this.supabase
        .from('inventory_status')
        .select('*')
        .in('stock_status', ['LOW_STOCK', 'OUT_OF_STOCK']);

      if (error) {
        throw error;
      }

      return (data || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        current_quantity: item.quantity_available,
        reorder_level: item.reorder_level,
        alert_type: item.stock_status === 'OUT_OF_STOCK' ? 'out_of_stock' : 'low_stock',
        severity: item.stock_status === 'OUT_OF_STOCK' ? 'critical' : 'warning',
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('[InventoryManager] Error getting low stock alerts:', error);
      return [];
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      const inventory = await this.getInventoryStatus();
      
      const stats: InventoryStats = {
        total_products: inventory.length,
        low_stock_products: 0,
        out_of_stock_products: 0,
        total_value_euros: 0,
        total_reserved_value_euros: 0,
        total_available_value_euros: 0,
        movements_today: 0,
        reorder_alerts: 0
      };

      for (const item of inventory) {
        if (!item.product) continue;

        // Count stock status
        if (item.quantity_available === 0) {
          stats.out_of_stock_products++;
        } else if (item.quantity_available <= item.reorder_level) {
          stats.low_stock_products++;
        }

        // Calculate values
        const productValue = item.product.value_euros;
        stats.total_value_euros += item.quantity_total * productValue;
        stats.total_reserved_value_euros += item.quantity_reserved * productValue;
        stats.total_available_value_euros += item.quantity_available * productValue;

        // Reorder alerts
        if (item.quantity_available <= item.reorder_level) {
          stats.reorder_alerts++;
        }
      }

      // Get movements today (would need stock_movements table)
      stats.movements_today = 0;

      return stats;

    } catch (error) {
      console.error('[InventoryManager] Error getting inventory stats:', error);
      throw error;
    }
  }

  // =====================================================
  // REORDER MANAGEMENT
  // =====================================================

  /**
   * Get products that need reordering
   */
  async getProductsNeedingReorder(): Promise<InventoryItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('proefpakket_inventory')
        .select(`
          *,
          product:proefpakket_products(*)
        `)
        .filter('quantity_available', 'lte', 'reorder_level')
        .eq('product.active', true);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('[InventoryManager] Error getting products needing reorder:', error);
      return [];
    }
  }

  /**
   * Calculate recommended reorder quantity
   */
  calculateReorderQuantity(inventory: InventoryItem): number {
    // Simple reorder calculation: bring stock to max level
    const currentTotal = inventory.quantity_total;
    const maxLevel = inventory.max_stock_level;
    const reorderQuantity = maxLevel - currentTotal;

    return Math.max(0, reorderQuantity);
  }

  /**
   * Generate reorder recommendations
   */
  async getReorderRecommendations(): Promise<Array<{
    product: Product;
    current_stock: number;
    reorder_level: number;
    recommended_quantity: number;
    estimated_cost: number;
  }>> {
    try {
      const productsNeedingReorder = await this.getProductsNeedingReorder();
      
      return productsNeedingReorder.map(inventory => {
        const recommendedQuantity = this.calculateReorderQuantity(inventory);
        const estimatedCost = recommendedQuantity * (inventory.product?.value_euros || 0);

        return {
          product: inventory.product!,
          current_stock: inventory.quantity_total,
          reorder_level: inventory.reorder_level,
          recommended_quantity: recommendedQuantity,
          estimated_cost: estimatedCost
        };
      });

    } catch (error) {
      console.error('[InventoryManager] Error getting reorder recommendations:', error);
      return [];
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Get inventory movements for a product (would need stock_movements table)
   */
  async getProductMovements(productId: string, limit: number = 50): Promise<StockMovement[]> {
    // This would query a stock_movements table
    // For now, return empty array
    console.log(`[InventoryManager] Getting movements for product ${productId} (not implemented)`);
    return [];
  }

  /**
   * Validate inventory data consistency
   */
  async validateInventoryConsistency(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const inventory = await this.getInventoryStatus();
      const errors: string[] = [];

      for (const item of inventory) {
        // Check if quantities add up
        const totalCalculated = item.quantity_available + item.quantity_reserved + item.quantity_shipped;
        if (totalCalculated !== item.quantity_total) {
          errors.push(`Product ${item.product?.sku}: quantities don't add up (${totalCalculated} vs ${item.quantity_total})`);
        }

        // Check for negative quantities
        if (item.quantity_available < 0) {
          errors.push(`Product ${item.product?.sku}: negative available quantity`);
        }
        if (item.quantity_reserved < 0) {
          errors.push(`Product ${item.product?.sku}: negative reserved quantity`);
        }
        if (item.quantity_shipped < 0) {
          errors.push(`Product ${item.product?.sku}: negative shipped quantity`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('[InventoryManager] Error validating inventory consistency:', error);
      return {
        valid: false,
        errors: ['Failed to validate inventory consistency']
      };
    }
  }
} 