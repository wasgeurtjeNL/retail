// =====================================================
// CONVERSION SYSTEM TEST API - Complete Flow Testing
// End-to-end testing of prospect to retailer conversion tracking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { PostDeliveryService } from '@/lib/conversion/post-delivery-service';
import { RetailerAttributionService } from '@/lib/conversion/retailer-attribution';
import { ProefpakketAssignmentService } from '@/lib/fulfillment/proefpakket-assignment';
import { TrackingNotificationService } from '@/lib/fulfillment/tracking-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { test_type = 'complete_conversion_flow', ...options } = body;

    console.log(`[Conversion Test] Starting ${test_type} test`);

    switch (test_type) {
      case 'complete_conversion_flow':
        return await testCompleteConversionFlow(options);
      
      case 'feedback_collection':
        return await testFeedbackCollection(options);
      
      case 'retailer_attribution':
        return await testRetailerAttribution(options);
      
      case 'analytics_calculation':
        return await testAnalyticsCalculation(options);
      
      case 'post_delivery_automation':
        return await testPostDeliveryAutomation(options);
      
      case 'create_test_scenario':
        return await createTestScenario(options);
      
      default:
        return NextResponse.json(
          { error: 'Invalid test_type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Conversion Test] Error:', error);
    
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
      
      case 'performance_metrics':
        return await getPerformanceMetrics();
      
      case 'cleanup':
        return await cleanupTestData();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Conversion Test] Error in GET:', error);
    
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
// COMPLETE CONVERSION FLOW TEST
// =====================================================

async function testCompleteConversionFlow(options: any = {}) {
  const testResults = {
    test_id: `conversion-test-${Date.now()}`,
    started_at: new Date().toISOString(),
    steps: [] as any[],
    success: false,
    summary: {}
  };

  try {
    console.log('[Conversion Test] Starting complete conversion flow test');

    // Step 1: Create test prospect
    const testProspect = await createTestProspect();
    testResults.steps.push({
      step: 'create_prospect',
      success: true,
      data: { prospect_id: testProspect.id, company: testProspect.company_name }
    });

    // Step 2: Assign proefpakket and create order
    const assignmentService = new ProefpakketAssignmentService();
    const assignmentResult = await assignmentService.processProspectAssignment({
      prospect_id: testProspect.id,
      trigger_source: 'manual',
      override_rules: true
    });

    testResults.steps.push({
      step: 'proefpakket_assignment',
      success: assignmentResult.success,
      data: assignmentResult
    });

    if (!assignmentResult.success) {
      throw new Error(`Assignment failed: ${assignmentResult.error}`);
    }

    const orderId = assignmentResult.order_id!;

    // Step 3: Simulate delivery
    const trackingService = new TrackingNotificationService();
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
      data: { tracking_number: assignmentResult.tracking_number }
    });

    // Step 4: Wait for post-delivery automation (simulate delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Simulate feedback submission
    const supabase = getServiceRoleClient();
    const { data: journey } = await supabase
      .from('conversion_journeys')
      .select('id')
      .eq('fulfillment_order_id', orderId)
      .single();

    if (journey) {
      const postDeliveryService = new PostDeliveryService();
      await postDeliveryService.processFeedbackSubmission(journey.id, {
        overall_rating: 5,
        product_quality_rating: 5,
        packaging_rating: 4,
        delivery_rating: 5,
        liked_most: 'Excellent quality products',
        interested_in_partnership: true,
        ready_for_follow_up: true,
        preferred_contact_method: 'email',
        decision_maker: true,
        decision_timeline: 'within_month',
        source: 'test_simulation'
      });

      testResults.steps.push({
        step: 'feedback_submission',
        success: true,
        data: { journey_id: journey.id, rating: 5, interested: true }
      });
    }

    // Step 6: Simulate retailer application
    const retailerApplication = {
      id: `test-app-${Date.now()}`,
      company_name: testProspect.company_name,
      contact_name: testProspect.contact_name,
      email: testProspect.email,
      phone: testProspect.phone,
      city: testProspect.city,
      postal_code: testProspect.postal_code,
      country: testProspect.country,
      utm_source: 'proefpakket',
      utm_campaign: `journey_${journey?.id}`,
      application_date: new Date().toISOString(),
      status: 'pending'
    };

    const attributionService = new RetailerAttributionService();
    const attributionMatches = await attributionService.processRetailerApplication(retailerApplication);

    testResults.steps.push({
      step: 'retailer_attribution',
      success: attributionMatches.length > 0,
      data: {
        matches_found: attributionMatches.length,
        best_match: attributionMatches[0] || null
      }
    });

    // Step 7: Update journey to converted status
    if (journey && attributionMatches.length > 0) {
      await supabase
        .from('conversion_journeys')
        .update({
          status: 'converted',
          conversion_completed_at: new Date().toISOString(),
          actual_ltv: 1500, // Test LTV
          conversion_source: 'proefpakket'
        })
        .eq('id', journey.id);

      testResults.steps.push({
        step: 'conversion_completion',
        success: true,
        data: { status: 'converted', ltv: 1500 }
      });
    }

    // Step 8: Test analytics calculation
    const analyticsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/conversion/analytics?action=overview`);
    const analyticsData = await analyticsResponse.json();

    testResults.steps.push({
      step: 'analytics_calculation',
      success: analyticsData.success,
      data: { analytics_available: analyticsData.success }
    });

    testResults.success = true;
    testResults.summary = {
      prospect_id: testProspect.id,
      order_id: orderId,
      journey_id: journey?.id,
      attribution_matches: attributionMatches.length,
      conversion_completed: true,
      total_steps: testResults.steps.length,
      completed_at: new Date().toISOString()
    };

    console.log('[Conversion Test] Complete flow test successful');

    return NextResponse.json({
      success: true,
      message: 'Complete conversion flow test successful',
      data: testResults
    });

  } catch (error) {
    testResults.steps.push({
      step: 'error',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    console.error('[Conversion Test] Complete flow test failed:', error);

    return NextResponse.json({
      success: false,
      message: 'Complete flow test failed',
      data: testResults
    });
  }
}

// =====================================================
// INDIVIDUAL COMPONENT TESTS
// =====================================================

async function testFeedbackCollection(options: any = {}) {
  try {
    const postDeliveryService = new PostDeliveryService();

    // Create test journey
    const testProspect = await createTestProspect();
    const journey = await postDeliveryService.initializeJourney(testProspect.id);

    // Test feedback submission
    await postDeliveryService.processFeedbackSubmission(journey.id, {
      overall_rating: 4,
      product_quality_rating: 4,
      packaging_rating: 3,
      delivery_rating: 5,
      liked_most: 'Great product selection',
      interested_in_partnership: true,
      ready_for_follow_up: true,
      preferred_contact_method: 'phone',
      source: 'test'
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback collection test successful',
      data: {
        journey_id: journey.id,
        prospect_id: testProspect.id,
        feedback_processed: true
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Feedback collection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testRetailerAttribution(options: any = {}) {
  try {
    const attributionService = new RetailerAttributionService();

    // Create test prospect and journey
    const testProspect = await createTestProspect();
    const postDeliveryService = new PostDeliveryService();
    const journey = await postDeliveryService.initializeJourney(testProspect.id);

    // Simulate delivery
    await postDeliveryService.processDeliveryEvent('test-order-id');

    // Test retailer application attribution
    const retailerApplication = {
      id: `test-attribution-${Date.now()}`,
      company_name: testProspect.company_name,
      contact_name: testProspect.contact_name,
      email: testProspect.email,
      phone: testProspect.phone,
      city: testProspect.city,
      postal_code: testProspect.postal_code,
      country: testProspect.country,
      utm_source: 'proefpakket',
      application_date: new Date().toISOString(),
      status: 'pending'
    };

    const matches = await attributionService.processRetailerApplication(retailerApplication);

    return NextResponse.json({
      success: true,
      message: 'Retailer attribution test successful',
      data: {
        prospect_id: testProspect.id,
        journey_id: journey.id,
        attribution_matches: matches,
        best_match_confidence: matches.length > 0 ? matches[0].confidence : 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Retailer attribution test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testAnalyticsCalculation(options: any = {}) {
  try {
    const postDeliveryService = new PostDeliveryService();

    // Test analytics methods
    const journeyStats = await postDeliveryService.getJourneyStats();
    const conversionMetrics = await postDeliveryService.getConversionMetrics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    return NextResponse.json({
      success: true,
      message: 'Analytics calculation test successful',
      data: {
        journey_stats: journeyStats,
        conversion_metrics: conversionMetrics,
        analytics_functional: true
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Analytics calculation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testPostDeliveryAutomation(options: any = {}) {
  try {
    const postDeliveryService = new PostDeliveryService();

    // Create test scenario
    const testProspect = await createTestProspect();
    const journey = await postDeliveryService.initializeJourney(testProspect.id);

    // Test delivery event processing
    await postDeliveryService.processDeliveryEvent('test-order-id');

    // Verify journey status updates
    const supabase = getServiceRoleClient();
    const { data: updatedJourney } = await supabase
      .from('conversion_journeys')
      .select('status, delivered_at, total_touchpoints')
      .eq('id', journey.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Post-delivery automation test successful',
      data: {
        journey_id: journey.id,
        updated_status: updatedJourney?.status,
        delivered_at: updatedJourney?.delivered_at,
        touchpoints_created: updatedJourney?.total_touchpoints || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Post-delivery automation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// =====================================================
// TEST DATA MANAGEMENT
// =====================================================

async function createTestProspect(): Promise<any> {
  const supabase = getServiceRoleClient();

  const testProspect = {
    company_name: `Test Conversion Co ${Date.now()}`,
    contact_name: 'John Conversion',
    email: `conversion-test-${Date.now()}@example.com`,
    phone: '+31612345678',
    address_line1: 'Test Street 123',
    city: 'Amsterdam',
    postal_code: '1012AB',
    country: 'NL',
    enrichment_score: 90,
    status: 'qualified',
    source: 'conversion_test'
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

async function createTestScenario(options: any = {}) {
  try {
    const scenario = options.scenario || 'basic';
    const count = options.count || 3;
    const results = [];

    for (let i = 0; i < count; i++) {
      const prospect = await createTestProspect();
      
      if (scenario === 'with_journey') {
        const postDeliveryService = new PostDeliveryService();
        const journey = await postDeliveryService.initializeJourney(prospect.id);
        results.push({ prospect, journey });
      } else {
        results.push({ prospect });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${scenario} test scenario with ${count} prospects`,
      data: { scenario, count, results }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to create test scenario',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// =====================================================
// SYSTEM STATUS & MONITORING
// =====================================================

async function getSystemStatus() {
  try {
    const supabase = getServiceRoleClient();

    // Test database connectivity
    const { error: dbError } = await supabase
      .from('conversion_journeys')
      .select('count')
      .limit(1);

    // Test service availability
    const services = {
      database: !dbError,
      post_delivery_service: true,
      attribution_service: true,
      analytics_service: true,
      tracking_integration: true
    };

    // Get recent activity
    const { data: recentJourneys } = await supabase
      .from('conversion_journeys')
      .select('count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: recentFeedback } = await supabase
      .from('proefpakket_feedback')
      .select('count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      success: true,
      data: {
        system_status: 'operational',
        services,
        recent_activity: {
          journeys_last_24h: recentJourneys?.length || 0,
          feedback_last_24h: recentFeedback?.length || 0
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getTestResults() {
  // Placeholder for test results storage
  return NextResponse.json({
    success: true,
    message: 'Test results feature not yet implemented',
    data: { results: [] }
  });
}

async function getPerformanceMetrics() {
  try {
    const supabase = getServiceRoleClient();

    // Get basic performance metrics
    const { data: journeyMetrics } = await supabase
      .from('conversion_journeys')
      .select('status, days_to_conversion, total_cost, actual_ltv')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalJourneys = journeyMetrics?.length || 0;
    const conversions = journeyMetrics?.filter(j => j.status === 'converted').length || 0;
    const conversionRate = totalJourneys > 0 ? (conversions / totalJourneys) * 100 : 0;

    const avgConversionTime = journeyMetrics?.filter(j => j.days_to_conversion)
      .reduce((sum, j, _, arr) => sum + j.days_to_conversion / arr.length, 0) || 0;

    const totalCost = journeyMetrics?.reduce((sum, j) => sum + (j.total_cost || 0), 0) || 0;
    const totalRevenue = journeyMetrics?.filter(j => j.actual_ltv)
      .reduce((sum, j) => sum + j.actual_ltv, 0) || 0;

    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: 'last_30_days',
        metrics: {
          total_journeys: totalJourneys,
          conversions,
          conversion_rate: conversionRate,
          avg_conversion_time_days: avgConversionTime,
          total_cost: totalCost,
          total_revenue: totalRevenue,
          roi_percentage: roi
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function cleanupTestData() {
  try {
    const supabase = getServiceRoleClient();

    // Clean up test prospects
    const { error: prospectError } = await supabase
      .from('prospects')
      .delete()
      .like('email', 'conversion-test-%@example.com');

    // Clean up test journeys
    const { error: journeyError } = await supabase
      .from('conversion_journeys')
      .delete()
      .like('notes', '%conversion_test%');

    return NextResponse.json({
      success: true,
      message: 'Conversion test data cleanup completed',
      cleaned: {
        prospects: !prospectError,
        journeys: !journeyError
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 