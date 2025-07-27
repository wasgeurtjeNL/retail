// =====================================================
// EMAIL QUEUE MANAGER - Optimized Email Processing
// Advanced email queue with retry logic, error handling, and monitoring
// =====================================================

import { getServiceRoleClient } from './supabase';
import { QueueManager } from './queue-manager';

export interface EmailQueueItem {
  id: string;
  prospect_id?: string;
  template_id?: string;
  campaign_id?: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  html_content: string;
  text_content?: string;
  
  // Scheduling
  scheduled_at: string;
  priority: number; // 1-10, higher = more urgent
  
  // Status tracking
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  sent_at?: string;
  
  // Tracking
  tracking_pixel_id?: string;
  click_tracking_ids?: Record<string, string>;
  
  // Metadata
  personalization_data?: Record<string, any>;
  error_message?: string;
  bounce_reason?: string;
  
  created_at: string;
  updated_at: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  bounced?: boolean;
  rejected?: boolean;
}

export interface QueueMetrics {
  totalQueued: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  avgProcessingTime: number;
  successRate: number;
  errorsByType: Record<string, number>;
}

export class EmailQueueManager {
  private queueManager: QueueManager;
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private maxConcurrentSends: number = 5;
  private processIntervalMs: number = 30000; // 30 seconds
  
  constructor() {
    this.queueManager = new QueueManager();
  }

  /**
   * Add email to queue
   */
  async addToQueue(emailData: Partial<EmailQueueItem>): Promise<string> {
    try {
      const supabase = getServiceRoleClient();
      
      const queueItem: Partial<EmailQueueItem> = {
        recipient_email: emailData.recipient_email,
        recipient_name: emailData.recipient_name,
        subject: emailData.subject || '',
        html_content: emailData.html_content || '',
        text_content: emailData.text_content,
        scheduled_at: emailData.scheduled_at || new Date().toISOString(),
        priority: emailData.priority || 5,
        status: 'pending',
        attempts: 0,
        max_attempts: emailData.max_attempts || 3,
        tracking_pixel_id: emailData.tracking_pixel_id || this.generateTrackingId(),
        click_tracking_ids: emailData.click_tracking_ids || {},
        personalization_data: emailData.personalization_data || {},
        prospect_id: emailData.prospect_id,
        template_id: emailData.template_id,
        campaign_id: emailData.campaign_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('commercial_email_queue')
        .insert(queueItem)
        .select()
        .single();

      if (error) {
        console.error('[EmailQueue] Error adding to queue:', error);
        throw error;
      }

      console.log(`[EmailQueue] Added email to queue: ${data.id} for ${emailData.recipient_email}`);
      return data.id;

    } catch (error) {
      console.error('[EmailQueue] Failed to add email to queue:', error);
      throw error;
    }
  }

  /**
   * Start queue processing
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.log('[EmailQueue] Already processing queue');
      return;
    }

    console.log('[EmailQueue] Starting email queue processing');
    this.isProcessing = true;

    // Process immediately, then start interval
    await this.processQueue();
    
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.processIntervalMs);

    console.log(`[EmailQueue] Queue processing started (interval: ${this.processIntervalMs}ms)`);
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    console.log('[EmailQueue] Stopping email queue processing');
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Process pending emails in queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isProcessing) return;

    try {
      const pendingEmails = await this.getPendingEmails();
      
      if (pendingEmails.length === 0) {
        console.log('[EmailQueue] No pending emails to process');
        return;
      }

      console.log(`[EmailQueue] Processing ${pendingEmails.length} pending emails`);

      // Process emails in batches to avoid overwhelming the system
      const batches = this.chunkArray(pendingEmails, this.maxConcurrentSends);
      
      for (const batch of batches) {
        const promises = batch.map(email => this.processEmail(email));
        await Promise.allSettled(promises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('[EmailQueue] Error processing queue:', error);
    }
  }

  /**
   * Get pending emails from queue
   */
  private async getPendingEmails(): Promise<EmailQueueItem[]> {
    try {
      const supabase = getServiceRoleClient();
      
      const { data: emails, error } = await supabase
        .from('commercial_email_queue')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lte('scheduled_at', new Date().toISOString())
        .lt('retry_count', 3) // Use fixed value instead of supabase.raw()
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[EmailQueue] Error fetching pending emails:', error);
        return [];
      }

      return emails || [];

    } catch (error) {
      console.error('[EmailQueue] Error in getPendingEmails:', error);
      return [];
    }
  }

