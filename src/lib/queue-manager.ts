// =====================================================
// QUEUE MANAGER - Background Job Processing
// Beheert async website analyse jobs
// =====================================================

import { createClient } from '@supabase/supabase-js'
import { AIAnalyzer } from './ai-analyzer'
import { WebsiteScraper } from './website-scraper'
import { getCacheManager } from './analysis-cache'
import { getServiceRoleClient } from './supabase'

// Types voor job management
export interface BackgroundJob {
  id: string
  job_type: 'website_analysis' | 'bulk_analysis' | 'scheduled_analysis' | 'email_campaign' | 'prospect_discovery' | 'lead_enrichment' | 'ai_optimization' | 'send_fulfillment_notification' | 'send_admin_notification'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retry'
  profile_id: string
  analysis_id?: string
  input_data: Record<string, any>
  output_data?: Record<string, any>
  error_data?: Record<string, any>
  progress_percentage: number
  current_step?: string
  total_steps?: number
  retry_count: number
  max_retries: number
  retry_delay_seconds: number
  scheduled_at: string
  started_at?: string
  completed_at?: string
  expires_at: string
  priority: number
  worker_id?: string
  created_at: string
  updated_at: string
}

export interface JobProgress {
  progress: number
  step?: string
  message?: string
}

export interface JobResult {
  success: boolean
  data?: any
  error?: string
}

export interface QueueConfig {
  maxConcurrentJobs: number
  workerPollInterval: number
  jobTimeout: number
  retryDelayBase: number
  maxRetries: number
  cleanupInterval: number
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrentJobs: 5,
  workerPollInterval: 5000, // 5 seconds
  jobTimeout: 300000, // 5 minutes
  retryDelayBase: 60, // 1 minute
  maxRetries: 3,
  cleanupInterval: 3600000 // 1 hour
}

// Queue Manager Class
export class QueueManager {
  private static instance: QueueManager
  private config: QueueConfig
  private isRunning = false
  private workerId: string
  private activeJobs = new Map<string, AbortController>()
  private intervalId?: NodeJS.Timeout
  private cleanupIntervalId?: NodeJS.Timeout

