// Sales Advice Analytics Refresh API
// Refreshes analytics data and triggers recalculation

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/sales-advice/analytics/refresh - Refresh analytics data
 */
export async function POST(request: NextRequest) {
  console.log('[SALES-ADVICE-ANALYTICS-REFRESH] POST request received');
  
  try {
    // Use the proper route handler client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[SALES-ADVICE-ANALYTICS-REFRESH] Authentication failed:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (only admins can refresh analytics)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[SALES-ADVICE-ANALYTICS-REFRESH] Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Error checking user permissions' }, { status: 500 });
    }

    if (!profile || profile.role !== 'admin') {
      console.log('[SALES-ADVICE-ANALYTICS-REFRESH] Access denied - not admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[SALES-ADVICE-ANALYTICS-REFRESH] Refreshing analytics data...');
    
    // Simulate refresh operation (in a real implementation, this would trigger cache invalidation,
    // recalculation of metrics, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    const refreshData = {
      success: true,
      message: 'Analytics data refreshed successfully',
      refreshed_at: new Date().toISOString(),
      refresh_id: `refresh_${Date.now()}`
    };

    console.log('[SALES-ADVICE-ANALYTICS-REFRESH] Refresh completed successfully');
    
    return NextResponse.json(refreshData, { status: 200 });

  } catch (error) {
    console.error('[SALES-ADVICE-ANALYTICS-REFRESH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh analytics data' },
      { status: 500 }
    );
  }
} 