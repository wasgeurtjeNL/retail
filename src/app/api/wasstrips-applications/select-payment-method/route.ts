// API route voor het opslaan van de gekozen betaalmethode voor wasstrips applicaties
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { applicationId, paymentMethod } = await request.json();
    
    if (!applicationId || !paymentMethod) {
      return NextResponse.json({ 
        error: 'Application ID and payment method are required' 
      }, { status: 400 });
    }

    if (!['direct', 'invoice'].includes(paymentMethod)) {
      return NextResponse.json({ 
        error: 'Invalid payment method. Must be "direct" or "invoice"' 
      }, { status: 400 });
    }

    console.log('[API] Saving payment method selection:', applicationId, paymentMethod);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Haal eerst de applicatie op om te controleren of deze bestaat
    const { data: application, error: fetchError } = await supabase
      .from('wasstrips_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('[API] Error fetching application:', fetchError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Controleer of payment options al verstuurd zijn
    if (!application.payment_options_sent) {
      return NextResponse.json({ 
        error: 'Payment options have not been sent yet' 
      }, { status: 400 });
    }

    // Update de applicatie met de gekozen betaalmethode
    const { data: updatedApp, error: updateError } = await supabase
      .from('wasstrips_applications')
      .update({
        payment_method_selected: paymentMethod,
        payment_method_selected_at: new Date().toISOString(),
        status: 'payment_selected',
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating application:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    console.log('[API] Payment method saved successfully:', paymentMethod, 'for application:', applicationId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Betaalmethode "${paymentMethod}" opgeslagen`,
      application: updatedApp
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 