// Initialiseert alle service clients wanneer de applicatie start
import { isMandrillConfigured } from './mail-service';
import { supabase } from './supabase';

// Dit wordt alleen op de server uitgevoerd
export const initServices = async () => {
  // Controleer Mandrill configuratie uit omgevingsvariabelen
  if (isMandrillConfigured()) {
    console.log('Mandrill client geïnitialiseerd vanuit omgevingsvariabelen');
  } else {
    console.warn('Mandrill client niet geïnitialiseerd. Controleer MANDRILL_API_KEY omgevingsvariabele.');
  }
  
  // Initialiseer de database (alleen op de server)
  try {
    // Controleer of de database URL is ingesteld
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('No Supabase URL found, skipping database initialization');
      return;
    }
    
    // Gebruik fetch om de setup route aan te roepen die de database initialiseert
    // Dit voorkomt problemen met directe servermodule imports
    if (typeof window === 'undefined') {
      // Dit wordt alleen op de server uitgevoerd
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        const response = await fetch(`${baseUrl}/api/setup`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          console.error('Database initialization failed:', data.error);
        } else {
          console.log('Database initialized successfully');
        }
      } catch (error) {
        console.error('Error calling setup endpoint:', error);
        console.log('Continuing without database initialization');
      }
    }
  } catch (error) {
    console.error('Error in database initialization process:', error);
    console.log('Application will continue but some features may not work properly');
  }
  
  // Andere services kunnen hier worden geïnitialiseerd
  // ...
};

// Exporteer dit zodat het kan worden aangeroepen in app/layout.tsx
export default initServices; 