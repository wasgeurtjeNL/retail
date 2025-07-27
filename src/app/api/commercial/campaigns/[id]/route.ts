import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

// Get specific campaign
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceRoleClient();
    const campaignId = params.id;
    
    const { data, error } = await supabase
      .from('commercial_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (error) {
      console.error('[CampaignAPI] Error fetching campaign:', error);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ campaign: data });
    
  } catch (error) {
    console.error('[CampaignAPI] Error in GET /api/commercial/campaigns/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update campaign
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const campaignId = params.id;
    
    const { 
      name, 
      description, 
      business_segment, 
      steps,
      active,
      max_emails_per_day,
      min_hours_between_emails,
      respect_business_hours,
      timezone
    } = body;
    
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (business_segment !== undefined) updateData.business_segment = business_segment;
    if (steps !== undefined) updateData.steps = steps;
    if (active !== undefined) updateData.active = active;
    if (max_emails_per_day !== undefined) updateData.max_emails_per_day = max_emails_per_day;
    if (min_hours_between_emails !== undefined) updateData.min_hours_between_emails = min_hours_between_emails;
    if (respect_business_hours !== undefined) updateData.respect_business_hours = respect_business_hours;
    if (timezone !== undefined) updateData.timezone = timezone;
    
    const supabase = getServiceRoleClient();
    
    const { data, error } = await supabase
      .from('commercial_email_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();
    
    if (error) {
      console.error('[CampaignAPI] Error updating campaign:', error);
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      );
    }
    
    console.log(`[CampaignAPI] Updated campaign: ${campaignId}`);
    
    return NextResponse.json({ 
      success: true, 
      campaign: data 
    });
    
  } catch (error) {
    console.error('[CampaignAPI] Error in PUT /api/commercial/campaigns/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceRoleClient();
    const campaignId = params.id;
    
    const { error } = await supabase
      .from('commercial_email_campaigns')
      .delete()
      .eq('id', campaignId);
    
    if (error) {
      console.error('[CampaignAPI] Error deleting campaign:', error);
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      );
    }
    
    console.log(`[CampaignAPI] Deleted campaign: ${campaignId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Campaign deleted successfully' 
    });
    
  } catch (error) {
    console.error('[CampaignAPI] Error in DELETE /api/commercial/campaigns/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}