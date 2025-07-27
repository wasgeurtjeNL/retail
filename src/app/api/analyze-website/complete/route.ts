// =====================================================
// COMPLETE WEBSITE ANALYSIS API - Full Website Intelligence
// Combines web scraping, AI analysis, and business categorization
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WebsiteAnalysisRequest {
  url: string;
  businessName?: string;
  includeAIAnalysis?: boolean;
  storageOptions?: {
    saveToProspects?: boolean;
    segmentOverride?: string;
  };
}

interface WebsiteAnalysisResult {
  success: boolean;
  data?: {
    url: string;
    businessInfo: {
      name: string;
      description: string;
      segment: string;
      contactInfo: {
        email?: string;
        phone?: string;
        address?: string;
      };
      socialMedia: {
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        twitter?: string;
      };
    };
    technicalInfo: {
      title: string;
      metaDescription: string;
      keywords: string[];
      technologies: string[];
      loadTime: number;
      mobileOptimized: boolean;
    };
    contentAnalysis: {
      wordCount: number;
      readabilityScore: number;
      keyTopics: string[];
      sentiment: 'positive' | 'neutral' | 'negative';
    };
    aiInsights?: {
      businessCategory: string;
      targetAudience: string;
      competitiveAdvantages: string[];
      potentialNeedsForWasgeurtje: string[];
      conversionProbability: number;
      recommendedApproach: string;
    };
    qualityScore: number;
    prospectViability: 'high' | 'medium' | 'low';
    processingTime: number;
  };
  error?: string;
}

/**
 * POST /api/analyze-website/complete
 * Complete website analysis with AI insights
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebsiteAnalysisResult>> {
  const startTime = Date.now();
  
  try {
    console.log('[Website Analysis] Complete analysis request received');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: WebsiteAnalysisRequest = await request.json();
    const { 
      url, 
      businessName, 
      includeAIAnalysis = true,
      storageOptions = {}
    } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`[Website Analysis] Analyzing website: ${targetUrl.href}`);

    // Step 1: Scrape website content
    const scrapingResult = await scrapeWebsiteContent(targetUrl.href);
    if (!scrapingResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to scrape website: ${scrapingResult.error}`
      }, { status: 400 });
    }

    // Step 2: Extract basic business information
    const businessInfo = await extractBusinessInfo(scrapingResult.data, businessName);

    // Step 3: Analyze technical aspects
    const technicalInfo = await analyzeTechnicalAspects(scrapingResult.data);

    // Step 4: Perform content analysis
    const contentAnalysis = await analyzeContent(scrapingResult.data);

    // Step 5: AI insights (if enabled and OpenAI available)
    let aiInsights;
    if (includeAIAnalysis && process.env.OPENAI_API_KEY) {
      aiInsights = await generateAIInsights(
        targetUrl.href,
        businessInfo,
        contentAnalysis,
        scrapingResult.data
      );
    }

    // Step 6: Calculate quality score and viability
    const qualityScore = calculateQualityScore(businessInfo, technicalInfo, contentAnalysis, aiInsights);
    const prospectViability = determineProspectViability(qualityScore, aiInsights);

    // Step 7: Store as prospect if requested
    if (storageOptions.saveToProspects) {
      await saveAsProspect(
        targetUrl.href,
        businessInfo,
        aiInsights,
        qualityScore,
        storageOptions.segmentOverride
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Website Analysis] Analysis completed in ${processingTime}ms`);

    // Log analysis for performance tracking
    await logAnalysis(targetUrl.href, qualityScore, processingTime, !!aiInsights);

    return NextResponse.json({
      success: true,
      data: {
        url: targetUrl.href,
        businessInfo,
        technicalInfo,
        contentAnalysis,
        aiInsights,
        qualityScore,
        prospectViability,
        processingTime
      }
    });

  } catch (error) {
    console.error('[Website Analysis] Analysis error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Scrape website content using basic fetch (production would use Puppeteer)
 */
