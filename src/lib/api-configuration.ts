// =====================================================
// API CONFIGURATION HELPER
// Guides users through external API setup process
// =====================================================

export interface APIProvider {
  name: string;
  description: string;
  signupUrl: string;
  pricingUrl?: string;
  documentationUrl: string;
  requiredFor: string[];
  estimatedCost: string;
  setupSteps: APISetupStep[];
}

export interface APISetupStep {
  step: number;
  title: string;
  description: string;
  actionRequired: string;
  screenshot?: string;
  estimatedTime: string;
}

export interface APIConfigStatus {
  provider: string;
  configured: boolean;
  lastTested?: string;
  status: 'working' | 'error' | 'untested';
  errorMessage?: string;
  usage?: {
    current: number;
    limit: number;
    period: string;
  };
}

export class APIConfigurationService {
  
  static getGooglePlacesSetup(): APIProvider {
    return {
      name: "Google Places API",
      description: "Officiële Google API voor het vinden van bedrijven wereldwijd",
      signupUrl: "https://console.cloud.google.com/apis/library/places-backend.googleapis.com",
      pricingUrl: "https://developers.google.com/maps/pricing",
      documentationUrl: "https://developers.google.com/maps/documentation/places/web-service",
      requiredFor: [
        "Automated prospect discovery",
        "Business location data",
        "Contact information enrichment",
        "Rating & review data"
      ],
      estimatedCost: "€0.017 per request (first 100 requests/maand gratis)",
      setupSteps: [
        {
          step: 1,
          title: "Google Cloud Console Setup",
          description: "Ga naar Google Cloud Console en maak een nieuw project aan",
          actionRequired: "Klik op 'Create Project' en geef het een naam zoals 'Wasgeurtje-Commercial'",
          estimatedTime: "2 minuten"
        },
        {
          step: 2,
          title: "Places API Activeren",
          description: "Activeer de Places API in je Google Cloud project",
          actionRequired: "Zoek naar 'Places API' en klik 'Enable'",
          estimatedTime: "1 minuut"
        },
        {
          step: 3,
          title: "API Key Aanmaken",
          description: "Maak een API key aan voor authenticatie",
          actionRequired: "Ga naar 'Credentials' → 'Create Credentials' → 'API Key'",
          estimatedTime: "1 minuut"
        },
        {
          step: 4,
          title: "API Key Beveiligen",
          description: "Beperk de API key tot alleen Places API en je domain",
          actionRequired: "Klik 'Restrict Key' en selecteer 'Places API'",
          estimatedTime: "2 minuten"
        },
        {
          step: 5,
          title: "Billing Account Koppelen",
          description: "Koppel een billing account (vereist maar eerste 100 requests gratis)",
          actionRequired: "Ga naar 'Billing' en voeg een payment method toe",
          estimatedTime: "3 minuten"
        }
      ]
    };
  }

  static getKvKSetup(): APIProvider {
    return {
      name: "KvK API (Nederlandse Kamer van Koophandel)",
      description: "Officiële Nederlandse bedrijfsregister data",
      signupUrl: "https://developers.kvk.nl/",
      pricingUrl: "https://developers.kvk.nl/pricing",
      documentationUrl: "https://developers.kvk.nl/documentation",
      requiredFor: [
        "Nederlandse bedrijfsdata verificatie",
        "KvK nummer validatie",
        "Officiële bedrijfsinformatie",
        "Compliance & verification"
      ],
      estimatedCost: "€0.25 per request (eerste 1000 gratis voor ontwikkelaars)",
      setupSteps: [
        {
          step: 1,
          title: "KvK Developer Account",
          description: "Registreer voor een gratis KvK developer account",
          actionRequired: "Ga naar developers.kvk.nl en klik 'Sign Up'",
          estimatedTime: "3 minuten"
        },
        {
          step: 2,
          title: "Email Verificatie",
          description: "Verifieer je email adres",
          actionRequired: "Check je email en klik de verificatie link",
          estimatedTime: "1 minuut"
        },
        {
          step: 3,
          title: "API Subscription",
          description: "Subscribe op de Business Profile API",
          actionRequired: "Ga naar 'My APIs' en selecteer 'Business Profile API'",
          estimatedTime: "2 minuten"
        },
        {
          step: 4,
          title: "API Key Genereren",
          description: "Genereer je API key voor productie gebruik",
          actionRequired: "Klik 'Generate API Key' en bewaar deze veilig",
          estimatedTime: "1 minuut"
        }
      ]
    };
  }

