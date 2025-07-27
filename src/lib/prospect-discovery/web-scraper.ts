// =====================================================
// WEB SCRAPER - Prospect Discovery Service
// Automated business discovery via web scraping
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';

export interface ScrapingConfig {
  sources: ('google_maps' | 'yelp' | 'facebook' | 'yellow_pages')[];
  segments: string[];
  regions: string[];
  frequency: 'daily' | 'weekly';
  limits: {
    perSource: number;
    perDay: number;
    duplicateCheckRadius: number; // in meters
  };
}

export interface DiscoveredProspect {
  business_name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  city?: string;
  postal_code?: string;
  business_segment: string;
  discovery_source: string;
  raw_data?: Record<string, any>;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ScrapingResult {
  success: boolean;
  prospects: DiscoveredProspect[];
  error?: string;
  metadata: {
    source: string;
    segment: string;
    region: string;
    total_found: number;
    duplicates_filtered: number;
    processing_time: number;
  };
}

export class ProspectWebScraper {
  private browser: any = null;
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
  ];

  constructor() {
    console.log('[ProspectScraper] Initialized prospect web scraper');
  }

  /**
   * Discover prospects from multiple sources
   */
  async discoverProspects(
    source: 'google_maps' | 'yelp' | 'facebook' | 'yellow_pages',
    segment: string,
    region: string,
    options: {
      limit?: number;
      useProxy?: boolean;
      respectRateLimit?: boolean;
    } = {}
  ): Promise<ScrapingResult> {
    const startTime = Date.now();
    const result: ScrapingResult = {
      success: false,
      prospects: [],
      metadata: {
        source,
        segment,
        region,
        total_found: 0,
        duplicates_filtered: 0,
        processing_time: 0
      }
    };

    try {
      console.log(`[ProspectScraper] Starting discovery: ${source} -> ${segment} in ${region}`);
      
      // Initialize browser if needed
      await this.initializeBrowser();
      
      // Perform scraping based on source
      switch (source) {
        case 'google_maps':
          result.prospects = await this.scrapeGoogleMaps(segment, region, options.limit || 50);
          break;
        case 'yelp':
          result.prospects = await this.scrapeYelp(segment, region, options.limit || 50);
          break;
        case 'facebook':
          result.prospects = await this.scrapeFacebook(segment, region, options.limit || 50);
          break;
        case 'yellow_pages':
          result.prospects = await this.scrapeYellowPages(segment, region, options.limit || 50);
          break;
        default:
          throw new Error(`Unsupported scraping source: ${source}`);
      }
      
      // Filter duplicates
      const uniqueProspects = await this.deduplicateProspects(result.prospects);
      
      result.metadata.total_found = result.prospects.length;
      result.metadata.duplicates_filtered = result.prospects.length - uniqueProspects.length;
      result.prospects = uniqueProspects;
      result.success = true;
      
    } catch (error) {
      console.error(`[ProspectScraper] Error discovering prospects:`, error);
      result.error = error instanceof Error ? error.message : String(error);
      result.success = false;
    } finally {
      result.metadata.processing_time = Date.now() - startTime;
      
      // Add rate limiting delay
      if (options.respectRateLimit !== false) {
        await this.addDelay(2000 + Math.random() * 3000); // 2-5 second delay
      }
    }

    console.log(`[ProspectScraper] Discovery completed: ${result.prospects.length} prospects found in ${result.metadata.processing_time}ms`);
    return result;
  }

