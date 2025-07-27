/**
 * AI Analysis Module
 * Gebruikt OpenAI GPT-4 voor intelligente bedrijfsanalyse van website content
 */

import OpenAI from 'openai';
import { ScrapedContent } from './website-scraper';
import { getEnvironmentConfig, getSafeEnvironmentConfig } from './env';

export interface BusinessAnalysis {
  url: string;
  businessType: string;
  mainActivities: string[];
  targetMarket: string;
  businessDescription: string;
  industryCategory: string;
  keyServices: string[];
  location: string;
  confidenceScore: number;
  strengths: string[];
  opportunities: string[];
  digitalMaturity: {
    level: 'basic' | 'intermediate' | 'advanced';
    score: number;
    areas: string[];
  };
  marketingInsights: {
    positioning: string;
    uniqueSellingPoints: string[];
    contentQuality: number;
    seoOptimization: number;
  };
  recommendations: string[];
  competitorAnalysis: {
    similarBusinesses: string[];
    competitiveAdvantages: string[];
    marketGaps: string[];
  };
  timestamp: string;
  processingTime: number;
}

export interface AnalysisOptions {
  language?: 'nl' | 'en';
  includeRecommendations?: boolean;
  includeCompetitorAnalysis?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export class AIAnalyzer {
  private openai: OpenAI;
  private config: NonNullable<ReturnType<typeof getSafeEnvironmentConfig>>;

  constructor() {
    const config = getSafeEnvironmentConfig();
    if (!config) {
      throw new Error('AI Analyzer configuration not available');
    }
    
    if (!config.openai.apiKey || config.openai.apiKey === 'not-configured') {
      throw new Error('OpenAI API key not configured');
    }
    
    this.config = config;
    this.openai = new OpenAI({
      apiKey: this.config.openai.apiKey,
      organization: this.config.openai.organizationId,
    });
  }

  /**
   * Analyseer website content met AI
   */
  public async analyzeWebsite(
    scrapedContent: ScrapedContent,
    options: AnalysisOptions = {}
  ): Promise<BusinessAnalysis> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Default options
    const opts: Required<AnalysisOptions> = {
      language: options.language || 'nl',
      includeRecommendations: options.includeRecommendations !== false,
      includeCompetitorAnalysis: options.includeCompetitorAnalysis !== false,
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.3
    };

    try {
      console.log(`[AI_ANALYZER] Starting analysis for: ${scrapedContent.url}`);

      // Prepareer content voor analyse
      const preparedContent = this.prepareContentForAnalysis(scrapedContent);

      // Genereer system prompt
      const systemPrompt = this.generateSystemPrompt(opts);

      // Genereer user prompt
      const userPrompt = this.generateUserPrompt(preparedContent, opts);

      // Roep OpenAI API aan
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI API');
      }

      // Parse JSON response
      const analysisData = JSON.parse(content);

      // Valideer en structureer resultaat
      const analysis = this.structureAnalysisResult(
        analysisData,
        scrapedContent.url,
        timestamp,
        Date.now() - startTime
      );

      console.log(`[AI_ANALYZER] Analysis completed for: ${scrapedContent.url} (${analysis.processingTime}ms)`);
      return analysis;

    } catch (error) {
      console.error('[AI_ANALYZER] Analysis failed:', error);
      
      // Return fallback analysis
      return this.createFallbackAnalysis(
        scrapedContent,
        timestamp,
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Prepareer content voor AI analyse
   */
  private prepareContentForAnalysis(content: ScrapedContent): string {
    const sections = [
      `=== WEBSITE TITLE ===`,
      content.title || 'No title available',
      '',
      `=== DESCRIPTION ===`,
      content.description || 'No description available',
      '',
      `=== HEADINGS ===`,
      content.headings.length > 0 ? content.headings.join('\n') : 'No headings found',
      '',
      `=== MAIN CONTENT ===`,
      content.content.length > 0 ? content.content.substring(0, 2000) : 'No content available',
      '',
      `=== BUSINESS INFO ===`,
      content.businessInfo.aboutText || 'No about text available',
      '',
      `=== SERVICES ===`,
      (content.businessInfo.services && content.businessInfo.services.length > 0) ? content.businessInfo.services.join(', ') : 'No services listed',
      '',
      `=== PRODUCTS ===`,
      (content.businessInfo.products && content.businessInfo.products.length > 0) ? content.businessInfo.products.join(', ') : 'No products listed',
      '',
      `=== CONTACT INFO ===`,
      `Emails: ${content.contactInfo.emails.join(', ') || 'None'}`,
      `Phones: ${content.contactInfo.phones.join(', ') || 'None'}`,
      `Addresses: ${content.contactInfo.addresses.join(', ') || 'None'}`,
      '',
      `=== TECHNICAL INFO ===`,
      `SSL: ${content.technicalInfo.hasSSL ? 'Yes' : 'No'}`,
      `Responsive: ${content.technicalInfo.responsive ? 'Yes' : 'No'}`,
      `Load Time: ${content.technicalInfo.loadTime}ms`,
      '',
      `=== SOCIAL MEDIA ===`,
      Object.entries(content.socialMedia)
        .filter(([_, url]) => url)
        .map(([platform, url]) => `${platform}: ${url}`)
        .join('\n') || 'No social media links found'
    ];

    return sections.join('\n');
  }

  /**
   * Genereer system prompt voor AI
   */
  private generateSystemPrompt(options: Required<AnalysisOptions>): string {
    const language = options.language === 'nl' ? 'Dutch' : 'English';
    
    return `You are a professional business analyst specializing in website analysis for Dutch businesses. 

Your task is to analyze website content and provide structured business insights. You must respond in valid JSON format with the following structure:

{
  "businessType": "string - Type of business (e.g., 'Webshop', 'Consultancy', 'Restaurant')",
  "mainActivities": ["array of main business activities"],
  "targetMarket": "string - Target market description",
  "businessDescription": "string - Comprehensive business description",
  "industryCategory": "string - Industry category (e.g., 'E-commerce', 'Healthcare', 'Technology')",
  "keyServices": ["array of key services offered"],
  "location": "string - Business location if determinable",
  "confidenceScore": 85,
  "strengths": ["array of identified business strengths"],
  "opportunities": ["array of growth opportunities"],
  "digitalMaturity": {
    "level": "basic|intermediate|advanced",
    "score": 75,
    "areas": ["array of digital maturity areas"]
  },
  "marketingInsights": {
    "positioning": "string - Market positioning",
    "uniqueSellingPoints": ["array of USPs"],
    "contentQuality": 80,
    "seoOptimization": 70
  },
  "recommendations": ["array of actionable recommendations"],
  "competitorAnalysis": {
    "similarBusinesses": ["array of similar business types"],
    "competitiveAdvantages": ["array of advantages"],
    "marketGaps": ["array of potential market gaps"]
  }
}

Guidelines:
- Analyze in ${language} context and provide responses in Dutch
- Focus on Dutch market conditions and business practices
- The 'confidenceScore' MUST be an integer between 0 and 100. Calculate it by summing the points from the following criteria based on the available website data:
  - Presence of a valid KvK-nummer (Dutch Chamber of Commerce number): +20 points
  - Presence of a physical address (street, city): +15 points
  - Presence of a phone number: +10 points
  - Presence of customer reviews/testimonials: +15 points
  - Presence of a detailed 'About Us' page: +10 points
  - Links to active social media profiles: +10 points
  - Website uses SSL (HTTPS): +10 points
  - Absence of major spelling/grammar errors: +5 points
  - If information is scarce or ambiguous, the total score should reflect that by being lower.
- Be specific and actionable in recommendations
- Consider local market dynamics and consumer behavior
- All scores (except confidenceScore) should be 0-100 integers
- Provide realistic and data-driven insights`;
  }

  /**
   * Genereer user prompt voor specifieke analyse
   */
  private generateUserPrompt(content: string, options: Required<AnalysisOptions>): string {
    return `Please analyze the following website content and provide a comprehensive business analysis:

${content}

Focus on:
1. Identifying the core business model and value proposition
2. Understanding the target market and customer segments
3. Evaluating digital maturity and online presence
4. Assessing competitive positioning
5. Identifying growth opportunities and areas for improvement

${options.includeRecommendations ? 'Include specific, actionable recommendations for business growth and digital improvement.' : ''}

${options.includeCompetitorAnalysis ? 'Include competitor analysis and market positioning insights.' : ''}

Provide your analysis in the specified JSON format. Ensure all fields are populated with meaningful data based on the available content.`;
  }

  /**
   * Structureer analyse resultaat
   */
  private structureAnalysisResult(
    data: any,
    url: string,
    timestamp: string,
    processingTime: number
  ): BusinessAnalysis {
    return {
      url,
      businessType: data.businessType || 'Unknown',
      mainActivities: Array.isArray(data.mainActivities) ? data.mainActivities : [],
      targetMarket: data.targetMarket || 'Not specified',
      businessDescription: data.businessDescription || 'No description available',
      industryCategory: data.industryCategory || 'General',
      keyServices: Array.isArray(data.keyServices) ? data.keyServices : [],
      location: data.location || 'Unknown',
      confidenceScore: Math.min(Math.max(data.confidenceScore || 0, 0), 1),
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      opportunities: Array.isArray(data.opportunities) ? data.opportunities : [],
      digitalMaturity: {
        level: data.digitalMaturity?.level || 'basic',
        score: Math.min(Math.max(data.digitalMaturity?.score || 0, 0), 100),
        areas: Array.isArray(data.digitalMaturity?.areas) ? data.digitalMaturity.areas : []
      },
      marketingInsights: {
        positioning: data.marketingInsights?.positioning || 'Not determined',
        uniqueSellingPoints: Array.isArray(data.marketingInsights?.uniqueSellingPoints) 
          ? data.marketingInsights.uniqueSellingPoints : [],
        contentQuality: Math.min(Math.max(data.marketingInsights?.contentQuality || 0, 0), 100),
        seoOptimization: Math.min(Math.max(data.marketingInsights?.seoOptimization || 0, 0), 100)
      },
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      competitorAnalysis: {
        similarBusinesses: Array.isArray(data.competitorAnalysis?.similarBusinesses) 
          ? data.competitorAnalysis.similarBusinesses : [],
        competitiveAdvantages: Array.isArray(data.competitorAnalysis?.competitiveAdvantages) 
          ? data.competitorAnalysis.competitiveAdvantages : [],
        marketGaps: Array.isArray(data.competitorAnalysis?.marketGaps) 
          ? data.competitorAnalysis.marketGaps : []
      },
      timestamp,
      processingTime
    };
  }

  /**
   * Maak fallback analyse bij fout
   */
  private createFallbackAnalysis(
    content: ScrapedContent,
    timestamp: string,
    processingTime: number,
    error: string
  ): BusinessAnalysis {
    // Basis analyse op basis van beschikbare content
    const businessType = this.inferBusinessType(content);
    const location = this.inferLocation(content);
    const services = content.businessInfo.services || [];

    return {
      url: content.url,
      businessType,
      mainActivities: services.slice(0, 3),
      targetMarket: 'Algemene markt',
      businessDescription: content.description || content.title || 'Bedrijfswebsite',
      industryCategory: 'Algemeen',
      keyServices: services,
      location,
      confidenceScore: 0.3, // Lage confidence voor fallback
      strengths: ['Heeft een website'],
      opportunities: ['Verbetering van online aanwezigheid'],
      digitalMaturity: {
        level: 'basic',
        score: 40,
        areas: ['Website optimalisatie', 'SEO verbetering']
      },
      marketingInsights: {
        positioning: 'Niet duidelijk',
        uniqueSellingPoints: [],
        contentQuality: 50,
        seoOptimization: 40
      },
      recommendations: [
        'Verbeter website content en structuur',
        'Optimaliseer voor zoekmachines',
        'Voeg meer bedrijfsinformatie toe'
      ],
      competitorAnalysis: {
        similarBusinesses: [],
        competitiveAdvantages: [],
        marketGaps: []
      },
      timestamp,
      processingTime
    };
  }

  /**
   * Infereer business type uit content
   */
  private inferBusinessType(content: ScrapedContent): string {
    const title = content.title.toLowerCase();
    const description = content.description.toLowerCase();
    const contentText = content.content.toLowerCase();
    
    const keywords = {
      'Webshop': ['webshop', 'online shop', 'kopen', 'bestellen', 'winkelwagen'],
      'Restaurant': ['restaurant', 'eten', 'menu', 'reserveren', 'keuken'],
      'Consultancy': ['consultancy', 'advies', 'consulting', 'diensten'],
      'Healthcare': ['zorg', 'dokter', 'behandeling', 'patiënt', 'gezondheid'],
      'Technology': ['software', 'tech', 'ontwikkeling', 'IT', 'digitaal']
    };

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => title.includes(word) || description.includes(word) || contentText.includes(word))) {
        return type;
      }
    }

    return 'Algemeen bedrijf';
  }

  /**
   * Infereer locatie uit content
   */
  private inferLocation(content: ScrapedContent): string {
    if (content.contactInfo.addresses.length > 0) {
      return content.contactInfo.addresses[0];
    }

    // Probeer locatie uit content te halen
    const dutchCities = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen'];
    const contentText = content.content + ' ' + content.title + ' ' + content.description;
    
    for (const city of dutchCities) {
      if (contentText.includes(city)) {
        return city;
      }
    }

    return 'Nederland';
  }

  /**
   * Bereken geschatte kosten van analyse
   */
  public calculateAnalysisCost(tokenCount: number): number {
    // GPT-4o-mini pricing: ongeveer $0.15 per 1M input tokens
    const costPerToken = 0.15 / 1000000;
    return tokenCount * costPerToken;
  }

  /**
   * Test OpenAI connectie
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10
      });

      return response.choices.length > 0;
    } catch (error) {
      console.error('[AI_ANALYZER] Connection test failed:', error);
      return false;
    }
  }
}

// Export types voor externe gebruik
export type { ScrapedContent }; 