  static getOpenAISetup(): APIProvider {
    return {
      name: "OpenAI API",
      description: "GPT-4 AI voor email optimalisatie en personalisatie",
      signupUrl: "https://platform.openai.com/signup",
      pricingUrl: "https://openai.com/pricing",
      documentationUrl: "https://platform.openai.com/docs",
      requiredFor: [
        "AI email optimization",
        "Dynamic content personalization",
        "Subject line generation",
        "Performance analysis"
      ],
      estimatedCost: "~€0.03 per email optimization (GPT-4 Turbo)",
      setupSteps: [
        {
          step: 1,
          title: "OpenAI Account",
          description: "Maak een OpenAI Platform account aan",
          actionRequired: "Ga naar platform.openai.com en sign up",
          estimatedTime: "2 minuten"
        },
        {
          step: 2,
          title: "Phone Verification",
          description: "Verifieer je telefoonnummer",
          actionRequired: "Voer je telefoonnummer in en bevestig de SMS code",
          estimatedTime: "2 minuten"
        },
        {
          step: 3,
          title: "Billing Setup",
          description: "Voeg een payment method toe",
          actionRequired: "Ga naar 'Billing' en voeg je creditcard toe",
          estimatedTime: "3 minuten"
        },
        {
          step: 4,
          title: "API Key Aanmaken",
          description: "Genereer een nieuwe API key",
          actionRequired: "Ga naar 'API Keys' → 'Create new secret key'",
          estimatedTime: "1 minuut"
        },
        {
          step: 5,
          title: "Usage Limits Instellen",
          description: "Stel maandelijkse uitgave limiet in voor kostenbeheer",
          actionRequired: "Ga naar 'Billing' → 'Usage limits' en stel €50/maand in",
          estimatedTime: "1 minuut"
        }
      ]
    };
  }

  static async testAPIKey(provider: string, apiKey: string): Promise<APIConfigStatus> {
    try {
      switch (provider) {
        case 'google_places':
          return await this.testGooglePlacesAPI(apiKey);
        case 'kvk':
          return await this.testKvKAPI(apiKey);
        case 'openai':
          return await this.testOpenAIAPI(apiKey);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      return {
        provider,
        configured: false,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async testGooglePlacesAPI(apiKey: string): Promise<APIConfigStatus> {
    const testUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Amsterdam&inputtype=textquery&key=${apiKey}`;
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return {
        provider: 'google_places',
        configured: true,
        status: 'working',
        lastTested: new Date().toISOString()
      };
    } else {
      return {
        provider: 'google_places',
        configured: false,
        status: 'error',
        errorMessage: data.error_message || `API returned status: ${data.status}`
      };
    }
  }

  private static async testKvKAPI(apiKey: string): Promise<APIConfigStatus> {
    const testUrl = `https://api.kvk.nl/api/v1/nhr-data-v2/companies?name=Test&resultSize=1`;
    
    const response = await fetch(testUrl, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      return {
        provider: 'kvk',
        configured: true,
        status: 'working',
        lastTested: new Date().toISOString()
      };
    } else {
      return {
        provider: 'kvk',
        configured: false,
        status: 'error',
        errorMessage: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  }

  private static async testOpenAIAPI(apiKey: string): Promise<APIConfigStatus> {
    const testUrl = 'https://api.openai.com/v1/models';
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return {
        provider: 'openai',
        configured: true,
        status: 'working',
        lastTested: new Date().toISOString()
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        provider: 'openai',
        configured: false,
        status: 'error',
        errorMessage: errorData.error?.message || `HTTP ${response.status}`
      };
    }
  }

  static getSetupInstructions(): string {
    return `
# 🔧 Commercial Acquisition API Setup Guide

## Overzicht
Voor volledige functionaliteit heeft het systeem 3 externe API's nodig:

### 1. 🌐 Google Places API
- **Doel**: Automatische business discovery
- **Kosten**: €0.017 per request (100/maand gratis)
- **Setup tijd**: ~10 minuten

### 2. 🏢 KvK API (Nederlandse Kamer van Koophandel)
- **Doel**: Nederlandse bedrijfsdata verificatie
- **Kosten**: €0.25 per request (1000 gratis voor developers)
- **Setup tijd**: ~7 minuten

### 3. 🤖 OpenAI API
- **Doel**: AI email optimization
- **Kosten**: ~€0.03 per optimization
- **Setup tijd**: ~9 minuten

## Totale Setup Tijd: ~26 minuten
## Geschatte Maandelijkse Kosten: €10-50 (afhankelijk van volume)

## Environment Variables
Na setup voeg deze toe aan je .env.local:

\`\`\`bash
# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_key_here

# KvK API
KVK_API_KEY=your_kvk_api_key_here
KVK_API_BASE_URL=https://api.kvk.nl/api/v1/nhr-data-v2

# OpenAI API
OPENAI_API_KEY=your_openai_key_here
\`\`\`

✅ Het systeem werkt al in TEST MODE zonder deze API's
🚀 Met API's krijg je volledige automatisering!
    `;
  }
}

export default APIConfigurationService; 