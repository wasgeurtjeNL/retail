// =====================================================
// FULFILLMENT ORDERS API - Order Management
// CRUD operations for fulfillment orders with tracking integration
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { TrackingNotificationService } from '@/lib/fulfillment/tracking-service';
import { ProefpakketAssignmentService } from '@/lib/fulfillment/proefpakket-assignment';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const prospectId = searchParams.get('prospect_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const orderBy = searchParams.get('order_by') || 'created_at';
    const orderDirection = searchParams.get('order_direction') || 'desc';

    console.log('[Fulfillment Orders API] Getting orders with filters:', {
      status, prospectId, page, limit, orderBy, orderDirection
    });

    const supabase = getServiceRoleClient();
    
    let query = supabase
      .from('fulfillment_orders')
      .select(`
        *,
        commercial_prospects (
          id,
          business_name,
          contact_name,
          email,
          lead_quality_score
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (prospectId) {
      query = query.eq('prospect_id', prospectId);
    }

    // Apply pagination and ordering
    const offset = (page - 1) * limit;
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    // Get tracking events for orders
    const orderIds = orders?.map(order => order.id) || [];
    let trackingEvents: any[] = [];
    
    if (orderIds.length > 0) {
      const { data: events, error: trackingError } = await supabase
        .from('fulfillment_tracking_events')
        .select('order_id, event_type, event_timestamp, location')
        .in('order_id', orderIds)
        .order('event_timestamp', { ascending: false });

      if (trackingError) {
        console.warn('[Fulfillment Orders API] Failed to fetch tracking events:', trackingError);
      } else {
        trackingEvents = events || [];
      }
    }

    // Enrich orders with latest tracking info
    const enrichedOrders = orders?.map(order => {
      const latestEvent = trackingEvents.find(event => event.order_id === order.id);
      return {
        ...order,
        latest_tracking_event: latestEvent || null
      };
    }) || [];

    console.log(`[Fulfillment Orders API] Found ${enrichedOrders.length} orders`);

    return NextResponse.json({
      success: true,
      data: enrichedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('[Fulfillment Orders API] Error fetching orders:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Fulfillment Orders API] Creating new order');

    const body = await req.json();
    const { prospect_id, force_assignment = false, ...orderData } = body;

    if (!prospect_id) {
      return NextResponse.json(
        { error: 'prospect_id is required' },
        { status: 400 }
      );
    }

    // Use the assignment service to create and assign order
    const assignmentService = new ProefpakketAssignmentService();
    
    const result = await assignmentService.processProspectAssignment({
      prospect_id,
      trigger_source: 'manual',
      override_rules: force_assignment,
      custom_notes: orderData.notes
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to create order',
          message: result.error,
          warnings: result.warnings
        },
        { status: 400 }
      );
    }

    console.log(`[Fulfillment Orders API] Successfully created order: ${result.order_id}`);

    return NextResponse.json({
      success: true,
      data: {
        order_id: result.order_id,
        tracking_number: result.tracking_number,
        product_assigned: result.product_assigned,
        shipping_service: result.shipping_service,
        estimated_delivery: result.estimated_delivery,
        actions_taken: result.actions_taken
      }
    });

  } catch (error) {
    console.error('[Fulfillment Orders API] Error creating order:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, tracking_number, notes, ...updateData } = body;

    console.log(`[Fulfillment Orders API] Updating order ${orderId}:`, body);

    const supabase = getServiceRoleClient();

    // Prepare update data
    const updates = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      
      // Set timestamp fields based on status
      if (status === 'shipped' && !updates.shipped_at) {
        updates.shipped_at = new Date().toISOString();
      } else if (status === 'delivered' && !updates.delivered_at) {
        updates.delivered_at = new Date().toISOString();
      }
    }

    if (tracking_number) {
      updates.tracking_number = tracking_number;
    }

    if (notes) {
      updates.notes = notes;
    }

    // Update order
    const { data: order, error } = await supabase
      .from('fulfillment_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    // If status changed, record tracking event
    if (status && status !== order.status) {
      const trackingService = new TrackingNotificationService();
      
      try {
        await trackingService.recordTrackingEvent({
          tracking_number: order.tracking_number || `ORDER-${orderId}`,
          order_id: orderId,
          event_type: status === 'shipped' ? 'shipped' : 
                     status === 'delivered' ? 'delivered' : 'in_transit',
          event_description: `Order status updated to ${status}`,
          event_timestamp: new Date()
        });
      } catch (trackingError) {
        console.warn('[Fulfillment Orders API] Failed to record tracking event:', trackingError);
      }
    }

    console.log(`[Fulfillment Orders API] Successfully updated order ${orderId}`);

    return NextResponse.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('[Fulfillment Orders API] Error updating order:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Fulfillment Orders API] Cancelling order ${orderId}`);

    const supabase = getServiceRoleClient();

    // Don't actually delete, just mark as cancelled
    const { data: order, error } = await supabase
      .from('fulfillment_orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }

    // Record tracking event
    const trackingService = new TrackingNotificationService();
    
    try {
      await trackingService.recordTrackingEvent({
        tracking_number: order.tracking_number || `ORDER-${orderId}`,
        order_id: orderId,
        event_type: 'failed',
        event_description: 'Order cancelled',
        event_timestamp: new Date()
      });
    } catch (trackingError) {
      console.warn('[Fulfillment Orders API] Failed to record tracking event:', trackingError);
    }

    console.log(`[Fulfillment Orders API] Successfully cancelled order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('[Fulfillment Orders API] Error cancelling order:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to cancel order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 