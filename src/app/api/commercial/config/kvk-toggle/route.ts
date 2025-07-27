// =====================================================
// KVK API TOGGLE MANAGEMENT
// API endpoint voor het in-/uitschakelen van KvK API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

interface KvKToggleRequest {
  enabled: boolean;
  reason?: string;
}

interface KvKToggleResponse {
  success: boolean;
  enabled: boolean;
  message?: string;
  error?: string;
}

/**
 * GET /api/commercial/config/kvk-toggle
 * Haalt de huidige KvK API toggle status op
 */
export async function GET(request: NextRequest): Promise<NextResponse<KvKToggleResponse>> {
  try {
    console.log('[KvK Toggle] GET request - checking KvK API toggle status');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, enabled: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, enabled: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Haal KvK toggle setting op
    const serviceSupabase = getServiceRoleClient();
    const { data: setting } = await serviceSupabase
      .from('settings')
      .select('value')
      .eq('setting_key', 'kvk_api_enabled')
      .single();

    // Default naar enabled als setting niet bestaat en API key beschikbaar is
    const defaultEnabled = !!process.env.KVK_API_KEY;
    const enabled = setting ? setting.value : defaultEnabled;

    console.log(`[KvK Toggle] Current status: ${enabled ? 'enabled' : 'disabled'}`);

    return NextResponse.json({
      success: true,
      enabled: enabled,
      message: `KvK API is currently ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('[KvK Toggle] Error getting toggle status:', error);
    return NextResponse.json(
      {
        success: false,
        enabled: false,
        error: error instanceof Error ? error.message : 'Failed to get KvK toggle status'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commercial/config/kvk-toggle
 * Update de KvK API toggle setting
 */
export async function POST(request: NextRequest): Promise<NextResponse<KvKToggleResponse>> {
  try {
    console.log('[KvK Toggle] POST request - updating KvK API toggle status');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, enabled: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, enabled: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body: KvKToggleRequest = await request.json();
    const { enabled, reason } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, enabled: false, error: 'Invalid enabled value - must be boolean' },
        { status: 400 }
      );
    }

    // Update setting in database
    const serviceSupabase = getServiceRoleClient();
    const { error } = await serviceSupabase
      .from('settings')
      .upsert({
        setting_key: 'kvk_api_enabled',
        value: enabled,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[KvK Toggle] Database error:', error);
      return NextResponse.json(
        { success: false, enabled: false, error: 'Failed to update setting' },
        { status: 500 }
      );
    }

    // Log de wijziging voor audit trail
    const actionLog = {
      user_id: user.id,
      action: `kvk_api_${enabled ? 'enabled' : 'disabled'}`,
      timestamp: new Date().toISOString(),
      reason: reason || 'No reason provided',
      user_email: user.email
    };

    console.log('[KvK Toggle] Setting updated:', actionLog);

    // Optioneel: Voeg toe aan audit log tabel
    try {
      await serviceSupabase
        .from('admin_actions')
        .insert(actionLog);
    } catch (auditError) {
      // Audit log failure shouldn't fail the main request
      console.warn('[KvK Toggle] Failed to log admin action:', auditError);
    }

    return NextResponse.json({
      success: true,
      enabled: enabled,
      message: `KvK API ${enabled ? 'enabled' : 'disabled'} successfully${reason ? ` (${reason})` : ''}`
    });

  } catch (error) {
    console.error('[KvK Toggle] Error updating toggle status:', error);
    return NextResponse.json(
      {
        success: false,
        enabled: false,
        error: error instanceof Error ? error.message : 'Failed to update KvK toggle'
      },
      { status: 500 }
    );
  }
} 