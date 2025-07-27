import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('[Prospects API] GET request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const segment = searchParams.get('segment');
    const search = searchParams.get('search');
    
    const offset = (page - 1) * limit;
    
    console.log('[Prospects API] Query params:', { page, limit, status, source, segment, search, offset });

    const supabase = getServiceRoleClient();
    
    // Build query
    let query = supabase
      .from('commercial_prospects')
      .select(`
        id,
        business_name,
        contact_name,
        email,
        phone,
        website,
        address,
        city,
        postal_code,
        business_segment,
        status,
        discovery_source,
        lead_quality_score,
        business_quality_score,
        enrichment_score,
        initial_outreach_date,
        last_contact_date,
        created_at,
        updated_at,
        raw_data
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (source) {
      query = query.eq('discovery_source', source);
    }
    if (segment) {
      query = query.eq('business_segment', segment);
    }
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: prospects, error: prospectsError, count } = await query;

    if (prospectsError) {
      console.error('[Prospects API] Error fetching prospects:', prospectsError);
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${prospectsError.message}` 
      }, { status: 500 });
    }

    // Get summary statistics
    const { data: stats, error: statsError } = await supabase
      .from('commercial_prospects')
      .select('status, discovery_source, business_segment', { count: 'exact' });

    if (statsError) {
      console.error('[Prospects API] Error fetching stats:', statsError);
    }

    // Calculate statistics
    const totalCount = count || 0;
    const statusCounts = stats?.reduce((acc: Record<string, number>, prospect) => {
      acc[prospect.status] = (acc[prospect.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const sourceCounts = stats?.reduce((acc: Record<string, number>, prospect) => {
      acc[prospect.discovery_source] = (acc[prospect.discovery_source] || 0) + 1;
      return acc;
    }, {}) || {};

    const segmentCounts = stats?.reduce((acc: Record<string, number>, prospect) => {
      acc[prospect.business_segment] = (acc[prospect.business_segment] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get today's additions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayProspects, error: todayError } = await supabase
      .from('commercial_prospects')
      .select('id', { count: 'exact' })
      .gte('created_at', today.toISOString());

    const todayCount = todayProspects?.length || 0;

    // Get recent email activity
    const { data: recentEmails, error: emailError } = await supabase
      .from('commercial_email_queue')
      .select('status', { count: 'exact' });

    const emailStats = recentEmails?.reduce((acc: Record<string, number>, email) => {
      acc[email.status] = (acc[email.status] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log(`[Prospects API] Returning ${prospects?.length || 0} prospects (page ${page})`);

    return NextResponse.json({
      success: true,
      data: {
        prospects: prospects || [],
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNext: offset + limit < totalCount,
          hasPrev: page > 1
        },
        statistics: {
          total: totalCount,
          added_today: todayCount,
          by_status: statusCounts,
          by_source: sourceCounts,
          by_segment: segmentCounts,
          email_queue: emailStats
        }
      }
    });

  } catch (error) {
    console.error('[Prospects API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[Prospects API] POST request received');
  
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'bulk_update_status') {
      const { prospect_ids, new_status } = body;
      
      if (!prospect_ids || !Array.isArray(prospect_ids) || !new_status) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing prospect_ids or new_status' 
        }, { status: 400 });
      }

      const supabase = getServiceRoleClient();
      
      const { data, error } = await supabase
        .from('commercial_prospects')
        .update({ 
          status: new_status,
          updated_at: new Date().toISOString()
        })
        .in('id', prospect_ids)
        .select('id, business_name');

      if (error) {
        console.error('[Prospects API] Bulk update error:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Update failed: ${error.message}` 
        }, { status: 500 });
      }

      console.log(`[Prospects API] Updated ${data?.length || 0} prospects to status: ${new_status}`);

      return NextResponse.json({
        success: true,
        message: `Updated ${data?.length || 0} prospects to ${new_status}`,
        updated_prospects: data
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Unknown action' 
    }, { status: 400 });

  } catch (error) {
    console.error('[Prospects API] POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 