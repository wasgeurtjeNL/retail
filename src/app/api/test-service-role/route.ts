import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, getWasstripsOrders, getWasstripsOrdersForRetailer } from '@/lib/supabase';

// Test API route om service role client te testen
export async function GET(request: NextRequest) {
    try {
        console.log('[test-service-role] Starting comprehensive test...');
        
        // Test 1: Direct service role client test
        console.log('[test-service-role] Test 1: Direct service role client');
        const adminClient = getServiceRoleClient();
        
        const { data: directData, error: directError } = await adminClient
            .from('wasstrips_applications')
            .select('id, status, tracking_code, updated_at')
            .eq('id', 'a3bfaa01-300d-4423-8791-1d27fddedd7c')
            .single();
            
        console.log('[test-service-role] Direct query result:', { directData, directError });
        
        // Test 2: getWasstripsOrders function (admin dashboard)
        console.log('[test-service-role] Test 2: getWasstripsOrders function');
        const adminResult = await getWasstripsOrders('paid');
        console.log('[test-service-role] Admin orders result:', {
            success: !adminResult.error,
            orderCount: adminResult.orders?.length || 0,
            firstOrder: adminResult.orders?.[0] ? {
                id: adminResult.orders[0].id,
                status: adminResult.orders[0].status,
                tracking_code: adminResult.orders[0].tracking_code,
                updated_at: adminResult.orders[0].updated_at
            } : null,
            error: adminResult.error
        });
        
        // Test 3: getWasstripsOrdersForRetailer function (retailer dashboard)
        console.log('[test-service-role] Test 3: getWasstripsOrdersForRetailer function');
        const retailerResult = await getWasstripsOrdersForRetailer('jackwullems20@spamok.nl');
        console.log('[test-service-role] Retailer orders result:', {
            success: !retailerResult.error,
            orderCount: retailerResult.orders?.length || 0,
            firstOrder: retailerResult.orders?.[0] ? {
                id: retailerResult.orders[0].id,
                order_number: retailerResult.orders[0].order_number,
                tracking_code: retailerResult.orders[0].tracking_code,
                fulfillment_status: retailerResult.orders[0].fulfillment_status,
                payment_status: retailerResult.orders[0].payment_status,
                updated_at: retailerResult.orders[0].updated_at
            } : null,
            error: retailerResult.error
        });
        
        // Test 4: Environment variables check
        console.log('[test-service-role] Test 4: Environment variables');
        const envCheck = {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            NODE_ENV: process.env.NODE_ENV
        };
        console.log('[test-service-role] Environment check:', envCheck);
        
        return NextResponse.json({
            success: true,
            tests: {
                directQuery: { data: directData, error: directError },
                adminOrders: {
                    success: !adminResult.error,
                    count: adminResult.orders?.length || 0,
                    error: adminResult.error,
                    sampleOrder: adminResult.orders?.[0] ? {
                        id: adminResult.orders[0].id,
                        tracking_code: adminResult.orders[0].tracking_code,
                        status: adminResult.orders[0].status
                    } : null
                },
                retailerOrders: {
                    success: !retailerResult.error,
                    count: retailerResult.orders?.length || 0,
                    error: retailerResult.error,
                    sampleOrder: retailerResult.orders?.[0] ? {
                        id: retailerResult.orders[0].id,
                        tracking_code: retailerResult.orders[0].tracking_code,
                        fulfillment_status: retailerResult.orders[0].fulfillment_status
                    } : null
                },
                environment: envCheck
            }
        });
        
    } catch (error) {
        console.error('[test-service-role] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
} 