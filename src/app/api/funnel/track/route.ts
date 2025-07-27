import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to get client IP
function getClientIP(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return null;
}

// Helper function to find invitation by token
async function findInvitationByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('business_invitations')
    .select('id, email, status')
    .eq('invitation_token', token)
    .single();
    
  if (error || !data) {
    console.log('[FUNNEL_TRACK] Invitation not found for token:', token);
    return null;
  }
  
  return data;
}

// POST - Track funnel event
export async function POST(req: NextRequest) {
  try {
    console.log('[FUNNEL_TRACK] Starting funnel tracking request');

    const {
      eventType,
      invitationToken,
      sessionId,
      metadata = {}
    } = await req.json();

    if (!eventType) {
      return NextResponse.json({ error: 'Event type vereist' }, { status: 400 });
    }

    // Get client information
    const userAgent = req.headers.get('user-agent') || '';
    const referrer = req.headers.get('referer') || '';
    const clientIP = getClientIP(req);
    
    let invitationId: string | null = null;

    // If invitation token is provided, find the invitation
    if (invitationToken) {
      const invitation = await findInvitationByToken(invitationToken);
      if (invitation) {
        invitationId = invitation.id;
        console.log('[FUNNEL_TRACK] Found invitation:', invitation.email);
      }
    }

    // If no invitation found but token provided, this might be an invalid/expired token
    if (invitationToken && !invitationId) {
      console.log('[FUNNEL_TRACK] Invalid or expired invitation token:', invitationToken);
      return NextResponse.json({ 
        success: false, 
        error: 'Ongeldige of verlopen uitnodiging' 
      }, { status: 404 });
    }

    // If no invitation token provided, we can still track general events
    if (!invitationId) {
      console.log('[FUNNEL_TRACK] Tracking general event without invitation:', eventType);
      
      // For general tracking, we could create a separate table or just log
      // For now, we'll return success but note that no invitation was tracked
      return NextResponse.json({ 
        success: true, 
        message: 'Event logged (no invitation context)',
        tracked: false
      });
    }

    // Log the funnel event
    const { data: eventId, error: logError } = await supabaseAdmin.rpc('log_funnel_event', {
      p_invitation_id: invitationId,
      p_event_type: eventType,
      p_session_id: sessionId || null,
      p_user_agent: userAgent,
      p_ip_address: clientIP || null,
      p_referrer: referrer || null,
      p_page_url: metadata.pageUrl || null,
      p_metadata: metadata
    });

    if (logError) {
      console.error('[FUNNEL_TRACK] Error logging funnel event:', logError);
      return NextResponse.json({ 
        error: 'Fout bij loggen funnel event: ' + logError.message 
      }, { status: 500 });
    }

    console.log('[FUNNEL_TRACK] Successfully logged event:', eventType, 'for invitation:', invitationId);

    return NextResponse.json({ 
      success: true,
      eventId,
      message: `Funnel event '${eventType}' succesvol gelogd`,
      tracked: true
    });

  } catch (error) {
    console.error('[FUNNEL_TRACK] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij funnel tracking' 
    }, { status: 500 });
  }
}

// GET - Get funnel statistics
export async function GET(req: NextRequest) {
  try {
    console.log('[FUNNEL_STATS] Getting funnel statistics');

    // Get funnel stats
    const { data: funnelStats, error: statsError } = await supabaseAdmin
      .from('invitation_funnel_stats')
      .select('*')
      .single();

    if (statsError) {
      console.error('[FUNNEL_STATS] Error getting funnel stats:', statsError);
      return NextResponse.json({ 
        error: 'Fout bij ophalen funnel statistieken: ' + statsError.message 
      }, { status: 500 });
    }

    // Get drop-off analysis
    const { data: dropOffData, error: dropOffError } = await supabaseAdmin
      .from('invitation_dropoff_analysis')
      .select('*')
      .order('dropped_count', { ascending: false });

    if (dropOffError) {
      console.error('[FUNNEL_STATS] Error getting drop-off analysis:', dropOffError);
      return NextResponse.json({ 
        error: 'Fout bij ophalen drop-off analyse: ' + dropOffError.message 
      }, { status: 500 });
    }

    console.log('[FUNNEL_STATS] Successfully retrieved funnel statistics');

    return NextResponse.json({ 
      success: true,
      funnelStats,
      dropOffAnalysis: dropOffData || []
    });

  } catch (error) {
    console.error('[FUNNEL_STATS] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij ophalen funnel statistieken' 
    }, { status: 500 });
  }
} 