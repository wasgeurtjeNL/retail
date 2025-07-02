// Deze API-route geeft een lijst van alle wasstrips aanvragen terug uit Supabase
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateWasstripsOrderNumber, updateWasstripsApplicationWithOrderDetails } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[API] Fetching Wasstrips applications with retailer status...');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Eerst de applications ophalen
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('wasstrips_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (applicationsError) {
      console.error('[API] Error fetching applications:', applicationsError);
      return NextResponse.json({ error: applicationsError.message }, { status: 500 });
    }

    console.log('[API] Raw applications data:', applicationsData?.length || 0, 'records');

    // Dan de profiles ophalen voor de profile_ids
    const profileIds = applicationsData?.map(app => app.profile_id).filter(Boolean) || [];
    
    let profilesData: any[] = [];
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);

      if (profilesError) {
        console.error('[API] Error fetching profiles:', profilesError);
        // Continue zonder profiles data
      } else {
        profilesData = profiles || [];
      }
    }

    console.log('[API] Profiles data:', profilesData.length, 'records');

    // Transform en verrijk de data
    const applications = applicationsData?.map(app => {
      const profile = profilesData.find(p => p.id === app.profile_id);
      const retailerApproved = profile?.status === 'active';
      const retailerPending = profile?.status === 'pending';
      const retailerRejected = profile?.status === 'suspended';

              return {
        id: app.id,
        businessName: profile?.company_name || 'Onbekend bedrijf',
        contactName: profile?.full_name || 'Onbekende naam',
        email: profile?.email || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        city: profile?.city || '',
        postalCode: profile?.postal_code || '',
        country: profile?.country || 'Nederland',
        status: app.status,
        notes: app.notes || '',
        appliedAt: app.created_at || app.appliedAt || new Date().toISOString(),
        paymentStatus: 'not_started' as const,
        isPaid: false,
        // Nieuwe aanbetaling velden
        deposit_status: app.deposit_status || 'not_sent',
        deposit_amount: app.deposit_amount || 30.00,
        deposit_paid_at: app.deposit_paid_at,
        deposit_payment_link: app.deposit_payment_link,
        remaining_amount: app.remaining_amount || 270.00,
        remaining_payment_status: app.remaining_payment_status || 'not_sent',
        remaining_payment_link: app.remaining_payment_link,
        product_delivered_at: app.product_delivered_at,
        total_amount: app.total_amount || 300.00,
        // Order ready fields
        payment_options_sent: app.payment_options_sent || false,
        payment_options_sent_at: app.payment_options_sent_at,
        payment_method_selected: app.payment_method_selected,
        payment_method_selected_at: app.payment_method_selected_at,
        // Retailer status informatie
        retailerStatus: profile?.status || 'unknown',
        retailerApproved,
        retailerPending,
        retailerRejected,
        // Bepaal of bewerken toegestaan is
        canEdit: retailerApproved,
        // Status indicatoren voor UI
        statusIndicator: retailerPending 
          ? 'retailer_pending' 
          : retailerRejected 
          ? 'retailer_rejected' 
          : retailerApproved 
          ? 'retailer_approved' 
          : 'unknown',
        _profileMissing: !profile
      };
    }) || [];

    console.log('[API] Transformed applications:', applications.length);
    console.log('[API] Retailer status breakdown:', {
      approved: applications.filter(a => a.retailerApproved).length,
      pending: applications.filter(a => a.retailerPending).length,
      rejected: applications.filter(a => a.retailerRejected).length,
      canEdit: applications.filter(a => a.canEdit).length
    });

    return NextResponse.json({ applications });

  } catch (error) {
        console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[API] Creating new Wasstrips application:', body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Genereer order number
    const { orderNumber, error: orderNumberError } = await generateWasstripsOrderNumber();
    if (orderNumberError || !orderNumber) {
      console.error('[API] Error generating order number:', orderNumberError);
      return NextResponse.json({ error: 'Failed to generate order number' }, { status: 500 });
    }

    // Standaard product details voor wasstrips
    const productDetails = {
      package_type: "starter_package",
      items: [
        {
          id: "wasstrips-starter",
          name: "Wasstrips Starterpakket",
          description: "Compleet pakket met wasstrips en marketingmateriaal",
          quantity: 1,
          price: body.total_amount || 300.00,
          category: "starter_package"
        }
      ],
      package_contents: [
        "50x Wasstrips assortiment",
        "Display standaard",
        "Marketingmateriaal",
        "Instructiehandleiding"
      ]
    };

    // Maak de application aan met order details
    const { data, error } = await supabase
      .from('wasstrips_applications')
      .insert({
        profile_id: body.profile_id,
        status: body.status || 'pending',
        deposit_status: body.deposit_status || 'not_sent',
        deposit_amount: body.deposit_amount || 30.00,
        total_amount: body.total_amount || 300.00,
        remaining_amount: body.remaining_amount || 270.00,
        order_number: orderNumber,
        product_details: productDetails,
        order_total: body.total_amount || 300.00,
        notes: body.notes,
        metadata: body.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating application:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Wasstrips application created successfully:', data);
    return NextResponse.json({ 
      data,
      message: `Wasstrips application created with order number: ${orderNumber}`
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

export async function PUT(request: Request) {
  try {
    console.log('[API] PUT request to update wasstrips application');
    
    const body = await request.json();
    const { orderId, sessionId, paymentStatus } = body;
    
    console.log('[API] Update request data:', { orderId, sessionId, paymentStatus });
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update de wasstrips application in de database
    const { data, error } = await supabase
      .from('wasstrips_applications')
      .update({
        remaining_payment_status: paymentStatus || 'paid',
        metadata: {
          stripe_session_id: sessionId,
          payment_completed_at: new Date().toISOString(),
          remaining_payment_completed: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('order_number', orderId)
      .select();
    
    if (error) {
      console.error('[API] Error updating wasstrips application:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update application' },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully updated wasstrips application:', data);
    
    return NextResponse.json({
      success: true,
      data: data?.[0] || null,
      message: 'Payment status updated successfully'
    });
    
  } catch (error) {
    console.error('[API] Error in PUT wasstrips-applications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 