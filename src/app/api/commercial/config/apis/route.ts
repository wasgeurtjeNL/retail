// =====================================================
// API CONFIGURATION ENDPOINT - External API Setup
// Complete setup and testing for Google Places, KvK, OpenAI APIs
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';

interface APIConfiguration {
  googlePlaces: {
    configured: boolean;
    working: boolean;
    apiKey?: string;
    lastTested?: string;
    testResult?: any;
    error?: string;
  };
  kvkAPI: {
    configured: boolean;
    working: boolean;
    apiKey?: string;
    baseUrl?: string;
    lastTested?: string;
    testResult?: any;
    error?: string;
  };
  openAI: {
    configured: boolean;
    working: boolean;
    apiKey?: string;
    lastTested?: string;
    testResult?: any;
    error?: string;
  };
  mandrill: {
    configured: boolean;
    working: boolean;
    apiKey?: string;
    lastTested?: string;
    testResult?: any;
    error?: string;
  };
}

interface APITestResult {
  success: boolean;
  service: string;
  statusCode?: number;
  responseTime: number;
  data?: any;
  error?: string;
}

/**
 * GET /api/commercial/config/apis
 * Get current API configuration status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[API Config] GET request - checking API configuration status');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check configuration status for all APIs
    const configuration: APIConfiguration = {
      googlePlaces: {
        configured: !!process.env.GOOGLE_PLACES_API_KEY,
        working: false,
        apiKey: process.env.GOOGLE_PLACES_API_KEY ? 
          `${process.env.GOOGLE_PLACES_API_KEY.substring(0, 8)}...` : undefined
      },
      kvkAPI: {
        configured: !!process.env.KVK_API_KEY,
        working: false,
        apiKey: process.env.KVK_API_KEY ? 
          `${process.env.KVK_API_KEY.substring(0, 8)}...` : undefined,
        baseUrl: process.env.KVK_API_BASE_URL || 'https://api.kvk.nl/api/v1/nhr-data-v2'
      },
      openAI: {
        configured: !!process.env.OPENAI_API_KEY,
        working: false,
        apiKey: process.env.OPENAI_API_KEY ? 
          `${process.env.OPENAI_API_KEY.substring(0, 12)}...` : undefined
      },
      mandrill: {
        configured: !!process.env.MANDRILL_API_KEY,
        working: false,
        apiKey: process.env.MANDRILL_API_KEY ? 
          `${process.env.MANDRILL_API_KEY.substring(0, 8)}...` : undefined
      }
    };

    // Test each API if configured
    const testPromises = [];

    if (configuration.googlePlaces.configured) {
      testPromises.push(testGooglePlacesAPI());
    }

    if (configuration.kvkAPI.configured) {
      testPromises.push(testKvKAPI());
    }

    if (configuration.openAI.configured) {
      testPromises.push(testOpenAIAPI());
    }

    if (configuration.mandrill.configured) {
      testPromises.push(testMandrillAPI());
    }

    // Execute all tests in parallel
    const testResults = await Promise.allSettled(testPromises);

    // Update configuration with test results
    let resultIndex = 0;
    
    if (configuration.googlePlaces.configured) {
      const result = testResults[resultIndex];
      if (result.status === 'fulfilled') {
        configuration.googlePlaces.working = result.value.success;
        configuration.googlePlaces.lastTested = new Date().toISOString();
        configuration.googlePlaces.testResult = result.value;
        if (!result.value.success) {
          configuration.googlePlaces.error = result.value.error;
        }
      }
      resultIndex++;
    }

    if (configuration.kvkAPI.configured) {
      const result = testResults[resultIndex];
      if (result.status === 'fulfilled') {
        configuration.kvkAPI.working = result.value.success;
        configuration.kvkAPI.lastTested = new Date().toISOString();
        configuration.kvkAPI.testResult = result.value;
        if (!result.value.success) {
          configuration.kvkAPI.error = result.value.error;
        }
      }
      resultIndex++;
    }

    if (configuration.openAI.configured) {
      const result = testResults[resultIndex];
      if (result.status === 'fulfilled') {
        configuration.openAI.working = result.value.success;
        configuration.openAI.lastTested = new Date().toISOString();
        configuration.openAI.testResult = result.value;
        if (!result.value.success) {
          configuration.openAI.error = result.value.error;
        }
      }
      resultIndex++;
    }

    if (configuration.mandrill.configured) {
      const result = testResults[resultIndex];
      if (result.status === 'fulfilled') {
        configuration.mandrill.working = result.value.success;
        configuration.mandrill.lastTested = new Date().toISOString();
        configuration.mandrill.testResult = result.value;
        if (!result.value.success) {
          configuration.mandrill.error = result.value.error;
        }
      }
    }

    // Calculate overall system readiness
    const configuredAPIs = Object.values(configuration).filter(api => api.configured).length;
    const workingAPIs = Object.values(configuration).filter(api => api.working).length;
    const systemReadiness = configuredAPIs > 0 ? (workingAPIs / configuredAPIs) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        configuration,
        summary: {
          totalAPIs: 4,
          configuredAPIs,
          workingAPIs,
          systemReadiness: Math.round(systemReadiness),
          allSystemsOperational: systemReadiness === 100
        }
      }
    });

  } catch (error) {
    console.error('[API Config] GET error:', error);
    
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
 * POST /api/commercial/config/apis
 * Test specific API or update configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[API Config] POST request - testing or updating API configuration');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, service, apiKey, testAll = false } = body;

    if (action === 'test') {
      let testResult: APITestResult;

      if (testAll) {
        // Test all configured APIs
        const results = [];
        
        if (process.env.GOOGLE_PLACES_API_KEY) {
          results.push(await testGooglePlacesAPI());
        }
        
        if (process.env.KVK_API_KEY) {
          results.push(await testKvKAPI());
        }
        
        if (process.env.OPENAI_API_KEY) {
          results.push(await testOpenAIAPI());
        }
        
        if (process.env.MANDRILL_API_KEY) {
          results.push(await testMandrillAPI());
        }

        return NextResponse.json({
          success: true,
          data: {
            testResults: results,
            allPassed: results.every(r => r.success)
          }
        });
      }

      // Test specific service
      switch (service) {
        case 'google_places':
          testResult = await testGooglePlacesAPI();
          break;
        case 'kvk':
          testResult = await testKvKAPI();
          break;
        case 'openai':
          testResult = await testOpenAIAPI();
          break;
        case 'mandrill':
          testResult = await testMandrillAPI();
          break;
        default:
          return NextResponse.json(
            { success: false, error: `Unknown service: ${service}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        data: { testResult }
      });
    }

    if (action === 'configure') {
      // In production, this would store API keys securely
      // For development, return instructions for manual configuration
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'API configuration instructions',
          instructions: {
            googlePlaces: {
              envVar: 'GOOGLE_PLACES_API_KEY',
              url: 'https://console.cloud.google.com/apis/credentials',
              steps: [
                '1. Go to Google Cloud Console',
                '2. Enable Places API',
                '3. Create credentials',
                '4. Add key to .env.local'
              ]
            },
            kvk: {
              envVar: 'KVK_API_KEY',
              url: 'https://developers.kvk.nl/',
              steps: [
                '1. Register at KvK Developer Portal',
                '2. Request API access',
                '3. Get API key',
                '4. Add key to .env.local'
              ]
            },
            openai: {
              envVar: 'OPENAI_API_KEY',
              url: 'https://platform.openai.com/api-keys',
              steps: [
                '1. Go to OpenAI Platform',
                '2. Create API key',
                '3. Set usage limits',
                '4. Add key to .env.local'
              ]
            },
            mandrill: {
              envVar: 'MANDRILL_API_KEY',
              url: 'https://mandrillapp.com/settings/',
              steps: [
                '1. Go to Mandrill Settings',
                '2. Generate API key',
                '3. Configure domains',
                '4. Add key to .env.local'
              ]
            }
          }
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API Config] POST error:', error);
    
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
 * Test Google Places API connectivity
 */
