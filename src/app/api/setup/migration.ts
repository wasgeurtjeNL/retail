import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { runProfileMigrations } from './profile-migration';

// Helper om te checken of een tabel bestaat
async function tableExists(supabase: SupabaseClient, tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('*').limit(1);
  // Als error.code === 'PGRST116' => tabel bestaat NIET
  return !(error && error.code === 'PGRST116');
}

// Deze functie zorgt dat alle benodigde tabellen bestaan
export const runMigrations = async () => {
  console.log('Running database migrations...');
  try {
    // settings
    if (await tableExists(supabase, 'settings')) {
      console.log('settings table bestaat al');
    } else {
      console.warn('settings table ontbreekt! Maak deze aan via migratie of Supabase UI.');
    }
    // email_templates
    if (await tableExists(supabase, 'email_templates')) {
      console.log('email_templates table bestaat al');
    } else {
      console.warn('email_templates table ontbreekt! Maak deze aan via migratie of Supabase UI.');
    }
    // email_config
    if (await tableExists(supabase, 'email_config')) {
      console.log('email_config table bestaat al');
    } else {
      console.warn('email_config table ontbreekt! Maak deze aan via migratie of Supabase UI.');
    }
    // products
    if (await tableExists(supabase, 'products')) {
      console.log('products table bestaat al');
    } else {
      console.warn('products table ontbreekt! Maak deze aan via migratie of Supabase UI.');
    }
    // Run profile and notification preferences migrations
    await runProfileMigrations(supabase);
    console.log('Database migrations completed.');
    return { success: true };
  } catch (error) {
    console.error('Error running migrations:', error);
    return { success: false, error };
  }
};

// Voer deze functie uit tijdens het opstarten van de applicatie
export const initializeDatabase = async () => {
  try {
    // Controleer of we verbinding kunnen maken met de database
    // Gebruik de profiles tabel die we weten dat bestaat
    const { error } = await supabase.from('profiles').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "Relation does not exist", wat betekent dat de tabel nog niet bestaat
      // Dit is normaal tijdens de eerste setup, dus we gaan door met migraties
      console.log('Profiles table does not exist yet, continuing with migrations...');
    } else if (error) {
      console.error('Could not connect to database:', error);
      return { success: false, error };
    }
    // Voer migraties uit
    return await runMigrations();
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}; 