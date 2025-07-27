// =====================================================
// COMMERCIAL EMAIL SERVICE - ESP Integration
// Handles commercial email delivery with tracking
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  trackingPixelId?: string;
  clickTrackingIds?: Record<string, string>;
  utmParameters?: Record<string, string>;
  campaignId?: string;
  prospectId?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
  clickTrackingIds?: Record<string, string>;
}

export interface EmailProvider {
  name: string;
  sendEmail(options: EmailOptions): Promise<EmailResult>;
}

// SendGrid Provider Implementation
class SendGridProvider implements EmailProvider {
  name = 'sendgrid';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[CommercialMail] SendGrid API key not configured');
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'SendGrid API key not configured',
        provider: this.name
      };
    }

    try {
      // Add tracking pixel if provided
      let htmlContent = options.html;
      if (options.trackingPixelId) {
        const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_BASE_URL}/api/track/pixel/${options.trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
        htmlContent = htmlContent.replace('</body>', `${trackingPixel}</body>`);
      }

      // Add click tracking to links
      const clickTrackingIds: Record<string, string> = {};
      
      // Extract all links and create tracking IDs
      const linkRegex = /href="([^"]*)"/g;
      let match;
      while ((match = linkRegex.exec(htmlContent)) !== null) {
        const originalUrl = match[1];
        if (originalUrl.startsWith('http') && !originalUrl.includes('/api/track/')) {
          const trackingId = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          clickTrackingIds[originalUrl] = trackingId;
          
          const trackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/track/click/${trackingId}?url=${encodeURIComponent(originalUrl)}`;
          htmlContent = htmlContent.replace(new RegExp(originalUrl, 'g'), trackingUrl);
        }
      }
      
      // Override with provided click tracking IDs if available
      if (options.clickTrackingIds) {
        Object.assign(clickTrackingIds, options.clickTrackingIds);
      }

      // Add UTM parameters to links
      if (options.utmParameters) {
        const utmString = new URLSearchParams(options.utmParameters).toString();
        htmlContent = htmlContent.replace(
          /href="([^"]*wasgeurtje\.nl[^"]*)"/g,
          (match, url) => {
            const separator = url.includes('?') ? '&' : '?';
            return `href="${url}${separator}${utmString}"`;
          }
        );
      }

      const emailData = {
        personalizations: [{
          to: [{ email: options.to }],
          subject: options.subject
        }],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'partners@wasgeurtje.nl',
          name: 'Wasgeurtje Partnership Team'
        },
        reply_to: {
          email: options.replyTo || 'partners@wasgeurtje.nl',
          name: 'Wasgeurtje Partnership Team'
        },
        content: [
          {
            type: 'text/html',
            value: htmlContent
          }
        ],
        // Add custom args for tracking
        custom_args: {
          campaign_id: options.campaignId || '',
          prospect_id: options.prospectId || '',
          tracking_pixel_id: options.trackingPixelId || ''
        },
        // Enable click tracking
        tracking_settings: {
          click_tracking: {
            enable: true,
            enable_text: false
          },
          open_tracking: {
            enable: true,
            substitution_tag: '%open_track%'
          }
        }
      };

      // Add plain text version if provided
      if (options.text) {
        emailData.content.push({
          type: 'text/plain',
          value: options.text
        });
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        // SendGrid returns the message ID in the X-Message-Id header
        const messageId = response.headers.get('X-Message-Id') || `sg_${Date.now()}`;
        
        console.log(`[CommercialMail] Email sent via SendGrid to ${options.to}, Message ID: ${messageId}`);
        
        return {
          success: true,
          messageId,
          provider: this.name,
          clickTrackingIds
        };
      } else {
        const errorData = await response.text();
        console.error('[CommercialMail] SendGrid error:', errorData);
        
        return {
          success: false,
          error: `SendGrid API error: ${response.status} - ${errorData}`,
          provider: this.name
        };
      }

    } catch (error) {
      console.error('[CommercialMail] SendGrid exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: this.name
      };
    }
  }
}

// Development Provider Implementation (fallback for testing)
class DevelopmentProvider implements EmailProvider {
  name = 'development';

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // For development, we'll simulate email sending and log details
      console.log('\n--- COMMERCIAL EMAIL (DEVELOPMENT) ---');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Campaign ID: ${options.campaignId || 'N/A'}`);
      console.log(`Prospect ID: ${options.prospectId || 'N/A'}`);
      console.log(`Tracking Pixel ID: ${options.trackingPixelId || 'N/A'}`);
      
      if (options.utmParameters) {
        console.log(`UTM Parameters:`, options.utmParameters);
      }
      
      console.log(`HTML Content (first 200 chars): ${options.html.substring(0, 200)}...`);
      console.log('--- END COMMERCIAL EMAIL ---\n');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const simulatedMessageId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId: simulatedMessageId,
        provider: this.name,
        clickTrackingIds: {} // Simulated click tracking IDs
      };

    } catch (error) {
      console.error('[CommercialMail] Development provider error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: this.name
      };
    }
  }
}

