// =====================================================
// LEAD ENRICHMENT SERVICE - Multi-Source Data Fusion
// Combines web scraping, Google Places, and KvK data
// =====================================================

import { ProspectWebScraper, DiscoveredProspect, ScrapingResult } from './web-scraper';
import { GooglePlacesAPI, GooglePlacesConfig } from './google-places-api';
import { KvKAPI, KvKConfig, KvKEnrichmentResult } from './kvk-api';
import { PerplexityAPI, PerplexityConfig } from './perplexity-api';
import { getServiceRoleClient } from '@/lib/supabase';

export interface EnrichmentConfig {
  googlePlaces: GooglePlacesConfig;
  kvk: KvKConfig;
  perplexity: PerplexityConfig;
  enabledSources: {
    webScraping: boolean;
    googlePlaces: boolean;
    kvkApi: boolean;
    perplexity: boolean;
  };
  qualityFilters: {
    minConfidenceScore: number;
    requireEmail: boolean;
    requireWebsite: boolean;
    requirePhone: boolean;
    minRating: number;
  };
}

export interface EnrichedProspect extends DiscoveredProspect {
  enrichment_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  data_sources: string[];
  contact_completeness: number;
  business_quality_score: number;
  kvk_verified: boolean;
  google_verified: boolean;
  enrichment_metadata: {
    enriched_at: string;
    processing_time: number;
    sources_used: string[];
    errors: string[];
    confidence_factors: Record<string, number>;
  };
}

export interface EnrichmentResult {
  success: boolean;
  prospect?: EnrichedProspect;
  errors: string[];
  metadata: {
    sources_attempted: string[];
    sources_successful: string[];
    processing_time: number;
    quality_score: number;
  };
}

export interface BulkEnrichmentResult {
  total_processed: number;
  successful: number;
  failed: number;
  prospects: EnrichedProspect[];
  errors: Array<{ prospect: string; error: string }>;
  processing_time: number;
}

export class LeadEnrichmentService {
  private webScraper: ProspectWebScraper;
  private googlePlaces: GooglePlacesAPI;
  private kvkApi: KvKAPI;
  private perplexityApi: PerplexityAPI;
  private config: EnrichmentConfig;
  private supabase = getServiceRoleClient();

  constructor(config: EnrichmentConfig) {
    this.config = config;
    this.webScraper = new ProspectWebScraper();
    this.googlePlaces = new GooglePlacesAPI(config.googlePlaces);
    this.kvkApi = new KvKAPI(config.kvk);
    this.perplexityApi = new PerplexityAPI(config.perplexity);
    
    console.log('[LeadEnrichment] Service initialized with sources:', 
      Object.entries(config.enabledSources)
        .filter(([_, enabled]) => enabled)
        .map(([source]) => source)
    );
  }

