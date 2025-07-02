import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Deze API-route geeft een lijst van alle verwijderde retailers terug
export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Haal alle relevante velden op voor een compleet overzicht
    const { data, error } = await supabase
      .from('deleted_retailers')
      .select('id, email, full_name, company_name, phone, address, city, postal_code, country, deleted_at, original_data');
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, deletedRetailers: data || [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Onbekende fout bij ophalen.' }, { status: 500 });
  }
} 