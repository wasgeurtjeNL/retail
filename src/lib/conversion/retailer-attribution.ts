// =====================================================
// RETAILER APPLICATION ATTRIBUTION SERVICE
// Track retailer applications back to proefpakket campaigns
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';
import { PostDeliveryService } from './post-delivery-service';

export interface AttributionMatch {
  confidence: number;
  method: 'direct_link' | 'utm_tracking' | 'phone_reference' | 'email_reference' | 'manual_assignment' | 'email_match' | 'company_match' | 'timing_correlation';
  journey_id?: string;
  prospect_id?: string;
  evidence: string[];
  metadata?: any;
}

export interface RetailerApplication {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referral_source?: string;
  application_date: string;
  status: string;
  notes?: string;
}

export class RetailerAttributionService {
  private supabase = getServiceRoleClient();
  private postDeliveryService: PostDeliveryService;

  constructor() {
    this.postDeliveryService = new PostDeliveryService();
    console.log('[RetailerAttribution] Service initialized');
  }

  // =====================================================
  // ATTRIBUTION PROCESSING
  // =====================================================

  /**
   * Process a new retailer application and find attribution to proefpakket campaigns
   */
  async processRetailerApplication(applicationData: RetailerApplication): Promise<AttributionMatch[]> {
    try {
      console.log(`[RetailerAttribution] Processing application for ${applicationData.company_name}`);

      const matches: AttributionMatch[] = [];

      // Try different attribution methods
      const directLinkMatch = await this.findDirectLinkAttribution(applicationData);
      if (directLinkMatch) matches.push(directLinkMatch);

      const utmMatch = await this.findUTMAttribution(applicationData);
      if (utmMatch) matches.push(utmMatch);

      const emailMatch = await this.findEmailAttribution(applicationData);
      if (emailMatch) matches.push(emailMatch);

      const companyMatch = await this.findCompanyAttribution(applicationData);
      if (companyMatch) matches.push(companyMatch);

      const timingMatch = await this.findTimingAttribution(applicationData);
      if (timingMatch) matches.push(timingMatch);

      // Sort by confidence and take the best match
      matches.sort((a, b) => b.confidence - a.confidence);

      // Record attribution if we found matches
      if (matches.length > 0) {
        const bestMatch = matches[0];
        await this.recordAttribution(applicationData, bestMatch);
        
        // Update conversion journey if applicable
        if (bestMatch.journey_id) {
          await this.updateConversionJourney(bestMatch.journey_id, applicationData);
        }
      }

      console.log(`[RetailerAttribution] Found ${matches.length} potential matches for ${applicationData.company_name}`);
      return matches;

    } catch (error) {
      console.error('[RetailerAttribution] Error processing application:', error);
      throw error;
    }
  }

  /**
   * Manual attribution assignment by admin
   */
  async assignManualAttribution(
    applicationId: string, 
    journeyId: string, 
    confidence: number = 1.0,
    notes?: string
  ): Promise<void> {
    try {
      console.log(`[RetailerAttribution] Manual attribution: application ${applicationId} → journey ${journeyId}`);

      const attribution = {
        retailer_application_id: applicationId,
        journey_id: journeyId,
        attribution_method: 'manual_assignment',
        attribution_confidence: confidence,
        attribution_notes: notes || 'Manually assigned by admin'
      };

      await this.supabase
        .from('retailer_applications_attribution')
        .insert([attribution]);

      // Update journey status
      await this.postDeliveryService.processFeedbackSubmission(journeyId, {
        overall_rating: 5, // Assume positive for conversion
        interested_in_partnership: true,
        source: 'application_conversion'
      });

      console.log(`[RetailerAttribution] Manual attribution recorded successfully`);

    } catch (error) {
      console.error('[RetailerAttribution] Error assigning manual attribution:', error);
      throw error;
    }
  }

  // =====================================================
  // ATTRIBUTION METHODS
  // =====================================================

