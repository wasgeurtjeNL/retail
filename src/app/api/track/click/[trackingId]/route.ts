import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const trackingId = params.trackingId;
  const { searchParams } = new URL(request.url);
  const originalUrl = searchParams.get('url');
  
  try {
    const supabase = getServiceRoleClient();
    
    // Get request metadata
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Determine device type from user agent
    const deviceType = getDeviceType(userAgent);
    
    // Find the email queue item by tracking ID
    // The tracking ID should be stored in click_tracking_ids JSON field
    const { data: emailData, error: emailError } = await supabase
      .from('commercial_email_queue')
      .select('id, prospect_id, campaign_id, click_tracking_ids')
      .contains('click_tracking_ids', JSON.stringify({ [originalUrl || '']: trackingId }))
      .single();
    
    if (emailError || !emailData) {
      console.warn(`[EmailTracking] Click tracking not found: ${trackingId} for URL: ${originalUrl}`);
      
      // Redirect to original URL if available, otherwise to homepage
      if (originalUrl) {
        return NextResponse.redirect(originalUrl);
      } else {
        return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL || 'https://wasgeurtje.nl');
      }
    }
    
    // Record the click event
    const { error: trackingError } = await supabase
      .from('commercial_email_tracking')
      .insert({
        email_queue_id: emailData.id,
        prospect_id: emailData.prospect_id,
        event_type: 'clicked',
        clicked_url: originalUrl,
        click_tracking_id: trackingId,
        user_agent: userAgent,
        ip_address: ip,
        device_type: deviceType,
        provider_event_id: trackingId,
        provider_raw_data: {
          tracking_id: trackingId,
          campaign_id: emailData.campaign_id,
          original_url: originalUrl,
          timestamp: new Date().toISOString()
        }
      });
    
    if (trackingError) {
      console.error('[EmailTracking] Failed to record click event:', trackingError);
    } else {
      console.log(`[EmailTracking] Email link clicked: ${trackingId} by prospect ${emailData.prospect_id} to ${originalUrl}`);
      
      // Update email queue status if this is the first click
      const { data: existingClick } = await supabase
        .from('commercial_email_queue')
        .select('clicked_at')
        .eq('id', emailData.id)
        .single();
      
      if (!existingClick?.clicked_at) {
        await supabase
          .from('commercial_email_queue')
          .update({ 
            clicked_at: new Date().toISOString(),
            status: 'clicked'
          })
          .eq('id', emailData.id);
      }
    }
    
    // Redirect to the original URL
    if (originalUrl) {
      return NextResponse.redirect(originalUrl);
    } else {
      return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL || 'https://wasgeurtje.nl');
    }
    
  } catch (error) {
    console.error('[EmailTracking] Error processing click tracking:', error);
    
    // Redirect to original URL or homepage on error
    if (originalUrl) {
      return NextResponse.redirect(originalUrl);
    } else {
      return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL || 'https://wasgeurtje.nl');
    }
  }
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