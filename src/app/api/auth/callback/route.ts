import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Deze route handelt callbacks af van Supabase Auth
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    // Wissel de code in voor een sessie
    await supabase.auth.exchangeCodeForSession(code);
    
    // Redirect naar dashboard of home
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }
  
  // Redirect naar login als er geen code is
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
} 