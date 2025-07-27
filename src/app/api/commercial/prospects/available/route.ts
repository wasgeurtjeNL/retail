// =====================================================
// AVAILABLE PROSPECTS API
// Haalt prospects op die beschikbaar zijn om toe te voegen aan email queue
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[Available Prospects API] GET request received');
    
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '50');
    const segment = searchParams.get('segment');
    const search = searchParams.get('search');
    
    console.log('[Available Prospects API] Query params:', {
      limit,
      segment,
      search
    });

    const supabase = getServiceRoleClient();
    
    // First, get prospects that don't have pending/processing emails
    const { data: prospectsWithQueue, error: queueError } = await supabase
      .from('commercial_email_queue')
      .select('prospect_id')
      .in('status', ['pending', 'processing']);

    if (queueError) {
      console.error('[Available Prospects API] Error fetching queue:', queueError);
      return NextResponse.json(
        { success: false, error: 'Failed to check email queue' },
        { status: 500 }
      );
    }

    // Get IDs of prospects that already have emails in queue
    const queuedProspectIds = prospectsWithQueue?.map(e => e.prospect_id) || [];

    console.log(`[Available Prospects API] Found ${queuedProspectIds.length} prospects already in queue`);

    // Build query for available prospects - select only existing columns
    // Use email presence as main filter instead of restrictive status filtering
    let query = supabase
      .from('commercial_prospects')
      .select('id, business_name, email, business_segment, city, contact_name, status, created_at, lead_quality_score')
      .not('email', 'is', null) // Must have email
      .neq('email', '') // Email must not be empty
      .order('created_at', { ascending: false })
      .limit(limit);

    // Exclude prospects that already have emails in queue
    if (queuedProspectIds.length > 0) {
      query = query.not('id', 'in', `(${queuedProspectIds.join(',')})`);
    }

    // Apply filters
    if (segment) {
      query = query.eq('business_segment', segment);
    }

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data: prospects, error } = await query;

    if (error) {
      console.error('[Available Prospects API] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch available prospects' },
        { status: 500 }
      );
    }

    console.log(`[Available Prospects API] Found ${prospects?.length || 0} available prospects`);

    // Get business segment counts for all available prospects
    let segmentQuery = supabase
      .from('commercial_prospects')
      .select('business_segment')
      .not('email', 'is', null)
      .neq('email', '');

    // Exclude prospects that already have emails in queue
    if (queuedProspectIds.length > 0) {
      segmentQuery = segmentQuery.not('id', 'in', `(${queuedProspectIds.join(',')})`);
    }

    const { data: segmentCounts, error: segmentError } = await segmentQuery;

    if (segmentError) {
      console.warn('[Available Prospects API] Error fetching segment counts:', segmentError);
    }

    const segments = segmentCounts?.reduce((acc: Record<string, number>, prospect) => {
      const segment = prospect.business_segment || 'unknown';
      acc[segment] = (acc[segment] || 0) + 1;
      return acc;
    }, {}) || {};

    // Transform prospects to ensure consistent structure
    const transformedProspects = prospects?.map(prospect => ({
      id: prospect.id,
      business_name: prospect.business_name || 'Onbekende zaak',
      email: prospect.email,
      business_segment: prospect.business_segment || 'unknown',
      city: prospect.city,
      contact_name: prospect.contact_name,
      status: prospect.status || 'new',
      created_at: prospect.created_at,
      potential_score: prospect.lead_quality_score || 0.5 // Use lead_quality_score as fallback
    })) || [];

    console.log(`[Available Prospects API] Returning ${transformedProspects.length} available prospects`);
    console.log(`[Available Prospects API] Sample prospect:`, transformedProspects[0]);

    return NextResponse.json({
      success: true,
      prospects: transformedProspects,
      total: transformedProspects.length,
      segments,
      queued_prospect_count: queuedProspectIds.length
    });

  } catch (error) {
    console.error('[Available Prospects API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 