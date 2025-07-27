// Background Job Monitor for Sales Advice Generation
// Monitors website analysis completion and triggers sales advice generation

import { createClient } from '@supabase/supabase-js';
import { generateAndSaveSalesAdvice, checkNeedsSalesAdvice } from './sales-advice-generator';
import { ProfileWebsiteAnalysis, Profile } from './database.types';

// Service client for background operations
const getSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

interface ProfileWithAnalysis {
  id: string;
  business_name?: string;
  email?: string;
  website_analysis?: ProfileWebsiteAnalysis;
}

/**
 * Monitor for newly completed website analyses that need sales advice generation
 */
export async function monitorCompletedAnalyses(): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  console.log('[BACKGROUND-MONITOR] Checking for completed analyses needing sales advice...');

  try {
    // Get profiles with completed website analyses but no sales advice
    const { data: profilesNeedingAdvice, error } = await supabase
      .from('profiles_needing_advice')
      .select('*')
      .eq('advice_source_available', 'ai_analysis');

    if (error) {
      console.error('[BACKGROUND-MONITOR] Error fetching profiles needing advice:', error);
      return;
    }

    if (!profilesNeedingAdvice || profilesNeedingAdvice.length === 0) {
      console.log('[BACKGROUND-MONITOR] No profiles need sales advice generation');
      return;
    }

    console.log(`[BACKGROUND-MONITOR] Found ${profilesNeedingAdvice.length} profiles needing sales advice generation`);

    // Process each profile
    for (const profile of profilesNeedingAdvice) {
      try {
        console.log(`[BACKGROUND-MONITOR] Generating sales advice for profile ${profile.id} (${profile.business_name || profile.email})`);
        
        const advice = await generateAndSaveSalesAdvice(profile.id);
        
        console.log(`[BACKGROUND-MONITOR] Successfully generated sales advice for profile ${profile.id}`);
        
        // Optional: Send notification email or update UI
        // await sendSalesAdviceNotification(profile, advice);
        
      } catch (error) {
        console.error(`[BACKGROUND-MONITOR] Failed to generate sales advice for profile ${profile.id}:`, error);
        
        // Continue with other profiles even if one fails
        continue;
      }
    }

    console.log('[BACKGROUND-MONITOR] Completed monitoring round');

  } catch (error) {
    console.error('[BACKGROUND-MONITOR] Error in monitoring process:', error);
  }
}

/**
 * Check for pending sales advice jobs and process them
 */
export async function processPendingSalesAdviceJobs(): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  console.log('[BACKGROUND-MONITOR] Processing pending sales advice jobs...');

  try {
    // Get pending jobs older than 5 minutes (to avoid processing currently being handled)
    const { data: pendingJobs, error } = await supabase
      .from('sales_advice_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 minutes ago
      .order('created_at', { ascending: true })
      .limit(10); // Process max 10 jobs at a time

    if (error) {
      console.error('[BACKGROUND-MONITOR] Error fetching pending jobs:', error);
      return;
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('[BACKGROUND-MONITOR] No pending sales advice jobs to process');
      return;
    }

    console.log(`[BACKGROUND-MONITOR] Found ${pendingJobs.length} pending sales advice jobs`);

    for (const job of pendingJobs) {
      try {
        console.log(`[BACKGROUND-MONITOR] Processing job ${job.id} for profile ${job.profile_id}`);
        
        // Update job status to processing
        await supabase
          .from('sales_advice_jobs')
          .update({ 
            status: 'processing', 
            started_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        // Generate the advice
        const advice = await generateAndSaveSalesAdvice(job.profile_id);
        
        console.log(`[BACKGROUND-MONITOR] Successfully processed job ${job.id}`);
        
      } catch (error) {
        console.error(`[BACKGROUND-MONITOR] Failed to process job ${job.id}:`, error);
        
        // Update job as failed
        await supabase
          .from('sales_advice_jobs')
          .update({ 
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    }

  } catch (error) {
    console.error('[BACKGROUND-MONITOR] Error processing pending jobs:', error);
  }
}

/**
 * Clean up old completed jobs (older than 7 days)
 */
export async function cleanupOldJobs(): Promise<void> {
  const supabase = getSupabaseServiceClient();
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('sales_advice_jobs')
      .delete()
      .in('status', ['completed', 'error'])
      .lt('completed_at', sevenDaysAgo);

    if (error) {
      console.error('[BACKGROUND-MONITOR] Error cleaning up old jobs:', error);
    } else {
      console.log('[BACKGROUND-MONITOR] Cleaned up old completed jobs');
    }
  } catch (error) {
    console.error('[BACKGROUND-MONITOR] Error in cleanup process:', error);
  }
}

/**
 * Get monitoring statistics
 */
export async function getMonitoringStats(): Promise<{
  pendingJobs: number;
  processingJobs: number;
  profilesNeedingAdvice: number;
  completedAdviceToday: number;
}> {
  const supabase = getSupabaseServiceClient();
  
  try {
    // Get pending and processing jobs count
    const { data: jobStats } = await supabase
      .from('sales_advice_jobs')
      .select('status')
      .in('status', ['pending', 'processing']);

    const pendingJobs = jobStats?.filter(j => j.status === 'pending').length || 0;
    const processingJobs = jobStats?.filter(j => j.status === 'processing').length || 0;

    // Get profiles needing advice
    const { data: profilesNeedingAdvice } = await supabase
      .from('profiles_needing_advice')
      .select('id', { count: 'exact', head: true });

    // Get completed advice today
    const today = new Date().toISOString().split('T')[0];
    const { data: completedToday } = await supabase
      .from('retailer_sales_advice')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .eq('status', 'completed');

    return {
      pendingJobs,
      processingJobs,
      profilesNeedingAdvice: profilesNeedingAdvice?.length || 0,
      completedAdviceToday: completedToday?.length || 0
    };

  } catch (error) {
    console.error('[BACKGROUND-MONITOR] Error getting monitoring stats:', error);
    return {
      pendingJobs: 0,
      processingJobs: 0,
      profilesNeedingAdvice: 0,
      completedAdviceToday: 0
    };
  }
}

/**
 * Main monitoring function that runs all checks
 */
export async function runMonitoringCycle(): Promise<void> {
  console.log('[BACKGROUND-MONITOR] Starting monitoring cycle...');
  
  const startTime = Date.now();
  
  try {
    // Run all monitoring tasks
    await Promise.all([
      monitorCompletedAnalyses(),
      processPendingSalesAdviceJobs(),
      cleanupOldJobs()
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`[BACKGROUND-MONITOR] Monitoring cycle completed in ${duration}ms`);
    
    // Log statistics
    const stats = await getMonitoringStats();
    console.log('[BACKGROUND-MONITOR] Current stats:', stats);
    
  } catch (error) {
    console.error('[BACKGROUND-MONITOR] Error in monitoring cycle:', error);
  }
}

/**
 * Set up periodic monitoring (call this once to start the background process)
 */
export function startBackgroundMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[BACKGROUND-MONITOR] Starting background monitoring with ${intervalMinutes} minute intervals`);
  
  // Run initial cycle
  runMonitoringCycle();
  
  // Set up periodic execution
  return setInterval(() => {
    runMonitoringCycle();
  }, intervalMinutes * 60 * 1000);
}