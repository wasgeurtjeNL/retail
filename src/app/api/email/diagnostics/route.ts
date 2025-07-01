import { NextRequest, NextResponse } from 'next/server';
import { checkEmailServiceStatus } from '@/lib/email-debug';
import { getMandrillConfig } from '@/lib/mail-service';

// This is a diagnostic endpoint for email service
export async function GET() {
  try {
    // Check email service status
    const emailStatus = await checkEmailServiceStatus();
    
    // Add information about hardcoded configuration
    const config = getMandrillConfig();
    
    return NextResponse.json({ 
      success: true,
      emailStatus: {
        ...emailStatus,
        hardcoded: true,
        hardcodedConfig: {
          apiKey: config.apiKey,
          fromEmail: config.fromEmail,
          fromName: config.fromName
        }
      }
    });
  } catch (error) {
    console.error('Error checking email diagnostics:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error checking email diagnostics'
    }, { status: 500 });
  }
}

// This endpoint is now disabled since we use hardcoded values
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: false,
    error: 'Email configuratie is nu hardcoded en kan niet worden gewijzigd via de API'
  }, { status: 403 });
} 