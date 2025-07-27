// AI-driven email optimization service voor Wasgeurtje commerciële acquisitie
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Performance thresholds voor verschillende metrics
const PERFORMANCE_THRESHOLDS = {
  open_rate: {
    excellent: 35,
    good: 25,
    needs_improvement: 20,
    poor: 15
  },
  click_rate: {
    excellent: 8,
    good: 4,
    needs_improvement: 2.5,
    poor: 1.5
  },
  conversion_rate: {
    excellent: 5,
    good: 2.5,
    needs_improvement: 1.5,
    poor: 0.8
  }
};

// Business segment specificaties voor targeting
const SEGMENT_CHARACTERISTICS = {
  beauty_salon: {
    description: 'Schoonheidssalons en beautyclinics',
    pain_points: ['Concurrentie differentiatie', 'Klantervaring verbeteren', 'Marge verhogen'],
    motivators: ['Exclusiviteit', 'Kwaliteit', 'Klantbeleving', 'Premium uitstraling'],
    tone: 'professioneel maar persoonlijk, luxe uitstraling'
  },
  hair_salon: {
    description: 'Kappers en haarsalons',
    pain_points: ['Klanten behouden', 'Onderscheiden van concurrentie', 'Extra omzet'],
    motivators: ['Unieke ervaring', 'Klantloyaliteit', 'Persoonlijke touch'],
    tone: 'vriendelijk, trendy, persoonlijk'
  },
  wellness_spa: {
    description: 'Wellness centra en spa\'s',
    pain_points: ['Complete relaxatie ervaring', 'Premium positioning', 'Klantwaarde verhogen'],
    motivators: ['Holistische ervaring', 'Zintuiglijke beleving', 'Luxe en kwaliteit'],
    tone: 'rustgevend, luxueus, holistisch'
  },
  hotel_bnb: {
    description: 'Hotels, B&B\'s en accommodaties',
    pain_points: ['Gastervaring verbeteren', 'Positieve reviews', 'Repeat bookings'],
    motivators: ['Gastvrijheid', 'Unieke ervaring', 'Kwaliteit service'],
    tone: 'gastvrij, professioneel, kwaliteitsgericht'
  },
  cleaning_service: {
    description: 'Schoonmaakbedrijven en huishoudelijke diensten',
    pain_points: ['Service differentiatie', 'Klantbehoud', 'Meerwaarde bieden'],
    motivators: ['Resultaat zichtbaar maken', 'Extra service', 'Klantcomplimenten'],
    tone: 'betrouwbaar, praktisch, resultaatgericht'
  },
  laundromat: {
    description: 'Wasserettes en wassalons',
    pain_points: ['Klantervaring verbeteren', 'Onderscheiden van concurrentie'],
    motivators: ['Frisheid', 'Gemak', 'Kwaliteit resultaat'],
    tone: 'praktisch, fris, betrouwbaar'
  },
  retail_fashion: {
    description: 'Kledingwinkels en fashion retail',
    pain_points: ['In-store ervaring', 'Klantbeleving', 'Marge optimalisatie'],
    motivators: ['Trendy uitstraling', 'Klantervaring', 'Sfeer creatie'],
    tone: 'trendy, stijlvol, inspirerend'
  },
  home_living: {
    description: 'Wonen & lifestyle winkels',
    pain_points: ['Sfeer creëren', 'Klantinspiratie', 'Cross-selling'],
    motivators: ['Huisgevoel', 'Sfeer', 'Lifestyle inspiratie'],
    tone: 'warm, inspirerend, huiselijk'
  },
  pharmacy: {
    description: 'Apotheken en drogisterijen',
    pain_points: ['Klantservice differentiatie', 'Extra omzet genereren'],
    motivators: ['Zorg en comfort', 'Gezondheid en welzijn', 'Vertrouwen'],
    tone: 'zorgzaam, betrouwbaar, professioneel'
  },
  supermarket: {
    description: 'Supermarkten en levensmiddelenwinkels',
    pain_points: ['Klantloyaliteit', 'Marge verbeteren', 'Klantervaring'],
    motivators: ['Gemak', 'Kwaliteit', 'Klantbeleving verbeteren'],
    tone: 'praktisch, toegankelijk, klantvriendelijk'
  },
  gift_shop: {
    description: 'Cadeau- en souvenir winkels',
    pain_points: ['Unieke producten', 'Memorabele ervaring', 'Impulse aankopen'],
    motivators: ['Verrassing', 'Bijzondere momenten', 'Unieke vondsten'],
    tone: 'vrolijk, verrassend, persoonlijk'
  },
  online_store: {
    description: 'Online winkels en e-commerce',
    pain_points: ['Klantbinding', 'Unboxing ervaring', 'Customer lifetime value'],
    motivators: ['Convenience', 'Unieke ervaring', 'Kwaliteit service'],
    tone: 'modern, efficiënt, klantvriendelijk'
  },
  other_retail: {
    description: 'Overige retail bedrijven',
    pain_points: ['Klantervaring', 'Differentiatie', 'Meerwaarde'],
    motivators: ['Klanttevredenheid', 'Kwaliteit', 'Service'],
    tone: 'professioneel, klantvriendelijk, betrouwbaar'
  }
};

