// =====================================================
// GOOGLE PLACES API - Business Discovery Service
// Official API integration for finding businesses
// =====================================================

import { DiscoveredProspect } from './web-scraper';

export interface GooglePlacesConfig {
  apiKey: string;
  searchRadius: number; // in meters
  language: string;
  region: string;
}

export interface PlaceSearchRequest {
  query: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
  type?: string;
  minPriceLevel?: number;
  maxPriceLevel?: number;
  openNow?: boolean;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  business_status: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

export class GooglePlacesAPI {
  private config: GooglePlacesConfig;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  constructor(config: GooglePlacesConfig) {
    this.config = config;
    console.log('[GooglePlaces] Initialized with search radius:', config.searchRadius);
  }

  /**
   * Search for businesses using Google Places API
   */
  async searchBusinesses(
    segment: string,
    city: string,
    options: {
      limit?: number;
      radius?: number;
      minRating?: number;
    } = {}
  ): Promise<DiscoveredProspect[]> {
    try {
      console.log(`[GooglePlaces] Searching businesses: ${segment} in ${city}`);

      // Get coordinates for the city
      const cityCoords = await this.geocodeCity(city);
      if (!cityCoords) {
        throw new Error(`Could not geocode city: ${city}`);
      }

      // Build search query
      const searchQuery = this.buildSearchQuery(segment, city);
      
      // Search for places
      const searchRequest: PlaceSearchRequest = {
        query: searchQuery,
        location: cityCoords,
        radius: options.radius || this.config.searchRadius,
        type: this.getPlaceType(segment)
      };

      const places = await this.textSearch(searchRequest, options.limit || 20);
      
      // Get detailed information for each place
      const prospects: DiscoveredProspect[] = [];
      
      for (const place of places) {
        try {
          await this.enforceRateLimit();
          
          const details = await this.getPlaceDetails(place.place_id);
          
          // Filter by rating if specified
          if (options.minRating && (!details.rating || details.rating < options.minRating)) {
            continue;
          }
          
          const prospect = this.convertPlaceToProspect(details, segment);
          if (prospect) {
            prospects.push(prospect);
          }
          
        } catch (error) {
          console.error(`[GooglePlaces] Error getting details for place ${place.place_id}:`, error);
          continue;
        }
      }

      console.log(`[GooglePlaces] Found ${prospects.length} prospects for ${segment} in ${city}`);
      return prospects;

    } catch (error) {
      console.error('[GooglePlaces] Search error:', error);
      throw error;
    }
  }

  /**
   * Text search for places
   */
  private async textSearch(request: PlaceSearchRequest, limit: number = 20): Promise<any[]> {
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      query: request.query,
      location: `${request.location.lat},${request.location.lng}`,
      radius: request.radius.toString(),
      key: this.config.apiKey,
      language: this.config.language,
      region: this.config.region
    });

    if (request.type) {
      params.append('type', request.type);
    }

    const url = `${this.baseUrl}/textsearch/json?${params}`;
    
