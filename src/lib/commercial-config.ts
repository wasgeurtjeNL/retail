// =====================================================
// COMMERCIAL CONFIGURATION SERVICE
// Centralized configuration management voor commercial features
// =====================================================

import { getServiceRoleClient } from './supabase';

export interface CommercialConfig {
  enabledSources: {
    webScraping: boolean;
    googlePlaces: boolean;
    kvkApi: boolean;
  };
  apiKeys: {
    googlePlaces: boolean;
    kvk: boolean;
    openai: boolean;
  };
  settings: {
    kvkApiEnabled: boolean;
    googlePlacesEnabled: boolean;
    webScrapingEnabled: boolean;
  };
}

/**
 * Haalt de KvK API enabled setting op uit de database
 */
export async function getKvKToggleSetting(): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('setting_key', 'kvk_api_enabled')
      .single();

    // Default naar enabled als setting niet bestaat en API key beschikbaar is
    if (!setting) {
      const defaultEnabled = !!process.env.KVK_API_KEY;
      console.log(`[CommercialConfig] KvK setting not found, defaulting to: ${defaultEnabled}`);
      return defaultEnabled;
    }

    const enabled = setting.value === true || setting.value === 'true';
    console.log(`[CommercialConfig] KvK API toggle setting: ${enabled}`);
    return enabled;

  } catch (error) {
    console.error('[CommercialConfig] Error getting KvK toggle setting:', error);
    // Fallback naar API key availability
    return !!process.env.KVK_API_KEY;
  }
}

/**
 * Controleer of Puppeteer beschikbaar is voor web scraping
 */
export function checkPuppeteerAvailability(): boolean {
  try {
    require.resolve('puppeteer');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Haalt de complete commercial configuratie op
 */
export async function getCommercialConfig(): Promise<CommercialConfig> {
  const kvkToggleEnabled = await getKvKToggleSetting();
  const puppeteerAvailable = checkPuppeteerAvailability();
  
  // API keys availability
  const apiKeys = {
    googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY,
    kvk: !!process.env.KVK_API_KEY,
    openai: !!process.env.OPENAI_API_KEY
  };

  // Enabled sources - combinatie van API keys EN toggle settings
  const enabledSources = {
    webScraping: puppeteerAvailable,
    googlePlaces: apiKeys.googlePlaces, // Voor nu geen aparte toggle, maar kan toegevoegd worden
    kvkApi: apiKeys.kvk && kvkToggleEnabled // API key AND toggle moet enabled zijn
  };

  // Settings voor admin interface
  const settings = {
    kvkApiEnabled: kvkToggleEnabled,
    googlePlacesEnabled: apiKeys.googlePlaces,
    webScrapingEnabled: puppeteerAvailable
  };

  console.log('[CommercialConfig] Current configuration:', {
    enabledSources,
    apiKeys,
    settings
  });

  return {
    enabledSources,
    apiKeys,
    settings
  };
}

/**
 * Update KvK API toggle setting in database
 */
export async function updateKvKToggleSetting(enabled: boolean, reason?: string): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from('settings')
      .upsert({
        setting_key: 'kvk_api_enabled',
        value: enabled,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('[CommercialConfig] Error updating KvK toggle:', error);
      return false;
    }

    console.log(`[CommercialConfig] KvK API ${enabled ? 'enabled' : 'disabled'}${reason ? ` (${reason})` : ''}`);
    return true;

  } catch (error) {
    console.error('[CommercialConfig] Error updating KvK toggle setting:', error);
    return false;
  }
}

/**
 * Legacy function - gebruikt de nieuwe commercial config
 * @deprecated Gebruik getCommercialConfig() in plaats hiervan
 */
export async function createEnrichmentConfig() {
  const config = await getCommercialConfig();
  
  return {
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
    enabledSources: config.enabledSources,
    qualityFilters: {
      minConfidenceScore: 0.6,
      requireEmail: false,
      requireWebsite: false,
      requirePhone: false,
      minRating: 3.0
    }
  };
} 