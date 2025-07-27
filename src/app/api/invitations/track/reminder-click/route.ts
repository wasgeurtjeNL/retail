import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET - Track reminder email clicks and redirect
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clickId = searchParams.get('id');
    
    console.log('[REMINDER_CLICK_TRACKING] Click request for ID:', clickId);
    
    if (!clickId) {
      console.log('[REMINDER_CLICK_TRACKING] No click ID provided');
      return NextResponse.redirect(new URL('/register', req.url));
    }

    // Track the reminder click and get redirect info
    const { data, error } = await supabaseAdmin.rpc('track_reminder_clicked', {
      click_id: clickId
    });

    if (error) {
      console.error('[REMINDER_CLICK_TRACKING] Error tracking reminder click:', error);
      return NextResponse.redirect(new URL('/register', req.url));
    }

    if (!data || data.length === 0) {
      console.log('[REMINDER_CLICK_TRACKING] No invitation found for click ID:', clickId);
      return NextResponse.redirect(new URL('/register', req.url));
    }

    const invitation = data[0];
    console.log('[REMINDER_CLICK_TRACKING] Successfully tracked reminder click for token:', invitation.invitation_token);

    // Redirect to registration page with token
    const redirectUrl = new URL(`/register?token=${invitation.invitation_token}`, req.url);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[REMINDER_CLICK_TRACKING] Unexpected error in reminder click tracking:', error);
    
    // Fallback redirect to registration page
    return NextResponse.redirect(new URL('/register', req.url));
  }
} 