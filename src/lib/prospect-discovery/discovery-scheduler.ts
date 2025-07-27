// =====================================================
// DISCOVERY SCHEDULER - Automated Prospect Discovery
// Manages scheduled discovery jobs across regions and segments
// =====================================================

import { LeadEnrichmentService, EnrichmentConfig, EnrichedProspect } from './lead-enrichment';
import { QueueManager } from '@/lib/queue-manager';
import { getServiceRoleClient } from '@/lib/supabase';

export interface DiscoveryJobConfig {
  id: string;
  name: string;
  segment: string;
  regions: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  maxProspectsPerRun: number;
  qualityFilters: {
    minEnrichmentScore: number;
    requireContactInfo: boolean;
    skipExistingProspects: boolean;
  };
  sources: ('web_scraping' | 'google_places' | 'perplexity')[];
}

export interface DiscoveryJobResult {
  jobId: string;
  success: boolean;
  prospectsDiscovered: number;
  prospectsEnriched: number;
  prospectsSaved: number;
  errors: string[];
  processing_time: number;
  timestamp: string;
}

export interface SchedulerStats {
  totalJobs: number;
  activeJobs: number;
  lastRunTime: string;
  totalProspectsDiscovered: number;
  avgProspectsPerJob: number;
  successRate: number;
}

export class DiscoveryScheduler {
  private queueManager: QueueManager;
  private enrichmentService: LeadEnrichmentService;
  private supabase = getServiceRoleClient();
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(
    queueManager: QueueManager,
    enrichmentConfig: EnrichmentConfig
  ) {
    this.queueManager = queueManager;
    this.enrichmentService = new LeadEnrichmentService(enrichmentConfig);
    
    console.log('[DiscoveryScheduler] Initialized discovery scheduler');
  }

  /**
   * Start the discovery scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[DiscoveryScheduler] Scheduler already running');
      return;
    }

    console.log('[DiscoveryScheduler] Starting scheduler...');
    this.isRunning = true;

    // Check for due jobs every 5 minutes
    this.schedulerInterval = setInterval(async () => {
      await this.checkAndRunDueJobs();
    }, 5 * 60 * 1000);

    // Run initial check
    await this.checkAndRunDueJobs();
    
    console.log('[DiscoveryScheduler] Scheduler started successfully');
  }

  /**
   * Stop the discovery scheduler
   */
  async stop(): Promise<void> {
    console.log('[DiscoveryScheduler] Stopping scheduler...');
    this.isRunning = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    console.log('[DiscoveryScheduler] Scheduler stopped');
  }