  /**
   * Scrape Google Maps for businesses
   */
  private async scrapeGoogleMaps(
    segment: string, 
    region: string, 
    limit: number
  ): Promise<DiscoveredProspect[]> {
    const prospects: DiscoveredProspect[] = [];
    
    try {
      // For development, we'll simulate Google Maps scraping
      // In production, this would use actual web scraping
      
      // Note: Skipping mock data generation - using real Google Places API instead
      console.log(`[ProspectScraper] Skipping mock data for ${segment} in ${region} - will use Google Places API`);
      
      // Production implementation would go here
      const page = await this.createPage();
      
      // Map segment to Google search terms
      const searchTerms = this.getGoogleSearchTerms(segment);
      const searchQuery = `${searchTerms} ${region} Nederland`;
      
      console.log(`[ProspectScraper] Searching Google Maps: "${searchQuery}"`);
      
      // Navigate to Google Maps
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for results to load
      await page.waitForSelector('[role="feed"]', { timeout: 15000 });
      
      // Scroll to load more results
      await this.autoScroll(page, limit);
      
      // Extract business data
      const businesses = await page.evaluate((maxResults: number) => {
        const results: any[] = [];
        const items = document.querySelectorAll('[role="feed"] > div');
        
        items.forEach((item, index) => {
          if (index >= maxResults) return;
          
          const nameElement = item.querySelector('h3');
          const name = nameElement?.textContent?.trim();
          
          if (!name) return;
          
          const addressElement = item.querySelector('[data-item-id*="address"]');
          const address = addressElement?.textContent?.trim();
          
          const phoneElement = item.querySelector('[data-item-id*="phone"]');
          const phone = phoneElement?.textContent?.trim();
          
          const websiteElement = item.querySelector('a[data-value="Website"]');
          const website = websiteElement?.getAttribute('href');
          
          // Extract rating and review count
          const ratingElement = item.querySelector('[role="img"][aria-label*="stars"]');
          const rating = ratingElement?.getAttribute('aria-label');
          
          results.push({
            business_name: name,
            address,
            phone,
            website,
            rating,
            source: 'google_maps'
          });
        });
        
        return results;
      }, limit);
      
      // Process and clean the extracted data
      for (const business of businesses) {
        const prospect: DiscoveredProspect = {
          business_name: business.business_name,
          address: business.address,
          phone: this.cleanPhoneNumber(business.phone),
          website: this.cleanWebsiteUrl(business.website),
          business_segment: segment,
          discovery_source: 'google_maps',
          raw_data: business
        };
        
        // Extract city and postal code from address
        if (business.address) {
          const addressParts = this.parseAddress(business.address);
          prospect.city = addressParts.city;
          prospect.postal_code = addressParts.postalCode;
        }
        
        prospects.push(prospect);
      }
      
      await page.close();
      
    } catch (error) {
      console.error('[ProspectScraper] Google Maps scraping error:', error);
      throw error;
    }
    
    return prospects;
  }

  /**
   * Scrape Yelp for businesses
   */
  private async scrapeYelp(
    segment: string, 
    region: string, 
    limit: number
  ): Promise<DiscoveredProspect[]> {
    const prospects: DiscoveredProspect[] = [];
    
    try {
      console.log(`[ProspectScraper] Simulating Yelp scraping for ${segment} in ${region}`);
      
      // Skip mock data - use real sources
      console.log(`[ProspectScraper] Skipping Yelp mock data - will use Google Places API instead`);
      
      // Production Yelp scraping implementation would go here
      const page = await this.createPage();
      
      const searchTerms = this.getYelpSearchTerms(segment);
      const yelpUrl = `https://www.yelp.nl/search?find_desc=${encodeURIComponent(searchTerms)}&find_loc=${encodeURIComponent(region)}`;
      
      console.log(`[ProspectScraper] Searching Yelp: ${yelpUrl}`);
      
      await page.goto(yelpUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for business listings
      await page.waitForSelector('[data-testid="serp-ia-card"]', { timeout: 15000 });
      
      // Extract business data
      const businesses = await page.evaluate((maxResults: number) => {
        const results: any[] = [];
        const cards = document.querySelectorAll('[data-testid="serp-ia-card"]');
        
        cards.forEach((card, index) => {
          if (index >= maxResults) return;
          
          const nameElement = card.querySelector('h3 a');
          const name = nameElement?.textContent?.trim();
          
          if (!name) return;
          
          const addressElement = card.querySelector('[data-testid="address"]');
          const address = addressElement?.textContent?.trim();
          
          const phoneElement = card.querySelector('[data-testid="phone"]');
          const phone = phoneElement?.textContent?.trim();
          
          const websiteElement = card.querySelector('a[href*="biz_redir"]');
          const website = websiteElement?.getAttribute('href');
          
          const ratingElement = card.querySelector('[aria-label*="star rating"]');
          const rating = ratingElement?.getAttribute('aria-label');
          
          results.push({
            business_name: name,
            address,
            phone,
            website,
            rating,
            source: 'yelp'
          });
        });
        
        return results;
      }, limit);
      
      // Process extracted data
      for (const business of businesses) {
        const prospect: DiscoveredProspect = {
          business_name: business.business_name,
          address: business.address,
          phone: this.cleanPhoneNumber(business.phone),
          website: this.cleanWebsiteUrl(business.website),
          business_segment: segment,
          discovery_source: 'yelp',
          raw_data: business
        };
        
        if (business.address) {
          const addressParts = this.parseAddress(business.address);
          prospect.city = addressParts.city;
          prospect.postal_code = addressParts.postalCode;
        }
        
        prospects.push(prospect);
      }
      
      await page.close();
      
    } catch (error) {
      console.error('[ProspectScraper] Yelp scraping error:', error);
      throw error;
    }
    
    return prospects;
  }

  /**
   * Scrape Facebook for businesses (placeholder)
   */
  private async scrapeFacebook(
    segment: string, 
    region: string, 
    limit: number
  ): Promise<DiscoveredProspect[]> {
    console.log(`[ProspectScraper] Facebook scraping not implemented yet for ${segment} in ${region}`);
    
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      const mockBusinesses = this.generateMockBusinesses(segment, region, Math.min(limit, 15));
      return mockBusinesses.map(business => ({
        ...business,
        discovery_source: 'facebook'
      }));
    }
    
    return [];
  }

