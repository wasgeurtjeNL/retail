import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// GET - Track reminder email opens via tracking pixel
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pixelId = searchParams.get('id');
    
    console.log('[REMINDER_TRACKING] Pixel request for ID:', pixelId);
    
    if (!pixelId) {
      console.log('[REMINDER_TRACKING] No pixel ID provided');
      return new NextResponse('Missing ID', { status: 400 });
    }

    // Track the reminder email open
    const { error } = await supabaseAdmin.rpc('track_reminder_opened', {
      pixel_id: pixelId
    });

    if (error) {
      console.error('[REMINDER_TRACKING] Error tracking reminder open:', error);
    } else {
      console.log('[REMINDER_TRACKING] Successfully tracked reminder open for:', pixelId);
    }

    // Return a 1x1 transparent pixel
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
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[REMINDER_TRACKING] Unexpected error in reminder pixel tracking:', error);
    
    // Still return a pixel even if tracking fails
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
} 