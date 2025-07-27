// =====================================================
// DHL WEBHOOK API - Shipping Status Updates
// Processes DHL tracking events and triggers notifications
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { TrackingNotificationService } from '@/lib/fulfillment/tracking-service';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    console.log('[DHL Webhook] Processing webhook request');

    // Verify webhook signature (DHL specific)
    const headersList = await headers();
    const signature = headersList.get('x-dhl-signature');
    
    if (!signature) {
      console.error('[DHL Webhook] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = await req.json();
    console.log('[DHL Webhook] Received data:', JSON.stringify(webhookData, null, 2));

    // Validate required fields
    if (!webhookData.trackingNumber || !webhookData.status) {
      console.error('[DHL Webhook] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process tracking update
    const trackingService = new TrackingNotificationService();
    await trackingService.processShippingWebhook('dhl', webhookData);

    console.log('[DHL Webhook] Successfully processed webhook');
    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
      tracking_number: webhookData.trackingNumber
    });

  } catch (error) {
    console.error('[DHL Webhook] Error processing webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET(req: NextRequest) {
  console.log('[DHL Webhook] Webhook verification endpoint');
  
  return NextResponse.json({
    message: 'DHL webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
} 