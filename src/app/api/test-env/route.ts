// Test endpoint to check environment variables
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const envVars = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasGoogle: !!process.env.GOOGLE_PLACES_API_KEY,
    hasKvK: !!process.env.KVK_API_KEY,
    hasMandrill: !!process.env.MANDRILL_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    openAILength: process.env.OPENAI_API_KEY?.length || 0
  };
  
  return NextResponse.json(envVars);
} 