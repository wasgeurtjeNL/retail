import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * GET /api/commercial/prospects/stats
 * Returns prospect statistics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[ProspectStats] Getting prospect statistics...');
    
    const supabase = getServiceRoleClient();
    
    // Get total prospects count
    const { data: totalProspects, error: totalError } = await supabase
      .from('commercial_prospects')
      .select('id', { count: 'exact' });

    // Get qualified prospects count
    const { data: qualifiedProspects, error: qualifiedError } = await supabase
      .from('commercial_prospects')
      .select('id', { count: 'exact' })
      .eq('status', 'qualified');

    // Get last discovery run
    const { data: lastDiscovery, error: lastDiscoveryError } = await supabase
      .from('commercial_prospects')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get prospects discovered in last 24 hours for discovery rate
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: recentProspects, error: recentError } = await supabase
      .from('commercial_prospects')
      .select('id', { count: 'exact' })
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (totalError || qualifiedError) {
      console.error('[ProspectStats] Database errors:', { totalError, qualifiedError });
    }

    const stats = {
      total_prospects: totalProspects?.length || 0,
      qualified_prospects: qualifiedProspects?.length || 0,
      last_discovery: lastDiscovery?.created_at || null,
      discovery_rate: recentProspects?.length || 0
    };

    console.log('[ProspectStats] Statistics retrieved:', stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[ProspectStats] Error getting prospect statistics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get prospect statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 