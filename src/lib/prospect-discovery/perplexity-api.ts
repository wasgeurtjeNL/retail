// =====================================================
// PERPLEXITY API CLIENT - AI-Powered Business Discovery
// Real-time web intelligence for prospect research
// =====================================================

import OpenAI from 'openai';
import { DiscoveredProspect } from './web-scraper';

export interface PerplexityConfig {
  apiKey: string;
  model: 'sonar' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-deep-research';
  temperature: number;
  maxTokens: number;
  baseURL: string;
}

export interface BusinessSearchOptions {
  limit?: number;
  includeReviews?: boolean;
  includeSocial?: boolean;
  includeHours?: boolean;
  minRating?: number;
  focusRecent?: boolean;
}

export interface PerplexitySearchResult {
  success: boolean;
  prospects: DiscoveredProspect[];
  metadata: {
    query: string;
    model: string;
    tokens_used: number;
    processing_time: number;
    sources_cited: number;
    confidence_score: number;
  };
  error?: string;
}

export class PerplexityAPI {
  private client: OpenAI;
  private config: PerplexityConfig;

  constructor(config: PerplexityConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.perplexity.ai"
    });

    console.log('[PerplexityAPI] Initialized with model:', config.model);
  }

  /**
   * Search for businesses using AI-powered web research
   */
  async searchBusinesses(
    segment: string,
    city: string,
    options: BusinessSearchOptions = {}
  ): Promise<DiscoveredProspect[]> {
    const startTime = Date.now();

    try {
      console.log(`[PerplexityAPI] ========== STARTING BUSINESS SEARCH ==========`);
      console.log(`[PerplexityAPI] Segment: ${segment}, City: ${city}`);
      console.log(`[PerplexityAPI] Options:`, JSON.stringify(options, null, 2));
      console.log(`[PerplexityAPI] Config check - API Key present:`, !!this.config.apiKey);
      console.log(`[PerplexityAPI] Config check - API Key length:`, this.config.apiKey?.length || 0);
      console.log(`[PerplexityAPI] Config check - Model:`, this.config.model);

      // Build intelligent search prompt
      const prompt = this.buildSearchPrompt(segment, city, options);
      console.log(`[PerplexityAPI] Generated prompt:`, prompt);
      
      // Execute AI search
      console.log(`[PerplexityAPI] Making API call with model: ${this.config.model}`);
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content: "You are a business research specialist. Provide accurate, current business information in structured JSON format. Always include real contact details and verify business authenticity."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      console.log(`[PerplexityAPI] API call completed. Response:`, JSON.stringify(response, null, 2));

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from Perplexity API');
      }

      console.log(`[PerplexityAPI] Response content:`, content);

      // Parse business data from AI response
      console.log(`[PerplexityAPI] About to parse business data from response...`);
      const prospects = await this.parseBusinessData(content, segment, city);
      
      console.log(`[PerplexityAPI] ========== PARSING RESULTS ==========`);
      console.log(`[PerplexityAPI] Found ${prospects.length} prospects in ${Date.now() - startTime}ms`);
      console.log(`[PerplexityAPI] Raw prospects:`, JSON.stringify(prospects, null, 2));
      console.log(`[PerplexityAPI] ========== END BUSINESS SEARCH ==========`);
      
      return prospects;

    } catch (error) {
      console.error('[PerplexityAPI] Search error:', error);
      console.error('[PerplexityAPI] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Enrich a single prospect with additional AI research
   */
  async enrichProspect(prospect: DiscoveredProspect): Promise<DiscoveredProspect> {
    try {
      console.log(`[PerplexityAPI] Enriching prospect: ${prospect.business_name}`);

      const enrichmentPrompt = this.buildEnrichmentPrompt(prospect);
      
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content: "You are a business intelligence analyst. Provide comprehensive, accurate business information with current market insights and contact verification."
          },
          {
            role: "user",
            content: enrichmentPrompt
          }
        ],
        temperature: 0.2, // Lower temperature for factual accuracy
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return prospect; // Return original if no enrichment
      }

      // Apply enrichment data
      const enrichedProspect = await this.applyEnrichmentData(prospect, content);
      
      console.log(`[PerplexityAPI] Enrichment completed for ${prospect.business_name}`);
      
      return enrichedProspect;

    } catch (error) {
      console.error(`[PerplexityAPI] Enrichment error for ${prospect.business_name}:`, error);
      return prospect; // Return original on error
    }
  }

  /**
   * Test API connection and functionality
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[PerplexityAPI] Testing connection...');
      console.log('[PerplexityAPI] API Key present:', !!this.config.apiKey);
      console.log('[PerplexityAPI] API Key length:', this.config.apiKey?.length || 0);
      console.log('[PerplexityAPI] Model:', this.config.model);
      console.log('[PerplexityAPI] Base URL:', this.config.baseURL);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: "Test query: Find one beauty salon in Amsterdam with contact info. Respond with just the business name."
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });

      console.log('[PerplexityAPI] Raw response:', JSON.stringify(response, null, 2));

      if (response.choices[0]?.message?.content) {
        console.log('[PerplexityAPI] Connection test successful');
        console.log('[PerplexityAPI] Response content:', response.choices[0].message.content);
        return { success: true };
      } else {
        throw new Error('No response content');
      }

    } catch (error) {
      console.error('[PerplexityAPI] Connection test failed:', error);
      console.error('[PerplexityAPI] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // Private helper methods

  private buildSearchPrompt(
    segment: string, 
    city: string, 
    options: BusinessSearchOptions
  ): string {
    const businessTypes = this.getBusinessTypes(segment);
    const limit = options.limit || 20;
    const recentFocus = options.focusRecent ? " Focus on recently opened or newly listed businesses." : "";
    const ratingFilter = options.minRating ? ` Include only businesses with ratings of ${options.minRating} stars or higher.` : "";

    return `
Find ${limit} current, actively operating ${businessTypes} businesses in ${city}, Netherlands.

Requirements:
- Provide REAL, verified business information only
- Include complete contact details (phone, email, website, address)
- Focus on businesses with good reputations and customer reviews
- Include postal codes and exact addresses
- Verify businesses are currently operating (not closed)${recentFocus}${ratingFilter}

For each business, provide this exact JSON structure:
{
  "business_name": "Exact business name",
  "address": "Full street address",
  "city": "${city}",
  "postal_code": "4-digit + 2-letter Dutch postal code",
  "phone": "Phone number with country code",
  "email": "Email address if available",
  "website": "Website URL if available",
  "business_segment": "${segment}",
  "description": "Brief business description",
  "rating": "Customer rating if available",
  "reviews_count": "Number of reviews if available",
  "specialties": ["List of services/specialties"],
  "coordinates": {"lat": latitude, "lng": longitude}
}

Return as a JSON array of businesses. Ensure all information is current and accurate.
    `.trim();
  }

  private buildEnrichmentPrompt(prospect: DiscoveredProspect): string {
    return `
Research and enrich information for this business:
Business: ${prospect.business_name}
Location: ${prospect.address}, ${prospect.city}
Current Info: ${JSON.stringify(prospect, null, 2)}

Provide additional insights:
1. Verify and update contact information
2. Check social media presence (Instagram, Facebook, LinkedIn)
3. Identify business owner/manager names if publicly available
4. Research recent customer reviews and reputation
5. Identify business services and specialties
6. Check operating hours and availability
7. Research competitor landscape and positioning
8. Identify potential partnership opportunities

Respond with enhanced business data in the same JSON structure, adding any new verified information.
    `.trim();
  }

  private getBusinessTypes(segment: string): string {
    const businessMap: Record<string, string> = {
      'beauty_salon': 'beauty salons, schoonheidssalons, cosmetic studios',
      'hair_salon': 'hair salons, kappers, hairdressers',
      'wellness_spa': 'wellness centers, spas, massage therapists',
      'hotel_bnb': 'hotels, bed & breakfasts, boutique accommodations',
      'restaurant': 'restaurants, cafes, eateries, dining establishments',
      'cleaning_service': 'cleaning services, schoonmaakdiensten, housekeeping',
      'laundromat': 'laundromats, wasserettes, dry cleaners',
      'fashion_retail': 'fashion stores, clothing boutiques, retail shops',
      'home_living': 'home & living stores, furniture shops, interior design'
    };

    return businessMap[segment] || segment.replace('_', ' ');
  }

  private async parseBusinessData(
    content: string, 
    segment: string, 
    city: string
  ): Promise<DiscoveredProspect[]> {
    try {
      console.log(`[PerplexityAPI] Raw content to parse:`, content);
      
      // Try multiple JSON extraction patterns
      let jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        // Try finding objects within code blocks
        jsonMatch = content.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        }
      }
      
      if (!jsonMatch) {
        // Try finding objects without array brackets
        const objectMatches = content.match(/\{[\s\S]*?\}/g);
        if (objectMatches && objectMatches.length > 0) {
          jsonMatch = [`[${objectMatches.join(',')}]`];
        }
      }
      
      if (!jsonMatch) {
        console.log(`[PerplexityAPI] No JSON found, falling back to text extraction`);
        return this.extractBusinessFromText(content, segment, city);
      }

      console.log(`[PerplexityAPI] Extracted JSON:`, jsonMatch[0]);
      const businessData = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(businessData)) {
        throw new Error('Response is not an array');
      }

      const prospects: DiscoveredProspect[] = [];

      for (const business of businessData) {
        try {
          const prospect: DiscoveredProspect = {
            business_name: business.business_name || 'Unknown Business',
            address: business.address || '',
            city: business.city || city,
            postal_code: business.postal_code || '',
            phone: business.phone || '',
            email: business.email || '',
            website: business.website || '',
            business_segment: segment,
            discovery_source: 'perplexity_api',
                         coordinates: business.coordinates || undefined,
            raw_data: {
              rating: business.rating,
              reviews_count: business.reviews_count,
              specialties: business.specialties,
              description: business.description,
              perplexity_enriched: true,
              discovery_timestamp: new Date().toISOString()
            }
          };

          // Validate required fields
          if (prospect.business_name && prospect.business_name !== 'Unknown Business') {
            prospects.push(prospect);
          }

        } catch (error) {
          console.error('[PerplexityAPI] Error parsing business entry:', error);
          continue;
        }
      }

      return prospects;

    } catch (error) {
      console.error('[PerplexityAPI] Error parsing business data:', error);
      // Fallback to text extraction
      return this.extractBusinessFromText(content, segment, city);
    }
  }

  private async extractBusinessFromText(
    content: string, 
    segment: string, 
    city: string
  ): Promise<DiscoveredProspect[]> {
    // Extract business names from text response as fallback
    const lines = content.split('\n').filter(line => line.trim());
    const prospects: DiscoveredProspect[] = [];

    for (const line of lines) {
      // Look for business-like patterns
      if (line.match(/^\d+\./) || line.includes('salon') || line.includes('spa') || line.includes('hotel')) {
        const businessName = line.replace(/^\d+\.\s*/, '').replace(/[*-]/g, '').trim();
        
        if (businessName && businessName.length > 3) {
          prospects.push({
            business_name: businessName,
            address: '',
            city: city,
            postal_code: '',
            phone: '',
            email: '',
            website: '',
            business_segment: segment,
            discovery_source: 'perplexity_api',
                         coordinates: undefined,
            raw_data: {
              text_extracted: true,
              original_line: line,
              discovery_timestamp: new Date().toISOString()
            }
          });
        }
      }
    }

    return prospects.slice(0, 10); // Limit fallback results
  }

  private async applyEnrichmentData(
    prospect: DiscoveredProspect, 
    enrichmentContent: string
  ): Promise<DiscoveredProspect> {
    try {
      // Try to parse JSON enrichment data
      const jsonMatch = enrichmentContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enrichmentData = JSON.parse(jsonMatch[0]);
        
        // Merge enrichment data
        return {
          ...prospect,
          phone: enrichmentData.phone || prospect.phone,
          email: enrichmentData.email || prospect.email,
          website: enrichmentData.website || prospect.website,
          address: enrichmentData.address || prospect.address,
          postal_code: enrichmentData.postal_code || prospect.postal_code,
          raw_data: {
            ...prospect.raw_data,
            ...enrichmentData,
            enriched_by_perplexity: true,
            enrichment_timestamp: new Date().toISOString()
          }
        };
      }

      // If no JSON, add enrichment as text metadata
      return {
        ...prospect,
        raw_data: {
          ...prospect.raw_data,
          perplexity_enrichment: enrichmentContent,
          enrichment_timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[PerplexityAPI] Error applying enrichment:', error);
      return prospect;
    }
  }
} 