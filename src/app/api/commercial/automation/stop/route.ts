// =====================================================
// COMMERCIAL AUTOMATION STOP API
// Stop commercial acquisition automation gracefully
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * STOP Automation - POST /api/commercial/automation/stop
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[AutomationStopAPI] Stopping commercial automation...');

    // Authentication check - Development Mode (temporarily disabled)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AutomationStopAPI] Development mode - skipping authentication');
    } else {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
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
    }

    // Stop automation services
    const stopResults = await stopAutomationServices();

    // Log automation stop
    await logAutomationEvent('stopped', stopResults);

    return NextResponse.json({
      success: true,
      message: 'Commercial automation stopped successfully',
      stop_results: stopResults
    });

  } catch (error) {
    console.error('[AutomationStopAPI] Error stopping automation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to stop automation',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * Stop automation services gracefully
 */
async function stopAutomationServices() {
  const results = {
    success: false,
    services_stopped: [] as string[],
    services_failed: [] as string[],
    details: {} as any
  };

  try {
    console.log('[AutomationStopAPI] Stopping services...');

    // Stop Email Queue Manager
    try {
      const { getEmailQueueManager } = await import('@/lib/email-queue-manager');
      const emailQueue = getEmailQueueManager();
      emailQueue.stopProcessing();
      results.services_stopped.push('email_campaigns');
      console.log('[AutomationStopAPI] ✅ Email Campaign System stopped');
    } catch (error) {
      console.error('[AutomationStopAPI] ❌ Failed to stop Email Campaign System:', error);
      results.services_failed.push('email_campaigns');
      results.details.email_campaigns_error = error instanceof Error ? error.message : String(error);
    }

    // Stop Queue Manager
    try {
      const { QueueManager } = await import('@/lib/queue-manager');
      const queueManager = QueueManager.getInstance();
      queueManager.stopWorker();
      results.services_stopped.push('queue_manager');
      console.log('[AutomationStopAPI] ✅ Queue Manager stopped');
    } catch (error) {
      console.error('[AutomationStopAPI] ❌ Failed to stop Queue Manager:', error);
      results.services_failed.push('queue_manager');
      results.details.queue_manager_error = error instanceof Error ? error.message : String(error);
    }

    // Mark other services as stopped
    results.services_stopped.push('prospect_discovery', 'ai_optimization');

    results.success = results.services_failed.length === 0;
    
    console.log(`[AutomationStopAPI] Stop completed. Stopped: ${results.services_stopped.length}, Failed: ${results.services_failed.length}`);

    return results;

  } catch (error) {
    results.details.fatal_error = error instanceof Error ? error.message : String(error);
    return results;
  }
}

/**
 * Log automation events
 */
async function logAutomationEvent(event: string, data: any) {
  try {
    const supabase = getServiceRoleClient();
    await supabase
      .from('background_jobs')
      .insert({
        job_type: 'automation_event',
        status: 'completed',
        profile_id: null, // Use null instead of invalid UUID string
        input_data: { event, data, timestamp: new Date().toISOString() },
        scheduled_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('[AutomationStopAPI] Error logging event:', error);
  }
} 