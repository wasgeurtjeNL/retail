import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { EmailCampaignService } from '@/lib/commercial-email-campaign';
import { testCommercialEmailConfiguration } from '@/lib/commercial-mail-service';
import { getCampaignScheduler } from '@/lib/campaign-scheduler';

// Test the complete email campaign flow
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      test_type = 'full_flow', 
      test_email,
      prospect_data,
      campaign_id 
    } = body;
    
    const results: any = {
      test_type,
      timestamp: new Date().toISOString(),
      success: false,
      steps: []
    };
    
    const supabase = getServiceRoleClient();
    
    switch (test_type) {
      case 'email_configuration':
        results.steps.push({ step: 'Testing email configuration', status: 'running' });
        
        const emailTest = await testCommercialEmailConfiguration();
        results.email_configuration = emailTest;
        results.steps[results.steps.length - 1].status = emailTest.success ? 'completed' : 'failed';
        results.success = emailTest.success;
        break;
        
      case 'create_test_prospect':
        results.steps.push({ step: 'Creating test prospect', status: 'running' });
        
        const testProspectData = prospect_data || {
          business_name: 'Test Beauty Salon',
          contact_name: 'Test Contact',
          email: test_email || 'test@example.com',
          business_segment: 'beauty_salon',
          city: 'Amsterdam',
          lead_quality_score: 0.8,
          status: 'qualified'
        };
        
        const { data: testProspect, error: prospectError } = await supabase
          .from('commercial_prospects')
          .insert(testProspectData)
          .select()
          .single();
        
        if (prospectError) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = prospectError.message;
          results.success = false;
        } else {
          results.steps[results.steps.length - 1].status = 'completed';
          results.test_prospect = testProspect;
          results.success = true;
        }
        break;
        
      case 'test_campaign_service':
        results.steps.push({ step: 'Testing EmailCampaignService', status: 'running' });
        
        if (!prospect_data?.id) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = 'Prospect ID required for campaign service test';
          results.success = false;
          break;
        }
        
        try {
          const emailService = new EmailCampaignService();
          await emailService.scheduleInitialOutreach(prospect_data.id, campaign_id);
          
          results.steps[results.steps.length - 1].status = 'completed';
          results.steps.push({ 
            step: 'Email scheduled successfully', 
            status: 'completed',
            prospect_id: prospect_data.id,
            campaign_id: campaign_id || 'default'
          });
          results.success = true;
          
        } catch (error) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = error instanceof Error ? error.message : String(error);
          results.success = false;
        }
        break;
        
      case 'test_scheduler':
        results.steps.push({ step: 'Testing campaign scheduler', status: 'running' });
        
        try {
          const scheduler = getCampaignScheduler();
          const status = scheduler.getStatus();
          
          results.steps[results.steps.length - 1].status = 'completed';
          results.scheduler_status = status;
          results.success = true;
          
        } catch (error) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = error instanceof Error ? error.message : String(error);
          results.success = false;
        }
        break;
        
      case 'full_flow':
      default:
        // Step 1: Test email configuration
        results.steps.push({ step: 'Testing email configuration', status: 'running' });
        
        const configTest = await testCommercialEmailConfiguration();
        results.email_configuration = configTest;
        
        if (!configTest.success) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = 'Email configuration failed';
          results.success = false;
          break;
        }
        
        results.steps[results.steps.length - 1].status = 'completed';
        
        // Step 2: Create test prospect
        results.steps.push({ step: 'Creating test prospect', status: 'running' });
        
        const fullTestProspectData = prospect_data || {
          business_name: 'Test Beauty Salon (Full Flow)',
          contact_name: 'Test Contact',
          email: test_email || 'test@example.com',
          business_segment: 'beauty_salon',
          city: 'Amsterdam',
          lead_quality_score: 0.8,
          status: 'qualified'
        };
        
        const { data: fullTestProspect, error: fullProspectError } = await supabase
          .from('commercial_prospects')
          .insert(fullTestProspectData)
          .select()
          .single();
        
        if (fullProspectError) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = fullProspectError.message;
          results.success = false;
          break;
        }
        
        results.steps[results.steps.length - 1].status = 'completed';
        results.test_prospect = fullTestProspect;
        
        // Step 3: Test campaign scheduling
        results.steps.push({ step: 'Scheduling test campaign', status: 'running' });
        
        try {
          const emailService = new EmailCampaignService();
          await emailService.scheduleInitialOutreach(fullTestProspect.id, campaign_id);
          
          results.steps[results.steps.length - 1].status = 'completed';
          
        } catch (error) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = error instanceof Error ? error.message : String(error);
          results.success = false;
          break;
        }
        
        // Step 4: Check queue status
        results.steps.push({ step: 'Checking email queue', status: 'running' });
        
        const { data: queueItems, error: queueError } = await supabase
          .from('commercial_email_queue')
          .select('*')
          .eq('prospect_id', fullTestProspect.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (queueError) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = queueError.message;
          results.success = false;
          break;
        }
        
        results.steps[results.steps.length - 1].status = 'completed';
        results.email_queue = queueItems;
        
        // Step 5: Test scheduler
        results.steps.push({ step: 'Testing campaign scheduler', status: 'running' });
        
        try {
          const scheduler = getCampaignScheduler();
          const schedulerStatus = scheduler.getStatus();
          
          results.steps[results.steps.length - 1].status = 'completed';
          results.scheduler_status = schedulerStatus;
          results.success = true;
          
        } catch (error) {
          results.steps[results.steps.length - 1].status = 'failed';
          results.steps[results.steps.length - 1].error = error instanceof Error ? error.message : String(error);
          results.success = false;
        }
        
        break;
    }
    
    // Add summary
    results.summary = {
      total_steps: results.steps.length,
      completed_steps: results.steps.filter((s: any) => s.status === 'completed').length,
      failed_steps: results.steps.filter((s: any) => s.status === 'failed').length,
      overall_success: results.success
    };
    
    console.log(`[TestCampaign] Test completed: ${test_type}, Success: ${results.success}`);
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('[TestCampaign] Error in test campaign:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        success: false
      },
      { status: 500 }
    );
  }
}

// Get test campaign status and logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const include = searchParams.get('include')?.split(',') || ['prospects', 'queue', 'campaigns'];
    
    const supabase = getServiceRoleClient();
    const results: any = {
      timestamp: new Date().toISOString()
    };
    
    // Get test prospects (those created for testing)
    if (include.includes('prospects')) {
      const { data: testProspects, error: prospectsError } = await supabase
        .from('commercial_prospects')
        .select('*')
        .like('business_name', '%Test%')
        .order('created_at', { ascending: false })
        .limit(10);
      
      results.test_prospects = testProspects || [];
    }
    
    // Get recent email queue items
    if (include.includes('queue')) {
      const { data: queueItems, error: queueError } = await supabase
        .from('commercial_email_queue')
        .select(`
          *,
          commercial_prospects!inner(business_name, email)
        `)
        .like('commercial_prospects.business_name', '%Test%')
        .order('created_at', { ascending: false })
        .limit(20);
      
      results.email_queue = queueItems || [];
    }
    
    // Get active campaigns
    if (include.includes('campaigns')) {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('commercial_email_campaigns')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      results.active_campaigns = campaigns || [];
    }
    
    // Get scheduler status
    try {
      const scheduler = getCampaignScheduler();
      results.scheduler_status = scheduler.getStatus();
    } catch (error) {
      results.scheduler_status = { error: 'Scheduler not initialized' };
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('[TestCampaign] Error in GET test campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}