  /**
   * Process individual email
   */
  private async processEmail(email: EmailQueueItem): Promise<void> {
    try {
      console.log(`[EmailQueue] Processing email ${email.id} to ${email.recipient_email}`);

      // Update status to processing
      await this.updateEmailStatus(email.id, 'processing', {
        attempts: email.attempts + 1
      });

      // Send email
      const sendResult = await this.sendEmail(email);
      
      if (sendResult.success) {
        // Email sent successfully
        await this.updateEmailStatus(email.id, 'sent', {
          sent_at: new Date().toISOString(),
          error_message: null
        });

        // Track email sending for analytics
        await this.trackEmailSent(email, sendResult.messageId);
        
        console.log(`[EmailQueue] Successfully sent email ${email.id}`);
      } else {
        // Email failed to send
        const isLastAttempt = (email.attempts + 1) >= email.max_attempts;
        const newStatus = isLastAttempt ? 'failed' : 'pending';
        
        await this.updateEmailStatus(email.id, newStatus, {
          error_message: sendResult.error,
          bounce_reason: sendResult.bounced ? 'bounced' : undefined
        });

        // Track email failure
        await this.trackEmailFailure(email, sendResult.error);
        
        if (isLastAttempt) {
          console.error(`[EmailQueue] Email ${email.id} failed permanently after ${email.max_attempts} attempts`);
        } else {
          console.warn(`[EmailQueue] Email ${email.id} failed, will retry. Attempt ${email.attempts + 1}/${email.max_attempts}`);
        }
      }

    } catch (error) {
      console.error(`[EmailQueue] Error processing email ${email.id}:`, error);
      
      // Update email status to failed
      await this.updateEmailStatus(email.id, 'failed', {
        error_message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send individual email using Mandrill
   */
  private async sendEmail(email: EmailQueueItem): Promise<EmailSendResult> {
    try {
      if (!process.env.MANDRILL_API_KEY) {
        return {
          success: false,
          error: 'Mandrill API key not configured'
        };
      }

      // Prepare email data for Mandrill
      const emailData = {
        key: process.env.MANDRILL_API_KEY,
        message: {
          html: email.html_content,
          text: email.text_content || '',
          subject: email.subject,
          from_email: process.env.FROM_EMAIL || 'noreply@wasgeurtje.nl',
          from_name: process.env.FROM_NAME || 'Wasgeurtje',
          to: [{
            email: email.recipient_email,
            name: email.recipient_name,
            type: 'to'
          }],
          headers: {
            'Reply-To': process.env.REPLY_TO_EMAIL || 'info@wasgeurtje.nl'
          },
          important: email.priority > 7,
          track_opens: true,
          track_clicks: true,
          auto_text: !email.text_content,
          auto_html: false,
          inline_css: true,
          url_strip_qs: false,
          preserve_recipients: false,
          view_content_link: false,
          tracking_domain: process.env.TRACKING_DOMAIN,
          signing_domain: process.env.SIGNING_DOMAIN,
          return_path_domain: process.env.RETURN_PATH_DOMAIN,
          merge: true,
          merge_language: 'handlebars',
          global_merge_vars: Object.entries(email.personalization_data || {}).map(([name, content]) => ({
            name,
            content
          })),
          metadata: {
            email_queue_id: email.id,
            prospect_id: email.prospect_id,
            campaign_id: email.campaign_id,
            template_id: email.template_id
          },
          tags: [
            'commercial-acquisition',
            email.campaign_id ? `campaign-${email.campaign_id}` : 'standalone',
            email.template_id ? `template-${email.template_id}` : 'custom'
          ]
        }
      };

      // Send via Mandrill
      const response = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      const results = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: results.message || `HTTP ${response.status}`
        };
      }

      // Check result for each recipient (should be only one)
      const result = results[0];
      
      if (result.status === 'sent' || result.status === 'queued') {
        return {
          success: true,
          messageId: result._id
        };
      } else if (result.status === 'rejected') {
        return {
          success: false,
          error: result.reject_reason || 'Email rejected',
          rejected: true
        };
      } else if (result.status === 'invalid') {
        return {
          success: false,
          error: 'Invalid email address',
          bounced: true
        };
      } else {
        return {
          success: false,
          error: `Unexpected status: ${result.status}`
        };
      }

    } catch (error) {
      console.error('[EmailQueue] Error sending email via Mandrill:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update email status in database
   */
  private async updateEmailStatus(
    emailId: string, 
    status: EmailQueueItem['status'], 
    updates: Partial<EmailQueueItem> = {}
  ): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...updates
      };

      const { error } = await supabase
        .from('commercial_email_queue')
        .update(updateData)
        .eq('id', emailId);

      if (error) {
        console.error('[EmailQueue] Error updating email status:', error);
      }

    } catch (error) {
      console.error('[EmailQueue] Error in updateEmailStatus:', error);
    }
  }

  /**
   * Track successful email sending
   */
  private async trackEmailSent(email: EmailQueueItem, messageId?: string): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Update prospect last contact if applicable
      if (email.prospect_id) {
        await supabase
          .from('commercial_prospects')
          .update({ 
            last_contact_attempt: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', email.prospect_id);
      }

      // Track in performance metrics
      await supabase
        .from('commercial_performance_metrics')
        .insert({
          metric_type: 'email_sent',
          category: 'email',
          value: 1,
          metadata: {
            queue_id: email.id,
            prospect_id: email.prospect_id,
            campaign_id: email.campaign_id,
            template_id: email.template_id,
            message_id: messageId,
            priority: email.priority
          }
        });

    } catch (error) {
      console.error('[EmailQueue] Error tracking email sent:', error);
    }
  }

  /**
   * Track email failure
   */
  private async trackEmailFailure(email: EmailQueueItem, errorMessage?: string): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Track in performance metrics
      await supabase
        .from('commercial_performance_metrics')
        .insert({
          metric_type: 'email_failed',
          category: 'email',
          value: 1,
          metadata: {
            queue_id: email.id,
            prospect_id: email.prospect_id,
            campaign_id: email.campaign_id,
            template_id: email.template_id,
            error_message: errorMessage,
            attempt_number: email.attempts + 1,
            priority: email.priority
          }
        });

    } catch (error) {
      console.error('[EmailQueue] Error tracking email failure:', error);
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      const supabase = getServiceRoleClient();
      
      // Get status counts
      const { data: statusCounts } = await supabase
        .from('commercial_email_queue')
        .select('status')
        .then(({ data }) => {
          const counts = {
            pending: 0,
            processing: 0,
            sent: 0,
            failed: 0,
            cancelled: 0
          };
          
          data?.forEach(item => {
            counts[item.status as keyof typeof counts]++;
          });
          
          return { data: counts };
        });

      const totalQueued = Object.values(statusCounts || {}).reduce((sum, count) => sum + count, 0);
      
      // Calculate success rate
      const successfulEmails = (statusCounts?.sent || 0);
      const totalProcessed = successfulEmails + (statusCounts?.failed || 0);
      const successRate = totalProcessed > 0 ? (successfulEmails / totalProcessed) * 100 : 0;

      // Get average processing time (last 100 emails)
      const { data: recentEmails } = await supabase
        .from('commercial_email_queue')
        .select('created_at, sent_at')
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(100);

      let avgProcessingTime = 0;
      if (recentEmails && recentEmails.length > 0) {
        const processingTimes = recentEmails.map(email => {
          const created = new Date(email.created_at).getTime();
          const sent = new Date(email.sent_at!).getTime();
          return sent - created;
        });
        
        avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      }

      // Get error types from failed emails
      const { data: failedEmails } = await supabase
        .from('commercial_email_queue')
        .select('error_message')
        .eq('status', 'failed')
        .not('error_message', 'is', null)
        .limit(100);

      const errorsByType: Record<string, number> = {};
      failedEmails?.forEach(email => {
        const errorType = this.categorizeError(email.error_message);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });

      return {
        totalQueued,
        pending: statusCounts?.pending || 0,
        processing: statusCounts?.processing || 0,
        sent: statusCounts?.sent || 0,
        failed: statusCounts?.failed || 0,
        cancelled: statusCounts?.cancelled || 0,
        avgProcessingTime: Math.round(avgProcessingTime / 1000), // Convert to seconds
        successRate: Math.round(successRate * 100) / 100,
        errorsByType
      };

    } catch (error) {
      console.error('[EmailQueue] Error getting queue metrics:', error);
      
      // Return default metrics on error
      return {
        totalQueued: 0,
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        avgProcessingTime: 0,
        successRate: 0,
        errorsByType: {}
      };
    }
  }

