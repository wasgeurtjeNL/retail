/**
 * Website Scraper Module
 * Gebruikt Playwright voor het extraheren van website content voor AI analyse
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';
import validator from 'validator';
import { getEnvironmentConfig, isDomainAllowed } from './env';

export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  headings: string[];
  content: string;
  images: string[];
  links: string[];
  metadata: {
    lang: string;
    charset: string;
    viewport: string;
    robots: string;
    author: string;
    keywords: string[];
  };
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  contactInfo: {
    emails: string[];
    phones: string[];
    addresses: string[];
  };
  businessInfo: {
    openingHours?: string;
    services?: string[];
    products?: string[];
    aboutText?: string;
  };
  technicalInfo: {
    loadTime: number;
    statusCode: number;
    redirects: number;
    hasSSL: boolean;
    responsive: boolean;
  };
  error?: string;
  timestamp: string;
}

export interface ScrapingOptions {
  timeout?: number;
  waitForLoad?: boolean;
  extractImages?: boolean;
  extractLinks?: boolean;
  maxRetries?: number;
  userAgent?: string;
  followRedirects?: boolean;
}

export class WebsiteScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: ReturnType<typeof getEnvironmentConfig>;

  constructor() {
    this.config = getEnvironmentConfig();
  }

  /**
   * Initialiseer browser instance
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080'
          ]
        });

        this.context = await this.browser.newContext({
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        console.log('[SCRAPER] Browser initialized successfully');
      } catch (error) {
        console.error('[SCRAPER] Failed to initialize browser:', error);
        throw new Error('Failed to initialize browser for scraping');
      }
    }
  }

  /**
   * Sluit browser instance
   */
  private async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Valideer URL voordat scraping
   */
  private validateUrl(url: string): { isValid: boolean; error?: string } {
    // Basis URL validatie
    if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
      return { isValid: false, error: 'Invalid URL format' };
    }

    // Controleer toegestane domeinen
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      if (!isDomainAllowed(domain)) {
        return { isValid: false, error: 'Domain not allowed for analysis' };
      }

      // Blokkeer lokale/interne IP adressen
      if (domain.match(/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost)/)) {
        return { isValid: false, error: 'Local/internal URLs not allowed' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Scrape website content
   */
  public async scrapeWebsite(
    url: string, 
    options: ScrapingOptions = {}
  ): Promise<ScrapedContent> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Default options
    const opts: Required<ScrapingOptions> = {
      timeout: options.timeout || this.config.security.timeout,
      waitForLoad: options.waitForLoad !== false,
      extractImages: options.extractImages !== false,
      extractLinks: options.extractLinks !== false,
      maxRetries: options.maxRetries || 3,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; WebsiteAnalyzer/1.0)',
      followRedirects: options.followRedirects !== false
    };

    // Valideer URL
    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      return {
        url,
        title: '',
        description: '',
        headings: [],
        content: '',
        images: [],
        links: [],
        metadata: {
          lang: '',
          charset: '',
          viewport: '',
          robots: '',
          author: '',
          keywords: []
        },
        socialMedia: {},
        contactInfo: {
          emails: [],
          phones: [],
          addresses: []
        },
        businessInfo: {},
        technicalInfo: {
          loadTime: 0,
          statusCode: 0,
          redirects: 0,
          hasSSL: false,
          responsive: false
        },
        error: validation.error,
        timestamp
      };
    }

    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < opts.maxRetries) {
      try {
        console.log(`[SCRAPER] Starting scrape attempt ${attempt + 1}/${opts.maxRetries} for: ${url}`);
        
        await this.initBrowser();
        const page = await this.context!.newPage();
        
        // Set timeout
        page.setDefaultTimeout(opts.timeout);
        
        // Navigate to page
        const response = await page.goto(url, {
          waitUntil: opts.waitForLoad ? 'networkidle' : 'domcontentloaded',
          timeout: opts.timeout
        });

        if (!response) {
          throw new Error('Failed to load page');
        }

        // Wait for content to be ready
        if (opts.waitForLoad) {
          await page.waitForTimeout(2000);
        }

        // Extract content
        const content = await this.extractContent(page, url, opts);
        
        // Add technical info
        content.technicalInfo = {
          loadTime: Date.now() - startTime,
          statusCode: response.status(),
          redirects: response.request().redirectedFrom() ? 1 : 0,
          hasSSL: url.startsWith('https://'),
          responsive: await this.checkResponsive(page)
        };

        await page.close();
        await this.closeBrowser();

        console.log(`[SCRAPER] Successfully scraped: ${url}`);
        return content;

      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[SCRAPER] Attempt ${attempt} failed for ${url}:`, lastError);
        
        // Cleanup on error
        try {
          await this.closeBrowser();
        } catch (cleanupError) {
          console.error('[SCRAPER] Cleanup error:', cleanupError);
        }

        if (attempt < opts.maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Return error result after all retries failed
    return {
      url,
      title: '',
      description: '',
      headings: [],
      content: '',
      images: [],
      links: [],
      metadata: {
        lang: '',
        charset: '',
        viewport: '',
        robots: '',
        author: '',
        keywords: []
      },
      socialMedia: {},
      contactInfo: {
        emails: [],
        phones: [],
        addresses: []
      },
      businessInfo: {},
      technicalInfo: {
        loadTime: Date.now() - startTime,
        statusCode: 0,
        redirects: 0,
        hasSSL: false,
        responsive: false
      },
      error: `Failed after ${opts.maxRetries} attempts. Last error: ${lastError}`,
      timestamp
    };
  }

  /**
   * Extract content from page
   */
  private async extractContent(
    page: Page, 
    url: string, 
    options: Required<ScrapingOptions>
  ): Promise<ScrapedContent> {
    const timestamp = new Date().toISOString();

    // Get page content
    const html = await page.content();
    const $ = load(html);

    // Extract basic info
    const title = await page.title() || $('title').text() || '';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';

    // Extract headings
    const headings: string[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    // Extract main content
    const content = this.extractMainContent($);

    // Extract images
    const images: string[] = [];
    if (options.extractImages) {
      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          const absoluteUrl = new URL(src, url).href;
          images.push(absoluteUrl);
        }
      });
    }

    // Extract links
    const links: string[] = [];
    if (options.extractLinks) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          try {
            const absoluteUrl = new URL(href, url).href;
            links.push(absoluteUrl);
          } catch (error) {
            // Skip invalid URLs
          }
        }
      });
    }

    // Extract metadata
    const metadata = {
      lang: $('html').attr('lang') || '',
      charset: $('meta[charset]').attr('charset') || '',
      viewport: $('meta[name="viewport"]').attr('content') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      author: $('meta[name="author"]').attr('content') || '',
      keywords: ($('meta[name="keywords"]').attr('content') || '').split(',').map(k => k.trim()).filter(k => k)
    };

    // Extract social media
    const socialMedia = {
      facebook: $('a[href*="facebook.com"]').attr('href'),
      twitter: $('a[href*="twitter.com"], a[href*="x.com"]').attr('href'),
      instagram: $('a[href*="instagram.com"]').attr('href'),
      linkedin: $('a[href*="linkedin.com"]').attr('href'),
      youtube: $('a[href*="youtube.com"]').attr('href')
    };

    // Extract contact info
    const contactInfo = {
      emails: this.extractEmails(content),
      phones: this.extractPhones(content),
      addresses: this.extractAddresses(content)
    };

    // Extract business info
    const businessInfo = {
      openingHours: this.extractOpeningHours($),
      services: this.extractServices($),
      products: this.extractProducts($),
      aboutText: this.extractAboutText($)
    };

    return {
      url,
      title,
      description,
      headings,
      content,
      images,
      links,
      metadata,
      socialMedia,
      contactInfo,
      businessInfo,
      technicalInfo: {
        loadTime: 0, // Will be set by caller
        statusCode: 0,
        redirects: 0,
        hasSSL: false,
        responsive: false
      },
      timestamp
    };
  }

  /**
   * Extract main content from page
   */
  private extractMainContent($: ReturnType<typeof load>): string {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .menu, .navigation, .sidebar').remove();

    // Try to find main content area
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.page-content',
      '.post-content',
      '.entry-content',
      'article',
      '.article'
    ];

    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    // Fallback to body content
    return $('body').text().trim();
  }

  /**
   * Extract email addresses from content
   */
  private extractEmails(content: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = content.match(emailRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Extract phone numbers from content
   */
  private extractPhones(content: string): string[] {
    const phoneRegex = /(?:\+31|0)[\s\-]?(?:\d[\s\-]?){8,9}\d/g;
    const matches = content.match(phoneRegex) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract addresses from content
   */
  private extractAddresses(content: string): string[] {
    // Simple Dutch address pattern
    const addressRegex = /\b\d{4}\s?[A-Z]{2}\s+[A-Za-z\s]+\b/g;
    const matches = content.match(addressRegex) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract opening hours
   */
  private extractOpeningHours($: ReturnType<typeof load>): string {
    const hourSelectors = [
      '.opening-hours',
      '.hours',
      '.openingstijden',
      '[class*="hours"]',
      '[class*="opening"]'
    ];

    for (const selector of hourSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    return '';
  }

  /**
   * Extract services
   */
  private extractServices($: ReturnType<typeof load>): string[] {
    const serviceSelectors = [
      '.services',
      '.diensten',
      '.service-list',
      '.what-we-do'
    ];

    const services: string[] = [];
    for (const selector of serviceSelectors) {
      $(selector).find('li, p, div').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 3 && text.length < 100) {
          services.push(text);
        }
      });
    }

    return [...new Set(services)];
  }

  /**
   * Extract products
   */
  private extractProducts($: ReturnType<typeof load>): string[] {
    const productSelectors = [
      '.products',
      '.product',
      '.producten',
      '.product-list'
    ];

    const products: string[] = [];
    for (const selector of productSelectors) {
      $(selector).find('li, .product-name, .product-title').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 3 && text.length < 100) {
          products.push(text);
        }
      });
    }

    return [...new Set(products)];
  }

  /**
   * Extract about text
   */
  private extractAboutText($: ReturnType<typeof load>): string {
    const aboutSelectors = [
      '.about',
      '.over-ons',
      '.about-us',
      '.company-info',
      '.bedrijfsinfo'
    ];

    for (const selector of aboutSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }

    return '';
  }

  /**
   * Check if website is responsive
   */
  private async checkResponsive(page: Page): Promise<boolean> {
    try {
      // Check viewport meta tag
      const viewport = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content')).catch(() => null);
      if (viewport && viewport.includes('width=device-width')) {
        return true;
      }

      // Check CSS media queries
      const hasMediaQueries = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        for (const sheet of stylesheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule.type === CSSRule.MEDIA_RULE) {
                return true;
              }
            }
          } catch (error) {
            // Skip if can't access stylesheet
          }
        }
        return false;
      });

      return hasMediaQueries;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.closeBrowser();
  }
}

// Export utility functions
export { isDomainAllowed, getEnvironmentConfig }; 