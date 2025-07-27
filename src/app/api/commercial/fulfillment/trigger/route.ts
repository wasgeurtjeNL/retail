// =====================================================
// COMMERCIAL FULFILLMENT TRIGGER API
// Automatische proefpakket verzending trigger
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CommercialFulfillmentService } from '@/lib/commercial-fulfillment-service';
import { getServiceRoleClient } from '@/lib/supabase';

const fulfillmentService = new CommercialFulfillmentService();

export async function POST(request: NextRequest) {
  try {
    console.log('[FulfillmentTrigger] Processing fulfillment trigger request...');

    const body = await request.json();
    const { prospectId, trigger, packageType, expedited, notes } = body;

    if (!prospectId) {
      return NextResponse.json({ 
        error: 'prospectId is required' 
      }, { status: 400 });
    }

    console.log(`[FulfillmentTrigger] Triggering fulfillment for prospect: ${prospectId}`);

    let result;

    switch (trigger) {
      case 'automatic':
        // Automatic trigger based on prospect qualification
        result = await fulfillmentService.triggerAutomaticFulfillment(prospectId);
        break;

      case 'manual':
        // Manual trigger with custom parameters
        result = await fulfillmentService.createFulfillmentOrder({
          prospectId,
          packageType: packageType || 'basis',
          priority: expedited ? 9 : 7,
          expedited,
          notes
        });
        break;

      case 'registration':
        // Trigger when prospect registers via commercial partner page
        result = await handleRegistrationTrigger(prospectId);
        break;

      case 'email_click':
        // Trigger when prospect clicks specific email links
        result = await handleEmailClickTrigger(prospectId);
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid trigger type' 
        }, { status: 400 });
    }

    console.log(`[FulfillmentTrigger] Fulfillment result:`, result);

    return NextResponse.json({
      success: result.success,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      trackingInfo: result.trackingInfo,
      error: result.error
    });

  } catch (error) {
    console.error('[FulfillmentTrigger] Error processing fulfillment trigger:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prospectId = searchParams.get('prospectId');
    const action = searchParams.get('action') || 'status';

    if (!prospectId) {
      return NextResponse.json({ 
        error: 'prospectId is required' 
      }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    switch (action) {
      case 'status':
        // Get fulfillment status for prospect
        const { data: orders, error } = await supabase
          .from('fulfillment_orders')
          .select(`
            id,
            order_number,
            status,
            shipped_at,
            created_at,
            metadata,
            shipments (
              tracking_number,
              status,
              estimated_delivery_date
            )
          `)
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          throw error;
        }

        return NextResponse.json({
          success: true,
          prospectId,
          orders: orders || [],
          hasActiveOrder: orders && orders.length > 0 && 
            orders.some(order => ['pending', 'processing', 'shipped'].includes(order.status))
        });

      case 'eligibility':
        // Check if prospect is eligible for fulfillment
        const { data: prospect, error: prospectError } = await supabase
          .from('commercial_prospects')
          .select('*')
          .eq('id', prospectId)
          .single();

        if (prospectError) {
          throw prospectError;
        }

        const isEligible = prospect && 
          prospect.status === 'qualified' &&
          prospect.email &&
          prospect.business_name &&
          (prospect.enrichment_score || 0) >= 0.5;

        return NextResponse.json({
          success: true,
          prospectId,
          eligible: isEligible,
          reasons: getEligibilityReasons(prospect)
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[FulfillmentTrigger] Error processing GET request:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper functions

async function handleRegistrationTrigger(prospectId: string) {
  console.log(`[FulfillmentTrigger] Handling registration trigger for: ${prospectId}`);
  
  // Add delay for registration flow
  const delayMinutes = 2; // 2 minute delay after registration
  const scheduledTime = new Date();
  scheduledTime.setMinutes(scheduledTime.getMinutes() + delayMinutes);

  // Use queue to schedule delayed fulfillment
  const { QueueManager } = await import('@/lib/queue-manager');
  const queueManager = QueueManager.getInstance();

  await queueManager.addJob(
    'send_fulfillment_notification',
    prospectId,
    {
      action: 'trigger_automatic_fulfillment',
      prospectId,
      trigger: 'registration_delayed'
    },
    { 
      priority: 8,
      scheduledAt: scheduledTime
    }
  );

  return {
    success: true,
    message: `Fulfillment scheduled for ${scheduledTime.toISOString()}`,
    scheduledAt: scheduledTime.toISOString()
  };
}

async function handleEmailClickTrigger(prospectId: string) {
  console.log(`[FulfillmentTrigger] Handling email click trigger for: ${prospectId}`);
  
  // Check if prospect clicked high-intent links
  const supabase = getServiceRoleClient();
  
  const { data: trackingEvents, error } = await supabase
    .from('commercial_email_tracking')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('event_type', 'clicked')
    .order('event_timestamp', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[FulfillmentTrigger] Error fetching tracking events:', error);
    return { success: false, error: 'Failed to fetch tracking data' };
  }

  // Check for high-intent clicks (product pages, pricing, etc.)
  const highIntentClicks = trackingEvents?.filter(event => 
    event.clicked_url && (
      event.clicked_url.includes('proefpakket') ||
      event.clicked_url.includes('product') ||
      event.clicked_url.includes('gratis')
    )
  ) || [];

  if (highIntentClicks.length > 0) {
    // Trigger immediate fulfillment for high-intent clicks
    return await fulfillmentService.triggerAutomaticFulfillment(prospectId);
  } else {
    return {
      success: false,
      error: 'No high-intent clicks detected'
    };
  }
}

function getEligibilityReasons(prospect: any): string[] {
  const reasons = [];
  
  if (!prospect) {
    reasons.push('Prospect not found');
    return reasons;
  }
  
  if (prospect.status !== 'qualified') {
    reasons.push(`Status is '${prospect.status}', should be 'qualified'`);
  }
  
  if (!prospect.email) {
    reasons.push('No email address provided');
  }
  
  if (!prospect.business_name) {
    reasons.push('No business name provided');
  }
  
  if ((prospect.enrichment_score || 0) < 0.5) {
    reasons.push(`Enrichment score too low: ${prospect.enrichment_score || 0}`);
  }
  
  if (prospect.fulfillment_sent_at) {
    reasons.push('Proefpakket already sent');
  }
  
  if (reasons.length === 0) {
    reasons.push('Prospect is eligible for fulfillment');
  }
  
  return reasons;
} 