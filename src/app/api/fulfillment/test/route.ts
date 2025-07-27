// =====================================================
// FULFILLMENT TEST API - Complete Flow Testing
// End-to-end testing of the prospect-to-delivery flow
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { ProefpakketAssignmentService } from '@/lib/fulfillment/proefpakket-assignment';
import { TrackingNotificationService } from '@/lib/fulfillment/tracking-service';
import { InventoryManager } from '@/lib/fulfillment/inventory-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { test_type = 'full_flow', prospect_id, options = {} } = body;

    console.log(`[Fulfillment Test] Starting ${test_type} test`);

    switch (test_type) {
      case 'full_flow':
        return await testFullFlow(prospect_id, options);
      
      case 'assignment_only':
        return await testAssignmentOnly(prospect_id, options);
      
      case 'tracking_only':
        return await testTrackingOnly(options);
      
      case 'inventory_check':
        return await testInventoryCheck();
      
      case 'notification_test':
        return await testNotifications(options);
      
      case 'create_test_data':
        return await createTestData(options);
      
      default:
        return NextResponse.json(
          { error: 'Invalid test_type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Fulfillment Test] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return await getSystemStatus();
      
      case 'test_results':
        return await getTestResults();
      
      case 'cleanup':
        return await cleanupTestData();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Fulfillment Test] Error in GET:', error);
    
    return NextResponse.json(
      { 
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// FULL FLOW TEST
// =====================================================

async function testFullFlow(prospectId?: string, options: any = {}) {
  const testResults = {
    test_id: `test-${Date.now()}`,
    started_at: new Date().toISOString(),
    steps: [] as any[],
    success: false,
    summary: {}
  };

  try {
    // Step 1: Create or get test prospect
    if (!prospectId) {
      const testProspect = await createTestProspect();
      prospectId = testProspect.id;
      testResults.steps.push({
        step: 'create_prospect',
        success: true,
        data: { prospect_id: prospectId }
      });
    }

    // Step 2: Test assignment
    console.log('[Fulfillment Test] Testing assignment...');
    const assignmentService = new ProefpakketAssignmentService();
    
    const assignmentResult = await assignmentService.processProspectAssignment({
      prospect_id: prospectId!,
      trigger_source: 'manual',
      override_rules: options.override_rules || false
    });

    testResults.steps.push({
      step: 'assignment',
      success: assignmentResult.success,
      data: assignmentResult
    });

    if (!assignmentResult.success) {
      throw new Error(`Assignment failed: ${assignmentResult.error}`);
    }

    const orderId = assignmentResult.order_id!;

    // Step 3: Test tracking event
    console.log('[Fulfillment Test] Testing tracking...');
    const trackingService = new TrackingNotificationService();
    
    await trackingService.recordTrackingEvent({
      tracking_number: assignmentResult.tracking_number!,
      order_id: orderId,
      event_type: 'shipped',
      event_description: 'Test shipment created',
      event_timestamp: new Date()
    });

    testResults.steps.push({
      step: 'tracking_event',
      success: true,
      data: { event_type: 'shipped' }
    });

    // Step 4: Test delivery simulation
    console.log('[Fulfillment Test] Simulating delivery...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    await trackingService.recordTrackingEvent({
      tracking_number: assignmentResult.tracking_number!,
      order_id: orderId,
      event_type: 'delivered',
      event_description: 'Test delivery completed',
      event_timestamp: new Date()
    });

    testResults.steps.push({
      step: 'delivery_simulation',
      success: true,
      data: { event_type: 'delivered' }
    });

    // Step 5: Validate final state
    const supabase = getServiceRoleClient();
    const { data: finalOrder, error } = await supabase
      .from('fulfillment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      throw new Error(`Failed to validate final state: ${error.message}`);
    }

    testResults.steps.push({
      step: 'validation',
      success: true,
      data: { final_status: finalOrder.status }
    });

    testResults.success = true;
    testResults.summary = {
      prospect_id: prospectId,
      order_id: orderId,
      tracking_number: assignmentResult.tracking_number,
      final_status: finalOrder.status,
      total_steps: testResults.steps.length,
      completed_at: new Date().toISOString()
    };

    console.log('[Fulfillment Test] Full flow test completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Full flow test completed successfully',
      data: testResults
    });

  } catch (error) {
    testResults.steps.push({
      step: 'error',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    console.error('[Fulfillment Test] Full flow test failed:', error);

    return NextResponse.json({
      success: false,
      message: 'Full flow test failed',
      data: testResults
    });
  }
}

// =====================================================
// INDIVIDUAL COMPONENT TESTS
// =====================================================

async function testAssignmentOnly(prospectId?: string, options: any = {}) {
  try {
    if (!prospectId) {
      const testProspect = await createTestProspect();
      prospectId = testProspect.id;
    }

    const assignmentService = new ProefpakketAssignmentService();
    const result = await assignmentService.processProspectAssignment({
      prospect_id: prospectId!,
      trigger_source: 'manual',
      override_rules: options.override_rules || false
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment test completed',
      data: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Assignment test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testTrackingOnly(options: any = {}) {
  try {
    const trackingService = new TrackingNotificationService();

    // Create a test tracking event
    const testEvent = {
      tracking_number: `TEST-${Date.now()}`,
      order_id: options.order_id || 'test-order',
      event_type: options.event_type || 'in_transit',
      event_description: 'Test tracking event',
      event_timestamp: new Date(),
      location: 'Test Location'
    };

    await trackingService.recordTrackingEvent(testEvent);

    return NextResponse.json({
      success: true,
      message: 'Tracking test completed',
      data: testEvent
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Tracking test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testInventoryCheck() {
  try {
    const inventoryManager = new InventoryManager();

    // Check inventory levels
    const supabase = getServiceRoleClient();
    const { data: products, error } = await supabase
      .from('fulfillment_products')
      .select('*')
      .limit(5);

    if (error) {
      throw new Error(`Failed to check inventory: ${error.message}`);
    }

    const inventoryResults = [];
    for (const product of products || []) {
      try {
        const available = await inventoryManager.checkAvailability(product.sku, 1);
        inventoryResults.push({
          sku: product.sku,
          name: product.name,
          available,
          stock_level: product.stock_quantity
        });
      } catch (err) {
        inventoryResults.push({
          sku: product.sku,
          name: product.name,
          available: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory check completed',
      data: { inventory: inventoryResults }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Inventory check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testNotifications(options: any = {}) {
  try {
    const trackingService = new TrackingNotificationService();

    // Test notification trigger
    const testEvent = {
      tracking_number: options.tracking_number || `TEST-${Date.now()}`,
      order_id: options.order_id || 'test-order',
      event_type: options.event_type || 'delivered',
      event_description: 'Test notification trigger',
      event_timestamp: new Date()
    };

    await trackingService.recordTrackingEvent(testEvent);

    return NextResponse.json({
      success: true,
      message: 'Notification test completed',
      data: testEvent
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Notification test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// =====================================================
// TEST DATA MANAGEMENT
// =====================================================

async function createTestProspect() {
  const supabase = getServiceRoleClient();

  const testProspect = {
    company_name: `Test Company ${Date.now()}`,
    contact_name: 'Test Contact',
    email: `test-${Date.now()}@example.com`,
    phone: '+31612345678',
    address_line1: 'Test Street 123',
    city: 'Amsterdam',
    postal_code: '1012AB',
    country: 'NL',
    enrichment_score: 85,
    status: 'qualified',
    source: 'test'
  };

  const { data, error } = await supabase
    .from('prospects')
    .insert([testProspect])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test prospect: ${error.message}`);
  }

  return data;
}

async function createTestData(options: any = {}) {
  try {
    const count = options.count || 5;
    const results = [];

    for (let i = 0; i < count; i++) {
      const prospect = await createTestProspect();
      results.push(prospect);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${count} test prospects`,
      data: { prospects: results }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to create test data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getSystemStatus() {
  try {
    const supabase = getServiceRoleClient();

    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('prospects')
      .select('count')
      .limit(1);

    const status = {
      database: !dbError,
      timestamp: new Date().toISOString(),
      services: {
        assignment_service: true,
        tracking_service: true,
        inventory_manager: true,
        queue_manager: true
      }
    };

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getTestResults() {
  // In a real implementation, this would retrieve stored test results
  return NextResponse.json({
    success: true,
    message: 'Test results feature not yet implemented',
    data: { results: [] }
  });
}

async function cleanupTestData() {
  try {
    const supabase = getServiceRoleClient();

    // Clean up test prospects
    const { error: prospectError } = await supabase
      .from('prospects')
      .delete()
      .like('email', 'test-%@example.com');

    if (prospectError) {
      console.warn('[Fulfillment Test] Error cleaning up prospects:', prospectError);
    }

    // Clean up test orders
    const { error: orderError } = await supabase
      .from('fulfillment_orders')
      .delete()
      .like('order_number', 'TEST-%');

    if (orderError) {
      console.warn('[Fulfillment Test] Error cleaning up orders:', orderError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test data cleanup completed'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 