// =====================================================
// TEMPLATE A/B TEST START API ROUTE
// Start A/B test tussen template variants
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('[A/B Test Start API] POST request received');
    
    const body = await req.json();
    const {
      segment,
      variant_id,
      control_variant_id,
      test_duration_days = 7,
      traffic_split = 50, // Percentage for test variant (50 = 50/50 split)
      test_name
    } = body;
    
    // Validation
    if (!segment || !variant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: segment, variant_id' },
        { status: 400 }
      );
    }
    
    if (traffic_split < 10 || traffic_split > 90) {
      return NextResponse.json(
        { error: 'Traffic split must be between 10% and 90%' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get the test variant
    const { data: testVariant, error: testError } = await supabase
      .from('segment_template_variants')
      .select('*')
      .eq('id', variant_id)
      .eq('segment', segment)
      .single();
    
    if (testError) {
      console.error('[A/B Test Start] Error fetching test variant:', testError);
      return NextResponse.json(
        { error: 'Test variant not found: ' + testError.message },
        { status: 404 }
      );
    }
    
    // Get or determine control variant
    let controlVariant;
    if (control_variant_id) {
      const { data: controlData, error: controlError } = await supabase
        .from('segment_template_variants')
        .select('*')
        .eq('id', control_variant_id)
        .eq('segment', segment)
        .eq('template_type', testVariant.template_type)
        .single();
      
      if (controlError) {
        return NextResponse.json(
          { error: 'Control variant not found: ' + controlError.message },
          { status: 404 }
        );
      }
      controlVariant = controlData;
    } else {
      // Use current active template as control
      const { data: activeTemplate, error: activeError } = await supabase
        .from('segment_template_variants')
        .select('*')
        .eq('segment', segment)
        .eq('template_type', testVariant.template_type)
        .eq('active', true)
        .single();
      
      if (activeError) {
        return NextResponse.json(
          { error: 'No active template found to use as control' },
          { status: 400 }
        );
      }
      controlVariant = activeTemplate;
    }
    
    // Ensure test and control are different
    if (testVariant.id === controlVariant.id) {
      return NextResponse.json(
        { error: 'Test variant and control variant cannot be the same' },
        { status: 400 }
      );
    }
    
    // Check if there's already an active A/B test for this segment/type
    const { data: existingTest, error: existingError } = await supabase
      .from('template_ab_tests')
      .select('id, test_name, status')
      .eq('segment', segment)
      .eq('template_type', testVariant.template_type)
      .in('status', ['active', 'running'])
      .single();
    
    if (existingTest && existingError?.code !== 'PGRST116') {
      return NextResponse.json(
        { error: `Active A/B test already exists: "${existingTest.test_name}"` },
        { status: 400 }
      );
    }
    
    // Create A/B test record
    const abTest = await createABTest(
      supabase,
      segment,
      testVariant,
      controlVariant,
      {
        test_duration_days,
        traffic_split,
        test_name: test_name || `${testVariant.variant_name} vs ${controlVariant.variant_name}`
      }
    );
    
    if (!abTest.success) {
      return NextResponse.json(
        { error: abTest.error },
        { status: 500 }
      );
    }
    
    // Enable test mode on both variants
    await Promise.all([
      supabase
        .from('segment_template_variants')
        .update({ 
          test_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', testVariant.id),
      
      supabase
        .from('segment_template_variants')
        .update({ 
          test_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', controlVariant.id)
    ]);
    
    console.log(`[A/B Test Start] Successfully started A/B test for ${testVariant.template_type} in segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      ab_test: abTest.test,
      test_variant: {
        id: testVariant.id,
        variant_name: testVariant.variant_name,
        current_conversion_rate: testVariant.current_conversion_rate
      },
      control_variant: {
        id: controlVariant.id,
        variant_name: controlVariant.variant_name,
        current_conversion_rate: controlVariant.current_conversion_rate
      },
      traffic_split: {
        test_variant: traffic_split,
        control_variant: 100 - traffic_split
      },
      test_duration_days: test_duration_days,
      estimated_end_date: new Date(Date.now() + (test_duration_days * 24 * 60 * 60 * 1000)).toISOString(),
      message: `A/B test "${abTest.test.test_name}" started successfully`
    });
    
  } catch (error) {
    console.error('[A/B Test Start API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

// =====================================================
// A/B TEST CREATION LOGIC
// =====================================================

async function createABTest(
  supabase: any,
  segment: string,
  testVariant: any,
  controlVariant: any,
  options: {
    test_duration_days: number;
    traffic_split: number;
    test_name: string;
  }
) {
  try {
    console.log('[A/B Test Start] Creating A/B test record');
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (options.test_duration_days * 24 * 60 * 60 * 1000));
    
    // Create A/B test table entry if the table exists
    // For now, we'll use a simplified approach and store in metadata
    const testData = {
      test_id: `ab_${segment}_${testVariant.template_type}_${Date.now()}`,
      segment: segment,
      template_type: testVariant.template_type,
      test_name: options.test_name,
      status: 'active',
      
      // Variants
      test_variant_id: testVariant.id,
      control_variant_id: controlVariant.id,
      
      // Configuration
      traffic_split_percentage: options.traffic_split,
      test_duration_days: options.test_duration_days,
      
      // Timing
      started_at: startDate.toISOString(),
      estimated_end_at: endDate.toISOString(),
      
      // Initial metrics
      test_variant_volume: 0,
      control_variant_volume: 0,
      test_variant_conversions: 0,
      control_variant_conversions: 0,
      
      // Statistical analysis
      confidence_level: 0.95,
      statistical_significance: false,
      winner_variant_id: null,
      
      // Metadata
      created_at: startDate.toISOString(),
      created_by: 'admin' // TODO: Get from auth context
    };
    
    // Try to create in dedicated A/B test table
    try {
      const { data: testRecord, error: testError } = await supabase
        .from('template_ab_tests')
        .insert([testData])
        .select()
        .single();
      
      if (testError) {
        console.log('[A/B Test Start] A/B test table not available, storing in variant metadata');
        
        // Fallback: Store test info in variant metadata
        await Promise.all([
          supabase
            .from('segment_template_variants')
            .update({
              template_content: {
                ...testVariant.template_content,
                ab_test: {
                  ...testData,
                  role: 'test_variant'
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', testVariant.id),
          
          supabase
            .from('segment_template_variants')
            .update({
              template_content: {
                ...controlVariant.template_content,
                ab_test: {
                  ...testData,
                  role: 'control_variant'
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', controlVariant.id)
        ]);
        
        return {
          success: true,
          test: testData,
          storage_method: 'variant_metadata'
        };
      }
      
      return {
        success: true,
        test: testRecord,
        storage_method: 'dedicated_table'
      };
      
    } catch (fallbackError) {
      console.error('[A/B Test Start] Error with A/B test table:', fallbackError);
      
      // Store in variant metadata as fallback
      await Promise.all([
        supabase
          .from('segment_template_variants')
          .update({
            template_content: {
              ...testVariant.template_content,
              ab_test: {
                ...testData,
                role: 'test_variant'
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', testVariant.id),
        
        supabase
          .from('segment_template_variants')
          .update({
            template_content: {
              ...controlVariant.template_content,
              ab_test: {
                ...testData,
                role: 'control_variant'
              }
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', controlVariant.id)
      ]);
      
      return {
        success: true,
        test: testData,
        storage_method: 'variant_metadata_fallback'
      };
    }
    
  } catch (error) {
    console.error('[A/B Test Start] Error creating A/B test:', error);
    return {
      success: false,
      error: 'Failed to create A/B test: ' + error.message
    };
  }
} 