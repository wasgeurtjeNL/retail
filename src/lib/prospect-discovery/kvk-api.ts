// =====================================================
// KVK API - Dutch Chamber of Commerce Integration
// Official business registry data for Netherlands
// =====================================================

import { DiscoveredProspect } from './web-scraper';

export interface KvKConfig {
  apiKey: string;
  baseUrl: string;
  testMode: boolean;
}

export interface KvKSearchRequest {
  kvkNumber?: string;
  branchNumber?: string;
  name?: string;
  city?: string;
  postalCode?: string;
  street?: string;
  houseNumber?: string;
  type?: 'hoofdvestiging' | 'nevenvestiging';
  active?: boolean;
  registrationDateStart?: string;
  registrationDateEnd?: string;
  startPage?: number;
  resultSize?: number;
}

export interface KvKBusinessData {
  kvkNumber: string;
  branchNumber?: string;
  businessName: string;
  legalBusinessName?: string;
  currentStatutoryName?: string;
  currentTradeNames?: string[];
  hasEntryInBusinessRegister: boolean;
  hasCommercialActivities: boolean;
  hasNonCommercialActivities: boolean;
  isLegalPerson: boolean;
  isBranch: boolean;
  isMainBranch: boolean;
  
  // Address information
  addresses: Array<{
    type: string;
    street: string;
    houseNumber: string;
    houseNumberAddition?: string;
    postalCode: string;
    city: string;
    country: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
  }>;
  
  // Business activities
  businessActivities: Array<{
    sbiCode: string;
    sbiCodeDescription: string;
    isMainSbi: boolean;
  }>;
  
  // Company details
  companyProfile?: {
    employees?: number;
    establishmentDate?: string;
    registrationDate?: string;
    deregistrationDate?: string;
    website?: string;
    phoneNumber?: string;
    emailAddress?: string;
  };
  
  // Financial data (if available)
  financialData?: {
    currency?: string;
    turnover?: number;
    balanceSheetTotal?: number;
    employees?: number;
  };
}

export interface KvKEnrichmentResult {
  success: boolean;
  data?: KvKBusinessData;
  error?: string;
  source: 'kvk_api';
  confidence: number;
  enrichmentFields: string[];
}

export class KvKAPI {
  private config: KvKConfig;
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  constructor(config: KvKConfig) {
    this.config = config;
    console.log('[KvK] Initialized KvK API client');
  }

