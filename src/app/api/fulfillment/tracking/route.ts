// =====================================================
// FULFILLMENT TRACKING API - Tracking Information & Analytics
// Get tracking history, batch status, and delivery metrics
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { TrackingNotificationService } from '@/lib/fulfillment/tracking-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const trackingNumber = searchParams.get('tracking_number');
    const action = searchParams.get('action') || 'history';

    console.log('[Fulfillment Tracking API] Request:', { orderId, trackingNumber, action });

    const trackingService = new TrackingNotificationService();

    switch (action) {
      case 'history':
        return await getTrackingHistory(orderId, trackingNumber, trackingService);
      
      case 'batch_status':
        return await getBatchStatus(req, trackingService);
      
      case 'analytics':
        return await getTrackingAnalytics(req, trackingService);
      
      case 'delivery_metrics':
        return await getDeliveryMetrics(req, trackingService);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process tracking request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    console.log('[Fulfillment Tracking API] POST request:', { action });

    switch (action) {
      case 'record_event':
        return await recordTrackingEvent(body);
      
      case 'batch_update':
        return await batchUpdateStatus(body);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error in POST:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process tracking request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// TRACKING HISTORY
// =====================================================

async function getTrackingHistory(
  orderId: string | null,
  trackingNumber: string | null,
  trackingService: TrackingNotificationService
) {
  if (!orderId && !trackingNumber) {
    return NextResponse.json(
      { error: 'Either order_id or tracking_number is required' },
      { status: 400 }
    );
  }

  try {
    let actualOrderId = orderId;

    // If only tracking number provided, find order ID
    if (!orderId && trackingNumber) {
      const supabase = getServiceRoleClient();
      const { data: order, error } = await supabase
        .from('fulfillment_orders')
        .select('id')
        .eq('tracking_number', trackingNumber)
        .single();

      if (error || !order) {
        return NextResponse.json(
          { error: 'Order not found for tracking number' },
          { status: 404 }
        );
      }

      actualOrderId = order.id;
    }

    // Get tracking history
    const history = await trackingService.getTrackingHistory(actualOrderId!);

    // Get order details
    const supabase = getServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from('fulfillment_orders')
      .select(`
        *,
        prospects (
          id,
          company_name,
          contact_name,
          email
        )
      `)
      .eq('id', actualOrderId)
      .single();

    if (orderError) {
      throw new Error(`Failed to get order details: ${orderError.message}`);
    }

    console.log(`[Fulfillment Tracking API] Found ${history.length} tracking events for order ${actualOrderId}`);

    return NextResponse.json({
      success: true,
      data: {
        order,
        tracking_history: history,
        current_status: order.status,
        latest_event: history.length > 0 ? history[history.length - 1] : null
      }
    });

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error getting tracking history:', error);
    throw error;
  }
}

// =====================================================
// BATCH STATUS OPERATIONS
// =====================================================

async function getBatchStatus(req: NextRequest, trackingService: TrackingNotificationService) {
  const { searchParams } = new URL(req.url);
  const orderIdsParam = searchParams.get('order_ids');

  if (!orderIdsParam) {
    return NextResponse.json(
      { error: 'order_ids parameter is required' },
      { status: 400 }
    );
  }

  try {
    const orderIds = orderIdsParam.split(',').map(id => id.trim());
    
    if (orderIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 orders can be checked at once' },
        { status: 400 }
      );
    }

    const statusMap = await trackingService.getBatchOrderStatus(orderIds);
    
    const result = Array.from(statusMap.entries()).map(([orderId, status]) => ({
      order_id: orderId,
      status
    }));

    console.log(`[Fulfillment Tracking API] Batch status check for ${orderIds.length} orders`);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error getting batch status:', error);
    throw error;
  }
}

// =====================================================
// ANALYTICS & METRICS
// =====================================================

async function getTrackingAnalytics(req: NextRequest, trackingService: TrackingNotificationService) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date parameters are required' },
      { status: 400 }
    );
  }

  try {
    const stats = await trackingService.getTrackingStats(
      new Date(startDate),
      new Date(endDate)
    );

    console.log('[Fulfillment Tracking API] Generated tracking analytics');

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error getting analytics:', error);
    throw error;
  }
}

async function getDeliveryMetrics(req: NextRequest, trackingService: TrackingNotificationService) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'week';

  try {
    const metrics = await trackingService.getDeliveryMetrics(period);

    console.log(`[Fulfillment Tracking API] Generated delivery metrics for ${period}`);

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error getting delivery metrics:', error);
    throw error;
  }
}

// =====================================================
// EVENT RECORDING
// =====================================================

async function recordTrackingEvent(body: any) {
  const { tracking_number, order_id, event_type, event_description, location, metadata } = body;

  if (!tracking_number || !order_id || !event_type || !event_description) {
    return NextResponse.json(
      { error: 'tracking_number, order_id, event_type, and event_description are required' },
      { status: 400 }
    );
  }

  try {
    const trackingService = new TrackingNotificationService();
    
    await trackingService.recordTrackingEvent({
      tracking_number,
      order_id,
      event_type,
      event_description,
      event_timestamp: new Date(),
      location,
      metadata
    });

    console.log(`[Fulfillment Tracking API] Recorded tracking event: ${event_type} for ${tracking_number}`);

    return NextResponse.json({
      success: true,
      message: 'Tracking event recorded successfully'
    });

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error recording tracking event:', error);
    throw error;
  }
}

// =====================================================
// BATCH UPDATES
// =====================================================

async function batchUpdateStatus(body: any) {
  const { updates } = body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: 'updates array is required and cannot be empty' },
      { status: 400 }
    );
  }

  if (updates.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 updates can be processed at once' },
      { status: 400 }
    );
  }

  try {
    const trackingService = new TrackingNotificationService();
    const results = [];

    for (const update of updates) {
      try {
        await trackingService.recordTrackingEvent({
          tracking_number: update.tracking_number,
          order_id: update.order_id,
          event_type: update.event_type,
          event_description: update.event_description,
          event_timestamp: new Date(update.event_timestamp || Date.now()),
          location: update.location,
          metadata: update.metadata
        });

        results.push({
          order_id: update.order_id,
          success: true
        });
      } catch (error) {
        results.push({
          order_id: update.order_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    console.log(`[Fulfillment Tracking API] Batch update completed: ${successCount}/${updates.length} successful`);

    return NextResponse.json({
      success: true,
      data: {
        total: updates.length,
        successful: successCount,
        failed: updates.length - successCount,
        results
      }
    });

  } catch (error) {
    console.error('[Fulfillment Tracking API] Error in batch update:', error);
    throw error;
  }
} 