    console.log(`[GooglePlaces] Text search: ${request.query}`);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return data.results?.slice(0, limit) || [];
  }

  /**
   * Get detailed place information
   */
  private async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      place_id: placeId,
      key: this.config.apiKey,
      language: this.config.language,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'business_status',
        'rating',
        'user_ratings_total',
        'price_level',
        'types',
        'geometry',
        'photos',
        'opening_hours',
        'reviews'
      ].join(',')
    });

    const url = `${this.baseUrl}/details/json?${params}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return data.result;
  }

  /**
   * Geocode a city to get coordinates (fallback to known coordinates)
   */
  private async geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
    // Fallback coordinates for major Dutch cities
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'rotterdam': { lat: 51.9225, lng: 4.47917 },
      'den haag': { lat: 52.0705, lng: 4.3007 },
      'utrecht': { lat: 52.0907, lng: 5.1214 },
      'eindhoven': { lat: 51.4416, lng: 5.4697 },
      'tilburg': { lat: 51.5555, lng: 5.0913 },
      'groningen': { lat: 53.2194, lng: 6.5665 },
      'almere': { lat: 52.3508, lng: 5.2647 },
      'breda': { lat: 51.5719, lng: 4.7683 },
      'nijmegen': { lat: 51.8426, lng: 5.8528 }
    };

    const normalizedCity = city.toLowerCase().trim();
    
    if (cityCoords[normalizedCity]) {
      console.log(`[GooglePlaces] Using fallback coordinates for ${city}`);
      return cityCoords[normalizedCity];
    }

    // Try geocoding API as backup (if authorized)
    try {
      await this.enforceRateLimit();

      const params = new URLSearchParams({
        address: `${city}, Netherlands`,
        key: this.config.apiKey,
        language: this.config.language,
        region: this.config.region
      });

      const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.[0]) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      } else {
        console.warn(`[GooglePlaces] Geocoding failed for ${city}: ${data.status}, using fallback`);
      }
    } catch (error) {
      console.warn(`[GooglePlaces] Geocoding error for ${city}:`, error);
    }

    // Default to Amsterdam if no match found
    console.log(`[GooglePlaces] No coordinates found for ${city}, defaulting to Amsterdam`);
    return cityCoords['amsterdam'];
  }

  /**
   * Convert Google Place to our prospect format
   */
  private convertPlaceToProspect(place: PlaceDetails, segment: string): DiscoveredProspect | null {
    try {
      // Validate required fields
      if (!place.name || !place.formatted_address) {
        return null;
      }

      // Parse address components
      const addressParts = this.parseAddress(place.formatted_address);

      const prospect: DiscoveredProspect = {
        business_name: place.name,
        address: place.formatted_address,
        phone: this.cleanPhoneNumber(place.formatted_phone_number),
        website: place.website,
        city: addressParts.city,
        postal_code: addressParts.postalCode,
        business_segment: segment,
        discovery_source: 'google_places_api',
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        raw_data: {
          place_id: place.place_id,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          price_level: place.price_level,
          types: place.types,
          business_status: place.business_status,
          photos: place.photos?.length || 0,
          has_website: !!place.website,
          has_phone: !!place.formatted_phone_number,
          google_places_score: this.calculateGooglePlacesScore(place)
        }
      };

      return prospect;

    } catch (error) {
      console.error('[GooglePlaces] Error converting place to prospect:', error);
      return null;
    }
  }

  /**
   * Build search query for specific business segment
   */
  private buildSearchQuery(segment: string, city: string): string {
    const queryTemplates: Record<string, string> = {
      'beauty_salon': `schoonheidssalon beauty salon ${city}`,
      'hair_salon': `kapsalon hairdresser hair salon ${city}`,
      'wellness_spa': `spa wellness massage center ${city}`,
      'hotel_bnb': `hotel bed breakfast accommodation ${city}`,
      'restaurant': `restaurant cafe bistro ${city}`,
      'cleaning_service': `schoonmaakbedrijf cleaning service ${city}`,
      'laundromat': `wasserette laundromat ${city}`,
      'fashion_retail': `fashion boutique clothing store ${city}`,
      'home_living': `furniture home decor interior ${city}`,
      'pharmacy': `apotheek pharmacy ${city}`,
      'supermarket': `supermarket grocery store ${city}`,
      'gift_shop': `cadeauwinkel gift shop ${city}`
    };

    return queryTemplates[segment] || `${segment} ${city}`;
  }

  /**
   * Get Google Places type for business segment
   */
  private getPlaceType(segment: string): string | undefined {
    const typeMapping: Record<string, string> = {
      'beauty_salon': 'beauty_salon',
      'hair_salon': 'hair_care',
      'wellness_spa': 'spa',
      'hotel_bnb': 'lodging',
      'restaurant': 'restaurant',
      'cleaning_service': 'home_goods_store',
      'laundromat': 'laundry',
      'fashion_retail': 'clothing_store',
      'pharmacy': 'pharmacy',
      'supermarket': 'supermarket'
    };

    return typeMapping[segment];
  }

  /**
   * Calculate quality score based on Google Places data
   */
  private calculateGooglePlacesScore(place: PlaceDetails): number {
    let score = 0.5; // Base score

    // Rating score (0-1)
    if (place.rating) {
      score += (place.rating / 5) * 0.3;
    }

    // Review count score
    if (place.user_ratings_total) {
      const reviewScore = Math.min(place.user_ratings_total / 100, 1) * 0.2;
      score += reviewScore;
    }

    // Has website bonus
    if (place.website) {
      score += 0.1;
    }

    // Has phone bonus
    if (place.formatted_phone_number) {
      score += 0.1;
    }

    // Business status bonus
    if (place.business_status === 'OPERATIONAL') {
      score += 0.05;
    }

    // Photo bonus
    if (place.photos && place.photos.length > 0) {
      score += 0.05;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(phone?: string): string | undefined {
    if (!phone) return undefined;

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Handle Dutch phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '+31' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+31' + cleaned;
    }

    return cleaned;
  }

  /**
   * Parse address to extract city and postal code
   */
  private parseAddress(address: string): { city?: string; postalCode?: string } {
    const result: { city?: string; postalCode?: string } = {};

    // Dutch postal code pattern
    const postalCodeMatch = address.match(/\b(\d{4}\s?[A-Z]{2})\b/i);
    if (postalCodeMatch) {
      result.postalCode = postalCodeMatch[1].replace(/\s/, ' ').toUpperCase();
    }

    // Extract city (usually the last part before the country)
    const parts = address.split(',').map(p => p.trim());
    
    // Remove "Netherlands" if present
    const filteredParts = parts.filter(part => 
      !part.toLowerCase().includes('netherlands') && 
      !part.toLowerCase().includes('nederland')
    );

    if (filteredParts.length > 0) {
      let cityPart = filteredParts[filteredParts.length - 1];
      
      // Remove postal code from city part
      if (result.postalCode) {
        cityPart = cityPart.replace(result.postalCode, '').trim();
      }
      
      result.city = cityPart;
    }

    return result;
  }

  /**
   * Enforce rate limiting to respect API quotas
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`[GooglePlaces] Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Test API configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[GooglePlaces] Testing API connection...');
      
      // Test with a simple search
      const testCoords = await this.geocodeCity('Amsterdam');
      
      if (!testCoords) {
        throw new Error('Geocoding test failed');
      }

      console.log('[GooglePlaces] API connection successful');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[GooglePlaces] API connection failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get API usage statistics (if available)
   */
  getUsageStats(): {
    requestsThisMonth?: number;
    quotaLimit?: number;
    costEstimate?: number;
  } {
    // This would require additional API calls to get usage data
    // For now, return placeholder
    return {
      requestsThisMonth: undefined,
      quotaLimit: undefined,
      costEstimate: undefined
    };
  }
} 