  /**
   * Search businesses in KvK database
   */
  async searchBusinesses(
    request: KvKSearchRequest
  ): Promise<{ businesses: KvKBusinessData[]; totalResults: number }> {
    try {
      console.log('[KvK] Searching businesses:', request);

      await this.enforceRateLimit();

      const queryParams = this.buildSearchParams(request);
      const url = `${this.config.baseUrl}/search/companies?${queryParams}`;

      const response = await fetch(url, {
        headers: {
          'apikey': this.config.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`KvK API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      const businesses = data.results?.map((item: any) => this.parseKvKData(item)) || [];
      
      console.log(`[KvK] Found ${businesses.length} businesses`);

      return {
        businesses,
        totalResults: data.totalItems || businesses.length
      };

    } catch (error) {
      console.error('[KvK] Search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed business information by KvK number
   */
  async getBusinessDetails(kvkNumber: string): Promise<KvKBusinessData | null> {
    try {
      console.log(`[KvK] Getting business details for KvK: ${kvkNumber}`);

      await this.enforceRateLimit();

      const url = `${this.config.baseUrl}/companies/${kvkNumber}`;

      const response = await fetch(url, {
        headers: {
          'apikey': this.config.apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[KvK] Business not found: ${kvkNumber}`);
          return null;
        }
        throw new Error(`KvK API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseKvKData(data);

    } catch (error) {
      console.error(`[KvK] Error getting details for ${kvkNumber}:`, error);
      throw error;
    }
  }

  /**
   * Enrich prospect data with KvK information
   */
  async enrichProspect(prospect: DiscoveredProspect): Promise<KvKEnrichmentResult> {
    try {
      console.log(`[KvK] Enriching prospect: ${prospect.business_name}`);

      let kvkData: KvKBusinessData | null = null;
      const enrichmentFields: string[] = [];

      // Try different search strategies
      if (prospect.raw_data?.kvk_number) {
        // Direct KvK number lookup
        kvkData = await this.getBusinessDetails(prospect.raw_data.kvk_number);
        if (kvkData) enrichmentFields.push('kvk_direct_lookup');
      }

      if (!kvkData && prospect.business_name) {
        // Search by business name and location
        const searchRequest: KvKSearchRequest = {
          name: prospect.business_name,
          city: prospect.city,
          postalCode: prospect.postal_code,
          active: true,
          resultSize: 5
        };

        const searchResult = await this.searchBusinesses(searchRequest);
        
        if (searchResult.businesses.length > 0) {
          // Find best match
          kvkData = this.findBestMatch(prospect, searchResult.businesses);
          if (kvkData) enrichmentFields.push('kvk_name_search');
        }
      }

      if (!kvkData) {
        return {
          success: false,
          error: 'No KvK data found for prospect',
          source: 'kvk_api',
          confidence: 0,
          enrichmentFields: []
        };
      }

      // Calculate confidence score
      const confidence = this.calculateMatchConfidence(prospect, kvkData);

      return {
        success: true,
        data: kvkData,
        source: 'kvk_api',
        confidence,
        enrichmentFields
      };

    } catch (error) {
      console.error('[KvK] Enrichment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        source: 'kvk_api',
        confidence: 0,
        enrichmentFields: []
      };
    }
  }

  /**
   * Apply KvK enrichment to prospect
   */
  applyEnrichment(prospect: DiscoveredProspect, kvkData: KvKBusinessData): DiscoveredProspect {
    const enriched = { ...prospect };

    // Update business information
    enriched.business_name = kvkData.businessName || enriched.business_name;
    
    // Add KvK specific data
    enriched.raw_data = {
      ...enriched.raw_data,
      kvk_number: kvkData.kvkNumber,
      branch_number: kvkData.branchNumber,
      legal_business_name: kvkData.legalBusinessName,
      trade_names: kvkData.currentTradeNames,
      is_main_branch: kvkData.isMainBranch,
      has_commercial_activities: kvkData.hasCommercialActivities,
      business_activities: kvkData.businessActivities,
      sbi_codes: kvkData.businessActivities?.map(activity => activity.sbiCode)
    };

    // Update address if available and more complete
    if (kvkData.addresses && kvkData.addresses.length > 0) {
      const mainAddress = kvkData.addresses.find(addr => addr.type === 'hoofdvestigingadres') 
                         || kvkData.addresses[0];
      
      if (mainAddress) {
        enriched.address = `${mainAddress.street} ${mainAddress.houseNumber}${mainAddress.houseNumberAddition || ''}, ${mainAddress.postalCode} ${mainAddress.city}`;
        enriched.city = mainAddress.city;
        enriched.postal_code = mainAddress.postalCode;
        
        if (mainAddress.gpsLatitude && mainAddress.gpsLongitude) {
          enriched.coordinates = {
            lat: mainAddress.gpsLatitude,
            lng: mainAddress.gpsLongitude
          };
        }
      }
    }

    // Update contact information if available
    if (kvkData.companyProfile) {
      if (kvkData.companyProfile.website && !enriched.website) {
        enriched.website = kvkData.companyProfile.website;
      }
      if (kvkData.companyProfile.phoneNumber && !enriched.phone) {
        enriched.phone = kvkData.companyProfile.phoneNumber;
      }
      if (kvkData.companyProfile.emailAddress && !enriched.email) {
        enriched.email = kvkData.companyProfile.emailAddress;
      }
    }

    // Add enrichment metadata
    enriched.raw_data.kvk_enriched = true;
    enriched.raw_data.kvk_enriched_at = new Date().toISOString();

    return enriched;
  }

  /**
   * Find best matching business from search results
   */
  private findBestMatch(prospect: DiscoveredProspect, businesses: KvKBusinessData[]): KvKBusinessData | null {
    if (businesses.length === 0) return null;
    if (businesses.length === 1) return businesses[0];

    // Score each business for match quality
    let bestMatch: KvKBusinessData | null = null;
    let bestScore = 0;

    for (const business of businesses) {
      let score = 0;

      // Name similarity
      const nameSimilarity = this.calculateNameSimilarity(
        prospect.business_name.toLowerCase(),
        business.businessName.toLowerCase()
      );
      score += nameSimilarity * 0.4;

      // Address similarity
      if (prospect.city && business.addresses.length > 0) {
        const cityMatch = business.addresses.some(addr => 
          addr.city.toLowerCase() === prospect.city?.toLowerCase()
        );
        if (cityMatch) score += 0.3;
      }

      if (prospect.postal_code && business.addresses.length > 0) {
        const postalMatch = business.addresses.some(addr => 
          addr.postalCode === prospect.postal_code
        );
        if (postalMatch) score += 0.2;
      }

      // Prefer main branches
      if (business.isMainBranch) {
        score += 0.1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = business;
      }
    }

    // Only return match if confidence is reasonable
    return bestScore > 0.5 ? bestMatch : null;
  }

  /**
   * Calculate name similarity using simple string comparison
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // Remove common business suffixes for better comparison
    const cleanName1 = this.cleanBusinessName(name1);
    const cleanName2 = this.cleanBusinessName(name2);

    // Exact match
    if (cleanName1 === cleanName2) return 1.0;

    // Contains match
    if (cleanName1.includes(cleanName2) || cleanName2.includes(cleanName1)) {
      return 0.8;
    }

    // Word overlap
    const words1 = cleanName1.split(/\s+/);
    const words2 = cleanName2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    
    if (commonWords.length > 0) {
      return (commonWords.length / Math.max(words1.length, words2.length)) * 0.6;
    }

    return 0;
  }

  /**
   * Clean business name for comparison
   */
  private cleanBusinessName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|ltd\.?|inc\.?|corp\.?|limited|bv|nv|vof)\b/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate match confidence between prospect and KvK data
   */
  private calculateMatchConfidence(prospect: DiscoveredProspect, kvkData: KvKBusinessData): number {
    let confidence = 0;

    // Name match
    const nameMatch = this.calculateNameSimilarity(
      prospect.business_name,
      kvkData.businessName
    );
    confidence += nameMatch * 0.4;

    // Address match
    if (prospect.city && kvkData.addresses.length > 0) {
      const cityMatch = kvkData.addresses.some(addr => 
        addr.city.toLowerCase() === prospect.city?.toLowerCase()
      );
      if (cityMatch) confidence += 0.3;
    }

    // Contact information match
    if (prospect.phone && kvkData.companyProfile?.phoneNumber) {
      const phoneMatch = prospect.phone === kvkData.companyProfile.phoneNumber;
      if (phoneMatch) confidence += 0.2;
    }

    if (prospect.website && kvkData.companyProfile?.website) {
      const websiteMatch = prospect.website === kvkData.companyProfile.website;
      if (websiteMatch) confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Parse KvK API response data
   */
  private parseKvKData(data: any): KvKBusinessData {
    return {
      kvkNumber: data.kvkNumber,
      branchNumber: data.branchNumber,
      businessName: data.businessName || data.name,
      legalBusinessName: data.legalBusinessName,
      currentStatutoryName: data.currentStatutoryName,
      currentTradeNames: data.currentTradeNames || [],
      hasEntryInBusinessRegister: data.hasEntryInBusinessRegister ?? true,
      hasCommercialActivities: data.hasCommercialActivities ?? true,
      hasNonCommercialActivities: data.hasNonCommercialActivities ?? false,
      isLegalPerson: data.isLegalPerson ?? false,
      isBranch: data.isBranch ?? false,
      isMainBranch: data.isMainBranch ?? true,
      
      addresses: (data.addresses || []).map((addr: any) => ({
        type: addr.type,
        street: addr.street,
        houseNumber: addr.houseNumber,
        houseNumberAddition: addr.houseNumberAddition,
        postalCode: addr.postalCode,
        city: addr.city,
        country: addr.country || 'Nederland',
        gpsLatitude: addr.gpsLatitude,
        gpsLongitude: addr.gpsLongitude
      })),
      
      businessActivities: (data.businessActivities || []).map((activity: any) => ({
        sbiCode: activity.sbiCode,
        sbiCodeDescription: activity.sbiCodeDescription,
        isMainSbi: activity.isMainSbi ?? false
      })),
      
      companyProfile: data.companyProfile ? {
        employees: data.companyProfile.employees,
        establishmentDate: data.companyProfile.establishmentDate,
        registrationDate: data.companyProfile.registrationDate,
        deregistrationDate: data.companyProfile.deregistrationDate,
        website: data.companyProfile.website,
        phoneNumber: data.companyProfile.phoneNumber,
        emailAddress: data.companyProfile.emailAddress
      } : undefined,
      
      financialData: data.financialData ? {
        currency: data.financialData.currency,
        turnover: data.financialData.turnover,
        balanceSheetTotal: data.financialData.balanceSheetTotal,
        employees: data.financialData.employees
      } : undefined
    };
  }

  /**
   * Build search parameters for KvK API
   */
  private buildSearchParams(request: KvKSearchRequest): string {
    const params = new URLSearchParams();

    if (request.kvkNumber) params.append('kvkNumber', request.kvkNumber);
    if (request.branchNumber) params.append('branchNumber', request.branchNumber);
    if (request.name) params.append('name', request.name);
    if (request.city) params.append('city', request.city);
    if (request.postalCode) params.append('postalCode', request.postalCode);
    if (request.street) params.append('street', request.street);
    if (request.houseNumber) params.append('houseNumber', request.houseNumber);
    if (request.type) params.append('type', request.type);
    if (request.active !== undefined) params.append('active', request.active.toString());
    if (request.registrationDateStart) params.append('registrationDateStart', request.registrationDateStart);
    if (request.registrationDateEnd) params.append('registrationDateEnd', request.registrationDateEnd);
    
    params.append('startPage', (request.startPage || 1).toString());
    params.append('resultSize', (request.resultSize || 10).toString());

    return params.toString();
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`[KvK] Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[KvK] Testing API connection...');

      // Test with a simple search
      const result = await this.searchBusinesses({
        name: 'Test',
        resultSize: 1
      });

      console.log('[KvK] API connection successful');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[KvK] API connection failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get SBI code description for business categorization
   */
  getSBICategory(sbiCode: string): string {
    // Common SBI codes for our target segments
    const sbiCategories: Record<string, string> = {
      '96021': 'beauty_salon',      // Haarverzorging
      '96022': 'beauty_salon',      // Schoonheidsverzorging, pedicures en manicures
      '96031': 'wellness_spa',      // Sauna's, solariums, baden e.d.
      '55101': 'hotel_bnb',         // Hotels met restaurant
      '55102': 'hotel_bnb',         // Hotels zonder restaurant
      '55201': 'hotel_bnb',         // Jeugdherbergen en vakantie-accommodatie
      '56101': 'restaurant',        // Restaurants
      '56102': 'restaurant',        // Cafetaria's, ijssalons, afhaalzaken e.d.
      '81221': 'cleaning_service',  // Interieurreiniging van gebouwen
      '96013': 'laundromat',        // Wasserettes en chemische wasserijen
      '47711': 'fashion_retail',    // Winkels in herenkleding
      '47712': 'fashion_retail',    // Winkels in dameskleding
      '47591': 'home_living',       // Winkels in meubels
      '47592': 'home_living',       // Winkels in woninginrichting
    };

    return sbiCategories[sbiCode] || 'other';
  }
} 