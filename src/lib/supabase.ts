import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

// Basic logging functions to replace the complex logger
const logError = (message: string, error?: any) => {
  console.error(message, error);
  if (typeof window !== 'undefined') {
    toast.error(message);
  }
};

const logInfo = (message: string) => {
  console.log(message);
};

const logWarning = (message: string) => {
  console.warn(message);
};

// Helper functie om te checken of we op de server of client draaien
const isServer = typeof window === 'undefined';

// Eenmalige check voor de Supabase verbinding
let isSupabaseConnectionValidated = false;
let supabaseClientInstance: SupabaseClient | null = null;

// Functie om de connectiviteit met Supabase te valideren
export const validateSupabaseConnection = async (client: SupabaseClient): Promise<boolean> => {
    // Sla de validatie over als deze al succesvol was
    if (isSupabaseConnectionValidated) return true;

    // Sla de validatie over op de server om onnodige checks te voorkomen
    if (isServer) {
        // logMessage('debug', 'supabase', 'Skipping connection validation on server-side.');
        isSupabaseConnectionValidated = true;
        return true;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Basischecks voor de aanwezigheid van de keys
    if (!supabaseUrl || !supabaseAnonKey) {
        logError('[Supabase] URL of Anon Key ontbreekt in .env.local', { url: !!supabaseUrl, key: !!supabaseAnonKey });
        return false;
    }

    // Controleer op placeholder/mock waarden
    if (
        supabaseUrl.includes('mock-') ||
        supabaseUrl.includes('your-project-url') ||
        supabaseAnonKey.includes('mock-credentials') ||
        supabaseAnonKey.includes('your-anon-key')
    ) {
        logWarning('[Supabase] Placeholder of mock credentials worden gebruikt. De verbinding wordt niet gevalideerd.');
        return false;
    }

    try {
        // Time-out implementatie om oneindig wachten te voorkomen
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase connection validation timed out after 3 seconds')), 3000)
        );

        // Voer een simpele, lichte query uit op een bestaande, publieke tabel (settings)
        const { error } = await Promise.race([
            client.from('settings').select('setting_key').limit(1),
            timeoutPromise
        ]);

        // Elke fout hier is nu een echte fout, aangezien de tabel en kolom moeten bestaan.
        if (error) {
            logError('[Supabase] Connection validation failed', error);
            isSupabaseConnectionValidated = false;
            return false;
        }

        logInfo('[Supabase] Connection validated successfully');
        isSupabaseConnectionValidated = true;
        return true;
    } catch (error: any) {
        logError('[Supabase] Exception during connection validation', error);
        isSupabaseConnectionValidated = false;
        return false;
    }
};

// Singleton Supabase client
export const getSupabase = (): SupabaseClient => {
    if (supabaseClientInstance) {
        return supabaseClientInstance;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
        logError('[Supabase] URL en Anon Key zijn verplicht.');
        
        // In development, maak een mock client aan in plaats van een error te gooien
        if (typeof window !== 'undefined') {
            console.warn('[Supabase] Using mock client for development');
            supabaseClientInstance = createClient(
                'https://mock-project.supabase.co',
                'mock-anon-key'
            );
            return supabaseClientInstance;
        }
        
        throw new Error('Supabase URL en Anon Key zijn niet geconfigureerd in .env.local');
    }

    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    
    // Valideer de verbinding asynchroon zonder het aanmaken te blokkeren
    validateSupabaseConnection(supabaseClientInstance);

    return supabaseClientInstance;
};

// Helper functie om Supabase verbinding te controleren
export const ensureSupabaseConnection = async (): Promise<boolean> => {
    const client = getSupabase();
    return await validateSupabaseConnection(client);
};

// Exporteer de client direct voor eenvoudig gebruik
// Gebruik een try-catch om te voorkomen dat de hele module faalt als env vars ontbreken
let supabaseInstance: SupabaseClient | null = null;

try {
    supabaseInstance = getSupabase();
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    // Maak een mock client aan voor development
    if (typeof window !== 'undefined') {
        console.warn('Using mock Supabase client for development');
        supabaseInstance = createClient(
            'https://mock-project.supabase.co',
            'mock-anon-key'
        );
    }
}

export const supabase = supabaseInstance!;

export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting current user:', error);
        return null;
    }
    return user;
};

export const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
    return supabase.auth.signOut();
};

export const clearPersistentAuthIfNeeded = () => {
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.startsWith('supabase.auth.token')) {
        localStorage.removeItem(key);
      }
    });
  }
};

export const resetApplicationData = async () => {
    console.warn("RESETTING ALL WASSTRIPS APPLICATIONS");
    const { error } = await supabase.from('wasstrips_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.error("Error resetting wasstrips_applications", error);
    return { error };
};

export type Product = {
    id: string;
    name: string;
    description_frontend: string;
    description_internal: string;
    price: number;
    sku: string;
    category: string;
    image_url: string;
    stock_quantity: number;
    badge_text?: string;
    is_active: boolean;
    created_at: string;
};

export const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching products:', error);
        return []; // Return empty array on error
    }
    return data as Product[];
};

