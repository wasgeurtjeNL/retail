import { NextResponse } from 'next/server';

export async function GET() {
  // Hardcoded credentials voor test
  const API_KEY = 'JiOOfYNSXNodWmS3nTCMW6AfioYlvelXO5cqaznK0Yw';
  const API_SECRET = 'scdvqRZbHMkMdiGdR3jNghnYtkxTGXcWDpaWNuLbdKjnTu8VwQ';
  
  // Test URL
  const url = 'https://api.postcode.nl/rest/addresses/1343AS/12/';
  
  // Create auth header
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  
  console.log('Testing with hardcoded credentials...');
  console.log('URL:', url);
  console.log('Auth string:', auth);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Next.js/13'
      }
    });
    
    const text = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response body:', text);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        return NextResponse.json({ success: true, data });
      } catch (e) {
        return NextResponse.json({ success: true, text });
      }
    } else {
      return NextResponse.json({ 
        error: true, 
        status: response.status,
        statusText: response.statusText,
        body: text,
        headers: Object.fromEntries(response.headers.entries())
      }, { status: response.status });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 });
  }
} 