  /**
   * Scrape Yellow Pages (placeholder)
   */
  private async scrapeYellowPages(
    segment: string, 
    region: string, 
    limit: number
  ): Promise<DiscoveredProspect[]> {
    console.log(`[ProspectScraper] Yellow Pages scraping not implemented yet for ${segment} in ${region}`);
    
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      const mockBusinesses = this.generateMockBusinesses(segment, region, Math.min(limit, 10));
      return mockBusinesses.map(business => ({
        ...business,
        discovery_source: 'yellow_pages'
      }));
    }
    
    return [];
  }

  // Helper methods
  private async initializeBrowser(): Promise<void> {
    if (this.browser) return;
    
    try {
      // In development, we don't need actual Puppeteer
      if (process.env.NODE_ENV === 'development') {
        console.log('[ProspectScraper] Using development mode - browser simulation');
        this.browser = { simulated: true };
        return;
      }
      
      // Production browser initialization
      const puppeteer = require('puppeteer');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      console.log('[ProspectScraper] Browser initialized');
      
    } catch (error) {
      console.error('[ProspectScraper] Browser initialization failed:', error);
      throw error;
    }
  }

  private async createPage(): Promise<any> {
    if (!this.browser) {
      await this.initializeBrowser();
    }
    
    if (this.browser.simulated) {
      return {
        goto: async () => {},
        waitForSelector: async () => {},
        evaluate: async (fn: any, ...args: any[]) => [],
        close: async () => {}
      };
    }
    
    const page = await this.browser.newPage();
    
    // Set random user agent
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await page.setUserAgent(userAgent);
    
    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    return page;
  }

  private async autoScroll(page: any, maxResults: number): Promise<void> {
    if (page.evaluate) {
      await page.evaluate(async (max: number) => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          let distance = 100;
          let scrolls = 0;
          const maxScrolls = Math.ceil(max / 10); // Approximate
          
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            scrolls++;
            
            if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      }, maxResults);
    }
  }

  private getGoogleSearchTerms(segment: string): string {
    const searchTerms: Record<string, string> = {
      'beauty_salon': 'schoonheidssalon beauty salon',
      'hair_salon': 'kapsalon hairdresser',
      'wellness_spa': 'wellness spa massage',
      'hotel_bnb': 'hotel bed breakfast accommodation',
      'restaurant': 'restaurant cafe bistro',
      'cleaning_service': 'schoonmaakbedrijf cleaning service',
      'laundromat': 'wasserette laundromat',
      'fashion_retail': 'fashion boutique clothing store',
      'home_living': 'woonwinkel furniture home decor'
    };
    
    return searchTerms[segment] || segment;
  }

  private getYelpSearchTerms(segment: string): string {
    const searchTerms: Record<string, string> = {
      'beauty_salon': 'beauty salon',
      'hair_salon': 'hair salon',
      'wellness_spa': 'spa wellness',
      'hotel_bnb': 'hotels bed breakfast',
      'restaurant': 'restaurants',
      'cleaning_service': 'cleaning services',
      'laundromat': 'laundromat',
      'fashion_retail': 'fashion boutique',
      'home_living': 'furniture home decor'
    };
    
    return searchTerms[segment] || segment;
  }

  private cleanPhoneNumber(phone?: string): string | undefined {
    if (!phone) return undefined;
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add Netherlands country code if missing
    if (cleaned.startsWith('06') || cleaned.startsWith('01') || cleaned.startsWith('02') || cleaned.startsWith('03') || cleaned.startsWith('04') || cleaned.startsWith('05') || cleaned.startsWith('07') || cleaned.startsWith('08') || cleaned.startsWith('09')) {
      return '+31' + cleaned;
    }
    
    return cleaned;
  }

  private cleanWebsiteUrl(website?: string): string | undefined {
    if (!website) return undefined;
    
    try {
      const url = new URL(website);
      return url.toString();
    } catch {
      // If not a valid URL, try adding https://
      try {
        const url = new URL('https://' + website);
        return url.toString();
      } catch {
        return undefined;
      }
    }
  }

  private parseAddress(address: string): { city?: string; postalCode?: string } {
    const result: { city?: string; postalCode?: string } = {};
    
    // Dutch postal code pattern
    const postalCodeMatch = address.match(/\b(\d{4}\s?[A-Z]{2})\b/i);
    if (postalCodeMatch) {
      result.postalCode = postalCodeMatch[1].replace(/\s/, ' ').toUpperCase();
    }
    
    // Extract city (usually after postal code or at the end)
    const parts = address.split(',').map(p => p.trim());
    const lastPart = parts[parts.length - 1];
    
    // Remove postal code from last part to get city
    if (result.postalCode) {
      result.city = lastPart.replace(result.postalCode, '').trim();
    } else {
      result.city = lastPart;
    }
    
    return result;
  }

  private async deduplicateProspects(prospects: DiscoveredProspect[]): Promise<DiscoveredProspect[]> {
    const unique: DiscoveredProspect[] = [];
    const seen = new Set<string>();
    
    for (const prospect of prospects) {
      // Create a fingerprint for deduplication
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
    const phone = prospect.phone?.replace(/[^\d]/g, '') || '';
    const website = prospect.website?.replace(/^https?:\/\/(www\.)?/, '') || '';
    
    return `${name}_${phone}_${website}`;
  }

  private generateMockBusinesses(segment: string, region: string, count: number): DiscoveredProspect[] {
    const businesses: DiscoveredProspect[] = [];
    const businessTypes: Record<string, string[]> = {
      'beauty_salon': ['Beauty Salon', 'Schoonheidssalon', 'Beauty Center', 'Wellness Salon'],
      'hair_salon': ['Kapsalon', 'Hair Studio', 'Hairdresser', 'Hair & Beauty'],
      'wellness_spa': ['Spa & Wellness', 'Massage Center', 'Day Spa', 'Wellness Resort'],
      'hotel_bnb': ['Hotel', 'Bed & Breakfast', 'Boutique Hotel', 'City Hotel'],
      'restaurant': ['Restaurant', 'Bistro', 'Brasserie', 'Eetcafe']
    };
    
    const types = businessTypes[segment] || ['Business'];
    const streets = ['Hoofdstraat', 'Kerkstraat', 'Marktplein', 'Nieuwstraat', 'Dorpsweg'];
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const street = streets[Math.floor(Math.random() * streets.length)];
      const number = Math.floor(Math.random() * 200) + 1;
      
      businesses.push({
        business_name: `${type} ${region} ${i + 1}`,
        address: `${street} ${number}, ${region}`,
        phone: `+31${Math.floor(Math.random() * 900000000) + 100000000}`,
        website: `https://www.${type.toLowerCase().replace(/\s/g, '')}-${region.toLowerCase()}-${i + 1}.nl`,
        email: `info@${type.toLowerCase().replace(/\s/g, '')}-${region.toLowerCase()}-${i + 1}.nl`,
        city: region,
        postal_code: `${Math.floor(Math.random() * 9000) + 1000} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        business_segment: segment,
        discovery_source: 'mock_data',
        raw_data: {
          mockGenerated: true,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return businesses;
  }

  private async addDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    if (this.browser && !this.browser.simulated) {
      try {
        await this.browser.close();
        console.log('[ProspectScraper] Browser closed');
      } catch (error) {
        console.error('[ProspectScraper] Error closing browser:', error);
      }
    }
    this.browser = null;
  }
}