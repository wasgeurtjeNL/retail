const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !service_role_key) {
  console.error("Supabase URL of Service Role Key ontbreekt in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, service_role_key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  {
    email: 'admin@wasgeurtje.nl',
    password: 'Admin123!',
    user_metadata: { role: 'admin' }
  },
  {
    email: 'retailer@wasgeurtje.nl',
    password: 'Retailer123!',
    user_metadata: { role: 'retailer' }
  }
];

const createUsers = async () => {
  console.log('Gebruikers aanmaken...');

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      user_metadata: user.user_metadata,
      email_confirm: true, // Auto-confirm the email
    });

    if (error) {
      console.error(`Fout bij aanmaken van gebruiker ${user.email}:`, error.message);
    } else {
      console.log(`Gebruiker ${data.user.email} succesvol aangemaakt met rol: ${data.user.user_metadata.role}`);
    }
  }

  console.log('Script voltooid.');
};

createUsers(); 