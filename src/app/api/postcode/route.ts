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

export async function GET(request: NextRequest) {
  console.log('🔥 POSTCODE API ROUTE CALLED!');
  console.log('🔥 REQUEST URL:', request.url);
  
  // Lees de API-sleutels binnen de functie om refresh problemen te voorkomen
  // .trim() verwijdert eventuele onzichtbare witruimte (spaties, etc.)
  const API_KEY = process.env.POSTCODE_API_KEY?.trim();
  const API_SECRET = process.env.POSTCODE_API_SECRET?.trim();
  
  // DEBUGGING: Log exact wat er wordt geladen
  console.log('[DEBUG] Raw POSTCODE_API_KEY from env:', JSON.stringify(process.env.POSTCODE_API_KEY));
  console.log('[DEBUG] Raw POSTCODE_API_SECRET from env:', JSON.stringify(process.env.POSTCODE_API_SECRET));
  console.log('[DEBUG] Trimmed API_KEY:', JSON.stringify(API_KEY));
  console.log('[DEBUG] Trimmed API_SECRET:', JSON.stringify(API_SECRET));
  console.log('[DEBUG] API_KEY length:', API_KEY?.length);
  console.log('[DEBUG] API_SECRET length:', API_SECRET?.length);
  
  // Check if API keys are configured
  if (!API_KEY || !API_SECRET) {
    console.error('🚨 API sleutels voor Postcode.nl zijn niet geconfigureerd in .env.local');
    console.error('🚨 POSTCODE_API_KEY exists:', !!process.env.POSTCODE_API_KEY);
    console.error('🚨 POSTCODE_API_SECRET exists:', !!process.env.POSTCODE_API_SECRET);
    console.error('🚨 Current working directory:', process.cwd());
    
    return NextResponse.json(
      { 
        exceptionId: 'ConfigurationError',
        message: 'De adres-validatie service is niet correct geconfigureerd. Check server logs.' 
      }, 
      { status: 500 }
    );
  }

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
  
  try {
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
    
    // Construct the URL - exact same structure as working PHP version
    const encodedPostcode = encodeURIComponent(cleanedPostcode);
    const encodedHouseNumber = encodeURIComponent(houseNumber);
    const encodedAddition = encodeURIComponent(addition || '');
    
    // Always include all three parameters like PHP version does
    const url = `${BASE_URL}/${encodedPostcode}/${encodedHouseNumber}/${encodedAddition}`;
    
    console.log('[DEBUG] Constructed URL:', url);
    
    // Create the Authorization header
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    console.log('[DEBUG] Auth string length before base64:', `${API_KEY}:${API_SECRET}`.length);
    console.log('[DEBUG] Base64 auth string length:', auth.length);
    console.log('[DEBUG] Auth string contains colon:', `${API_KEY}:${API_SECRET}`.includes(':'));
    console.log('[DEBUG] Auth header created successfully');
    
    console.log('🔥 OUR auth string:', auth);
    
    try {
      // Make the actual API call to Postcode.nl
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      console.log('🔥 Postcode.nl API Response Status:', response.status);
      console.log('🔥 Postcode.nl API Response Headers:', Object.fromEntries(response.headers.entries()));
      
      // Parse the response
      const data = await response.json();
      console.log('🔥 Postcode.nl API Response Data:', JSON.stringify(data, null, 2));
      
      // If the response is not OK, format the error
      if (!response.ok) {
        console.error('🚨 Postcode.nl API returned error status:', response.status);
        console.error('🚨 Error data:', JSON.stringify(data, null, 2));
        
        return NextResponse.json(
          { 
            exceptionId: data.exceptionId || 'APIError',
            message: data.exception || data.message || 'Er is een fout opgetreden bij het ophalen van het adres'
          },
          { status: response.status }
        );
      }
      
      // Return the successful response
      return NextResponse.json(data);
      
    } catch (apiError) {
      console.error('API call failed:', apiError);
      
      // In case of network error or other issues, return a generic error
      return NextResponse.json(
        { 
          exceptionId: 'APIConnectionError',
          message: 'Er kon geen verbinding worden gemaakt met de adres-validatie service'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
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