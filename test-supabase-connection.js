// Test script om Supabase verbinding te controleren
// Gebruik: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Checking Supabase configuration...\n');

// Check environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Environment variables niet gevonden!');
  console.error('   Zorg dat je .env.local bestand bestaat met:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✅ Environment variables gevonden');
console.log(`📍 URL: ${supabaseUrl}`);
console.log(`🔑 Key: ${supabaseAnonKey.substring(0, 20)}...`);

// Test connection
try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('\n🔌 Testing connection...');
  
  // Try a simple query
  const { data, error } = await supabase
    .from('_test_connection')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('✅ Verbinding succesvol! (Tabel bestaat niet, maar dat is OK)');
      console.log('\n📊 Nu kun je het SQL script uitvoeren in Supabase om tabellen aan te maken.');
    } else {
      console.error('❌ Verbindingsfout:', error.message);
    }
  } else {
    console.log('✅ Verbinding succesvol!');
  }
  
  // Test of we tabellen kunnen ophalen
  console.log('\n📋 Checking for existing tables...');
  const { data: tables, error: tablesError } = await supabase
    .from('products')
    .select('count')
    .limit(1);
    
  if (!tablesError) {
    console.log('✅ Products tabel gevonden!');
  } else if (tablesError.message.includes('does not exist')) {
    console.log('⚠️  Products tabel bestaat nog niet - voer setup-supabase.sql uit');
  }
  
} catch (error) {
  console.error('❌ Onverwachte fout:', error.message);
}

console.log('\n🎉 Test voltooid!'); 