// Wasgeurtje brand context voor consistent messaging
const WASGEURTJE_BRAND_CONTEXT = `
WASGEURTJE MERKIDENTITEIT & PROPOSITIE:

Kernwaarden:
• Nederlandse kwaliteit en ambacht sinds de oprichting
• Duurzaamheid: milieuvriendelijke formules zonder schadelijke stoffen
• Premiumsegment: hoogwaardige geuren en langdurige frisheid
• Samenwerking: we geloven in win-win partnerships met onze verkooppunten
• Exclusiviteit: selectieve distributie, niet overal verkrijgbaar

Unieke Verkoopproposities (USP's):
• Langdurige geurervaring (tot 6 weken fris)
• Concentraat formule: kleine hoeveelheid, grote impact
• Hypoallergeen en veilig voor alle stoffen
• Nederlandse productie met internationale uitstraling
• Gratis proefpakket voor nieuwe verkooppunten

Doelgroep Retailers:
• Bedrijven die kwaliteit en klantervaring waarderen
• Retailers die hun klanten iets bijzonders willen bieden
• Ondernemers die geloven in premium producten
• Verkooppunten die exclusiviteit en marge willen

Emotionele Triggers:
• Trots op Nederlandse kwaliteit
• Exclusiviteit en prestige
• Klantverrassing en -plezier
• Zakelijk succes en marge
• Duurzaamheid en verantwoordelijkheid

Tone of Voice:
• Vertrouwenwekkend maar toegankelijk
• Professioneel maar persoonlijk
• Enthousiast maar niet overdreven
• Nederlandse directheid met internationale klasse
• Focus op partnership, niet alleen verkoop
`;

interface OptimizationRequest {
  templateId: string;
  businessSegment: string;
  currentPerformance: {
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
    sent_count: number;
  };
  benchmarkPerformance: {
    target_open_rate: number;
    target_click_rate: number;
    target_conversion_rate: number;
  };
  currentContent: {
    subject_line: string;
    email_body_html: string;
    call_to_action_text: string;
  };
  optimizationType: 'subject_line' | 'email_body' | 'cta' | 'full_template';
}

interface OptimizationResult {
  success: boolean;
  optimizedContent: {
    subject_line?: string;
    email_body_html?: string;
    call_to_action_text?: string;
  };
  aiReasoning: string;
  recommendedChanges: string[];
  expectedImprovements: string[];
  error?: string;
}

export class AIEmailOptimizer {
  