  /**
   * Discover and enrich prospects for a specific segment and region
   */
  async discoverProspects(
    segment: string,
    region: string,
    options: {
      limit?: number;
      sources?: ('web_scraping' | 'google_places' | 'perplexity')[];
    } = {}
  ): Promise<EnrichedProspect[]> {
    const startTime = Date.now();
    const allProspects: DiscoveredProspect[] = [];
    const sources = options.sources || ['perplexity', 'web_scraping'];

    console.log(`[LeadEnrichment] Discovering prospects: ${segment} in ${region}`);
    console.log(`[LeadEnrichment] Sources requested: ${sources.join(', ')}`);
    console.log(`[LeadEnrichment] Enabled sources:`, this.config.enabledSources);

    try {
      // Perplexity AI discovery (PRIORITEIT!)
      if (sources.includes('perplexity') && this.config.enabledSources.perplexity) {
        try {
          console.log('[LeadEnrichment] Starting Perplexity AI discovery...');
          const perplexityProspects = await this.perplexityApi.searchBusinesses(
            segment, region, { 
              limit: options.limit || 20,
              minRating: this.config.qualityFilters.minRating,
              includeReviews: true,
              focusRecent: true
            }
          );
          
          allProspects.push(...perplexityProspects);
          console.log(`[LeadEnrichment] Perplexity AI found ${perplexityProspects.length} prospects`);
        } catch (error) {
          console.error('[LeadEnrichment] Perplexity AI error:', error);
        }
      }

      // Google Places API discovery (fallback)
      if (sources.includes('google_places') && this.config.enabledSources.googlePlaces) {
        try {
          console.log('[LeadEnrichment] Starting Google Places discovery...');
          const placesProspects = await this.googlePlaces.searchBusinesses(
            segment, region, { 
              limit: options.limit || 20,
              minRating: this.config.qualityFilters.minRating 
            }
          );
          
          allProspects.push(...placesProspects);
          console.log(`[LeadEnrichment] Google Places found ${placesProspects.length} prospects`);
        } catch (error) {
          console.error('[LeadEnrichment] Google Places error:', error);
        }
      }

      // Web scraping ALLEEN als fallback en geen echte data beschikbaar
      if (sources.includes('web_scraping') && allProspects.length === 0 && this.config.enabledSources.webScraping) {
        console.log('[LeadEnrichment] Using web scraping as fallback (no API results)');
        try {
          const scrapingResults = await this.webScraper.discoverProspects(
            'google_maps', segment, region, { limit: options.limit || 10 }
          );
          
          allProspects.push(...scrapingResults.prospects);
          console.log(`[LeadEnrichment] Web scraping found ${scrapingResults.prospects.length} prospects`);
        } catch (error) {
          console.error('[LeadEnrichment] Web scraping error:', error);
        }
      }

      // Deduplicate prospects
      const uniqueProspects = await this.deduplicateProspects(allProspects);
      console.log(`[LeadEnrichment] After deduplication: ${uniqueProspects.length} unique prospects`);

      // Enrich each prospect
      const enrichedProspects: EnrichedProspect[] = [];
      
      for (const prospect of uniqueProspects) {
        try {
          const enrichmentResult = await this.enrichProspect(prospect);
          if (enrichmentResult.success && enrichmentResult.prospect) {
            // Apply quality filters
            if (this.meetsQualityFilters(enrichmentResult.prospect)) {
              enrichedProspects.push(enrichmentResult.prospect);
            }
          }
        } catch (error) {
          console.error(`[LeadEnrichment] Error enriching prospect ${prospect.business_name}:`, error);
        }
      }

      console.log(`[LeadEnrichment] Discovery completed: ${enrichedProspects.length} qualified prospects in ${Date.now() - startTime}ms`);
      
      // Sort by enrichment score
      return enrichedProspects.sort((a, b) => b.enrichment_score - a.enrichment_score);

    } catch (error) {
      console.error('[LeadEnrichment] Discovery error:', error);
      return [];
    }
  }

  /**
   * Enrich a single prospect with all available data sources
   */
  async enrichProspect(prospect: DiscoveredProspect): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const sourcesAttempted: string[] = [];
    const sourcesSuccessful: string[] = [];
    const errors: string[] = [];

    console.log(`[LeadEnrichment] Enriching prospect: ${prospect.business_name}`);

