import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service role client voor admin operaties
const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: retailerId } = await params;

  // ✅ Log de exacte ID die we proberen te verwijderen
  console.log('[RETAILER DELETE] 🎯 Attempting to delete retailer ID:', retailerId);
  console.log('[RETAILER DELETE] 🔍 ID type:', typeof retailerId, 'Length:', retailerId.length);

  // UUID validatie
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(retailerId)) {
    console.error('[RETAILER DELETE] ❌ Invalid UUID format:', retailerId);
    return NextResponse.json({ error: 'Ongeldig retailer ID format.' }, { status: 400 });
  }

  // ✅ Gebruik service role client voor admin operaties
  const supabase = getServiceSupabase();

  // ✅ Eerst: Check welke retailers er zijn in de database  
  console.log('[RETAILER DELETE] 🔍 Checking existing retailers in database...');
  
  const { data: allRetailers, error: listError } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, role, status')
    .eq('role', 'retailer');

  console.log('[RETAILER DELETE] 📊 All retailers in database:', allRetailers);
  console.log('[RETAILER DELETE] 📊 List error:', listError);

  // ✅ Check of de exacte retailer bestaat
  const targetRetailer = allRetailers?.find((r: any) => r.id === retailerId);
  console.log('[RETAILER DELETE] 🎯 Target retailer found:', targetRetailer);

  if (!targetRetailer) {
    console.error('[RETAILER DELETE] ❌ Retailer not found in database. Available IDs:', 
      allRetailers?.map((r: any) => r.id));
    return NextResponse.json({ 
      error: 'Retailer niet gevonden',
      availableIds: allRetailers?.map((r: any) => r.id),
      requestedId: retailerId
    }, { status: 404 });
  }

  // ✅ Probeer DELETE met uitgebreide logging
  console.log('[RETAILER DELETE] 🗑️ Attempting DELETE on profiles table...');
  
  const deleteResult = await supabase
    .from('profiles')
    .delete()
    .eq('id', retailerId)
    .eq('role', 'retailer');

  // ✅ Log de volledige response zoals gevraagd
  console.log('[RETAILER DELETE] 📋 Complete delete result:', {
    data: deleteResult.data,
    error: deleteResult.error,
    count: deleteResult.count,
    status: deleteResult.status,
    statusText: deleteResult.statusText
  });

  // ✅ Check voor errors
  if (deleteResult.error) {
    console.error('[RETAILER DELETE] ❌ Delete error:', deleteResult.error);
    return NextResponse.json({ 
      error: 'Database error tijdens verwijderen',
      details: deleteResult.error.message
    }, { status: 500 });
  }

  // ✅ Check voor success: status 204 (No Content) betekent succesvol verwijderd
  if (deleteResult.status === 204 || (deleteResult.count !== null && deleteResult.count > 0)) {
    // ✅ Success!
    console.log('[RETAILER DELETE] ✅ Successfully deleted retailer:', retailerId);
    console.log('[RETAILER DELETE] 📊 Delete successful with status:', deleteResult.status);
    
    return NextResponse.json({ 
      success: true,
      deletedId: retailerId,
      message: 'Retailer succesvol verwijderd'
    });
  }

  // Als we hier komen, is er echt een probleem
  console.warn('[RETAILER DELETE] ⚠️ Unexpected result - retailer may not have been deleted');
  console.warn('[RETAILER DELETE] 🔍 Full result:', deleteResult);
  
  return NextResponse.json({ 
    error: 'Onverwacht resultaat bij verwijderen',
    details: 'Status was niet 204 en count was null/0',
    deleteResult: deleteResult
  }, { status: 500 });
}