  // Hoofdfunctie voor het optimaliseren van email templates
  static async optimizeEmailTemplate(request: OptimizationRequest): Promise<OptimizationResult> {
    try {
      console.log('[AI_OPTIMIZER] Starting optimization for template:', request.templateId);

      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // Genereer wasgeurtje-specifieke prompt
      const prompt = this.generateOptimizationPrompt(request);
      
      console.log('[AI_OPTIMIZER] Generated prompt for optimization');

      // Roep ChatGPT API aan
      const aiResponse = await this.callChatGPT(prompt);
      
      console.log('[AI_OPTIMIZER] Received AI response');

      // Parse en valideer AI response
      const optimizationResult = this.parseAIResponse(aiResponse, request.optimizationType);

      // Log optimalisatie voor tracking
      await this.logOptimization(request, optimizationResult, prompt, aiResponse);

      console.log('[AI_OPTIMIZER] Optimization completed successfully');

      return optimizationResult;

    } catch (error) {
      console.error('[AI_OPTIMIZER] Error during optimization:', error);
      return {
        success: false,
        optimizedContent: {},
        aiReasoning: 'Er is een fout opgetreden tijdens de AI optimalisatie',
        recommendedChanges: [],
        expectedImprovements: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Genereer gespecialiseerde prompt voor Wasgeurtje email optimalisatie
  private static generateOptimizationPrompt(request: OptimizationRequest): string {
    const segment = SEGMENT_CHARACTERISTICS[request.businessSegment as keyof typeof SEGMENT_CHARACTERISTICS];
    const performanceGap = this.calculatePerformanceGap(request.currentPerformance, request.benchmarkPerformance);

    return `
Je bent een expert email marketing specialist die zich specialiseert in B2B acquisitie voor Wasgeurtje, een premium Nederlandse wasgeuren merk.

${WASGEURTJE_BRAND_CONTEXT}

TARGET SEGMENT ANALYSE:
Segment: ${segment?.description || 'Algemene retail'}
Pain Points: ${segment?.pain_points.join(', ') || 'Algemene retail uitdagingen'}
Motivators: ${segment?.motivators.join(', ') || 'Kwaliteit en service'}
Gewenste Tone: ${segment?.tone || 'professioneel en klantvriendelijk'}

HUIDIGE PERFORMANCE ANALYSE:
• Open Rate: ${request.currentPerformance.open_rate}% (target: ${request.benchmarkPerformance.target_open_rate}%)
• Click Rate: ${request.currentPerformance.click_rate}% (target: ${request.benchmarkPerformance.target_click_rate}%)
• Conversion Rate: ${request.currentPerformance.conversion_rate}% (target: ${request.benchmarkPerformance.target_conversion_rate}%)
• Verzonden: ${request.currentPerformance.sent_count} emails

PERFORMANCE GAP:
${performanceGap}

HUIDIGE EMAIL CONTENT:
Subject: "${request.currentContent.subject_line}"
Call-to-Action: "${request.currentContent.call_to_action_text}"

Email Body:
${request.currentContent.email_body_html}

OPTIMALISATIE OPDRACHT:
Optimaliseer de ${request.optimizationType === 'full_template' ? 'complete email template' : request.optimizationType} om:
1. Beter aan te sluiten bij de pain points en motivators van ${segment?.description}
2. De performance te verhogen richting onze targets
3. Consistent te blijven met Wasgeurtje's merkidentiteit
4. Een gevoel van exclusiviteit en selectie te creëren
5. De focus te leggen op het gratis proefpakket als laagdrempelige eerste stap

SPECIFIEKE VEREISTEN:
• Gebruik Nederlandse directe communicatiestijl
• Emphasize de exclusiviteit van de uitnodiging ("Je bent geselecteerd...")
• Maak duidelijk dat dit GEEN sales pitch is, maar een partnership mogelijkheid
• Benadruk de vrijblijvendheid van het proefpakket
• Gebruik social proof van bestaande retailers indien mogelijk
• Focus op business impact voor hun klanten
• Maak de call-to-action actionable en time-sensitive

RESPONSE FORMAT:
Geef je antwoord in deze exacte JSON structuur:
{
  "optimized_content": {
    ${request.optimizationType === 'subject_line' || request.optimizationType === 'full_template' ? '"subject_line": "nieuwe onderwerpregel",' : ''}
    ${request.optimizationType === 'email_body' || request.optimizationType === 'full_template' ? '"email_body_html": "volledige HTML email body",' : ''}
    ${request.optimizationType === 'cta' || request.optimizationType === 'full_template' ? '"call_to_action_text": "nieuwe CTA tekst"' : ''}
  },
  "ai_reasoning": "Gedetailleerde uitleg waarom deze wijzigingen de performance zullen verbeteren voor dit specifieke segment",
  "recommended_changes": [
    "Specifieke verandering 1",
    "Specifieke verandering 2",
    "Specifieke verandering 3"
  ],
  "expected_improvements": [
    "Verwachte performance verbetering 1",
    "Verwachte performance verbetering 2"
  ]
}

Zorg ervoor dat je response valid JSON is en alle requested content bevat.
`;
  }

  // Bereken performance gap voor context
  private static calculatePerformanceGap(current: any, target: any): string {
    const gaps = [];
    
    if (current.open_rate < target.target_open_rate) {
      gaps.push(`Open rate ${(target.target_open_rate - current.open_rate).toFixed(1)}% te laag`);
    }
    
    if (current.click_rate < target.target_click_rate) {
      gaps.push(`Click rate ${(target.target_click_rate - current.click_rate).toFixed(1)}% te laag`);
    }
    
    if (current.conversion_rate < target.target_conversion_rate) {
      gaps.push(`Conversion rate ${(target.target_conversion_rate - current.conversion_rate).toFixed(1)}% te laag`);
    }

    return gaps.length > 0 ? gaps.join(', ') : 'Performance binnen targets';
  }

  // ChatGPT API call
  private static async callChatGPT(prompt: string): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Je bent een expert email marketing specialist gespecialiseerd in B2B acquisitie voor premium Nederlandse merken. Je hebt uitgebreide ervaring met retail partnerships en conversion optimalisatie.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Parse AI response naar structured format
  private static parseAIResponse(aiResponse: string, optimizationType: string): OptimizationResult {
    try {
      // Extract JSON van de AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        optimizedContent: parsedResponse.optimized_content || {},
        aiReasoning: parsedResponse.ai_reasoning || 'Geen reasoning beschikbaar',
        recommendedChanges: parsedResponse.recommended_changes || [],
        expectedImprovements: parsedResponse.expected_improvements || []
      };

    } catch (error) {
      console.error('[AI_OPTIMIZER] Error parsing AI response:', error);
      return {
        success: false,
        optimizedContent: {},
        aiReasoning: 'Fout bij het interpreteren van AI response',
        recommendedChanges: [],
        expectedImprovements: [],
        error: error instanceof Error ? error.message : 'Parse error'
      };
    }
  }

  // Log optimalisatie voor tracking en analyse
  private static async logOptimization(
    request: OptimizationRequest, 
    result: OptimizationResult, 
    prompt: string, 
    aiResponse: string
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('commercial_ai_optimizations')
        .insert({
          optimization_type: request.optimizationType,
          business_segment: request.businessSegment,
          trigger_metric: this.identifyTriggerMetric(request.currentPerformance, request.benchmarkPerformance),
          trigger_threshold: this.getTriggerThreshold(request.benchmarkPerformance),
          actual_performance: this.getWorstPerformingMetric(request.currentPerformance),
          baseline_performance: this.getWorstBaselineMetric(request.benchmarkPerformance),
          ai_prompt: prompt,
          ai_response: aiResponse,
          original_content: JSON.stringify(request.currentContent),
          optimized_content: JSON.stringify(result.optimizedContent),
          ai_reasoning: result.aiReasoning,
          implemented: false
        });

      console.log('[AI_OPTIMIZER] Optimization logged successfully');
    } catch (error) {
      console.error('[AI_OPTIMIZER] Error logging optimization:', error);
    }
  }

  // Helper methods voor logging
  private static identifyTriggerMetric(current: any, benchmark: any): string {
    if (current.open_rate < benchmark.target_open_rate) return 'open_rate';
    if (current.click_rate < benchmark.target_click_rate) return 'click_rate';
    if (current.conversion_rate < benchmark.target_conversion_rate) return 'conversion_rate';
    return 'general_optimization';
  }

  private static getTriggerThreshold(benchmark: any): number {
    return Math.min(benchmark.target_open_rate, benchmark.target_click_rate, benchmark.target_conversion_rate);
  }

  private static getWorstPerformingMetric(current: any): number {
    return Math.min(current.open_rate, current.click_rate, current.conversion_rate);
  }

  private static getWorstBaselineMetric(benchmark: any): number {
    return Math.min(benchmark.target_open_rate, benchmark.target_click_rate, benchmark.target_conversion_rate);
  }

  // Automatische performance monitoring en optimalisatie trigger
  static async checkAndOptimizeUnderperformingTemplates(): Promise<void> {
    try {
      console.log('[AI_OPTIMIZER] Checking for underperforming templates...');

      // Haal templates op die onder benchmark presteren
      const { data: underperformingTemplates, error } = await supabaseAdmin
        .from('commercial_email_templates')
        .select(`
          *,
          commercial_segment_benchmarks!inner(*)
        `)
        .eq('is_active', true)
        .gte('sent_count', 50) // Minimum sample size
        .or(`
          open_rate.lt.commercial_segment_benchmarks.target_open_rate,
          click_rate.lt.commercial_segment_benchmarks.target_click_rate,
          conversion_rate.lt.commercial_segment_benchmarks.target_conversion_rate
        `);

      if (error) {
        throw error;
      }

      console.log(`[AI_OPTIMIZER] Found ${underperformingTemplates?.length || 0} underperforming templates`);

      // Voor elke underperforming template, trigger optimalisatie
      for (const template of underperformingTemplates || []) {
        await this.triggerAutomaticOptimization(template);
      }

    } catch (error) {
      console.error('[AI_OPTIMIZER] Error in automatic optimization check:', error);
    }
  }

  // Trigger automatische optimalisatie voor een template
  private static async triggerAutomaticOptimization(template: any): Promise<void> {
    try {
      console.log(`[AI_OPTIMIZER] Triggering automatic optimization for template: ${template.template_name}`);

      // Check of er recent al een optimalisatie is geweest
      const { data: recentOptimizations } = await supabaseAdmin
        .from('commercial_ai_optimizations')
        .select('*')
        .eq('business_segment', template.business_segment)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Laatste 7 dagen
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentOptimizations && recentOptimizations.length > 0) {
        console.log(`[AI_OPTIMIZER] Recent optimization found for segment ${template.business_segment}, skipping`);
        return;
      }

      // Bepaal welk onderdeel het meest optimalisatie nodig heeft
      const optimizationType = this.determineOptimizationType(template);

      // Maak optimalisatie request
      const request: OptimizationRequest = {
        templateId: template.id,
        businessSegment: template.business_segment,
        currentPerformance: {
          open_rate: template.open_rate,
          click_rate: template.click_rate,
          conversion_rate: template.conversion_rate,
          sent_count: template.sent_count
        },
        benchmarkPerformance: {
          target_open_rate: template.commercial_segment_benchmarks.target_open_rate,
          target_click_rate: template.commercial_segment_benchmarks.target_click_rate,
          target_conversion_rate: template.commercial_segment_benchmarks.target_conversion_rate
        },
        currentContent: {
          subject_line: template.subject_line,
          email_body_html: template.email_body_html,
          call_to_action_text: template.call_to_action_text
        },
        optimizationType
      };

      // Voer optimalisatie uit
      const result = await this.optimizeEmailTemplate(request);

      if (result.success) {
        // Maak nieuwe template versie met geoptimaliseerde content
        await this.createOptimizedTemplate(template, result, optimizationType);
      }

    } catch (error) {
      console.error(`[AI_OPTIMIZER] Error in automatic optimization for template ${template.id}:`, error);
    }
  }