  /**
   * Find attribution through direct link tracking
   */
  private async findDirectLinkAttribution(application: RetailerApplication): Promise<AttributionMatch | null> {
    try {
      // Check if UTM parameters contain proefpakket tracking
      if (application.utm_source === 'proefpakket' || application.utm_campaign?.includes('proefpakket')) {
        // Extract journey ID from UTM parameters if available
        const journeyId = this.extractJourneyIdFromUTM(application);
        
        if (journeyId) {
          return {
            confidence: 1.0,
            method: 'direct_link',
            journey_id: journeyId,
            evidence: [
              `UTM source: ${application.utm_source}`,
              `UTM campaign: ${application.utm_campaign}`,
              `Journey ID: ${journeyId}`
            ]
          };
        }

        return {
          confidence: 0.9,
          method: 'utm_tracking',
          evidence: [
            `UTM source: ${application.utm_source}`,
            `UTM campaign: ${application.utm_campaign}`
          ]
        };
      }

      return null;
    } catch (error) {
      console.error('[RetailerAttribution] Error in direct link attribution:', error);
      return null;
    }
  }

  /**
   * Find attribution through UTM tracking
   */
  private async findUTMAttribution(application: RetailerApplication): Promise<AttributionMatch | null> {
    try {
      if (!application.utm_source && !application.utm_campaign) {
        return null;
      }

      // Check for proefpakket-related UTM parameters
      const proefpakketIndicators = ['proefpakket', 'sample', 'trial', 'conversion'];
      const hasProefpakketUTM = proefpakketIndicators.some(indicator => 
        application.utm_source?.toLowerCase().includes(indicator) ||
        application.utm_campaign?.toLowerCase().includes(indicator) ||
        application.utm_medium?.toLowerCase().includes(indicator)
      );

      if (hasProefpakketUTM) {
        return {
          confidence: 0.8,
          method: 'utm_tracking',
          evidence: [
            `UTM parameters indicate proefpakket source`,
            `Source: ${application.utm_source}`,
            `Campaign: ${application.utm_campaign}`,
            `Medium: ${application.utm_medium}`
          ]
        };
      }

      return null;
    } catch (error) {
      console.error('[RetailerAttribution] Error in UTM attribution:', error);
      return null;
    }
  }

