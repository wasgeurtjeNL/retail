import { NextRequest, NextResponse } from 'next/server';
import { updateOrder } from '@/lib/supabase';

// Test API route om updateOrder functionaliteit te testen
export async function POST(request: NextRequest) {
    try {
        const { orderId, updates } = await request.json();
        
        console.log('[test-update-order] Testing updateOrder with:', { orderId, updates });
        
        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            );
        }
        
        // Test de updateOrder functie
        const result = await updateOrder(orderId, updates);
        
        if (result.error) {
            console.error('[test-update-order] Error from updateOrder:', result.error);
            return NextResponse.json(
                { 
                    error: 'Update failed', 
                    details: result.error,
                    success: false 
                },
                { status: 500 }
            );
        }
        
        console.log('[test-update-order] Update successful:', result.order);
        return NextResponse.json({
            success: true,
            order: result.order,
            message: 'Order updated successfully'
        });
        
    } catch (error) {
        console.error('[test-update-order] Unexpected error:', error);
        return NextResponse.json(
            { 
                error: 'Unexpected error', 
                details: error instanceof Error ? error.message : 'Unknown error',
                success: false 
            },
            { status: 500 }
        );
    }
} 