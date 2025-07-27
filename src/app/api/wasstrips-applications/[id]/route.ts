import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// API endpoint om een specifieke wasstrips application op te halen
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[API] Getting wasstrips application:', params.id);
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ 
        error: 'Application ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal applicatie gegevens op
    const { data: application, error: fetchError } = await supabase
      .from('wasstrips_applications')
      .select(`
        *,
        profiles:profile_id (
          id,
          full_name,
          company_name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      console.error('[API] Application not found:', id, 'Error:', fetchError?.message || 'No data returned');
      return NextResponse.json({ 
        error: 'Application not found',
        details: fetchError?.message || 'No data returned for this ID'
      }, { status: 404 });
    }

    console.log('[API] Successfully retrieved application:', id);
    console.log('[API] Raw application data:', JSON.stringify(application, null, 2));

    // Transform data om consistent te zijn met frontend interface
    const transformedApplication = {
      id: application.id,
      businessName: application.profiles?.company_name || 'Onbekend bedrijf',
      contactName: application.profiles?.full_name || 'Onbekende contactpersoon',
      email: application.profiles?.email || '',
      phone: application.profiles?.phone || '',
      total: application.order_total || application.total_amount || 300.00, // Wasstrips standard price
      isPaid: application.remaining_payment_status === 'paid',
      paymentMethod: application.payment_method_selected === 'direct' ? 'stripe' : 'invoice',
      paymentStatus: application.remaining_payment_status || 'pending',
      selectedPaymentOption: application.payment_method_selected,
      depositStatus: application.deposit_status,
      remainingPaymentStatus: application.remaining_payment_status,
      status: application.status,
      paymentOptionsReady: application.payment_options_sent,
      // Additional metadata
      depositPaidAt: application.deposit_paid_at,
      createdAt: application.created_at,
      updatedAt: application.updated_at
    };

    console.log('[API] Transformed application data:', JSON.stringify(transformedApplication, null, 2));

    return NextResponse.json({
      success: true,
      application: transformedApplication
    });

  } catch (error) {
    console.error('[API] Unexpected error getting wasstrips application:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 