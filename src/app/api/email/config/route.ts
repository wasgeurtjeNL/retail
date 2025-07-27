import { NextRequest, NextResponse } from 'next/server';
import { testMandrillConnection, getEmailConfiguration } from '@/lib/mail-service';

// GET - Haal huidige email configuratie op
export async function GET() {
  console.log('[EMAIL CONFIG] Fetching email configuration');
  
  try {
    const config = getEmailConfiguration();
    
    // Test Mandrill verbinding
    const connectionTest = await testMandrillConnection();
    
    return NextResponse.json({
      success: true,
      configuration: config,
      connection: connectionTest,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[EMAIL CONFIG] Error fetching configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch email configuration',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Test Mandrill verbinding met specifieke key
export async function POST(request: NextRequest) {
  console.log('[EMAIL CONFIG] Testing Mandrill configuration');
  
  try {
    const body = await request.json();
    const { action, apiKey } = body;

    if (action === 'test-connection') {
      const result = await testMandrillConnection();
      
      return NextResponse.json({
        success: true,
        test: result,
        recommendations: result.success ? [] : [
          'Controleer of je MANDRILL_API_KEY correct is ingesteld in .env.local',
          'Zorg ervoor dat de API key het format md-xxxxxxxxxxxxxxxxxx heeft',
          'Verifieer dat je Mandrill account actief is',
          'Controleer of de API key de juiste permissies heeft voor het verzenden van emails'
        ]
      });
    }

    if (action === 'validate-key' && apiKey) {
      // Basic format validation
      const isValidFormat = /^md-[a-zA-Z0-9_-]{22}$/.test(apiKey);
      
      return NextResponse.json({
        success: true,
        validation: {
          format: isValidFormat,
          length: apiKey.length,
          prefix: apiKey.startsWith('md-'),
          recommendations: isValidFormat ? 
            ['API key format is correct'] : 
            [
              'Mandrill API keys should start with "md-"',
              'API keys should be 26 characters long',
              'Check for any extra spaces or hidden characters'
            ]
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[EMAIL CONFIG] Error testing configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test email configuration',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 