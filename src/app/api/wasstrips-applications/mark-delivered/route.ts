// API route voor het markeren van Wasstrips als geleverd
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json();
    
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    console.log('[API] Marking product as delivered for application:', applicationId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal de applicatie op
    const { data: application, error: fetchError } = await supabase
      .from('wasstrips_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('[API] Error fetching application:', fetchError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Controleer of aanbetaling betaald is
    if (application.deposit_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Deposit must be paid before marking as delivered' 
      }, { status: 400 });
    }

    // Controleer of al gemarkeerd als geleverd
    if (application.product_delivered_at) {
      return NextResponse.json({ 
        error: 'Product already marked as delivered' 
      }, { status: 400 });
    }

    // Update de applicatie met leveringsdatum
    const { data: updatedApp, error: updateError } = await supabase
      .from('wasstrips_applications')
      .update({
        product_delivered_at: new Date().toISOString(),
        status: 'delivered', // Update status naar delivered
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    console.log('[API] Product marked as delivered successfully for:', applicationId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Product gemarkeerd als geleverd',
      application: updatedApp
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 