  private constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`[QueueManager] Initialized with worker ID: ${this.workerId}`)
  }

  // Singleton pattern
  static getInstance(config?: Partial<QueueConfig>): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(config)
    }
    return QueueManager.instance
  }

  // =====================================================
  // JOB CREATION
  // =====================================================

  // Voeg nieuwe job toe aan queue
  async addJob(
    jobType: BackgroundJob['job_type'],
    profileId: string,
    inputData: Record<string, any>,
    options: {
      priority?: number
      maxRetries?: number
      retryDelay?: number
      scheduledAt?: Date
    } = {}
  ): Promise<string> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const job = {
      job_type: jobType,
      profile_id: profileId,
      input_data: inputData,
      priority: options.priority ?? 5,
      max_retries: options.maxRetries ?? this.config.maxRetries,
      retry_delay_seconds: options.retryDelay ?? this.config.retryDelayBase,
      scheduled_at: options.scheduledAt?.toISOString() ?? new Date().toISOString(),
      expires_at: new Date(Date.now() + this.config.jobTimeout).toISOString()
    }

    const { data, error } = await supabase
      .from('background_jobs')
      .insert([job])
      .select('id')
      .single()

    if (error) {
      console.error('[QueueManager] Error adding job:', error)
      throw new Error(`Failed to add job: ${error.message}`)
    }

    console.log(`[QueueManager] Added job ${data.id} to queue`)
    return data.id
  }

  // =====================================================
  // JOB PROCESSING
  // =====================================================

  // Start worker process
  async startWorker(): Promise<void> {
    if (this.isRunning) {
      console.log('[QueueManager] Worker already running')
      return
    }

    this.isRunning = true
    console.log(`[QueueManager] Starting worker ${this.workerId}`)

    // Start job polling interval
    this.intervalId = setInterval(async () => {
      try {
        await this.processNextJob()
      } catch (error) {
        console.error('[QueueManager] Error in job processing:', error)
      }
    }, this.config.workerPollInterval)

    // Start cleanup interval
    this.cleanupIntervalId = setInterval(async () => {
      try {
        await this.cleanupExpiredJobs()
      } catch (error) {
        console.error('[QueueManager] Error in cleanup:', error)
      }
    }, this.config.cleanupInterval)

    console.log('[QueueManager] Worker started successfully')
  }

  // Stop worker process
  async stopWorker(): Promise<void> {
    if (!this.isRunning) {
      console.log('[QueueManager] Worker not running')
      return
    }

    this.isRunning = false
    console.log(`[QueueManager] Stopping worker ${this.workerId}`)

    // Clear intervals
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
    }

    // Cancel active jobs
    for (const [jobId, controller] of this.activeJobs.entries()) {
      console.log(`[QueueManager] Cancelling job ${jobId}`)
      controller.abort()
    }
    this.activeJobs.clear()

    console.log('[QueueManager] Worker stopped')
  }

  // Verwerk volgende job in queue
  private async processNextJob(): Promise<void> {
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return // Max concurrent jobs reached
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Haal volgende job op
    const { data: job, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !job) {
      return // No jobs available
    }

    // Claim job
    const { error: claimError } = await supabase
      .from('background_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        worker_id: this.workerId
      })
      .eq('id', job.id)
      .eq('status', 'pending') // Ensure we only claim pending jobs

    if (claimError) {
      console.error('[QueueManager] Error claiming job:', claimError)
      return
    }

    console.log(`[QueueManager] Processing job ${job.id}`)

    // Setup abort controller
    const controller = new AbortController()
    this.activeJobs.set(job.id, controller)

    // Process job
    try {
      await this.executeJob(job, controller.signal)
    } catch (error) {
      console.error(`[QueueManager] Error processing job ${job.id}:`, error)
    } finally {
      this.activeJobs.delete(job.id)
    }
  }

  // Voer specifieke job uit
  private async executeJob(job: BackgroundJob, signal: AbortSignal): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateProgress = async (progress: JobProgress) => {
      await supabase
        .from('background_jobs')
        .update({
          progress_percentage: progress.progress,
          current_step: progress.step,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
    }

    try {
      let result: JobResult

      switch (job.job_type) {
        case 'website_analysis':
          result = await this.executeWebsiteAnalysis(job, signal, updateProgress)
          break
        case 'bulk_analysis':
          result = await this.executeBulkAnalysis(job, signal, updateProgress)
          break
        case 'scheduled_analysis':
          result = await this.executeScheduledAnalysis(job, signal, updateProgress)
          break
        case 'email_campaign':
          result = await this.executeEmailCampaign(job, signal, updateProgress)
          break
        case 'prospect_discovery':
          result = await this.executeProspectDiscovery(job, signal, updateProgress)
          break
        case 'lead_enrichment':
          result = await this.executeLeadEnrichment(job, signal, updateProgress)
          break
        case 'ai_optimization':
          result = await this.executeAIOptimization(job, signal, updateProgress)
          break
        case 'send_fulfillment_notification':
          result = await this.executeFulfillmentNotification(job, signal, updateProgress)
          break
        case 'send_admin_notification':
          result = await this.executeAdminNotification(job, signal, updateProgress)
          break
        default:
          throw new Error(`Unknown job type: ${job.job_type}`)
      }

      if (result.success) {
        await supabase
          .from('background_jobs')
          .update({
            status: 'completed',
            output_data: result.data,
            progress_percentage: 100,
            current_step: 'Completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        console.log(`[QueueManager] Job ${job.id} completed successfully`)
      } else {
        throw new Error(result.error || 'Job failed without error message')
      }
    } catch (error) {
      console.error(`[QueueManager] Job ${job.id} failed:`, error)

      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Check if we should retry
      if (job.retry_count < job.max_retries && !signal.aborted) {
        await supabase
          .from('background_jobs')
          .update({
            status: 'retry',
            retry_count: job.retry_count + 1,
            scheduled_at: new Date(Date.now() + job.retry_delay_seconds * 1000).toISOString(),
            error_data: {
              error: errorMessage,
              retry_attempt: job.retry_count + 1,
              failed_at: new Date().toISOString()
            },
            worker_id: null,
            started_at: null
          })
          .eq('id', job.id)

        console.log(`[QueueManager] Job ${job.id} scheduled for retry (attempt ${job.retry_count + 1})`)
      } else {
        await supabase
          .from('background_jobs')
          .update({
            status: 'failed',
            error_data: {
              error: errorMessage,
              failed_at: new Date().toISOString(),
              final_failure: true
            },
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        console.log(`[QueueManager] Job ${job.id} failed permanently`)
      }
    }
  }

  // =====================================================
  // JOB EXECUTORS
  // =====================================================

  // Website analyse job executor
  private async executeWebsiteAnalysis(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    const { profile_id, input_data } = job;
    const url = input_data.url;

    if (!url || !profile_id) {
      return { success: false, error: 'Missing URL or Profile ID in job input_data' };
    }

    const supabase = getServiceRoleClient();
    const cacheManager = getCacheManager();

    try {
      // Stap 1: Deactiveer alle bestaande 'actieve' analyses voor deze profile_id
      await updateProgress({ progress: 2, step: 'Deactivating old analyses' });
      const { error: updateError } = await supabase
        .from('profile_website_analysis')
        .update({ is_active: false, status: 'archived' })
        .eq('profile_id', profile_id)
        .eq('is_active', true);

      if (updateError) {
        console.warn(`[QueueManager] Could not deactivate existing analysis, maybe there were none. Error: ${updateError.message}`);
        // This is not a fatal error, so we continue.
      }

      // Stap 2: Nieuwe analyse record aanmaken om de status te tracken
      await updateProgress({ progress: 5, step: 'Creating analysis record' });
      const { data: analysisRecord, error: insertError } = await supabase
        .from('profile_website_analysis')
        .insert({
          profile_id: profile_id,
          website_url: url,
          status: 'processing',
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create analysis record: ${insertError.message}`);
      }

      const analysisId = analysisRecord.id;

      // Update de job met de nieuwe analysis ID
      await supabase.from('background_jobs').update({ analysis_id: analysisId }).eq('id', job.id);
      
      // === STEP 3: Scraping & Caching ===
      const scrapingOptions = { timeout: 30000, waitForLoad: true, extractImages: false, extractLinks: false };
      await updateProgress({ progress: 20, step: 'Checking cache for scraped content' });
      let scrapedContent = cacheManager.getScrapedContent(url, scrapingOptions);

      if (!scrapedContent) {
        console.log(`[QueueManager] Cache miss for scraped content: ${url}`);
        await updateProgress({ progress: 30, step: 'Scraping website content' });
        const scraper = new WebsiteScraper();
        scrapedContent = await scraper.scrapeWebsite(url, scrapingOptions);
        if (scrapedContent.error) {
          throw new Error(`Failed to scrape website: ${scrapedContent.error}`);
        }
        cacheManager.cacheScrapedContent(url, scrapedContent, scrapingOptions);
        await scraper.cleanup();
      } else {
        console.log(`[QueueManager] Cache hit for scraped content: ${url}`);
      }
      if (signal.aborted) throw new Error('Job was cancelled');

      // === STEP 4: AI Analysis & Caching ===
      const analysisOptions = { language: 'nl' as const, includeRecommendations: true, includeCompetitorAnalysis: false };
      await updateProgress({ progress: 50, step: 'Checking cache for AI analysis' });
      let analysisResult = cacheManager.getAIAnalysis(url, analysisOptions);

      if (!analysisResult) {
        console.log(`[QueueManager] Cache miss for AI analysis: ${url}`);
        await updateProgress({ progress: 60, step: 'Analyzing website content with AI' });
        const analyzer = new AIAnalyzer();
        analysisResult = await analyzer.analyzeWebsite(scrapedContent, analysisOptions);
        cacheManager.cacheAIAnalysis(url, analysisResult, analysisOptions);
      } else {
        console.log(`[QueueManager] Cache hit for AI analysis: ${url}`);
      }
      if (signal.aborted) throw new Error('Job was cancelled');

      // === STEP 5: Database-update met resultaten ===
      await updateProgress({ progress: 90, step: 'Saving analysis results' });
      const { error: finalUpdateError } = await supabase
          .from('profile_website_analysis')
        .update({
          status: 'completed',
          analysis_data: analysisResult, // Assuming analysisResult is the JSON object to store
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', analysisId);

      if (finalUpdateError) {
        throw new Error(`Failed to save final analysis: ${finalUpdateError.message}`);
      }

      await updateProgress({ progress: 100, step: 'Analysis completed' });

      return {
        success: true,
        data: { analysis_id: analysisId, ...analysisResult },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[QueueManager] Website analysis failed:', errorMessage);
      
      // Probeer de status in de database op 'failed' te zetten
      const supabaseClient = getServiceRoleClient();
      const { data: jobData } = await supabaseClient.from('background_jobs').select('analysis_id').eq('id', job.id).single();
      if(jobData?.analysis_id) {
        await supabaseClient.from('profile_website_analysis').update({ status: 'failed', error_message: errorMessage }).eq('id', jobData.analysis_id);
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Bulk analyse job executor
  private async executeBulkAnalysis(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    const { websites, profileId } = job.input_data

    if (!Array.isArray(websites) || websites.length === 0) {
      throw new Error('Website list is required')
    }

    const totalWebsites = websites.length
    const results = []

    for (let i = 0; i < websites.length; i++) {
      if (signal.aborted) throw new Error('Job was cancelled')

      const website = websites[i]
      const progress = Math.round((i / totalWebsites) * 100)
      
      await updateProgress({ 
        progress, 
        step: `Analyzing ${i + 1}/${totalWebsites}: ${website}` 
      })

      try {
        // Create individual analysis job
        const analysisJobId = await this.addJob('website_analysis', profileId, {
          websiteUrl: website,
          profileId
        }, { priority: 3 })

        results.push({
          website,
          job_id: analysisJobId,
          status: 'queued'
        })
      } catch (error) {
        console.error(`[QueueManager] Failed to queue analysis for ${website}:`, error)
        results.push({
          website,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    await updateProgress({ progress: 100, step: 'All analyses queued' })

    return {
      success: true,
      data: {
        total_websites: totalWebsites,
        queued_analyses: results.filter(r => r.status === 'queued').length,
        failed_analyses: results.filter(r => r.status === 'failed').length,
        results
      }
    }
  }

  // Scheduled analyse job executor
  private async executeScheduledAnalysis(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    // Implementation voor scheduled analyses
    await updateProgress({ progress: 50, step: 'Executing scheduled analysis' })
    
    // Placeholder - kan later worden uitgebreid
    return {
      success: true,
      data: { message: 'Scheduled analysis completed' }
    }
  }

  // Email campaign job executor
  private async executeEmailCampaign(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    await updateProgress({ progress: 10, step: 'Initializing email campaign processor' })
    
    try {
      // Import EmailCampaignService dynamically to avoid circular dependencies
      const { EmailCampaignService } = await import('./commercial-email-campaign')
      const emailService = new EmailCampaignService()
      
      await updateProgress({ progress: 30, step: 'Processing email campaign job' })
      
      const result = await emailService.processEmailJob(job)
      
      await updateProgress({ progress: 100, step: 'Email campaign job completed' })
      
      return result
    } catch (error) {
      console.error('[QueueManager] Email campaign execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // Prospect discovery job executor
  private async executeProspectDiscovery(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    await updateProgress({ progress: 50, step: 'Executing prospect discovery' })
    
    // Placeholder for future implementation
    return {
      success: true,
      data: { message: 'Prospect discovery completed' }
    }
  }

  // Lead enrichment job executor
  private async executeLeadEnrichment(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    await updateProgress({ progress: 50, step: 'Executing lead enrichment' })
    
    // Placeholder for future implementation
    return {
      success: true,
      data: { message: 'Lead enrichment completed' }
    }
  }

  // AI optimization job executor
  private async executeAIOptimization(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    await updateProgress({ progress: 50, step: 'Executing AI optimization' })
    
    // Placeholder for future implementation
    return {
      success: true,
      data: { message: 'AI optimization completed' }
    }
  }

  // Fulfillment notification job executor
  private async executeFulfillmentNotification(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    await updateProgress({ progress: 10, step: 'Initializing fulfillment processor' })
    
    try {
      const { action, orderId, prospectId } = job.input_data
      
      await updateProgress({ progress: 30, step: 'Processing fulfillment action' })
      
      switch (action) {
        case 'process_fulfillment_order':
          // Import service dynamically to avoid circular dependencies
          const { CommercialFulfillmentService } = await import('./commercial-fulfillment-service')
          const fulfillmentService = new CommercialFulfillmentService()
          
          await updateProgress({ progress: 60, step: 'Processing fulfillment order' })
          
          const result = await fulfillmentService.processFulfillmentOrder(orderId)
          
          await updateProgress({ progress: 100, step: 'Fulfillment order processed' })
          
          return result
          
        case 'trigger_automatic_fulfillment':
          const { CommercialFulfillmentService: FulfillmentService } = await import('./commercial-fulfillment-service')
          const autoFulfillmentService = new FulfillmentService()
          
          await updateProgress({ progress: 60, step: 'Triggering automatic fulfillment' })
          
          const autoResult = await autoFulfillmentService.triggerAutomaticFulfillment(prospectId)
          
          await updateProgress({ progress: 100, step: 'Automatic fulfillment triggered' })
          
          return autoResult
          
        default:
          throw new Error(`Unknown fulfillment action: ${action}`)
      }
      
    } catch (error) {
      console.error('[QueueManager] Fulfillment notification execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // Admin notification job executor
  private async executeAdminNotification(
    job: BackgroundJob,
    signal: AbortSignal,
    updateProgress: (progress: JobProgress) => Promise<void>
  ): Promise<JobResult> {
    await updateProgress({ progress: 10, step: 'Initializing admin notification processor' })
    
    try {
      const { action, orderId, orderNumber, trackingNumber, recipientEmail } = job.input_data
      
      await updateProgress({ progress: 30, step: 'Processing admin notification' })
      
      switch (action) {
        case 'send_shipping_notification':
          // Import email service to send notifications
          const { sendCommercialEmail } = await import('./commercial-mail-service')
          
          await updateProgress({ progress: 60, step: 'Sending shipping notification' })
          
          const emailResult = await sendCommercialEmail({
            to: recipientEmail,
            subject: `Uw proefpakket is verzonden! 📦`,
            html: `
              <h2>Goed nieuws! Uw proefpakket is onderweg</h2>
              <p>Beste klant,</p>
              <p>Uw proefpakket (bestelling ${orderNumber}) is verzonden en is onderweg naar uw adres.</p>
              ${trackingNumber ? `<p><strong>Track & Trace:</strong> ${trackingNumber}</p>` : ''}
              <p>Verwachte levertijd: 2-3 werkdagen</p>
              <p>We hopen dat u tevreden bent met onze producten!</p>
              <p>Met vriendelijke groet,<br>Team Wasgeurtje</p>
            `,
            text: `Uw proefpakket (${orderNumber}) is verzonden. ${trackingNumber ? `Track & Trace: ${trackingNumber}` : ''} Verwachte levertijd: 2-3 werkdagen.`,
            campaignId: 'fulfillment_shipping',
            prospectId: job.profile_id
          })
          
          await updateProgress({ progress: 100, step: 'Shipping notification sent' })
          
          return emailResult
          
        default:
          throw new Error(`Unknown admin notification action: ${action}`)
      }
      
    } catch (error) {
      console.error('[QueueManager] Admin notification execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  // Cleanup expired jobs
  private async cleanupExpiredJobs(): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .rpc('cleanup_expired_background_jobs')

    if (error) {
      console.error('[QueueManager] Cleanup error:', error)
    } else {
      console.log(`[QueueManager] Cleaned up ${data} expired jobs`)
    }
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('background_jobs_stats')
      .select('*')

    if (error) {
      console.error('[QueueManager] Error getting stats:', error)
      return null
    }

    return data
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<BackgroundJob | null> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('[QueueManager] Error getting job status:', error)
      return null
    }

    return data
  }

  // Cancel job
  async cancelJob(jobId: string): Promise<boolean> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Cancel if it's processing
    const controller = this.activeJobs.get(jobId)
    if (controller) {
      controller.abort()
      this.activeJobs.delete(jobId)
    }

    // Update status in database
    const { error } = await supabase
      .from('background_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .in('status', ['pending', 'processing'])

    if (error) {
      console.error('[QueueManager] Error cancelling job:', error)
      return false
    }

    console.log(`[QueueManager] Job ${jobId} cancelled`)
    return true
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Initialize queue manager singleton
export const queueManager = QueueManager.getInstance()

// Helper function voor job creation
export async function queueWebsiteAnalysis(
  profileId: string,
  websiteUrl: string,
  options?: { priority?: number }
): Promise<string> {
  return queueManager.addJob('website_analysis', profileId, {
    url: websiteUrl, // Use 'url' to match the executor
    profileId // Keep profileId for potential cross-reference, though executor uses job.profile_id
  }, options)
}

// Helper function voor bulk analysis
export async function queueBulkAnalysis(
  profileId: string,
  websites: string[],
  options?: { priority?: number }
): Promise<string> {
  return queueManager.addJob('bulk_analysis', profileId, {
    websites,
    profileId
  }, options)
}

// Helper function voor email campaigns
export async function queueEmailCampaign(
  prospectId: string,
  campaignData: Record<string, any>,
  options?: { priority?: number; scheduledAt?: Date }
): Promise<string> {
  return queueManager.addJob('email_campaign', prospectId, campaignData, options)
}

// Start queue worker (call this in your app initialization)
export async function startQueueWorker(): Promise<void> {
  console.log('[QueueManager] Starting queue worker...')
  await queueManager.startWorker()
}

// Stop queue worker (call this in your app cleanup)
export async function stopQueueWorker(): Promise<void> {
  console.log('[QueueManager] Stopping queue worker...')
  await queueManager.stopWorker()
} 