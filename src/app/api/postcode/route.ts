import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.postcode.nl/rest/addresses';

// Cleans the postcode by removing spaces and making it lowercase (postcode.nl requires lowercase)
function cleanPostcode(postcode: string): string {
  return postcode.replace(/\s+|-/g, '').toLowerCase().trim();
}

// Clean API key by removing all non-alphanumeric characters
function cleanApiKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '');
}

// Robust environment variable loading with multiple fallback strategies
function getPostcodeCredentials(): { apiKey: string; apiSecret: string } | null {
  // Strategy 1: Standard environment variables
  let apiKey = process.env.POSTCODE_API_KEY;
  let apiSecret = process.env.POSTCODE_API_SECRET;
  
  // Strategy 2: Try alternative names (in case of typos)
  if (!apiKey) {
    apiKey = process.env.POSTCODE_API_KEY || process.env.POSTCODEAPI_KEY || process.env.POSTCODE_KEY;
  }
  if (!apiSecret) {
    apiSecret = process.env.POSTCODE_API_SECRET || process.env.POSTCODEAPI_SECRET || process.env.POSTCODE_SECRET;
  }
  
  // Strategy 3: Clean the values thoroughly
  if (apiKey && apiSecret) {
    // Remove quotes, whitespace, and other unwanted characters
    apiKey = apiKey.replace(/^["']|["']$/g, '').trim();
    apiSecret = apiSecret.replace(/^["']|["']$/g, '').trim();
    
    // Final validation
    if (apiKey.length > 20 && apiSecret.length > 20) {
      return { apiKey, apiSecret };
    }
  }
  
  // No fallback credentials for security reasons
  console.log('[POSTCODE] No API credentials configured - please set POSTCODE_API_KEY environment variable');
  
  return null;
}

export async function GET(request: NextRequest) {
  console.log('🔥 POSTCODE API ROUTE CALLED!');
  console.log('🔥 REQUEST URL:', request.url);
  
  try {
    // Get credentials using robust loading
    const credentials = getPostcodeCredentials();
    
    if (!credentials) {
      console.error('🚨 Could not load Postcode API credentials');
      return NextResponse.json(
        { 
          exceptionId: 'ConfigurationError',
          message: 'Postcode API credentials not configured correctly' 
        }, 
        { status: 500 }
      );
    }
    
    const { apiKey, apiSecret } = credentials;
    
    // DEBUGGING: Log credential info (without exposing full keys)
    console.log('[DEBUG] API_KEY length:', apiKey.length);
    console.log('[DEBUG] API_SECRET length:', apiSecret.length);
    console.log('[DEBUG] API_KEY prefix:', apiKey.substring(0, 10));
    console.log('[DEBUG] API_SECRET prefix:', apiSecret.substring(0, 10));

    // Get the query parameters from the URL
    const searchParams = request.nextUrl.searchParams;
    const postcode = searchParams.get('postcode');
    const houseNumber = searchParams.get('houseNumber');
    const addition = searchParams.get('addition') || '';
    
    // Validate required parameters
    if (!postcode || !houseNumber) {
      return NextResponse.json(
        { 
          exceptionId: 'MissingParameters',
          message: 'Postcode en huisnummer zijn vereist' 
        }, 
        { status: 400 }
      );
    }
    
    // Clean the postcode
    const cleanedPostcode = cleanPostcode(postcode);
    
    // Validate the postcode format (lowercase letters)
    if (!/^[1-9][0-9]{3}[a-z]{2}$/.test(cleanedPostcode)) {
      return NextResponse.json(
        { 
          exceptionId: 'PostcodeNl_Controller_Address_InvalidPostcodeException',
          message: 'Ongeldige postcode formaat' 
        },
        { status: 400 }
      );
    }
    
    // Validate the house number
    if (!/^\d+$/.test(houseNumber)) {
      return NextResponse.json(
        { 
          exceptionId: 'PostcodeNl_Controller_Address_InvalidHouseNumberException',
          message: 'Ongeldig huisnummer' 
        },
        { status: 400 }
      );
    }
    
    // Construct the URL - EXACT same as working PHP (always include addition, even if empty)
    const encodedPostcode = encodeURIComponent(cleanedPostcode);
    const encodedHouseNumber = encodeURIComponent(houseNumber);
    const encodedAddition = encodeURIComponent(addition || ''); // Always encode, even if empty
    
    const url = `${BASE_URL}/${encodedPostcode}/${encodedHouseNumber}/${encodedAddition}`;
    
    console.log('[DEBUG] Constructed URL:', url);
    
    // Create the Authorization header
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    console.log('[DEBUG] Auth string length before base64:', `${apiKey}:${apiSecret}`.length);
    console.log('[DEBUG] Base64 auth string length:', auth.length);
    
    // Make the request with improved headers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'User-Agent': 'NextJS/PostcodeAPI-v2',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        signal: controller.signal
      });
    } catch (fetchError) {
      console.error('🚨 Fetch request failed:', fetchError);
      return NextResponse.json(
        { 
          exceptionId: 'NetworkError',
          message: 'Er kon geen verbinding worden gemaakt met de adres-validatie service'
        },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeout);
    }
    
    console.log('🔥 Postcode.nl API Response Status:', response.status);
    console.log('🔥 Postcode.nl API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    // Parse the response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('🚨 Failed to parse JSON response:', parseError);
      return NextResponse.json(
        { 
          exceptionId: 'ParseError',
          message: 'Ongeldig response van de adres-validatie service'
        },
        { status: 502 }
      );
    }
    
    console.log('🔥 Postcode.nl API Response Data:', JSON.stringify(data, null, 2));
    
    // If the response is not OK, format the error
    if (!response.ok) {
      console.error('🚨 Postcode.nl API returned error status:', response.status);
      console.error('🚨 Error data:', JSON.stringify(data, null, 2));
      
      return NextResponse.json(
        { 
          exceptionId: data?.exceptionId || 'APIError',
          message: data?.exception || data?.message || `API Error: ${response.status} - ${response.statusText}`
        },
        { status: response.status }
      );
    }
    
    // Return the successful response
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('🚨 Unexpected error processing request:', error);
    return NextResponse.json(
      { 
        exceptionId: 'ServerError',
        message: 'Er is een onverwachte fout opgetreden bij het verwerken van uw verzoek'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Methode niet toegestaan' },
    { status: 405 }
  );
} 