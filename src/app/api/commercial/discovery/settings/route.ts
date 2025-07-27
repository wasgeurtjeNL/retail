import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

// Haalt alle discovery settings op voor admin interface
export async function GET() {
  console.log('[API] Discovery Settings - Fetching all configurations');
  
  try {
    const supabase = getServiceRoleClient();
    
    const { data: settings, error } = await supabase
      .from('commercial_discovery_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching discovery settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch discovery settings', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[API] Found ${settings?.length || 0} discovery configurations`);
    return NextResponse.json({ settings });

  } catch (error: any) {
    console.error('[API] Discovery Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Maakt nieuwe discovery setting configuratie aan
export async function POST(request: NextRequest) {
  console.log('[API] Discovery Settings - Creating new configuration');
  
  try {
    const body = await request.json();
    const {
      name,
      description,
      perplexity_model = 'sonar',
      perplexity_temperature = 0.3,
      perplexity_max_tokens = 2000,
      max_results_per_search = 10,
      search_radius = 5000,
      min_confidence_score = 0.6,
      require_email = false,
      require_website = false,
      require_phone = false,
      min_rating = 3.0,
      enable_web_scraping = true,
      enable_google_places = false,
      enable_kvk_api = false,
      enable_perplexity = true,
      default_business_segments = [],
      default_regions = [],
      auto_discovery_enabled = false,
      discovery_frequency = 'daily',
      max_daily_discoveries = 50
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Configuration name is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    
    const { data: newSetting, error } = await supabase
      .from('commercial_discovery_settings')
      .insert({
        name: name.trim(),
        description: description?.trim(),
        perplexity_model,
        perplexity_temperature,
        perplexity_max_tokens,
        max_results_per_search,
        search_radius,
        min_confidence_score,
        require_email,
        require_website,
        require_phone,
        min_rating,
        enable_web_scraping,
        enable_google_places,
        enable_kvk_api,
        enable_perplexity,
        default_business_segments,
        default_regions,
        auto_discovery_enabled,
        discovery_frequency,
        max_daily_discoveries
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating discovery setting:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Configuration name already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create discovery setting', details: error.message },
        { status: 500 }
      );
    }

    console.log('[API] Discovery setting created:', newSetting.name);
    return NextResponse.json({ setting: newSetting }, { status: 201 });

  } catch (error: any) {
    console.error('[API] Discovery Settings POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Update bestaande discovery setting configuratie
export async function PATCH(request: NextRequest) {
  console.log('[API] Discovery Settings - Updating configuration');
  
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    
    const { data: updatedSetting, error } = await supabase
      .from('commercial_discovery_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API] Error updating discovery setting:', error);
      return NextResponse.json(
        { error: 'Failed to update discovery setting', details: error.message },
        { status: 500 }
      );
    }

    if (!updatedSetting) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    console.log('[API] Discovery setting updated:', updatedSetting.name);
    return NextResponse.json({ setting: updatedSetting });

  } catch (error: any) {
    console.error('[API] Discovery Settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Verwijdert discovery setting configuratie
export async function DELETE(request: NextRequest) {
  console.log('[API] Discovery Settings - Deleting configuration');
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    
    // Controleer of het de actieve configuratie is
    const { data: activeSetting } = await supabase
      .from('commercial_discovery_settings')
      .select('name, is_active')
      .eq('id', id)
      .single();

    if (activeSetting?.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete active configuration. Please deactivate first.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('commercial_discovery_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[API] Error deleting discovery setting:', error);
      return NextResponse.json(
        { error: 'Failed to delete discovery setting', details: error.message },
        { status: 500 }
      );
    }

    console.log('[API] Discovery setting deleted:', id);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API] Discovery Settings DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 