  // Bepaal welk onderdeel het meest optimalisatie nodig heeft
  private static determineOptimizationType(template: any): 'subject_line' | 'email_body' | 'cta' | 'full_template' {
    const openRateGap = template.commercial_segment_benchmarks.target_open_rate - template.open_rate;
    const clickRateGap = template.commercial_segment_benchmarks.target_click_rate - template.click_rate;
    const conversionRateGap = template.commercial_segment_benchmarks.target_conversion_rate - template.conversion_rate;

    // Als open rate het grootste probleem is, focus op subject line
    if (openRateGap > clickRateGap && openRateGap > conversionRateGap) {
      return 'subject_line';
    }
    
    // Als click rate het grootste probleem is, focus op email body
    if (clickRateGap > conversionRateGap) {
      return 'email_body';
    }
    
    // Als conversion rate het grootste probleem is, focus op CTA
    if (conversionRateGap > 2) {
      return 'cta';
    }

    // Als alle metrics slecht zijn, optimaliseer alles
    return 'full_template';
  }

  // Maak nieuwe geoptimaliseerde template
  private static async createOptimizedTemplate(
    originalTemplate: any, 
    optimization: OptimizationResult, 
    optimizationType: string
  ): Promise<void> {
    try {
      const newTemplate = {
        template_name: `${originalTemplate.template_name} (AI Optimized ${optimizationType})`,
        template_version: `${originalTemplate.template_version}_ai_${Date.now()}`,
        business_segment: originalTemplate.business_segment,
        subject_line: optimization.optimizedContent.subject_line || originalTemplate.subject_line,
        email_body_html: optimization.optimizedContent.email_body_html || originalTemplate.email_body_html,
        email_body_text: this.htmlToText(optimization.optimizedContent.email_body_html || originalTemplate.email_body_html),
        call_to_action_text: optimization.optimizedContent.call_to_action_text || originalTemplate.call_to_action_text,
        call_to_action_url: originalTemplate.call_to_action_url,
        ai_generated: true,
        ai_optimization_notes: optimization.aiReasoning,
        parent_template_id: originalTemplate.id,
        is_active: true
      };

      const { data: newTemplateData, error } = await supabaseAdmin
        .from('commercial_email_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update de optimalisatie log met de nieuwe template ID
      await supabaseAdmin
        .from('commercial_ai_optimizations')
        .update({
          implemented: true,
          implemented_at: new Date().toISOString(),
          new_template_id: newTemplateData.id
        })
        .eq('business_segment', originalTemplate.business_segment)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log(`[AI_OPTIMIZER] Created optimized template: ${newTemplateData.id}`);

    } catch (error) {
      console.error('[AI_OPTIMIZER] Error creating optimized template:', error);
    }
  }

  // Helper: Convert HTML to plain text
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

export default AIEmailOptimizer; 