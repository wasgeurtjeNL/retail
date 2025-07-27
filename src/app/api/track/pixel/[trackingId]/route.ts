import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const trackingId = params.trackingId;
  
  try {
    const supabase = getServiceRoleClient();
    
    // Get request metadata
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Determine device type from user agent
    const deviceType = getDeviceType(userAgent);
    const emailClient = getEmailClient(userAgent);
    
    // Find the email queue item by tracking pixel ID
    const { data: emailData, error: emailError } = await supabase
      .from('commercial_email_queue')
      .select('id, prospect_id, campaign_id')
      .eq('tracking_pixel_id', trackingId)
      .single();
    
    if (emailError || !emailData) {
      console.warn(`[EmailTracking] Tracking pixel not found: ${trackingId}`);
      // Still return the pixel image even if tracking fails
      return getTrackingPixelResponse();
    }
    
    // Check if this open was already tracked (prevent duplicate opens)
    const { data: existingOpen, error: checkError } = await supabase
      .from('commercial_email_tracking')
      .select('id')
      .eq('email_queue_id', emailData.id)
      .eq('event_type', 'opened')
      .single();
    
    if (!existingOpen) {
      // Record the email open event
      const { error: trackingError } = await supabase
        .from('commercial_email_tracking')
        .insert({
          email_queue_id: emailData.id,
          prospect_id: emailData.prospect_id,
          event_type: 'opened',
          user_agent: userAgent,
          ip_address: ip,
          device_type: deviceType,
          email_client: emailClient,
          provider_event_id: trackingId,
          provider_raw_data: {
            tracking_pixel_id: trackingId,
            campaign_id: emailData.campaign_id,
            timestamp: new Date().toISOString()
          }
        });
      
      if (trackingError) {
        console.error('[EmailTracking] Failed to record open event:', trackingError);
      } else {
        console.log(`[EmailTracking] Email opened: ${trackingId} by prospect ${emailData.prospect_id}`);
        
        // Update email queue status
        await supabase
          .from('commercial_email_queue')
          .update({ 
            opened_at: new Date().toISOString(),
            status: 'opened'
          })
          .eq('id', emailData.id);
      }
    } else {
      console.log(`[EmailTracking] Duplicate open event ignored for: ${trackingId}`);
    }
    
    // Return 1x1 transparent pixel
    return getTrackingPixelResponse();
    
  } catch (error) {
    console.error('[EmailTracking] Error processing pixel tracking:', error);
    // Always return the pixel image, even on error
    return getTrackingPixelResponse();
  }
}

function getTrackingPixelResponse(): NextResponse {
  // 1x1 transparent PNG pixel
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  
  return new NextResponse(pixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': pixel.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function getEmailClient(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('outlook')) return 'Outlook';
  if (ua.includes('thunderbird')) return 'Thunderbird';
  if (ua.includes('apple mail') || ua.includes('mail/')) return 'Apple Mail';
  if (ua.includes('gmail')) return 'Gmail';
  if (ua.includes('yahoo')) return 'Yahoo Mail';
  if (ua.includes('chrome')) return 'Gmail (Chrome)';
  if (ua.includes('firefox')) return 'Thunderbird (Firefox)';
  if (ua.includes('safari')) return 'Apple Mail (Safari)';
  
  return 'Unknown';
}