import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendTemplateEmail } from '@/lib/mail-service';

// GET - Test route
export async function GET() {
  console.log('[RETAILERS API] GET request ontvangen');
  return NextResponse.json({
    success: true,
    message: 'Retailers API is actief',
    timestamp: new Date().toISOString(),
    methods: ['GET', 'DELETE']
  });
}

// DELETE - Verwijder een retailer
export async function DELETE(request: NextRequest) {
  console.log('[RETAILERS API] ============ DELETE REQUEST START ============');
  console.log('[RETAILERS API] DELETE request ontvangen');
  
  try {
    const body = await request.json();
    const { retailerId } = body;
    
    console.log('[RETAILERS API] Request body:', JSON.stringify(body));
    
    if (!retailerId) {
      return NextResponse.json(
        { success: false, error: 'Geen retailerId opgegeven' },
        { status: 400 }
      );
    }
    
    console.log(`[RETAILERS API] Verwijderen van retailer: ${retailerId}`);
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check if retailer exists
    const { data: existingRetailers, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', retailerId)
      .eq('role', 'retailer');
    
    console.log('[RETAILERS API] Database query resultaat:', {
      count: existingRetailers?.length || 0,
      error: fetchError
    });
    
    if (fetchError) {
      console.error('[RETAILERS API] Database fout:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Database fout: ' + fetchError.message },
        { status: 500 }
      );
    }
    
    if (!existingRetailers || existingRetailers.length === 0) {
      console.error('[RETAILERS API] Retailer niet gevonden');
      return NextResponse.json(
        { success: false, error: 'Retailer niet gevonden' },
        { status: 404 }
      );
    }
    
    const retailerToDelete = existingRetailers[0];
    console.log('[RETAILERS API] Retailer gevonden:', retailerToDelete.email);
    
    // 1. Sla retailer op in deleted_retailers vóór verwijdering
    const { error: archiveError } = await supabase
      .from('deleted_retailers')
      .insert({
        id: retailerToDelete.id,
        email: retailerToDelete.email,
        full_name: retailerToDelete.full_name,
        company_name: retailerToDelete.company_name,
        phone: retailerToDelete.phone,
        address: retailerToDelete.address,
        city: retailerToDelete.city,
        postal_code: retailerToDelete.postal_code,
        country: retailerToDelete.country,
        original_data: retailerToDelete,
        deleted_at: new Date().toISOString(),
      });
    if (archiveError) {
      console.error('[RETAILERS API] Fout bij archiveren in deleted_retailers:', archiveError);
      return NextResponse.json(
        { success: false, error: 'Fout bij archiveren van retailer: ' + archiveError.message },
        { status: 500 }
      );
    }

    // 2. Stuur beëindigingsmail vóór verwijderen
    try {
      await sendTemplateEmail({
        to: retailerToDelete.email,
        template: 'retailer-removal',
        subject: 'Uw Wasgeurtje retailer account is beëindigd',
        context: {
          contactName: retailerToDelete.full_name || 'Geachte retailer',
          businessName: retailerToDelete.company_name || 'Uw bedrijf',
          reason: 'Account beëindiging op verzoek van de administrator'
        }
      });
      console.log('[RETAILERS API] Beëindigings-email verzonden');
    } catch (emailError) {
      console.warn('[RETAILERS API] Email fout (niet kritiek):', emailError);
    }

    // 3. Verwijder retailer uit profiles-tabel
    const { data: deleteData, error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', retailerId)
      .eq('role', 'retailer')
      .select();

    if (deleteError) {
      console.error('[RETAILERS API] Fout bij verwijderen:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Fout bij verwijderen: ' + deleteError.message },
        { status: 500 }
      );
    }

    if (!deleteData || deleteData.length === 0) {
      console.error('[RETAILERS API] Geen rijen verwijderd');
      return NextResponse.json(
        { success: false, error: 'Retailer kon niet worden verwijderd' },
        { status: 404 }
      );
    }

    const deletedRetailer = deleteData[0];
    console.log(`[RETAILERS API] Retailer succesvol verwijderd: ${deletedRetailer.email}`);
    
    console.log('[RETAILERS API] ============ DELETE SUCCESS ============');
    
    return NextResponse.json({
      success: true,
      message: 'Retailer succesvol verwijderd en beëindigings-email verzonden',
      deletedRetailer: {
        id: deletedRetailer.id,
        email: deletedRetailer.email,
        name: deletedRetailer.full_name
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
    console.error('[RETAILERS API] Onverwachte fout:', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
