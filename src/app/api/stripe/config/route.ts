import { NextRequest, NextResponse } from 'next/server';

// Respond with appropriate CORS headers
function corsResponse(req: NextRequest, data: any, status = 200) {
  // Get the origin from the request or default to localhost
  const origin = req.headers.get('origin') || 'http://localhost:3000';
  
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    },
  });
}

// Main POST handler
export async function POST(req: NextRequest) {
  try {
    // We'll ignore the body since we're using hardcoded keys
    // Return success response with the hardcoded keys for confirmation
    return corsResponse(req, { 
      success: true,
      message: 'Stripe is configured with hardcoded test keys'
    });
  } catch (error) {
    console.error('Error setting Stripe keys:', error);
    return corsResponse(
      req,
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error setting Stripe keys' 
      },
      500
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(req: NextRequest) {
  return corsResponse(req, {});
} 