async function scrapeWebsiteContent(url: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('text/html')) {
      return {
        success: false,
        error: 'URL does not return HTML content'
      };
    }

    // Basic HTML parsing (in production, use proper HTML parser)
    const title = extractFromHTML(html, /<title[^>]*>(.*?)<\/title>/i);
    const metaDescription = extractFromHTML(html, /<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    const metaKeywords = extractFromHTML(html, /<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"']*)["\'][^>]*>/i);
    
    // Extract text content (remove HTML tags)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract contact information
    const emailMatches = textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const phoneMatches = textContent.match(/(\+31|0)[0-9\s\-]{8,}/g) || [];

    // Extract social media links
    const socialMedia = {
      facebook: extractFromHTML(html, /(?:href|src)=["\']([^"']*facebook\.com[^"']*)["\']/) || undefined,
      instagram: extractFromHTML(html, /(?:href|src)=["\']([^"']*instagram\.com[^"']*)["\']/) || undefined,
      linkedin: extractFromHTML(html, /(?:href|src)=["\']([^"']*linkedin\.com[^"']*)["\']/) || undefined,
      twitter: extractFromHTML(html, /(?:href|src)=["\']([^"']*twitter\.com[^"']*)["\']/) || undefined
    };

    return {
      success: true,
      data: {
        html,
        title: title || '',
        metaDescription: metaDescription || '',
        metaKeywords: metaKeywords || '',
        textContent,
        emails: [...new Set(emailMatches)],
        phones: [...new Set(phoneMatches)],
        socialMedia,
        contentLength: textContent.length,
        loadTime: 0 // Would be measured in real scraping
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Extract business information from scraped content
 */
async function extractBusinessInfo(scrapedData: any, providedName?: string): Promise<any> {
  // Business name detection
  let businessName = providedName || '';
  if (!businessName) {
    // Try to extract from title or content
    businessName = scrapedData.title.split(' | ')[0] || 'Unknown Business';
  }

  // Business segment detection based on keywords
  const content = scrapedData.textContent.toLowerCase();
  const segment = detectBusinessSegment(content);

  // Extract description from meta or first paragraph
  const description = scrapedData.metaDescription || 
    scrapedData.textContent.substring(0, 200) + '...';

  return {
    name: businessName,
    description,
    segment,
    contactInfo: {
      email: scrapedData.emails[0],
      phone: scrapedData.phones[0],
      address: extractAddress(scrapedData.textContent)
    },
    socialMedia: scrapedData.socialMedia
  };
}

/**
 * Analyze technical aspects of the website
 */
async function analyzeTechnicalAspects(scrapedData: any): Promise<any> {
  // Detect technologies based on HTML content
  const technologies = detectTechnologies(scrapedData.html);
  
  // Check mobile optimization
  const mobileOptimized = scrapedData.html.includes('viewport') && 
    scrapedData.html.includes('responsive');

  return {
    title: scrapedData.title,
    metaDescription: scrapedData.metaDescription,
    keywords: scrapedData.metaKeywords ? scrapedData.metaKeywords.split(',').map((k: string) => k.trim()) : [],
    technologies,
    loadTime: scrapedData.loadTime,
    mobileOptimized
  };
}

/**
 * Analyze content quality and characteristics
 */
async function analyzeContent(scrapedData: any): Promise<any> {
  const textContent = scrapedData.textContent;
  const wordCount = textContent.split(/\s+/).length;
  
  // Simple readability score (Flesch-like)
  const sentences = textContent.split(/[.!?]+/).length;
  const avgWordsPerSentence = wordCount / sentences;
  const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 2)));

  // Extract key topics (simple keyword extraction)
  const keyTopics = extractKeyTopics(textContent);

  // Basic sentiment analysis
  const sentiment = analyzeSentiment(textContent);

  return {
    wordCount,
    readabilityScore: Math.round(readabilityScore),
    keyTopics,
    sentiment
  };
}

/**
 * Generate AI insights using OpenAI
 */
async function generateAIInsights(
  url: string, 
  businessInfo: any, 
  contentAnalysis: any, 
  scrapedData: any
): Promise<any> {
  try {
    const prompt = `
Analyseer de volgende website voor commerciële acquisitie van Wasgeurtje (waskapsels en parfumproducten):

URL: ${url}
Bedrijfsnaam: ${businessInfo.name}
Segment: ${businessInfo.segment}
Beschrijving: ${businessInfo.description}

Website content (eerste 1000 karakters):
${scrapedData.textContent.substring(0, 1000)}

Geef een JSON response met:
{
  "businessCategory": "specifieke categorie",
  "targetAudience": "doelgroep omschrijving",
  "competitiveAdvantages": ["voordeel 1", "voordeel 2"],
  "potentialNeedsForWasgeurtje": ["behoefte 1", "behoefte 2"],
  "conversionProbability": 0-100,
  "recommendedApproach": "aanbevolen benadering voor contact"
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Je bent een expert in commerciële acquisitie en business development. Analyseer websites om hun geschiktheid voor Wasgeurtje partnerships te bepalen.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from OpenAI');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('[Website Analysis] AI insights error:', error);
    
    // Return fallback insights
    return {
      businessCategory: businessInfo.segment,
      targetAudience: 'Not determined',
      competitiveAdvantages: ['Professional website'],
      potentialNeedsForWasgeurtje: ['Product enhancement'],
      conversionProbability: 50,
      recommendedApproach: 'Standard outreach approach'
    };
  }
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(
  businessInfo: any, 
  technicalInfo: any, 
  contentAnalysis: any, 
  aiInsights?: any
): number {
  let score = 0;

  // Business info score (30%)
  if (businessInfo.contactInfo.email) score += 10;
  if (businessInfo.contactInfo.phone) score += 5;
  if (businessInfo.description.length > 50) score += 5;
  if (businessInfo.segment !== 'general') score += 10;

  // Technical score (25%)
  if (technicalInfo.title.length > 0) score += 5;
  if (technicalInfo.metaDescription.length > 0) score += 5;
  if (technicalInfo.mobileOptimized) score += 10;
  if (technicalInfo.technologies.length > 0) score += 5;

  // Content score (25%)
  if (contentAnalysis.wordCount > 200) score += 10;
  if (contentAnalysis.readabilityScore > 60) score += 10;
  if (contentAnalysis.keyTopics.length > 3) score += 5;

  // AI insights score (20%)
  if (aiInsights) {
    score += Math.min(20, Math.round(aiInsights.conversionProbability / 5));
  }

  return Math.min(100, score);
}

/**
 * Determine prospect viability
 */
function determineProspectViability(
  qualityScore: number, 
  aiInsights?: any
): 'high' | 'medium' | 'low' {
  let viabilityScore = qualityScore;
  
  if (aiInsights) {
    viabilityScore = (viabilityScore + aiInsights.conversionProbability) / 2;
  }

  if (viabilityScore >= 75) return 'high';
  if (viabilityScore >= 50) return 'medium';
  return 'low';
}

/**
 * Save analysis result as prospect
 */
async function saveAsProspect(
  url: string,
  businessInfo: any,
  aiInsights: any,
  qualityScore: number,
  segmentOverride?: string
): Promise<void> {
  try {
    const serviceSupabase = getServiceRoleClient();
    
    const prospectData = {
      business_name: businessInfo.name,
      business_segment: segmentOverride || businessInfo.segment,
      contact_name: '',
      email: businessInfo.contactInfo.email,
      phone: businessInfo.contactInfo.phone,
      website: url,
      city: extractCityFromAddress(businessInfo.contactInfo.address),
      address: businessInfo.contactInfo.address,
      lead_quality_score: qualityScore / 100,
      enrichment_data: {
        source: 'website_analysis',
        analysis_data: {
          businessInfo,
          aiInsights,
          qualityScore,
          analyzedAt: new Date().toISOString()
        }
      },
      discovery_source: 'website_analysis',
      status: 'new'
    };

    await serviceSupabase
      .from('commercial_prospects')
      .upsert(prospectData, {
        onConflict: 'business_name,website',
        ignoreDuplicates: false
      });

    console.log(`[Website Analysis] Saved as prospect: ${businessInfo.name}`);

  } catch (error) {
    console.error('[Website Analysis] Error saving prospect:', error);
  }
}

/**
 * Log analysis for performance tracking
 */
async function logAnalysis(
  url: string, 
  qualityScore: number, 
  processingTime: number, 
  hadAIAnalysis: boolean
): Promise<void> {
  try {
    const serviceSupabase = getServiceRoleClient();
    
    await serviceSupabase
      .from('commercial_performance_metrics')
      .insert({
        metric_type: 'website_analysis',
        category: 'discovery',
        value: qualityScore,
        metadata: {
          url,
          processing_time: processingTime,
          had_ai_analysis: hadAIAnalysis,
          analyzed_at: new Date().toISOString()
        }
      });

  } catch (error) {
    console.error('[Website Analysis] Error logging analysis:', error);
  }
}

// Helper functions

function extractFromHTML(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1] : null;
}

function detectBusinessSegment(content: string): string {
  const segments = {
    'beauty_salon': ['schoonheidssalon', 'beauty', 'cosmetica', 'gezichtsbehandeling'],
    'hair_salon': ['kapsalon', 'kapper', 'haar', 'styling'],
    'spa_wellness': ['spa', 'wellness', 'massage', 'ontspanning'],
    'nail_salon': ['nagels', 'nagelstudio', 'manicure', 'pedicure'],
    'barbershop': ['barbershop', 'baard', 'herenkapper'],
    'fitness': ['fitness', 'sportschool', 'gym'],
    'hotel': ['hotel', 'accommodatie', 'overnachting'],
    'restaurant': ['restaurant', 'cafe', 'horeca'],
    'retail': ['winkel', 'boutique', 'mode'],
    'healthcare': ['zorg', 'praktijk', 'behandeling']
  };

  for (const [segment, keywords] of Object.entries(segments)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return segment;
    }
  }

  return 'general';
}

function detectTechnologies(html: string): string[] {
  const technologies = [];
  
  if (html.includes('wordpress')) technologies.push('WordPress');
  if (html.includes('wix')) technologies.push('Wix');
  if (html.includes('shopify')) technologies.push('Shopify');
  if (html.includes('bootstrap')) technologies.push('Bootstrap');
  if (html.includes('jquery')) technologies.push('jQuery');
  if (html.includes('react')) technologies.push('React');
  if (html.includes('vue')) technologies.push('Vue.js');
  if (html.includes('angular')) technologies.push('Angular');
  
  return technologies;
}

function extractKeyTopics(text: string): string[] {
  // Simple keyword extraction based on frequency
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 4);

  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['geweldig', 'fantastisch', 'uitstekend', 'perfect', 'professioneel', 'kwaliteit'];
  const negativeWords = ['slecht', 'probleem', 'fout', 'niet goed', 'teleurgesteld'];

  const words = text.toLowerCase().split(/\s+/);
  let sentiment = 0;

  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) sentiment += 1;
    if (negativeWords.some(neg => word.includes(neg))) sentiment -= 1;
  });

  if (sentiment > 0) return 'positive';
  if (sentiment < 0) return 'negative';
  return 'neutral';
}

function extractAddress(text: string): string | undefined {
  // Simple address extraction for Dutch addresses
  const addressRegex = /([A-Za-z\s]+\s\d+[a-z]?,?\s*\d{4}\s?[A-Z]{2}\s*[A-Za-z\s]*)/;
  const match = text.match(addressRegex);
  return match ? match[0].trim() : undefined;
}

function extractCityFromAddress(address?: string): string | undefined {
  if (!address) return undefined;
  
  // Extract city from Dutch address format
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  
  // Try postal code pattern
  const cityMatch = address.match(/\d{4}\s?[A-Z]{2}\s*([A-Za-z\s]+)/);
  return cityMatch ? cityMatch[1].trim() : undefined;
} 