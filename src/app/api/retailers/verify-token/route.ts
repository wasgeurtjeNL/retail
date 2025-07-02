import { NextRequest, NextResponse } from 'next/server';
import { getRetailerByToken } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token is verplicht'
      }, { status: 400 });
    }
    
    console.log(`[API] Verifying token: ${token}`);
    
    // Gebruik de server-side functie
    const { retailer, error } = await getRetailerByToken(token);
    
    if (error || !retailer) {
      console.error('[API] Error verifying token:', error);
      return NextResponse.json({
        success: false,
        error: 'Token is ongeldig of verlopen'
      }, { status: 404 });
    }
    
    console.log(`[API] Token verified for retailer: ${retailer.business_name} (${retailer.email})`);
    
    return NextResponse.json({
      success: true,
      retailer: {
        business_name: retailer.business_name,
        contact_name: retailer.contact_name,
        email: retailer.email
      }
    });
    
  } catch (error) {
    console.error('[API] Unexpected error verifying token:', error);
    return NextResponse.json({
      success: false,
      error: 'Er is een onverwachte fout opgetreden'
    }, { status: 500 });
  }
} 