async function testGooglePlacesAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        service: 'google_places',
        responseTime: Date.now() - startTime,
        error: 'API key not configured'
      };
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Amsterdam&inputtype=textquery&key=${apiKey}`,
      { method: 'GET' }
    );

    const data = await response.json();
    
    if (data.status === 'OK' && data.candidates?.length > 0) {
      return {
        success: true,
        service: 'google_places',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        data: { candidatesFound: data.candidates.length }
      };
    } else {
      return {
        success: false,
        service: 'google_places',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        error: data.error_message || `API returned status: ${data.status}`
      };
    }

  } catch (error) {
    return {
      success: false,
      service: 'google_places',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test KvK API connectivity
 */
async function testKvKAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.KVK_API_KEY;
    const baseUrl = process.env.KVK_API_BASE_URL || 'https://api.kvk.nl/api/v1/nhr-data-v2';
    
    if (!apiKey) {
      return {
        success: false,
        service: 'kvk',
        responseTime: Date.now() - startTime,
        error: 'API key not configured'
      };
    }

    const response = await fetch(
      `${baseUrl}/companies?q=testbedrijf&size=1`,
      {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        service: 'kvk',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        data: { totalResults: data.totalItems || 0 }
      };
    } else {
      return {
        success: false,
        service: 'kvk',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

  } catch (error) {
    return {
      success: false,
      service: 'kvk',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test OpenAI API connectivity
 */
async function testOpenAIAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        service: 'openai',
        responseTime: Date.now() - startTime,
        error: 'API key not configured'
      };
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const gptModels = data.data?.filter((model: any) => 
        model.id.includes('gpt')
      ).length || 0;
      
      return {
        success: true,
        service: 'openai',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        data: { availableModels: data.data?.length || 0, gptModels }
      };
    } else {
      return {
        success: false,
        service: 'openai',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

  } catch (error) {
    return {
      success: false,
      service: 'openai',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Mandrill API connectivity
 */
async function testMandrillAPI(): Promise<APITestResult> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.MANDRILL_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        service: 'mandrill',
        responseTime: Date.now() - startTime,
        error: 'API key not configured'
      };
    }

    const response = await fetch('https://mandrillapp.com/api/1.0/users/info.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key: apiKey })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        service: 'mandrill',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        data: { 
          username: data.username,
          hourlyQuota: data.hourly_quota,
          backlog: data.backlog
        }
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        service: 'mandrill',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        error: errorData.message || `HTTP ${response.status}`
      };
    }

  } catch (error) {
    return {
      success: false,
      service: 'mandrill',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 