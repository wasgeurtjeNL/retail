import { NextRequest, NextResponse } from 'next/server';
import { getMandrillConfig, sendTestEmail } from '@/lib/mail-service';

// Deze route stelt de Mandrill e-mail configuratie in vanuit het admin panel
export async function POST(request: NextRequest) {
  try {
    // Retourneer een bericht dat de configuratie nu hardcoded is
    return NextResponse.json({ 
      success: true,
      message: 'Email configuratie is nu hardcoded en kan niet worden gewijzigd via de interface',
      hardcoded: true
    });
  } catch (error) {
    console.error('Error in email config endpoint:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het verwerken van het verzoek',
      hardcoded: true
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Haal de hardcoded configuratie op
    const config = getMandrillConfig();
    
    return NextResponse.json({ 
      configured: true,
      hardcoded: true,
      config: {
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        updatedAt: new Date().toISOString(),
        note: 'Deze configuratie is hardcoded en kan niet worden gewijzigd via de interface'
      }
    });
  } catch (error) {
    console.error('Error getting Mandrill config:', error);
    return NextResponse.json({ 
      configured: true,
      hardcoded: true,
      error: 'Er is een fout opgetreden bij het ophalen van de Mandrill configuratie'
    }, { status: 500 });
  }
} 