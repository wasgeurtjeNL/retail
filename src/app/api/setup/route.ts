import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from './migration';

// Deze route initialiseert de database bij de eerste keer opstarten
export async function GET(request: NextRequest) {
  try {
    const result = await initializeDatabase();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Kon de database niet initialiseren'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database succesvol geïnitialiseerd'
    });
  } catch (error) {
    console.error('Error in setup route:', error);
    return NextResponse.json({
      success: false,
      error: 'Er is een fout opgetreden bij het initialiseren van de database'
    }, { status: 500 });
  }
} 