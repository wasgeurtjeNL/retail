import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Simple debug endpoint to check environment variables
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      openAILength: process.env.OPENAI_API_KEY?.length || 0,
      openAIPrefix: process.env.OPENAI_API_KEY?.substring(0, 12) || 'not-set',
      hasGoogle: !!process.env.GOOGLE_PLACES_API_KEY,
      hasKvK: !!process.env.KVK_API_KEY,
      hasMandrill: !!process.env.MANDRILL_API_KEY,
      hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  };
  
  return NextResponse.json(envCheck);
} 