export const getPendingRetailers = async () => {
    const { data, error } = await supabase
        .from('profiles') // <--- HIER IS HET VERSCHIL
        .select('*')
        .eq('role', 'retailer')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending retailer profiles:', error);
        return [];
    }
    return data;
};

// Haal goedgekeurde retailers op uit de profiles tabel
export const getApprovedRetailers = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'retailer')
        .eq('status', 'active') // 'active' is de gemapte status van 'approved'
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching approved retailer profiles:', error);
        return [];
    }
    
    // Map de data naar het verwachte retailer format
    return data.map(profile => ({
        id: profile.id,
        user_id: profile.id,
        business_name: profile.company_name || 'Onbekend bedrijf',
        contact_name: profile.full_name || 'Onbekende naam',
        email: profile.email,
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        postal_code: profile.postal_code || '',
        country: profile.country || 'Nederland',
        status: 'approved', // Voor de UI tonen we dit als 'approved'
        created_at: profile.created_at
    }));
};

export const getOrders = async () => {
    const { data, error } = await supabase
        .from('orders')
        .select(`*, profiles ( email, company_name )`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
    return data;
};

export const addProduct = async (productData: Partial<Product>) => {
    const { data, error } = await supabase.from('products').insert(productData).select().single();
    return { product: data, error };
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    return { product: data, error };
};

export const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    return { error };
};

export type Retailer = {
  id: string;
  user_id: string | null;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export const registerRetailer = async (retailerData: Partial<Retailer>) => {
  console.log('[SUPABASE] Poging tot registreren van retailer:', retailerData);
  
  if (!retailerData.status) {
    retailerData.status = 'pending';
  }
  
  if (!retailerData.created_at) {
    retailerData.created_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('retailers')
    .insert([retailerData])
    .select()
    .single();

  if (error) {
    console.error('[SUPABASE] Fout bij registreren retailer:', error);
  } else {
    console.log('[SUPABASE] Retailer succesvol geregistreerd:', data);
  }
  
  return { retailer: data as Retailer, error };
};

export const getRetailers = async (status?: 'pending' | 'approved' | 'rejected') => {
  let query = supabase.from('retailers').select('*');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching retailers:', error);
    return [];
  }
  return data;
};

// Haal een specifieke retailer op uit de profiles tabel
export const getRetailerById = async (id: string) => {
  console.log('[getRetailerById] Looking for retailer with ID:', id);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'retailer');

  console.log('[getRetailerById] Query result:', { data, error });

  if (error) {
    console.error('Error fetching retailer by ID:', error);
    return { retailer: null, error };
  }

  // Als er geen data is of een lege array, probeer zonder role filter
  if (!data || data.length === 0) {
    console.log('[getRetailerById] No retailer found with role filter, trying without role filter');
    
    const { data: dataWithoutRole, error: errorWithoutRole } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id);
      
    console.log('[getRetailerById] Query without role filter result:', { data: dataWithoutRole, error: errorWithoutRole });
    
    if (errorWithoutRole || !dataWithoutRole || dataWithoutRole.length === 0) {
      console.error('Retailer not found even without role filter');
      return { retailer: null, error: errorWithoutRole || new Error('Retailer not found') };
    }
    
    // Gebruik de data zonder role filter
    const profile = dataWithoutRole[0];
    const retailer = {
      id: profile.id,
      user_id: profile.id,
      business_name: profile.company_name || 'Onbekend bedrijf',
      contact_name: profile.full_name || 'Onbekende naam',
      email: profile.email,
      phone: profile.phone || '',
      address: profile.address || '',
      city: profile.city || '',
      postal_code: profile.postal_code || '',
      country: profile.country || 'Nederland',
      status: profile.status as 'pending' | 'approved' | 'rejected',
      created_at: profile.created_at
    };
    
    console.log('[getRetailerById] Mapped retailer data:', retailer);
    return { retailer, error: null };
  }

  // Map de profile data naar retailer format voor backwards compatibility
  const profile = data[0];
  const retailer = {
    id: profile.id,
    user_id: profile.id, // Voor profiles is id hetzelfde als user_id
    business_name: profile.company_name || 'Onbekend bedrijf',
    contact_name: profile.full_name || 'Onbekende naam',
    email: profile.email,
    phone: profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    postal_code: profile.postal_code || '',
    country: profile.country || 'Nederland',
    status: profile.status as 'pending' | 'approved' | 'rejected',
    created_at: profile.created_at
  };

  console.log('[getRetailerById] Mapped retailer data:', retailer);
  return { retailer, error: null };
};

// Update de status van een retailer in de profiles tabel
export const updateRetailerStatus = async (id: string, status: 'approved' | 'rejected') => {
  console.log(`[updateRetailerStatus] Updating retailer ${id} to status: ${status}`);
  
  const statusMapping = {
    'approved': 'active',
    'rejected': 'suspended'
  };

  const { error } = await supabase
    .from('profiles')
    .update({ 
      status: statusMapping[status],
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating retailer status:', error);
  } else {
    console.log(`[updateRetailerStatus] Successfully updated retailer ${id} to ${statusMapping[status]}`);
  }

  return { error };
};