    try {
      let enrichedProspect: EnrichedProspect = {
        ...prospect,
        enrichment_score: 0,
        confidence_level: 'low',
        data_sources: [prospect.discovery_source],
        contact_completeness: 0,
        business_quality_score: 0,
        kvk_verified: false,
        google_verified: false,
        enrichment_metadata: {
          enriched_at: new Date().toISOString(),
          processing_time: 0,
          sources_used: [],
          errors: [],
          confidence_factors: {}
        }
      };

      // KvK API Enrichment
      if (this.config.enabledSources.kvkApi) {
        sourcesAttempted.push('kvk_api');
        try {
          console.log(`[LeadEnrichment] KvK enrichment for: ${prospect.business_name}`);
          const kvkResult = await this.kvkApi.enrichProspect(prospect);
          
                     if (kvkResult.success && kvkResult.data) {
             const kvkEnriched = this.kvkApi.applyEnrichment(enrichedProspect, kvkResult.data);
             // Merge KvK enriched data back into enriched prospect
             enrichedProspect = { ...enrichedProspect, ...kvkEnriched };
             enrichedProspect.kvk_verified = true;
             enrichedProspect.data_sources.push('kvk_api');
             enrichedProspect.enrichment_metadata.confidence_factors.kvk_match = kvkResult.confidence;
             sourcesSuccessful.push('kvk_api');
            
            console.log(`[LeadEnrichment] KvK enrichment successful (confidence: ${kvkResult.confidence})`);
          }
        } catch (error) {
          console.error('[LeadEnrichment] KvK enrichment error:', error);
          errors.push(`KvK API: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Google Places verification (if not already from Google Places)
      if (this.config.enabledSources.googlePlaces && prospect.discovery_source !== 'google_places_api') {
        sourcesAttempted.push('google_places_verification');
        try {
          console.log(`[LeadEnrichment] Google Places verification for: ${prospect.business_name}`);
          const placesProspects = await this.googlePlaces.searchBusinesses(
            prospect.business_segment, 
            prospect.city || '', 
            { limit: 3 }
          );
          
          // Find matching business
          const match = placesProspects.find(p => 
            this.calculateBusinessSimilarity(prospect, p) > 0.8
          );
          
          if (match) {
            enrichedProspect.google_verified = true;
            enrichedProspect.data_sources.push('google_places_verification');
            enrichedProspect.enrichment_metadata.confidence_factors.google_match = 0.8;
            sourcesSuccessful.push('google_places_verification');
            
                         // Merge Google Places data
             if (!enrichedProspect.raw_data) {
               enrichedProspect.raw_data = {};
             }
             if (match.raw_data?.rating) {
               enrichedProspect.raw_data.google_rating = match.raw_data.rating;
             }
             if (match.raw_data?.user_ratings_total) {
               enrichedProspect.raw_data.google_reviews = match.raw_data.user_ratings_total;
             }
          }
        } catch (error) {
          console.error('[LeadEnrichment] Google Places verification error:', error);
          errors.push(`Google Places: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Calculate enrichment scores
      enrichedProspect.contact_completeness = this.calculateContactCompleteness(enrichedProspect);
      enrichedProspect.business_quality_score = this.calculateBusinessQualityScore(enrichedProspect);
      enrichedProspect.enrichment_score = this.calculateEnrichmentScore(enrichedProspect);
      enrichedProspect.confidence_level = this.determineConfidenceLevel(enrichedProspect.enrichment_score);

      // Update metadata
      enrichedProspect.enrichment_metadata.processing_time = Date.now() - startTime;
      enrichedProspect.enrichment_metadata.sources_used = sourcesSuccessful;
      enrichedProspect.enrichment_metadata.errors = errors;

      console.log(`[LeadEnrichment] Enrichment completed for ${prospect.business_name} (score: ${enrichedProspect.enrichment_score})`);

      return {
        success: true,
        prospect: enrichedProspect,
        errors,
        metadata: {
          sources_attempted: sourcesAttempted,
          sources_successful: sourcesSuccessful,
          processing_time: Date.now() - startTime,
          quality_score: enrichedProspect.enrichment_score
        }
      };

    } catch (error) {
      console.error(`[LeadEnrichment] Enrichment failed for ${prospect.business_name}:`, error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metadata: {
          sources_attempted: sourcesAttempted,
          sources_successful: sourcesSuccessful,
          processing_time: Date.now() - startTime,
          quality_score: 0
        }
      };
    }
  }

  /**
   * Bulk enrich multiple prospects
   */
  async bulkEnrichProspects(prospects: DiscoveredProspect[]): Promise<BulkEnrichmentResult> {
    const startTime = Date.now();
    const result: BulkEnrichmentResult = {
      total_processed: prospects.length,
      successful: 0,
      failed: 0,
      prospects: [],
      errors: [],
      processing_time: 0
    };

    console.log(`[LeadEnrichment] Starting bulk enrichment of ${prospects.length} prospects`);

    for (const prospect of prospects) {
      try {
        const enrichmentResult = await this.enrichProspect(prospect);
        
        if (enrichmentResult.success && enrichmentResult.prospect) {
          result.prospects.push(enrichmentResult.prospect);
          result.successful++;
        } else {
          result.failed++;
          result.errors.push({
            prospect: prospect.business_name,
            error: enrichmentResult.errors.join('; ')
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          prospect: prospect.business_name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    result.processing_time = Date.now() - startTime;
    
    console.log(`[LeadEnrichment] Bulk enrichment completed: ${result.successful}/${result.total_processed} successful`);
    
    return result;
  }

  /**
   * Save enriched prospects to database
   */
  async saveProspects(prospects: EnrichedProspect[]): Promise<{ saved: number; errors: string[] }> {
    const errors: string[] = [];
    let saved = 0;

    console.log(`[LeadEnrichment] Saving ${prospects.length} prospects to database`);

    for (const prospect of prospects) {
      try {
        console.log(`[LeadEnrichment] Processing prospect: ${prospect.business_name}`);
        
        // Format data for database
        const dbData = this.formatProspectForDb(prospect);
        console.log(`[LeadEnrichment] Formatted data for ${prospect.business_name}:`, JSON.stringify(dbData, null, 2));

        // Check if prospect already exists
        const existing = await this.supabase
          .from('commercial_prospects')
          .select('id')
          .eq('business_name', prospect.business_name)
          .eq('city', prospect.city)
          .single();

        console.log(`[LeadEnrichment] Existing check for ${prospect.business_name}:`, existing.data ? 'Found existing' : 'New prospect');

        if (existing.data) {
          // Update existing prospect
          console.log(`[LeadEnrichment] Updating existing prospect: ${prospect.business_name}`);
          const { data, error } = await this.supabase
            .from('commercial_prospects')
            .update({
              ...dbData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.data.id)
            .select();

          if (error) {
            console.error(`[LeadEnrichment] Update error for ${prospect.business_name}:`, error);
            throw error;
          }
          console.log(`[LeadEnrichment] Successfully updated prospect: ${prospect.business_name}`);
        } else {
          // Insert new prospect
          console.log(`[LeadEnrichment] Inserting new prospect: ${prospect.business_name}`);
          const { data, error } = await this.supabase
            .from('commercial_prospects')
            .insert(dbData)
            .select();

          if (error) {
            console.error(`[LeadEnrichment] Insert error for ${prospect.business_name}:`, error);
            throw error;
          }
          console.log(`[LeadEnrichment] Successfully inserted prospect: ${prospect.business_name}`, data);
        }

        saved++;
        console.log(`[LeadEnrichment] Successfully saved prospect: ${prospect.business_name} (${saved}/${prospects.length})`);
      } catch (error) {
        console.error(`[LeadEnrichment] Error saving prospect ${prospect.business_name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 
                             (typeof error === 'object' && error !== null) ? JSON.stringify(error) : 
                             String(error);
        errors.push(`${prospect.business_name}: ${errorMessage}`);
      }
    }

    console.log(`[LeadEnrichment] Saved ${saved}/${prospects.length} prospects to database`);
    
    return { saved, errors };
  }

  // Helper methods
  private calculateContactCompleteness(prospect: EnrichedProspect): number {
    let score = 0;
    const maxScore = 4;

    if (prospect.email) score += 1;
    if (prospect.phone) score += 1;
    if (prospect.website) score += 1;
    if (prospect.address) score += 1;

    return score / maxScore;
  }

  private calculateBusinessQualityScore(prospect: EnrichedProspect): number {
    let score = 0.5; // Base score

    // KvK verification bonus
    if (prospect.kvk_verified) score += 0.2;

    // Google verification bonus
    if (prospect.google_verified) score += 0.1;

    // Contact completeness
    score += prospect.contact_completeness * 0.15;

    // Google rating bonus
    if (prospect.raw_data?.google_rating) {
      score += (prospect.raw_data.google_rating / 5) * 0.05;
    }

    return Math.min(1, score);
  }

  private calculateEnrichmentScore(prospect: EnrichedProspect): number {
    let score = 0;

    // Base score from contact completeness
    score += prospect.contact_completeness * 0.3;

    // Business quality score
    score += prospect.business_quality_score * 0.4;

    // Data source diversity bonus
    const uniqueSources = new Set(prospect.data_sources).size;
    score += (uniqueSources / 3) * 0.2; // Max 3 sources

    // Verification bonuses
    if (prospect.kvk_verified) score += 0.05;
    if (prospect.google_verified) score += 0.05;

    return Math.min(1, score);
  }

  private determineConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private meetsQualityFilters(prospect: EnrichedProspect): boolean {
    const filters = this.config.qualityFilters;

    if (prospect.enrichment_score < filters.minConfidenceScore) return false;
    if (filters.requireEmail && !prospect.email) return false;
    if (filters.requireWebsite && !prospect.website) return false;
    if (filters.requirePhone && !prospect.phone) return false;

    return true;
  }

  private calculateBusinessSimilarity(prospect1: DiscoveredProspect, prospect2: DiscoveredProspect): number {
    let similarity = 0;

    // Name similarity
    const name1 = prospect1.business_name.toLowerCase();
    const name2 = prospect2.business_name.toLowerCase();
    
    if (name1 === name2) {
      similarity += 0.4;
    } else if (name1.includes(name2) || name2.includes(name1)) {
      similarity += 0.3;
    }

    // Location similarity
    if (prospect1.city?.toLowerCase() === prospect2.city?.toLowerCase()) {
      similarity += 0.3;
    }

    if (prospect1.postal_code === prospect2.postal_code) {
      similarity += 0.2;
    }

    // Contact similarity
    if (prospect1.phone === prospect2.phone && prospect1.phone) {
      similarity += 0.1;
    }

    return similarity;
  }

  private async deduplicateProspects(prospects: DiscoveredProspect[]): Promise<DiscoveredProspect[]> {
    const unique: DiscoveredProspect[] = [];
    const seen = new Set<string>();

    for (const prospect of prospects) {
      const fingerprint = this.createProspectFingerprint(prospect);
      
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        unique.push(prospect);
      }
    }

    return unique;
  }

  private createProspectFingerprint(prospect: DiscoveredProspect): string {
    const name = prospect.business_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const city = prospect.city?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const phone = prospect.phone?.replace(/[^\d]/g, '') || '';
    
    return `${name}_${city}_${phone}`;
  }

  private formatProspectForDb(prospect: EnrichedProspect): any {
    // Map only fields that exist in the commercial_prospects table
    return {
      business_name: prospect.business_name,
      email: prospect.email,
      phone: prospect.phone,
      website: prospect.website,
      address: prospect.address,
      city: prospect.city,
      postal_code: prospect.postal_code,
      business_segment: prospect.business_segment,
      discovery_source: prospect.discovery_source,
      enrichment_score: prospect.enrichment_score,
      business_quality_score: prospect.business_quality_score,
      coordinates: prospect.coordinates,
      raw_data: {
        ...prospect.raw_data,
        // Store the non-DB fields in raw_data
        confidence_level: prospect.confidence_level,
        contact_completeness: prospect.contact_completeness,
        kvk_verified: prospect.kvk_verified,
        google_verified: prospect.google_verified,
        data_sources: prospect.data_sources,
        enrichment_metadata: prospect.enrichment_metadata
      },
      // Use appropriate DB field mappings
      segment_confidence: prospect.enrichment_score, // Map enrichment_score to segment_confidence
      lead_quality_score: prospect.business_quality_score, // Map business_quality_score to lead_quality_score
      status: 'active',
      created_at: new Date().toISOString()
    };
  }

  /**
   * Test the enrichment service
   */
  async testEnrichment(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Test KvK API
      if (this.config.enabledSources.kvkApi) {
        const kvkTest = await this.kvkApi.testConnection();
        if (!kvkTest.success) {
          errors.push(`KvK API: ${kvkTest.error}`);
        }
      }

      // Test Google Places API
      if (this.config.enabledSources.googlePlaces) {
        const placesTest = await this.googlePlaces.testConnection();
        if (!placesTest.success) {
          errors.push(`Google Places: ${placesTest.error}`);
        }
      }

      // Test Perplexity API
      if (this.config.enabledSources.perplexity) {
        const perplexityTest = await this.perplexityApi.testConnection();
        if (!perplexityTest.success) {
          errors.push(`Perplexity API: ${perplexityTest.error}`);
        }
      }

      console.log('[LeadEnrichment] Service test completed');
      return { success: errors.length === 0, errors };

    } catch (error) {
      console.error('[LeadEnrichment] Service test failed:', error);
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
} 