// Email Service Manager
class CommercialEmailService {
  private providers: EmailProvider[];
  private preferredProvider: string;

  constructor() {
    this.providers = [
      new SendGridProvider(),
      new DevelopmentProvider() // Development fallback
    ];
    
    // Determine preferred provider based on environment
    this.preferredProvider = process.env.COMMERCIAL_EMAIL_PROVIDER || 'sendgrid';
    
    // In development, use development provider
    if (process.env.NODE_ENV === 'development') {
      this.preferredProvider = 'development';
    }
    
    console.log(`[CommercialMail] Initialized with preferred provider: ${this.preferredProvider}`);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Try preferred provider first
    const preferredProvider = this.providers.find(p => p.name === this.preferredProvider);
    
    if (preferredProvider) {
      const result = await preferredProvider.sendEmail(options);
      if (result.success) {
        await this.logEmailSent(options, result);
        return result;
      }
      
      console.warn(`[CommercialMail] Preferred provider ${this.preferredProvider} failed:`, result.error);
    }

    // Try fallback providers
    for (const provider of this.providers) {
      if (provider.name === this.preferredProvider) continue; // Skip already tried
      
      console.log(`[CommercialMail] Trying fallback provider: ${provider.name}`);
      
      const result = await provider.sendEmail(options);
      if (result.success) {
        await this.logEmailSent(options, result);
        return result;
      }
      
      console.warn(`[CommercialMail] Provider ${provider.name} failed:`, result.error);
    }

    // All providers failed
    const error = 'All commercial email providers failed';
    console.error('[CommercialMail]', error);
    
    return {
      success: false,
      error
    };
  }

  private async logEmailSent(options: EmailOptions, result: EmailResult): Promise<void> {
    try {
      const supabase = getServiceRoleClient();
      
      // Log to email tracking table if we have the necessary IDs
      if (options.prospectId) {
        await supabase
          .from('commercial_email_tracking')
          .insert({
            prospect_id: options.prospectId,
            event_type: 'sent',
            provider_event_id: result.messageId,
            provider_raw_data: {
              provider: result.provider,
              to: options.to,
              subject: options.subject,
              campaign_id: options.campaignId,
              tracking_pixel_id: options.trackingPixelId
            }
          });
      }
      
      console.log(`[CommercialMail] Email tracking logged for prospect: ${options.prospectId}`);
      
    } catch (error) {
      console.error('[CommercialMail] Failed to log email tracking:', error);
      // Don't fail the email send if logging fails
    }
  }
}

// Singleton instance
const commercialEmailService = new CommercialEmailService();

// Main export function
export async function sendCommercialEmail(options: EmailOptions): Promise<EmailResult> {
  console.log(`[CommercialMail] Sending commercial email to ${options.to} with subject: ${options.subject}`);
  
  // Validate required fields
  if (!options.to || !options.subject || !options.html) {
    return {
      success: false,
      error: 'Missing required email fields: to, subject, or html'
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.to)) {
    return {
      success: false,
      error: 'Invalid email address format'
    };
  }

  try {
    return await commercialEmailService.sendEmail(options);
  } catch (error) {
    console.error('[CommercialMail] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function to test email configuration
export async function testCommercialEmailConfiguration(): Promise<{ success: boolean; results: Record<string, EmailResult> }> {
  const testEmail: EmailOptions = {
    to: process.env.TEST_EMAIL || 'test@example.com',
    subject: 'Wasgeurtje Commercial Email Service Test',
    html: '<p>This is a test email from the Wasgeurtje commercial email service.</p><p>If you receive this, the configuration is working correctly.</p>',
    text: 'This is a test email from the Wasgeurtje commercial email service. If you receive this, the configuration is working correctly.',
    campaignId: 'test-campaign',
    prospectId: 'test-prospect',
    trackingPixelId: 'test-pixel'
  };

  const results: Record<string, EmailResult> = {};
  
  // Test each provider individually
  const sendGridProvider = new SendGridProvider();
  const developmentProvider = new DevelopmentProvider();

  results.sendgrid = await sendGridProvider.sendEmail(testEmail);
  results.development = await developmentProvider.sendEmail(testEmail);

  const success = Object.values(results).some(result => result.success);

  return { success, results };
}

// Export for testing
export { CommercialEmailService, SendGridProvider, DevelopmentProvider };