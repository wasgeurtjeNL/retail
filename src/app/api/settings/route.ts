import { NextRequest, NextResponse } from 'next/server';
import { supabase, ensureSupabaseConnection } from '@/lib/supabase';

// Helper functie voor veilig loggen van fouten
const logError = (prefix: string, error: any) => {
  try {
    if (error instanceof Error) {
      console.error(`${prefix}: ${error.name}: ${error.message}`);
      return;
    }
    
    if (typeof error === 'object' && error !== null) {
      // Check for empty object
      if (Object.keys(error).length === 0) {
        console.error(`${prefix}: [Leeg object - mogelijk een netwerkfout]`);
        return;
      }
      
      // Try to stringify, but handle empty objects specially
      try {
        const stringified = JSON.stringify(error);
        console.error(`${prefix}: ${stringified === '{}' ? '[Leeg foutobject]' : stringified}`);
      } catch (e) {
        console.error(`${prefix}: [Niet-serialiseerbaar object]`);
      }
      
      return;
    }
    
    // Last resort, convert to string
    console.error(`${prefix}: ${String(error)}`);
  } catch (loggingError) {
    console.error(`${prefix}: [Fout bij loggen]`);
  }
};

// Haal instellingen op (zoals logo URL)
export async function GET(request: NextRequest) {
  try {
    // Valideer de Supabase verbinding voordat we query's uitvoeren
    const isConnected = await ensureSupabaseConnection().catch(() => false);
    if (!isConnected) {
      console.error('[DEBUG] Settings API: Supabase verbinding niet gevalideerd');
      return NextResponse.json({ error: 'Database verbinding mislukt', code: 'connection-error' }, { status: 500 });
    }
    
    // Haal specifieke instelling op basis van query parameter
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (key) {
      // Haal één specifieke instelling op
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        logError('Error fetching setting', error);
        return NextResponse.json({ error: 'Kon instelling niet ophalen', code: 'query-error' }, { status: 500 });
      }

      return NextResponse.json({ setting: data });
    } else {
      // Haal alle instellingen op
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) {
        // Formatteer error als string om lege objecten te voorkomen
        logError('Error fetching settings', error);
        return NextResponse.json({ error: 'Kon instellingen niet ophalen', code: 'query-error' }, { status: 500 });
      }

      // Converteer naar key-value object voor gemakkelijker gebruik aan de client
      const settings: Record<string, any> = {};
      data.forEach(item => {
        settings[item.key] = item.value;
      });

      return NextResponse.json({ settings });
    }
  } catch (error) {
    logError('Error in settings API', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden', code: 'unexpected-error' }, { status: 500 });
  }
}

// Update instellingen
export async function POST(request: NextRequest) {
  try {
    // Valideer de Supabase verbinding voordat we query's uitvoeren
    const isConnected = await ensureSupabaseConnection().catch(() => false);
    if (!isConnected) {
      console.error('[DEBUG] Settings API: Supabase verbinding niet gevalideerd');
      return NextResponse.json({ error: 'Database verbinding mislukt', code: 'connection-error' }, { status: 500 });
    }
    
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Sleutel is verplicht', code: 'validation-error' }, { status: 400 });
    }

    const { error } = await supabase
      .from('settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      });

    if (error) {
      logError('Error updating setting', error);
      return NextResponse.json({ error: 'Kon instelling niet bijwerken', code: 'update-error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Instelling bijgewerkt' });
  } catch (error) {
    logError('Error in settings API', error);
    return NextResponse.json({ error: 'Er is een fout opgetreden', code: 'unexpected-error' }, { status: 500 });
  }
} 