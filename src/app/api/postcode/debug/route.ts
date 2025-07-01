import { NextResponse } from 'next/server';

export async function GET() {
  // Get environment variables
  const rawKey = process.env.POSTCODE_API_KEY;
  const rawSecret = process.env.POSTCODE_API_SECRET;
  
  // Trim them
  const key = rawKey?.trim();
  const secret = rawSecret?.trim();
  
  // Create auth string
  const auth = key && secret ? Buffer.from(`${key}:${secret}`).toString('base64') : 'NOT_SET';
  
  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasKey: !!rawKey,
      hasSecret: !!rawSecret,
      keyLength: rawKey?.length,
      secretLength: rawSecret?.length,
      trimmedKeyLength: key?.length,
      trimmedSecretLength: secret?.length,
      keyFirstChar: key ? key.charCodeAt(0) : null,
      keyLastChar: key ? key.charCodeAt(key.length - 1) : null,
      secretFirstChar: secret ? secret.charCodeAt(0) : null,
      secretLastChar: secret ? secret.charCodeAt(secret.length - 1) : null,
    },
    auth: {
      base64: auth,
      expectedBase64: 'SmlPT2ZZTlNYTm9kV21TM25UQ01XNkFmaW9ZbHZlbFhPNWNxYXpuSzBZdzpzY2R2cVJaYkhNa01kaUdkUjNqTmdobll0a3hUR1hjV0RwYVdOdUxiZEtqblR1OFZ3UQ==',
      matches: auth === 'SmlPT2ZZTlNYTm9kV21TM25UQ01XNkFmaW9ZbHZlbFhPNWNxYXpuSzBZdzpzY2R2cVJaYkhNa01kaUdkUjNqTmdobll0a3hUR1hjV0RwYVdOdUxiZEtqblR1OFZ3UQ=='
    }
  });
} 