  /**
   * Cancel pending emails
   */
  async cancelPendingEmails(filters: { 
    prospect_id?: string; 
    campaign_id?: string; 
    template_id?: string 
  }): Promise<number> {
    try {
      const supabase = getServiceRoleClient();
      
      let query = supabase
        .from('commercial_email_queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'pending');

      if (filters.prospect_id) {
        query = query.eq('prospect_id', filters.prospect_id);
      }
      
      if (filters.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id);
      }
      
      if (filters.template_id) {
        query = query.eq('template_id', filters.template_id);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('[EmailQueue] Error cancelling emails:', error);
        return 0;
      }

      const cancelledCount = data?.length || 0;
      console.log(`[EmailQueue] Cancelled ${cancelledCount} pending emails`);
      
      return cancelledCount;

    } catch (error) {
      console.error('[EmailQueue] Error in cancelPendingEmails:', error);
      return 0;
    }
  }

  /**
   * Clean up old emails (older than specified days)
   */
  async cleanupOldEmails(daysOld: number = 30): Promise<number> {
    try {
      const supabase = getServiceRoleClient();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('commercial_email_queue')
        .delete()
        .in('status', ['sent', 'failed', 'cancelled'])
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        console.error('[EmailQueue] Error cleaning up old emails:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`[EmailQueue] Cleaned up ${deletedCount} old emails (older than ${daysOld} days)`);
      
      return deletedCount;

    } catch (error) {
      console.error('[EmailQueue] Error in cleanupOldEmails:', error);
      return 0;
    }
  }

  // Helper methods

  private generateTrackingId(): string {
    return `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private categorizeError(errorMessage: string): string {
    if (!errorMessage) return 'unknown';
    
    const message = errorMessage.toLowerCase();
    
    if (message.includes('bounce') || message.includes('invalid')) {
      return 'invalid_email';
    } else if (message.includes('reject') || message.includes('spam')) {
      return 'rejected';
    } else if (message.includes('timeout') || message.includes('network')) {
      return 'network_error';
    } else if (message.includes('quota') || message.includes('limit')) {
      return 'rate_limit';
    } else if (message.includes('api') || message.includes('key')) {
      return 'api_error';
    } else {
      return 'other';
    }
  }
}

// Export singleton instance
let emailQueueManagerInstance: EmailQueueManager | null = null;

export function getEmailQueueManager(): EmailQueueManager {
  if (!emailQueueManagerInstance) {
    emailQueueManagerInstance = new EmailQueueManager();
  }
  return emailQueueManagerInstance;
}

// Auto-start queue processing in production
if (process.env.NODE_ENV === 'production') {
  const manager = getEmailQueueManager();
  manager.startProcessing().catch(console.error);
} 