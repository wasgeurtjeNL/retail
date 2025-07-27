import { NextRequest, NextResponse } from 'next/server';
import { SocialSharingService } from '@/lib/social-sharing-service';

// GET /api/referral/track - Track referral click
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ref = searchParams.get('ref');
    const email = searchParams.get('email');

    if (!ref) {
      return NextResponse.json({ error: 'Missing referral code' }, { status: 400 });
    }

    // Decode the share ID
    let shareId: string;
    try {
      shareId = Buffer.from(ref, 'base64').toString('utf-8');
    } catch (error) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Track the click
    const sharingService = SocialSharingService.getInstance();
    const success = await sharingService.trackShareClick(shareId, email || undefined);

    if (!success) {
      return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 });
    }

    // Redirect to registration page with referral info
    const redirectUrl = new URL('/register', req.url);
    redirectUrl.searchParams.set('ref', ref);
    if (email) {
      redirectUrl.searchParams.set('email', email);
    }

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('[Referral Track API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track referral' },
      { status: 500 }
    );
  }
} 