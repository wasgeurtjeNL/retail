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
    
    // Find the email queue item by tracking pixel ID
    const { data: emailData, error: emailError } = await supabase
      .from('commercial_email_queue')
      .select('id, prospect_id, campaign_id')
      .eq('tracking_pixel_id', trackingId)
      .single();
    
    if (emailError || !emailData) {
      console.warn(`[EmailTracking] Unsubscribe tracking not found: ${trackingId}`);
      return NextResponse.json(
        { error: 'Invalid unsubscribe link' },
        { status: 404 }
      );
    }
    
    // Record the unsubscribe event
    const { error: trackingError } = await supabase
      .from('commercial_email_tracking')
      .insert({
        email_queue_id: emailData.id,
        prospect_id: emailData.prospect_id,
        event_type: 'unsubscribed',
        user_agent: userAgent,
        ip_address: ip,
        provider_event_id: trackingId,
        provider_raw_data: {
          tracking_pixel_id: trackingId,
          campaign_id: emailData.campaign_id,
          timestamp: new Date().toISOString()
        }
      });
    
    if (trackingError) {
      console.error('[EmailTracking] Failed to record unsubscribe event:', trackingError);
    } else {
      console.log(`[EmailTracking] Email unsubscribed: ${trackingId} by prospect ${emailData.prospect_id}`);
      
      // Update email queue status
      await supabase
        .from('commercial_email_queue')
        .update({ 
          unsubscribed_at: new Date().toISOString(),
          status: 'unsubscribed'
        })
        .eq('id', emailData.id);
      
      // Update prospect status to unsubscribed
      await supabase
        .from('commercial_prospects')
        .update({ 
          status: 'unsubscribed',
          notes: 'Unsubscribed from commercial emails'
        })
        .eq('id', emailData.prospect_id);
    }
    
    // Return unsubscribe confirmation page
    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Uitgeschreven - Wasgeurtje</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background-color: #f8f9fa;
                color: #333;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
            }
            .logo {
                width: 150px;
                margin-bottom: 30px;
            }
            h1 {
                color: #2c5aa0;
                margin-bottom: 20px;
            }
            p {
                line-height: 1.6;
                margin-bottom: 15px;
            }
            .success-icon {
                font-size: 48px;
                color: #28a745;
                margin-bottom: 20px;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✓</div>
            <h1>Succesvol Uitgeschreven</h1>
            <p>Je bent succesvol uitgeschreven van onze commerciële emails.</p>
            <p>Je ontvangt geen verdere marketing emails van Wasgeurtje meer.</p>
            <p>Mocht je je later bedenken, dan kun je je altijd weer aanmelden via onze website.</p>
            
            <div class="footer">
                <p>Bedankt voor je interesse in Wasgeurtje.</p>
                <p><a href="https://wasgeurtje.nl" style="color: #2c5aa0;">Terug naar wasgeurtje.nl</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    return new NextResponse(htmlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('[EmailTracking] Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

// Also handle POST for unsubscribe forms
export async function POST(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  // Same logic as GET, but also handle form data if needed
  return GET(request, { params });
}