  /**
   * Create a new discovery job
   */
  async createJob(config: DiscoveryJobConfig): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[DiscoveryScheduler] Creating job: ${config.name}`);

      // Calculate next run time
      const nextRun = this.calculateNextRunTime(config.frequency);
      config.nextRun = nextRun.toISOString();

      // Save job to database
      const { error } = await this.supabase
        .from('discovery_jobs')
        .insert({
          id: config.id,
          name: config.name,
          segment: config.segment,
          regions: config.regions,
          frequency: config.frequency,
          enabled: config.enabled,
          next_run: config.nextRun,
          max_prospects_per_run: config.maxProspectsPerRun,
          quality_filters: config.qualityFilters,
          sources: config.sources,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      console.log(`[DiscoveryScheduler] Job created successfully: ${config.id}`);
      return { success: true };

    } catch (error) {
      console.error('[DiscoveryScheduler] Error creating job:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Update an existing discovery job
   */
  async updateJob(jobId: string, updates: Partial<DiscoveryJobConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[DiscoveryScheduler] Updating job: ${jobId}`);

      // If frequency changed, recalculate next run
      if (updates.frequency) {
        updates.nextRun = this.calculateNextRunTime(updates.frequency).toISOString();
      }

      const { error } = await this.supabase
        .from('discovery_jobs')
        .update({
          name: updates.name,
          segment: updates.segment,
          regions: updates.regions,
          frequency: updates.frequency,
          enabled: updates.enabled,
          next_run: updates.nextRun,
          max_prospects_per_run: updates.maxProspectsPerRun,
          quality_filters: updates.qualityFilters,
          sources: updates.sources,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) {
        throw error;
      }

      console.log(`[DiscoveryScheduler] Job updated successfully: ${jobId}`);
      return { success: true };

    } catch (error) {
      console.error('[DiscoveryScheduler] Error updating job:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Delete a discovery job
   */
  async deleteJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[DiscoveryScheduler] Deleting job: ${jobId}`);

      const { error } = await this.supabase
        .from('discovery_jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        throw error;
      }

      console.log(`[DiscoveryScheduler] Job deleted successfully: ${jobId}`);
      return { success: true };

    } catch (error) {
      console.error('[DiscoveryScheduler] Error deleting job:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get all discovery jobs
   */
  async getJobs(): Promise<DiscoveryJobConfig[]> {
    try {
      const { data, error } = await this.supabase
        .from('discovery_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(this.parseJobFromDb);

    } catch (error) {
      console.error('[DiscoveryScheduler] Error getting jobs:', error);
      return [];
    }
  }

  /**
   * Run a specific discovery job manually
   */
  async runJob(jobId: string): Promise<DiscoveryJobResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[DiscoveryScheduler] Running job manually: ${jobId}`);

      // Get job configuration
      const { data: jobData, error } = await this.supabase
        .from('discovery_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const job = this.parseJobFromDb(jobData);
      
      if (!job.enabled) {
        throw new Error(`Job is disabled: ${jobId}`);
      }

      // Execute discovery for each region
      const allProspects: EnrichedProspect[] = [];
      const errors: string[] = [];

      for (const region of job.regions) {
        try {
          console.log(`[DiscoveryScheduler] Discovering prospects in ${region} for ${job.segment}`);
          
          const prospects = await this.enrichmentService.discoverProspects(
            job.segment,
            region,
            {
              limit: Math.floor(job.maxProspectsPerRun / job.regions.length),
              sources: job.sources
            }
          );

          // Apply job-specific quality filters
          const filteredProspects = prospects.filter(prospect => 
            this.jobQualityFilter(prospect, job)
          );

          allProspects.push(...filteredProspects);
          
          console.log(`[DiscoveryScheduler] Found ${filteredProspects.length} qualified prospects in ${region}`);

        } catch (error) {
          console.error(`[DiscoveryScheduler] Error discovering in ${region}:`, error);
          errors.push(`${region}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Save prospects to database
      const saveResult = await this.enrichmentService.saveProspects(allProspects);
      if (saveResult.errors.length > 0) {
        errors.push(...saveResult.errors);
      }

      // Update job last run time and next run time
      const nextRun = this.calculateNextRunTime(job.frequency);
      await this.supabase
        .from('discovery_jobs')
        .update({
          last_run: new Date().toISOString(),
          next_run: nextRun.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Record job result
      const result: DiscoveryJobResult = {
        jobId,
        success: true,
        prospectsDiscovered: allProspects.length,
        prospectsEnriched: allProspects.length,
        prospectsSaved: saveResult.saved,
        errors,
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Save job result to database
      await this.saveJobResult(result);

      console.log(`[DiscoveryScheduler] Job completed: ${jobId} (${result.prospectsSaved} prospects saved)`);
      return result;

    } catch (error) {
      console.error(`[DiscoveryScheduler] Job execution failed: ${jobId}`, error);
      
      const result: DiscoveryJobResult = {
        jobId,
        success: false,
        prospectsDiscovered: 0,
        prospectsEnriched: 0,
        prospectsSaved: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      await this.saveJobResult(result);
      return result;
    }
  }

  /**
   * Get scheduler statistics
   */
  async getStats(): Promise<SchedulerStats> {
    try {
      // Get job counts
      const { data: jobs } = await this.supabase
        .from('discovery_jobs')
        .select('enabled, last_run');

      const totalJobs = jobs?.length || 0;
      const activeJobs = jobs?.filter(job => job.enabled).length || 0;

      // Get latest job results
      const { data: results } = await this.supabase
        .from('discovery_job_results')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

             const totalProspects = results?.reduce((sum, result) => sum + result.prospects_saved, 0) || 0;
       const avgProspectsPerJob = totalJobs > 0 ? totalProspects / totalJobs : 0;
       const successRate = (results && results.length > 0) 
         ? results.filter(r => r.success).length / results.length 
         : 0;

      const lastRunTime = jobs?.reduce((latest, job) => {
        if (!job.last_run) return latest;
        const jobTime = new Date(job.last_run);
        return !latest || jobTime > latest ? jobTime : latest;
      }, null as Date | null)?.toISOString() || 'Never';

      return {
        totalJobs,
        activeJobs,
        lastRunTime,
        totalProspectsDiscovered: totalProspects,
        avgProspectsPerJob: Math.round(avgProspectsPerJob),
        successRate: Math.round(successRate * 100) / 100
      };

    } catch (error) {
      console.error('[DiscoveryScheduler] Error getting stats:', error);
      return {
        totalJobs: 0,
        activeJobs: 0,
        lastRunTime: 'Error',
        totalProspectsDiscovered: 0,
        avgProspectsPerJob: 0,
        successRate: 0
      };
    }
  }

  // Private methods
  private async checkAndRunDueJobs(): Promise<void> {
    try {
      console.log('[DiscoveryScheduler] Checking for due jobs...');

      const now = new Date();
      const { data: dueJobs, error } = await this.supabase
        .from('discovery_jobs')
        .select('*')
        .eq('enabled', true)
        .lte('next_run', now.toISOString());

      if (error) {
        throw error;
      }

      if (!dueJobs || dueJobs.length === 0) {
        console.log('[DiscoveryScheduler] No due jobs found');
        return;
      }

      console.log(`[DiscoveryScheduler] Found ${dueJobs.length} due jobs`);

             // Queue each job for execution
       for (const jobData of dueJobs) {
         await this.queueManager.addJob(
           'prospect_discovery',
           '00000000-0000-0000-0000-000000000001', // Use system UUID for automated jobs
           {
             job_id: jobData.id,
             action: 'run_discovery_job'
           },
           { priority: 5 }
         );
       }

    } catch (error) {
      console.error('[DiscoveryScheduler] Error checking due jobs:', error);
    }
  }

  private calculateNextRunTime(frequency: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
             case 'monthly':
         const nextMonth = new Date(now);
         nextMonth.setMonth(now.getMonth() + 1, 1); // Set to first day of next month
         return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private jobQualityFilter(prospect: EnrichedProspect, job: DiscoveryJobConfig): boolean {
    const filters = job.qualityFilters;

    // Minimum enrichment score
    if (prospect.enrichment_score < filters.minEnrichmentScore) {
      return false;
    }

    // Require contact info
    if (filters.requireContactInfo) {
      if (!prospect.email && !prospect.phone) {
        return false;
      }
    }

    return true;
  }

  private async saveJobResult(result: DiscoveryJobResult): Promise<void> {
    try {
      await this.supabase
        .from('discovery_job_results')
        .insert({
          job_id: result.jobId,
          success: result.success,
          prospects_discovered: result.prospectsDiscovered,
          prospects_enriched: result.prospectsEnriched,
          prospects_saved: result.prospectsSaved,
          errors: result.errors,
          processing_time: result.processing_time,
          timestamp: result.timestamp
        });
    } catch (error) {
      console.error('[DiscoveryScheduler] Error saving job result:', error);
    }
  }

  private parseJobFromDb(data: any): DiscoveryJobConfig {
    return {
      id: data.id,
      name: data.name,
      segment: data.segment,
      regions: data.regions || [],
      frequency: data.frequency,
      enabled: data.enabled,
      lastRun: data.last_run,
      nextRun: data.next_run,
      maxProspectsPerRun: data.max_prospects_per_run || 50,
      qualityFilters: data.quality_filters || {
        minEnrichmentScore: 0.6,
        requireContactInfo: false,
        skipExistingProspects: true
      },
      sources: data.sources || ['web_scraping', 'perplexity']
    };
  }

  /**
   * Create default discovery jobs for all segments
   */
  async createDefaultJobs(): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    const segments = [
      'beauty_salon',
      'hair_salon', 
      'wellness_spa',
      'hotel_bnb',
      'restaurant',
      'cleaning_service',
      'laundromat',
      'fashion_retail',
      'home_living'
    ];

    const majorCities = [
      'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven',
      'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen'
    ];

    for (const segment of segments) {
      try {
        const jobId = `default_${segment}_weekly`;
        
        const jobConfig: DiscoveryJobConfig = {
          id: jobId,
          name: `Weekly ${segment.replace('_', ' ')} Discovery`,
          segment,
          regions: majorCities,
          frequency: 'weekly',
          enabled: true,
          maxProspectsPerRun: 100,
          qualityFilters: {
            minEnrichmentScore: 0.6,
            requireContactInfo: false,
            skipExistingProspects: true
          },
          sources: ['web_scraping', 'perplexity']
        };

        const result = await this.createJob(jobConfig);
        if (result.success) {
          created++;
        } else {
          errors.push(`${segment}: ${result.error}`);
        }

      } catch (error) {
        errors.push(`${segment}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`[DiscoveryScheduler] Created ${created} default jobs`);
    return { created, errors };
  }
} 