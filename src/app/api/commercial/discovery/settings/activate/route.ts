import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

// Activeert een specifieke discovery configuratie en deactiveert alle anderen
export async function POST(request: NextRequest) {
  console.log('[API] Discovery Settings Activate - Setting active configuration');
  
  try {
    const body = await request.json();
    const { configurationId } = body;

    if (!configurationId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    
    // Eerst alle configuraties deactiveren
    console.log('[API] Deactivating all configurations');
    const { error: deactivateError } = await supabase
      .from('commercial_discovery_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', 'dummy'); // Update all rows

    if (deactivateError) {
      console.error('[API] Error deactivating configurations:', deactivateError);
      return NextResponse.json(
        { error: 'Failed to deactivate existing configurations', details: deactivateError.message },
        { status: 500 }
      );
    }

    // Dan de geselecteerde configuratie activeren
    console.log('[API] Activating configuration:', configurationId);
    const { data: activatedConfig, error: activateError } = await supabase
      .from('commercial_discovery_settings')
      .update({ 
        is_active: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', configurationId)
      .select()
      .single();

    if (activateError) {
      console.error('[API] Error activating configuration:', activateError);
      return NextResponse.json(
        { error: 'Failed to activate configuration', details: activateError.message },
        { status: 500 }
      );
    }

    if (!activatedConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    console.log('[API] Configuration activated successfully:', activatedConfig.name);
    return NextResponse.json({ 
      success: true, 
      activeConfiguration: activatedConfig 
    });

  } catch (error: any) {
    console.error('[API] Discovery Settings Activate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Haalt de huidige actieve configuratie op
export async function GET() {
  console.log('[API] Discovery Settings - Fetching active configuration');
  
  try {
    const supabase = getServiceRoleClient();
    
    const { data: activeConfig, error } = await supabase
      .from('commercial_discovery_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[API] Error fetching active configuration:', error);
      return NextResponse.json(
        { error: 'Failed to fetch active configuration', details: error.message },
        { status: 500 }
      );
    }

    if (!activeConfig) {
      console.log('[API] No active configuration found');
      return NextResponse.json({ 
        activeConfiguration: null,
        message: 'No active configuration found'
      });
    }

    console.log('[API] Active configuration found:', activeConfig.name);
    return NextResponse.json({ activeConfiguration: activeConfig });

  } catch (error: any) {
    console.error('[API] Discovery Settings GET active error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 