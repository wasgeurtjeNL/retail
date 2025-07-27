import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

// Get campaigns
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use service role client for data operations
    const serviceSupabase = getServiceRoleClient();
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get('segment');
    
    let query = serviceSupabase
      .from('commercial_email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (segment) {
      query = query.eq('business_segment', segment);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[CampaignAPI] Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ campaigns: data });
    
  } catch (error) {
    console.error('[CampaignAPI] Error in GET /api/commercial/campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new campaign
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      name, 
      description, 
      business_segment, 
      steps,
      max_emails_per_day = 100,
      min_hours_between_emails = 24,
      respect_business_hours = true,
      timezone = 'Europe/Amsterdam'
    } = body;
    
    // Validate required fields
    if (!name || !business_segment || !steps) {
      return NextResponse.json(
        { error: 'Missing required fields: name, business_segment, steps' },
        { status: 400 }
      );
    }
    
    // Validate steps format
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'Steps must be a non-empty array' },
        { status: 400 }
      );
    }
    
    // Use service role client for data operations
    const serviceSupabase = getServiceRoleClient();
    
    const { data, error } = await serviceSupabase
      .from('commercial_email_campaigns')
      .insert({
        name,
        description,
        business_segment,
        steps,
        max_emails_per_day,
        min_hours_between_emails,
        respect_business_hours,
        timezone
      })
      .select()
      .single();
    
    if (error) {
      console.error('[CampaignAPI] Error creating campaign:', error);
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      );
    }
    
    console.log(`[CampaignAPI] Created campaign: ${data.name} for segment: ${data.business_segment}`);
    
    return NextResponse.json({ 
      success: true, 
      campaign: data 
    });
    
  } catch (error) {
    console.error('[CampaignAPI] Error in POST /api/commercial/campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}