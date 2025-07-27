import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getRetailerProfileId, getAllOrdersForRetailer } from '@/lib/supabase';

// Maak nieuwe order aan via API route (regel 24)
export async function POST(req: NextRequest) {
    try {
        console.log('[API] Starting order creation');
        
        const body = await req.json();
        console.log('[API] Request body:', body);
        
        // Valideer input
        const { 
            retailerEmail, 
            items, 
            subtotal, 
            total_amount, 
            shipping_address,
            shipping_city,
            shipping_postal_code,
            payment_method 
        } = body;
        
        if (!retailerEmail || !items || !total_amount) {
            console.error('[API] Missing required fields');
            return NextResponse.json(
                { error: 'Missing required fields: retailerEmail, items, total_amount' },
                { status: 400 }
            );
        }
        
        // Haal profile_id op (regel 19 - service role client)
        console.log('[API] Getting profile ID for:', retailerEmail);
        const { profileId, error: profileError } = await getRetailerProfileId(retailerEmail);
        
        if (profileError || !profileId) {
            console.error('[API] Error getting profile ID:', profileError);
            return NextResponse.json(
                { error: 'Retailer profile not found' },
                { status: 404 }
            );
        }

        // Haal volledige profiel gegevens op voor facturatie (regel 19)
        console.log('[API] Getting complete profile data for billing information');
        const { getServiceRoleClient } = await import('@/lib/supabase');
        const serviceClient = getServiceRoleClient();
        
        const { data: profileData, error: profileDataError } = await serviceClient
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();
        
        if (profileDataError || !profileData) {
            console.error('[API] Error getting profile data:', profileDataError);
            return NextResponse.json(
                { error: 'Unable to fetch profile data for billing' },
                { status: 500 }
            );
        }
        
        console.log('[API] Profile data retrieved for billing:', {
            company_name: profileData.company_name,
            full_name: profileData.full_name,
            address: profileData.address,
            city: profileData.city,
            postal_code: profileData.postal_code,
            kvk_number: profileData.kvk_number,
            vat_number: profileData.vat_number
        });
        
        // Genereer order nummer
        const orderNumber = `ORD-${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        
        // Bereid order data voor met billing gegevens uit profiel (regel 22 - uitgebreide metadata)
        const orderData = {
            profile_id: profileId,
            order_number: orderNumber,
            subtotal: parseFloat(subtotal.toString()),
            shipping_cost: 0,
            tax_amount: 0,
            total_amount: parseFloat(total_amount.toString()),
            payment_method: payment_method || 'invoice',
            
            // Shipping gegevens (indien opgegeven, anders gebruik billing)
            shipping_address: shipping_address || profileData.address,
            shipping_city: shipping_city || profileData.city,
            shipping_postal_code: shipping_postal_code || profileData.postal_code,
            shipping_country: 'Nederland',
            
            // Billing gegevens automatisch uit profiel
            billing_address: profileData.address,
            billing_city: profileData.city,
            billing_postal_code: profileData.postal_code,
            billing_country: profileData.country || 'Nederland',
            
            metadata: {
                created_from: 'catalog',
                order_source: 'retailer_dashboard',
                retailer_email: retailerEmail,
                
                // Bedrijfsgegevens voor factuur
                billing_company_name: profileData.company_name,
                billing_contact_name: profileData.full_name,
                billing_phone: profileData.phone,
                billing_email: profileData.email,
                billing_kvk_number: profileData.kvk_number,
                billing_vat_number: profileData.vat_number,
                billing_website: profileData.website,
                
                // Volledige profiel referentie
                profile_snapshot: {
                    company_name: profileData.company_name,
                    full_name: profileData.full_name,
                    email: profileData.email,
                    phone: profileData.phone,
                    address: profileData.address,
                    city: profileData.city,
                    postal_code: profileData.postal_code,
                    country: profileData.country || 'Nederland',
                    kvk_number: profileData.kvk_number,
                    vat_number: profileData.vat_number,
                    website: profileData.website,
                    captured_at: new Date().toISOString()
                }
            },
            items: items.map((item: any) => ({
                id: item.id,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: parseFloat(item.price.toString())
            }))
        };
        
        console.log('[API] Creating order with billing data:', {
            order_number: orderData.order_number,
            billing_company: orderData.metadata.billing_company_name,
            billing_kvk: orderData.metadata.billing_kvk_number,
            billing_vat: orderData.metadata.billing_vat_number,
            billing_address: orderData.billing_address,
            billing_city: orderData.billing_city,
            billing_postal_code: orderData.billing_postal_code
        });
        
        // Maak order aan in database (regel 19 - service role client)
        const { order, error: createError } = await createOrder(orderData);
        
        if (createError) {
            console.error('[API] Error creating order:', createError);
            return NextResponse.json(
                { error: 'Failed to create order' },
                { status: 500 }
            );
        }
        
        console.log('[API] Order created successfully with billing data:', order?.id);
        
        return NextResponse.json({
            success: true,
            order: {
                id: order?.id,
                order_number: order?.order_number,
                total_amount: order?.total_amount,
                status: order?.status,
                payment_status: order?.payment_status,
                created_at: order?.created_at,
                
                // Billing informatie voor bevestiging
                billing_info: {
                    company_name: orderData.metadata.billing_company_name,
                    contact_name: orderData.metadata.billing_contact_name,
                    address: orderData.billing_address,
                    city: orderData.billing_city,
                    postal_code: orderData.billing_postal_code,
                    kvk_number: orderData.metadata.billing_kvk_number,
                    vat_number: orderData.metadata.billing_vat_number
                }
            }
        });
        
    } catch (error) {
        console.error('[API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Haal orders op voor een retailer
export async function GET(req: NextRequest) {
    try {
        console.log('[API] Starting order retrieval');
        
        // Haal email uit query parameters
        const { searchParams } = new URL(req.url);
        const retailerEmail = searchParams.get('email');
        
        if (!retailerEmail) {
            console.error('[API] Missing retailer email parameter');
            return NextResponse.json(
                { error: 'Missing retailer email parameter' },
                { status: 400 }
            );
        }
        
        console.log('[API] Getting orders for retailer:', retailerEmail);
        
        // Haal alle orders op voor deze retailer
        const result = await getAllOrdersForRetailer(retailerEmail);
        
        if (result.error) {
            console.error('[API] Error retrieving orders:', result.error);
            return NextResponse.json(
                { error: 'Failed to retrieve orders' },
                { status: 500 }
            );
        }
        
        console.log('[API] Retrieved', result.orders?.length || 0, 'orders');
        
        return NextResponse.json(result.orders || []);
        
    } catch (error) {
        console.error('[API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}