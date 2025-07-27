// =====================================================
// DISCOVERY CONFIG LOADER
// Helper voor het laden van discovery configuratie uit database
// =====================================================

import { getServiceRoleClient } from './supabase';
import { EnrichmentConfig } from '@/lib/prospect-discovery/lead-enrichment';

// Interface voor discovery setting uit database
interface DatabaseDiscoverySetting {
  id: string;
  name: string;
  description?: string;
  perplexity_model: string;
  perplexity_temperature: number;
  perplexity_max_tokens: number;
  max_results_per_search: number;
  search_radius: number;
  min_confidence_score: number;
  require_email: boolean;
  require_website: boolean;
  require_phone: boolean;
  min_rating: number;
  enable_web_scraping: boolean;
  enable_google_places: boolean;
  enable_kvk_api: boolean;
  enable_perplexity: boolean;
  default_business_segments: string[];
  default_regions: string[];
  auto_discovery_enabled: boolean;
  discovery_frequency: string;
  max_daily_discoveries: number;
  is_active: boolean;
}

// Default fallback configuratie als er geen actieve configuratie is
const DEFAULT_CONFIG: EnrichmentConfig = {
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    searchRadius: 5000,
    language: 'nl',
    region: 'nl'
  },
  kvk: {
    apiKey: process.env.KVK_API_KEY || '',
    baseUrl: process.env.KVK_API_BASE_URL || 'https://api.kvk.nl/api/v1/nhr-data-v2',
    testMode: process.env.NODE_ENV === 'development'
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    model: 'sonar', // Updated to new Perplexity model name
    temperature: 0.3,
    maxTokens: 2000,
    baseURL: 'https://api.perplexity.ai'
  },
  enabledSources: {
    webScraping: true,
    googlePlaces: false,
    kvkApi: false,
    perplexity: true
  },
  qualityFilters: {
    minConfidenceScore: 0.6,
    requireEmail: false,
    requireWebsite: false,
    requirePhone: false,
    minRating: 3.0
  }
};

// Converteert database configuratie naar EnrichmentConfig formaat
function convertToEnrichmentConfig(dbConfig: DatabaseDiscoverySetting): EnrichmentConfig {
  return {
    googlePlaces: {
      apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
      searchRadius: dbConfig.search_radius,
      language: 'nl',
      region: 'nl'
    },
    kvk: {
      apiKey: process.env.KVK_API_KEY || '',
      baseUrl: process.env.KVK_API_BASE_URL || 'https://api.kvk.nl/api/v1/nhr-data-v2',
      testMode: process.env.NODE_ENV === 'development'
    },
    perplexity: {
      apiKey: process.env.PERPLEXITY_API_KEY || '',
      model: dbConfig.perplexity_model as 'sonar' | 'sonar-pro' | 'sonar-reasoning' | 'sonar-deep-research',
      temperature: dbConfig.perplexity_temperature,
      maxTokens: dbConfig.perplexity_max_tokens,
      baseURL: 'https://api.perplexity.ai'
    },
    enabledSources: {
      webScraping: dbConfig.enable_web_scraping,
      googlePlaces: dbConfig.enable_google_places,
      kvkApi: dbConfig.enable_kvk_api,
      perplexity: dbConfig.enable_perplexity
    },
    qualityFilters: {
      minConfidenceScore: dbConfig.min_confidence_score,
      requireEmail: dbConfig.require_email,
      requireWebsite: dbConfig.require_website,
      requirePhone: dbConfig.require_phone,
      minRating: dbConfig.min_rating
    }
  };
}

// Cached configuratie voor performance
let cachedConfig: EnrichmentConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuten cache

/**
 * Laadt de actieve discovery configuratie uit de database of fallback naar default
 */
export async function loadActiveDiscoveryConfig(): Promise<EnrichmentConfig> {
  console.log('[DiscoveryConfigLoader] Loading active discovery configuration');

  // Check cache
  const now = Date.now();
  if (cachedConfig && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[DiscoveryConfigLoader] Using cached configuration');
    return cachedConfig;
  }

  try {
    const supabase = getServiceRoleClient();
    
    const { data: activeConfig, error } = await supabase
      .from('discovery_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active configuration found
        console.log('[DiscoveryConfigLoader] No active configuration found, using default');
        cachedConfig = DEFAULT_CONFIG;
        cacheTimestamp = now;
        return DEFAULT_CONFIG;
      }
      
      console.error('[DiscoveryConfigLoader] Error loading active configuration:', error);
      console.log('[DiscoveryConfigLoader] Falling back to default configuration');
      cachedConfig = DEFAULT_CONFIG;
      cacheTimestamp = now;
      return DEFAULT_CONFIG;
    }

    if (!activeConfig) {
      console.log('[DiscoveryConfigLoader] No active configuration found, using default');
      cachedConfig = DEFAULT_CONFIG;
      cacheTimestamp = now;
      return DEFAULT_CONFIG;
    }

    console.log('[DiscoveryConfigLoader] Active configuration loaded:', activeConfig.name);
    
    // FIX: Check for old model names and update to valid ones
    if (activeConfig.perplexity_model === 'sonar-medium') {
      console.log('[DiscoveryConfigLoader] Converting old model "sonar-medium" to "sonar"');
      activeConfig.perplexity_model = 'sonar';
    }
    
    // Converteer database configuratie naar EnrichmentConfig
    const enrichmentConfig = convertToEnrichmentConfig(activeConfig);
    
    // Cache de configuratie
    cachedConfig = enrichmentConfig;
    cacheTimestamp = now;
    
    return enrichmentConfig;

  } catch (error) {
    console.error('[DiscoveryConfigLoader] Error in loadActiveDiscoveryConfig:', error);
    console.log('[DiscoveryConfigLoader] Falling back to default configuration');
    
    // Fallback naar default configuratie
    cachedConfig = DEFAULT_CONFIG;
    cacheTimestamp = now;
    return DEFAULT_CONFIG;
  }
}

// Functie om cache te invalideren (bijv. na configuratie wijzigingen)
export function invalidateConfigCache(): void {
  console.log('[DiscoveryConfigLoader] Cache invalidated');
  cachedConfig = null;
  cacheTimestamp = 0;
}

// Haalt specifieke configuratie waardes op
export async function getDiscoveryLimits(): Promise<{
  maxResultsPerSearch: number;
  maxDailyDiscoveries: number;
  autoDiscoveryEnabled: boolean;
  discoveryFrequency: string;
}> {
  try {
    const supabase = getServiceRoleClient();
    
    const { data: activeConfig, error } = await supabase
      .from('commercial_discovery_settings')
      .select('max_results_per_search, max_daily_discoveries, auto_discovery_enabled, discovery_frequency')
      .eq('is_active', true)
      .single();

    if (error || !activeConfig) {
      console.warn('[DiscoveryConfigLoader] Using default limits');
      return {
        maxResultsPerSearch: 10,
        maxDailyDiscoveries: 50,
        autoDiscoveryEnabled: false,
        discoveryFrequency: 'daily'
      };
    }

    return {
      maxResultsPerSearch: activeConfig.max_results_per_search,
      maxDailyDiscoveries: activeConfig.max_daily_discoveries,
      autoDiscoveryEnabled: activeConfig.auto_discovery_enabled,
      discoveryFrequency: activeConfig.discovery_frequency
    };

  } catch (error: any) {
    console.error('[DiscoveryConfigLoader] Error loading limits:', error);
    return {
      maxResultsPerSearch: 10,
      maxDailyDiscoveries: 50,
      autoDiscoveryEnabled: false,
      discoveryFrequency: 'daily'
    };
  }
} 