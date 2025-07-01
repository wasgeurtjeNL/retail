-- Supabase Database Setup Script
-- Dit script initialiseert alle benodigde tabellen en functies voor je retail applicatie

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Functie om tabellen aan te maken als ze nog niet bestaan
CREATE OR REPLACE FUNCTION create_table_if_not_exists(
  table_name TEXT,
  table_definition TEXT
) RETURNS void AS $$
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I (%s)', table_name, table_definition);
EXCEPTION
  WHEN duplicate_table THEN
    -- Tabel bestaat al, geen actie nodig
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Maak de retailers tabel
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Nederland',
  hear_about_us TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de products tabel
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  category TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de settings tabel
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de email_templates tabel
CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by TEXT
);

-- Maak de email_config tabel
CREATE TABLE IF NOT EXISTS email_config (
  id TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de orders tabel
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES retailers(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL,
  shipping_address JSONB,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'pending',
  payment_due_date TIMESTAMP WITH TIME ZONE,
  payment_intent_id TEXT,
  stripe_session_id TEXT,
  notes TEXT,
  tracking_code TEXT,
  shipping_provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de profiles tabel voor gebruikersprofielen
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  retailer_id UUID REFERENCES retailers(id),
  role TEXT DEFAULT 'retailer' CHECK (role IN ('admin', 'retailer')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de notification_preferences tabel
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  order_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Maak de wasstrips_applications tabel
CREATE TABLE IF NOT EXISTS wasstrips_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES retailers(id),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Nederland',
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Voeg indexes toe voor betere performance
CREATE INDEX IF NOT EXISTS idx_retailers_status ON retailers(status);
CREATE INDEX IF NOT EXISTS idx_retailers_email ON retailers(email);
CREATE INDEX IF NOT EXISTS idx_orders_retailer_id ON orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_retailer_id ON profiles(retailer_id);

-- Voeg RLS (Row Level Security) policies toe
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor retailers
CREATE POLICY "Retailers can view their own data" ON retailers
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can manage all retailers" ON retailers
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies voor products (iedereen kan producten zien)
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- RLS Policies voor orders
CREATE POLICY "Retailers can view their own orders" ON orders
  FOR SELECT USING (
    retailer_id IN (
      SELECT id FROM retailers WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Retailers can create their own orders" ON orders
  FOR INSERT WITH CHECK (
    retailer_id IN (
      SELECT id FROM retailers WHERE user_id = auth.uid()
    )
  );

-- Voeg enkele standaard instellingen toe
INSERT INTO settings (key, value) VALUES
  ('business_name', '"Wasgeurtje B.V."'),
  ('logo_url', '"/assets/images/branding/default-logo.png"'),
  ('accent_color', '"#e91e63"')
ON CONFLICT (key) DO NOTHING;

-- Voeg standaard email templates toe
INSERT INTO email_templates (key, name, description, subject, html, text) VALUES
  ('retailer_welcome', 'Retailer Welcome', 'Welcome email for new retailers', 'Welkom bij {{business_name}}!', 
   '<h1>Welkom {{retailer_name}}!</h1><p>We zijn blij je te verwelkomen als retailer.</p>', 
   'Welkom {{retailer_name}}! We zijn blij je te verwelkomen als retailer.')
ON CONFLICT (key) DO NOTHING;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 