  /**
   * Find attribution through email matching
   */
  private async findEmailAttribution(application: RetailerApplication): Promise<AttributionMatch | null> {
    try {
      // Look for prospects with matching email
      const { data: prospects, error } = await this.supabase
        .from('prospects')
        .select(`
          id,
          email,
          conversion_journeys (
            id,
            status,
            delivered_at,
            feedback_received_at
          )
        `)
        .eq('email', application.email);

      if (error) {
        throw new Error(`Failed to find email matches: ${error.message}`);
      }

      if (!prospects || prospects.length === 0) {
        return null;
      }

      // Find the most recent journey with delivery
      const prospect = prospects[0];
      const deliveredJourneys = prospect.conversion_journeys?.filter(
        (j: any) => j.delivered_at
      ) || [];

      if (deliveredJourneys.length === 0) {
        return null;
      }

      // Sort by delivery date and take the most recent
      const recentJourney = deliveredJourneys.sort(
        (a: any, b: any) => new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime()
      )[0];

      // Calculate time between delivery and application
      const deliveryDate = new Date(recentJourney.delivered_at);
      const applicationDate = new Date(application.application_date);
      const daysBetween = Math.floor((applicationDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Higher confidence for shorter time periods
      let confidence = 0.95;
      if (daysBetween > 30) confidence = 0.7;
      else if (daysBetween > 14) confidence = 0.8;
      else if (daysBetween > 7) confidence = 0.9;

      return {
        confidence,
        method: 'email_reference',
        journey_id: recentJourney.id,
        prospect_id: prospect.id,
        evidence: [
          `Email match: ${application.email}`,
          `Journey status: ${recentJourney.status}`,
          `Days between delivery and application: ${daysBetween}`,
          `Delivery date: ${deliveryDate.toLocaleDateString()}`
        ],
        metadata: {
          days_between_delivery_and_application: daysBetween,
          journey_status: recentJourney.status
        }
      };

    } catch (error) {
      console.error('[RetailerAttribution] Error in email attribution:', error);
      return null;
    }
  }

  /**
   * Find attribution through company name matching
   */
  private async findCompanyAttribution(application: RetailerApplication): Promise<AttributionMatch | null> {
    try {
      // Look for prospects with similar company names
      const { data: prospects, error } = await this.supabase
        .from('prospects')
        .select(`
          id,
          company_name,
          contact_name,
          email,
          conversion_journeys (
            id,
            status,
            delivered_at
          )
        `)
        .ilike('company_name', `%${application.company_name}%`);

      if (error) {
        throw new Error(`Failed to find company matches: ${error.message}`);
      }

      if (!prospects || prospects.length === 0) {
        return null;
      }

      // Find exact or close matches
      const exactMatches = prospects.filter(p => 
        p.company_name.toLowerCase() === application.company_name.toLowerCase()
      );

      const closeMatches = prospects.filter(p => {
        const similarity = this.calculateStringSimilarity(
          p.company_name.toLowerCase(), 
          application.company_name.toLowerCase()
        );
        return similarity > 0.8;
      });

      const candidateProspects = exactMatches.length > 0 ? exactMatches : closeMatches;

      if (candidateProspects.length === 0) {
        return null;
      }

      // Find prospects with delivered journeys
      const prospectsWithDelivery = candidateProspects.filter(p => 
        p.conversion_journeys?.some((j: any) => j.delivered_at)
      );

      if (prospectsWithDelivery.length === 0) {
        return null;
      }

      // Take the most recent prospect with delivery
      const bestProspect = prospectsWithDelivery[0];
      const recentJourney = bestProspect.conversion_journeys
        ?.filter((j: any) => j.delivered_at)
        .sort((a: any, b: any) => new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime())[0];

      const confidence = exactMatches.length > 0 ? 0.85 : 0.75;

      return {
        confidence,
        method: 'company_match',
        journey_id: recentJourney.id,
        prospect_id: bestProspect.id,
        evidence: [
          `Company name match: "${application.company_name}" ≈ "${bestProspect.company_name}"`,
          `Contact: ${bestProspect.contact_name}`,
          `Email: ${bestProspect.email}`,
          `Match type: ${exactMatches.length > 0 ? 'exact' : 'similar'}`
        ]
      };

    } catch (error) {
      console.error('[RetailerAttribution] Error in company attribution:', error);
      return null;
    }
  }

  /**
   * Find attribution through timing correlation
   */
  private async findTimingAttribution(application: RetailerApplication): Promise<AttributionMatch | null> {
    try {
      const applicationDate = new Date(application.application_date);
      const lookbackStart = new Date(applicationDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back
      const lookbackEnd = new Date(applicationDate.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day back

      // Find journeys delivered in the lookback period in the same area
      const { data: journeys, error } = await this.supabase
        .from('conversion_journeys')
        .select(`
          id,
          delivered_at,
          prospects (
            id,
            company_name,
            contact_name,
            city,
            postal_code,
            country
          )
        `)
        .gte('delivered_at', lookbackStart.toISOString())
        .lte('delivered_at', lookbackEnd.toISOString())
        .eq('status', 'delivered');

      if (error) {
        throw new Error(`Failed to find timing matches: ${error.message}`);
      }

      if (!journeys || journeys.length === 0) {
        return null;
      }

      // Filter by geographic proximity
      const nearbyJourneys = journeys.filter(journey => {
        const prospect = journey.prospects;
        return (
          prospect.country === application.country &&
          (prospect.city === application.city || 
           this.calculatePostalCodeProximity(prospect.postal_code, application.postal_code) < 10)
        );
      });

      if (nearbyJourneys.length === 0) {
        return null;
      }

      // Find the most recent nearby journey
      const recentJourney = nearbyJourneys.sort(
        (a, b) => new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime()
      )[0];

      const daysBetween = Math.floor(
        (applicationDate.getTime() - new Date(recentJourney.delivered_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Lower confidence for timing-based attribution
      const confidence = Math.max(0.3, 0.6 - (daysBetween / 30) * 0.3);

      return {
        confidence,
        method: 'timing_correlation',
        journey_id: recentJourney.id,
        prospect_id: recentJourney.prospects.id,
        evidence: [
          `Delivered in same area: ${recentJourney.prospects.city}`,
          `Days between delivery and application: ${daysBetween}`,
          `Prospect company: ${recentJourney.prospects.company_name}`,
          `Geographic proximity correlation`
        ],
        metadata: {
          days_between: daysBetween,
          geographic_match: true
        }
      };

    } catch (error) {
      console.error('[RetailerAttribution] Error in timing attribution:', error);
      return null;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Record attribution in database
   */
  private async recordAttribution(
    application: RetailerApplication, 
    match: AttributionMatch
  ): Promise<void> {
    try {
      const attributionData = {
        retailer_application_id: application.id,
        journey_id: match.journey_id,
        attribution_method: match.method,
        attribution_confidence: match.confidence,
        attribution_notes: match.evidence.join('; '),
        time_since_delivery_hours: match.metadata?.days_between 
          ? match.metadata.days_between * 24 
          : null
      };

      await this.supabase
        .from('retailer_applications_attribution')
        .insert([attributionData]);

      console.log(`[RetailerAttribution] Attribution recorded: ${match.method} (${match.confidence})`);

    } catch (error) {
      console.error('[RetailerAttribution] Error recording attribution:', error);
    }
  }

  /**
   * Update conversion journey with application data
   */
  private async updateConversionJourney(
    journeyId: string, 
    application: RetailerApplication
  ): Promise<void> {
    try {
      const updates = {
        status: 'application_submitted',
        application_submitted_at: application.application_date,
        updated_at: new Date().toISOString()
      };

      await this.supabase
        .from('conversion_journeys')
        .update(updates)
        .eq('id', journeyId);

      // Record touchpoint
      await this.supabase
        .from('conversion_touchpoints')
        .insert([{
          journey_id: journeyId,
          touchpoint_type: 'application_submitted',
          channel: 'website',
          subject: 'Retailer application submitted',
          content: `Application for ${application.company_name}`,
          automated: false,
          conversion_contribution: 0.95
        }]);

      console.log(`[RetailerAttribution] Journey ${journeyId} updated for application`);

    } catch (error) {
      console.error('[RetailerAttribution] Error updating journey:', error);
    }
  }

  /**
   * Extract journey ID from UTM parameters
   */
  private extractJourneyIdFromUTM(application: RetailerApplication): string | null {
    const utmContent = application.utm_campaign || application.utm_source || '';
    const journeyMatch = utmContent.match(/journey[_-]([a-f0-9-]{36})/i);
    return journeyMatch ? journeyMatch[1] : null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * Calculate postal code proximity (simplified for Dutch postal codes)
   */
  private calculatePostalCodeProximity(postal1?: string, postal2?: string): number {
    if (!postal1 || !postal2) return 100;

    // Extract numeric part of Dutch postal codes
    const num1 = parseInt(postal1.substring(0, 4));
    const num2 = parseInt(postal2.substring(0, 4));

    if (isNaN(num1) || isNaN(num2)) return 100;

    return Math.abs(num1 - num2);
  }

  // =====================================================
  // ANALYTICS & REPORTING
  // =====================================================

  /**
   * Get attribution statistics
   */
  async getAttributionStats(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      const { data: attributions, error } = await this.supabase
        .from('retailer_applications_attribution')
        .select(`
          *,
          conversion_journeys (
            status,
            total_cost,
            actual_ltv
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        throw new Error(`Failed to get attribution stats: ${error.message}`);
      }

      const totalAttributions = attributions?.length || 0;
      const methodBreakdown = attributions?.reduce((acc: any, attr: any) => {
        acc[attr.attribution_method] = (acc[attr.attribution_method] || 0) + 1;
        return acc;
      }, {}) || {};

      const avgConfidence = attributions?.length 
        ? attributions.reduce((sum: number, attr: any) => sum + attr.attribution_confidence, 0) / attributions.length 
        : 0;

      const totalValue = attributions?.reduce((sum: number, attr: any) => 
        sum + (attr.conversion_journeys?.actual_ltv || 0), 0) || 0;

      return {
        total_attributions: totalAttributions,
        method_breakdown: methodBreakdown,
        average_confidence: avgConfidence,
        total_attributed_value: totalValue,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      };

    } catch (error) {
      console.error('[RetailerAttribution] Error getting attribution stats:', error);
      throw error;
    }
  }
} 