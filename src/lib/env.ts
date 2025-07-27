// Environment variables configuration for website analysis
// Deze file zorgt voor type safety en validatie van environment variabelen

export interface EnvironmentConfig {
  // OpenAI Configuration
  openai: {
    apiKey: string;
    organizationId?: string;
    model: string;
  };
  
  // Rate Limiting
  rateLimit: {
    analysesPerHour: number;
    analysesPerDay: number;
    enabled: boolean;
  };
  
  // Security
  security: {
    allowedDomains: string[];
    timeout: number;
  };
  
  // App Configuration
  app: {
    url: string;
    environment: 'development' | 'staging' | 'production';
  };
}

// Haal environment variabelen op met validatie
export function getEnvironmentConfig(): EnvironmentConfig {
  const requiredVars = [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'WEBSITE_ANALYSIS_RATE_LIMIT',
    'WEBSITE_ANALYSIS_DAILY_LIMIT',
    'WEBSITE_ANALYSIS_ENABLED',
    'WEBSITE_ANALYSIS_ALLOWED_DOMAINS',
    'WEBSITE_ANALYSIS_TIMEOUT',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  // Controleer of alle vereiste variabelen aanwezig zijn
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Valideer OpenAI API key format
  const openaiApiKey = process.env.OPENAI_API_KEY!;
  if (!openaiApiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. Must start with "sk-"');
  }
  
  return {
    openai: {
      apiKey: openaiApiKey,
      organizationId: process.env.OPENAI_ORGANIZATION_ID,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    },
    rateLimit: {
      analysesPerHour: parseInt(process.env.WEBSITE_ANALYSIS_RATE_LIMIT || '10'),
      analysesPerDay: parseInt(process.env.WEBSITE_ANALYSIS_DAILY_LIMIT || '25'),
      enabled: process.env.WEBSITE_ANALYSIS_ENABLED === 'true'
    },
    security: {
      allowedDomains: process.env.WEBSITE_ANALYSIS_ALLOWED_DOMAINS?.split(',') || ['*.nl', '*.com', '*.be'],
      timeout: parseInt(process.env.WEBSITE_ANALYSIS_TIMEOUT || '30000')
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL!,
      environment: (process.env.NODE_ENV as any) || 'development'
    }
  };
}

// Valideer of een domain toegestaan is
export function isDomainAllowed(domain: string): boolean {
  const config = getEnvironmentConfig();
  
  return config.security.allowedDomains.some(allowedDomain => {
    // Converteer wildcard patterns naar regex
    const pattern = allowedDomain.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`, 'i');
    return regex.test(domain);
  });
}

// Helper functie om safe environment config te krijgen zonder errors
export function getSafeEnvironmentConfig(): EnvironmentConfig | null {
  try {
    return getEnvironmentConfig();
  } catch (error) {
    console.warn('[ENV] Safe config fallback - some features may be disabled:', error instanceof Error ? error.message : String(error));
    
    // Return minimal config for development
    return {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'not-configured',
        organizationId: process.env.OPENAI_ORGANIZATION_ID,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      },
      rateLimit: {
        analysesPerHour: parseInt(process.env.WEBSITE_ANALYSIS_RATE_LIMIT || '10'),
        analysesPerDay: parseInt(process.env.WEBSITE_ANALYSIS_DAILY_LIMIT || '25'),
        enabled: process.env.WEBSITE_ANALYSIS_ENABLED !== 'false'
      },
      security: {
        allowedDomains: (process.env.WEBSITE_ANALYSIS_ALLOWED_DOMAINS || '*.nl,*.com,*.org').split(','),
        timeout: parseInt(process.env.WEBSITE_ANALYSIS_TIMEOUT || '30000')
      },
      app: {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        environment: (process.env.NODE_ENV as any) || 'development'
      }
    };
  }
} 