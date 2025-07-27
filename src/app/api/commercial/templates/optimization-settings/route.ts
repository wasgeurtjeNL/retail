// =====================================================
// TEMPLATE OPTIMIZATION SETTINGS API ROUTE
// Management van optimization settings per segment
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('[Optimization Settings API] GET request received');
    
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get('segment');
    
    if (!segment) {
      return NextResponse.json(
        { error: 'Segment parameter is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get optimization settings for the segment
    const { data: settings, error } = await supabase
      .from('segment_optimization_settings')
      .select('*')
      .eq('segment', segment)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Optimization Settings API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch optimization settings: ' + error.message },
        { status: 500 }
      );
    }
    
    // If no settings found, return default settings
    if (!settings) {
      console.log(`[Optimization Settings API] No settings found for segment: ${segment}, returning defaults`);
      
      const defaultSettings = getDefaultOptimizationSettings(segment);
      
      return NextResponse.json({
        success: true,
        settings: defaultSettings,
        is_default: true
      });
    }
    
    console.log(`[Optimization Settings API] Found settings for segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      settings: settings,
      is_default: false
    });
    
  } catch (error) {
    console.error('[Optimization Settings API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Optimization Settings API] POST request received');
    
    const body = await req.json();
    const {
      segment,
      email_benchmark_conversion_rate,
      landing_benchmark_conversion_rate,
      email_benchmark_open_rate,
      email_benchmark_click_rate,
      auto_switch_enabled,
      minimum_test_volume,
      test_duration_days,
      confidence_threshold,
      check_frequency_hours,
      notify_on_switch,
      notification_email
    } = body;
    
    if (!segment) {
      return NextResponse.json(
        { error: 'Segment is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Prepare update/insert data
    const settingsData = {
      segment,
      email_benchmark_conversion_rate: email_benchmark_conversion_rate || 5.0,
      landing_benchmark_conversion_rate: landing_benchmark_conversion_rate || 12.0,
      email_benchmark_open_rate: email_benchmark_open_rate || 25.0,
      email_benchmark_click_rate: email_benchmark_click_rate || 8.0,
      auto_switch_enabled: auto_switch_enabled !== undefined ? auto_switch_enabled : true,
      minimum_test_volume: minimum_test_volume || 100,
      test_duration_days: test_duration_days || 7,
      confidence_threshold: confidence_threshold || 0.95,
      check_frequency_hours: check_frequency_hours || 24,
      notify_on_switch: notify_on_switch !== undefined ? notify_on_switch : true,
      notification_email: notification_email || 'admin@blossomdrip.com',
      updated_at: new Date().toISOString()
    };
    
    // Use upsert (insert or update)
    const { data: settings, error } = await supabase
      .from('segment_optimization_settings')
      .upsert(settingsData, {
        onConflict: 'segment'
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Optimization Settings API] Upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save optimization settings: ' + error.message },
        { status: 500 }
      );
    }
    
    console.log(`[Optimization Settings API] Saved settings for segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      settings: settings,
      message: 'Optimization settings saved successfully'
    });
    
  } catch (error) {
    console.error('[Optimization Settings API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // PUT is handled by POST (upsert)
  return POST(req);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getDefaultOptimizationSettings(segment: string) {
  const defaultSettings: Record<string, any> = {
    beauty_salon: {
      email_benchmark_conversion_rate: 6.50,
      landing_benchmark_conversion_rate: 15.00,
      email_benchmark_open_rate: 28.0,
      email_benchmark_click_rate: 9.0
    },
    hair_salon: {
      email_benchmark_conversion_rate: 5.80,
      landing_benchmark_conversion_rate: 12.50,
      email_benchmark_open_rate: 26.0,
      email_benchmark_click_rate: 8.5
    },
    cleaning_service: {
      email_benchmark_conversion_rate: 4.20,
      landing_benchmark_conversion_rate: 10.00,
      email_benchmark_open_rate: 24.0,
      email_benchmark_click_rate: 7.5
    },
    restaurant: {
      email_benchmark_conversion_rate: 3.80,
      landing_benchmark_conversion_rate: 9.50,
      email_benchmark_open_rate: 22.0,
      email_benchmark_click_rate: 7.0
    },
    hotel_bnb: {
      email_benchmark_conversion_rate: 5.20,
      landing_benchmark_conversion_rate: 13.00,
      email_benchmark_open_rate: 30.0,
      email_benchmark_click_rate: 10.0
    },
    wellness_spa: {
      email_benchmark_conversion_rate: 7.80,
      landing_benchmark_conversion_rate: 17.50,
      email_benchmark_open_rate: 32.0,
      email_benchmark_click_rate: 11.0
    }
  };
  
  const segmentDefaults = defaultSettings[segment] || defaultSettings.beauty_salon;
  
  return {
    segment: segment,
    email_benchmark_conversion_rate: segmentDefaults.email_benchmark_conversion_rate,
    landing_benchmark_conversion_rate: segmentDefaults.landing_benchmark_conversion_rate,
    email_benchmark_open_rate: segmentDefaults.email_benchmark_open_rate,
    email_benchmark_click_rate: segmentDefaults.email_benchmark_click_rate,
    auto_switch_enabled: true,
    minimum_test_volume: 100,
    test_duration_days: 7,
    confidence_threshold: 0.95,
    check_frequency_hours: 24,
    notify_on_switch: true,
    notification_email: 'admin@blossomdrip.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
} 