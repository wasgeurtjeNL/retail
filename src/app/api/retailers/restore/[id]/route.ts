import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Deze API-route herstelt een verwijderde retailer uit deleted_retailers terug naar profiles
// Gebruik: POST /api/retailers/restore/[id] met het id van de te herstellen retailer
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // 1. Haal de verwijderde retailer op uit deleted_retailers
    const { data: deleted, error: fetchError } = await supabase
      .from('deleted_retailers')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !deleted) {
      return NextResponse.json({ success: false, error: 'Retailer niet gevonden in archief.' }, { status: 404 });
    }

    // 2. Zet de gegevens terug in profiles (gebruik originele data voor volledigheid)
    const profileData = deleted.original_data || deleted;
    const { error: restoreError } = await supabase
      .from('profiles')
      .insert({
        id: profileData.id,
        email: profileData.email,
        full_name: profileData.full_name,
        company_name: profileData.company_name,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        postal_code: profileData.postal_code,
        country: profileData.country,
        role: 'retailer',
        status: profileData.status || 'pending',
      });
    if (restoreError) {
      return NextResponse.json({ success: false, error: 'Fout bij herstellen: ' + restoreError.message }, { status: 500 });
    }

    // 3. (Optioneel) Verwijder de entry uit deleted_retailers
    await supabase.from('deleted_retailers').delete().eq('id', id);

    return NextResponse.json({ success: true, message: 'Retailer succesvol hersteld.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Onbekende fout bij herstellen.' }, { status: 500 });
  }
} 