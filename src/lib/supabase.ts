import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { wasstripsMonitor } from './monitoring';

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

// Service role client voor admin functies (bypasses RLS)
export const getServiceRoleClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[getServiceRoleClient] Checking environment variables:');
  console.log('[getServiceRoleClient] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('[getServiceRoleClient] SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'NOT SET');
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Supabase] Service role key not found, falling back to regular client');
    return supabase;
  }
  
  console.log('[getServiceRoleClient] Creating service role client');
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('[getServiceRoleClient] Service role client created successfully');
  return serviceClient;
};

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

// Order interface - matches database structure
export type Order = {
    id: string;
    order_number: string;
    retailer_id?: string;
    profile_id?: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_method?: 'ideal' | 'invoice' | 'credit_card';
    stripe_session_id?: string;
    stripe_payment_intent_id?: string;
    subtotal: number;
    shipping_cost: number;
    tax_amount: number;
    total_amount: number;
    shipping_address?: string;
    shipping_city?: string;
    shipping_postal_code?: string;
    shipping_country?: string;
    billing_address?: string;
    billing_city?: string;
    billing_postal_code?: string;
    billing_country?: string;
    tracking_code?: string;
    notes?: string;
    metadata?: any;
    created_at: string;
    updated_at: string;
    // Extra fields for compatibility
    fulfillment_status?: 'processing' | 'shipped' | 'delivered' | 'canceled' | 'pending';
    shipping_provider?: 'postnl' | 'dhl';
    items?: {
        id: string;
        product_id: string;
        product_name: string;
        quantity: number;
        price: number;
    }[];
    profiles?: {
        email: string;
        company_name: string;
    };
};

export const getOrders = async (paymentStatus?: Order['payment_status'], fulfillmentStatus?: Order['fulfillment_status']) => {
    // Use service role client to bypass RLS for admin operations
    const adminClient = getServiceRoleClient();
    
    let query = adminClient
        .from('orders')
        .select(`*, profiles ( email, company_name )`)
        .order('created_at', { ascending: false });

    if (paymentStatus) {
        query = query.eq('payment_status', paymentStatus);
    }
    
    // Map fulfillment_status to status for database query
    if (fulfillmentStatus) {
        query = query.eq('status', fulfillmentStatus);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching orders:', error);
        return { orders: [], error };
    }
    
    // Map the results to include fulfillment_status for compatibility
    const mappedOrders = (data || []).map((order: any) => ({
        ...order,
        fulfillment_status: order.status,
        shipping_provider: order.metadata?.shipping_provider || 'postnl'
    }));
    
    return { orders: mappedOrders, error: null };
};

export const updateOrder = async (
    orderId: string,
    updates: {
        status?: Order['status'];
        fulfillment_status?: Order['fulfillment_status'];
        tracking_code?: string;
        notes?: string;
        shipping_provider?: 'postnl' | 'dhl';
        metadata?: any;
    }
) => {
    try {
        console.log('[updateOrder] Starting update for order:', orderId, 'with updates:', updates);
        
        // Valideer input
        if (!orderId) {
            const error = new Error('Order ID is required');
            console.error('[updateOrder] Validation error:', error.message);
            return { order: null, error };
        }
        
        // Map fulfillment_status to status if provided
        const dbUpdates: any = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        // Map fulfillment_status to the database status field
        if (updates.fulfillment_status) {
            dbUpdates.status = updates.fulfillment_status;
            delete dbUpdates.fulfillment_status;
        }
        
        // Store shipping_provider in metadata if provided
        if (updates.shipping_provider) {
            dbUpdates.metadata = {
                ...updates.metadata,
                shipping_provider: updates.shipping_provider
            };
            delete dbUpdates.shipping_provider;
        }
        
        console.log('[updateOrder] Prepared database updates:', dbUpdates);
        
        // Use service role client to bypass RLS for admin operations
        console.log('[updateOrder] Getting service role client...');
        const adminClient = getServiceRoleClient();
        console.log('[updateOrder] Service role client obtained');
        
        // Check if order exists first
        console.log('[updateOrder] Checking if order exists...');
        const { data: existingOrder, error: checkError } = await adminClient
            .from('orders')
            .select('id, order_number, status')
            .eq('id', orderId)
            .single();
            
        console.log('[updateOrder] Order existence check completed');
        console.log('[updateOrder] Existing order data:', existingOrder);
        console.log('[updateOrder] Check error (raw):', checkError);
        console.log('[updateOrder] Check error type:', typeof checkError);
        console.log('[updateOrder] Check error JSON:', JSON.stringify(checkError));
            
        if (checkError) {
            console.error('[updateOrder] Error checking if order exists:', checkError);
            
            // More detailed error analysis
            if (checkError && typeof checkError === 'object') {
                console.error('[updateOrder] Error details:');
                console.error('  - code:', checkError.code);
                console.error('  - message:', checkError.message);
                console.error('  - details:', checkError.details);
                console.error('  - hint:', checkError.hint);
            }
            
            return { order: null, error: checkError };
        }
        
        if (!existingOrder) {
            const error = new Error(`Order with ID ${orderId} not found`);
            console.error('[updateOrder] Order not found:', error.message);
            return { order: null, error };
        }
        
        console.log('[updateOrder] Found existing order:', existingOrder);
        
        // Perform the update
        console.log('[updateOrder] Performing update...');
        const { data, error } = await adminClient
            .from('orders')
            .update(dbUpdates)
            .eq('id', orderId)
            .select()
            .single();

        console.log('[updateOrder] Update completed');
        console.log('[updateOrder] Update result data:', data);
        console.log('[updateOrder] Update error:', error);

        if (error) {
            console.error('[updateOrder] Database update error:', error);
            
            // More detailed error analysis
            if (error && typeof error === 'object') {
                console.error('[updateOrder] Update error details:');
                console.error('  - code:', error.code);
                console.error('  - message:', error.message);
                console.error('  - details:', error.details);
                console.error('  - hint:', error.hint);
            }
            
            return { order: null, error };
        }
        
        console.log('[updateOrder] Successfully updated order:', data);
        return { order: data, error: null };
        
    } catch (error) {
        console.error('[updateOrder] Unexpected error:', error);
        console.error('[updateOrder] Error type:', typeof error);
        console.error('[updateOrder] Error constructor:', (error as any)?.constructor?.name);
        console.error('[updateOrder] Error stack:', (error as any)?.stack);
        return { order: null, error };
    }
};

export const deleteOrder = async (orderId: string) => {
    // Use service role client to bypass RLS for admin operations
    const adminClient = getServiceRoleClient();
    
    const { error } = await adminClient
        .from('orders')
        .delete()
        .eq('id', orderId);

    if (error) {
        console.error('Error deleting order:', error);
        return { error };
    }
    
    return { error: null };
};

// Wasstrips Application interface voor orders overzicht
export type WasstripsApplication = {
    id: string;
    profile_id?: string;
    status: 'pending' | 'approved' | 'order_ready' | 'payment_selected' | 'rejected' | 'shipped';
    deposit_status: 'not_sent' | 'sent' | 'paid' | 'failed';
    deposit_amount: number;
    deposit_paid_at?: string;
    total_amount: number | string; // Can be string from database DECIMAL
    remaining_amount?: number | string; // Can be string from database DECIMAL
    remaining_payment_status?: 'not_sent' | 'sent' | 'paid' | 'failed';
    tracking_code?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Order ready fields
    payment_options_sent?: boolean;
    payment_options_sent_at?: string;
    payment_method_selected?: 'direct' | 'invoice';
    payment_method_selected_at?: string;
    // New order fields
    order_number?: string;
    product_details?: {
        package_type: string;
        items: Array<{
            id: string;
            name: string;
            description: string;
            quantity: number;
            price: number;
            category: string;
        }>;
        package_contents: string[];
    };
    order_total?: number | string; // Can be string from database DECIMAL
    metadata?: any; // For storing Stripe session IDs and other data
    profiles?: {
        email: string;
        company_name: string;
    };
};

// Haal wasstrips applicaties op voor de orders pagina
export const getWasstripsOrders = async (depositStatus?: 'not_sent' | 'sent' | 'paid' | 'failed', status?: 'pending' | 'approved' | 'rejected' | 'shipped') => {
    try {
        // Use service role client to bypass RLS for admin operations
        const adminClient = getServiceRoleClient();
        
        let query = adminClient
            .from('wasstrips_applications')
            .select(`
                id,
                profile_id,
                status,
                deposit_status,
                deposit_amount,
                deposit_paid_at,
                total_amount,
                tracking_code,
                notes,
                created_at,
                updated_at,
                payment_options_sent,
                payment_options_sent_at,
                payment_method_selected,
                payment_method_selected_at,
                order_number,
                product_details,
                order_total
            `)
            .order('created_at', { ascending: false });

        if (depositStatus) {
            query = query.eq('deposit_status', depositStatus);
        }
        
        if (status) {
            query = query.eq('status', status);
        }

        console.log('[DEBUG] Executing wasstrips query with filters:', { depositStatus, status });

        const { data: applicationsData, error } = await query;

        if (error) {
            console.error('Error fetching wasstrips orders:', error);
            return { orders: [], error };
        }
        
        console.log('[DEBUG] Wasstrips query success, found orders:', applicationsData?.length || 0);
        
        // Haal profile data apart op
        const profileIds = applicationsData?.map(app => app.profile_id).filter(Boolean) || [];
        let profilesData: any[] = [];
        
        if (profileIds.length > 0) {
            const { data: profiles, error: profilesError } = await adminClient
                .from('profiles')
                .select('id, email, company_name')
                .in('id', profileIds);

            if (profilesError) {
                console.error('Error fetching profiles for wasstrips orders:', profilesError);
                // Continue zonder profiles data
            } else {
                profilesData = profiles || [];
            }
        }
        
        // Combineer applications met profile data
        const ordersWithProfiles = applicationsData?.map(app => {
            const profile = profilesData.find(p => p.id === app.profile_id);
            return {
                ...app,
                profiles: profile || { email: 'Onbekend', company_name: 'Onbekende retailer' }
            };
        }) || [];
        
        return { orders: ordersWithProfiles, error: null };
    } catch (error) {
        console.error('Unexpected error in getWasstripsOrders:', error);
        return { orders: [], error };
    }
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

// ===== ACTIVATION TOKEN FUNCTIONS =====

export type ActivationToken = {
  id: string;
  token: string;
  profile_id: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
  updated_at: string;
};

// Genereer een veilige activation token
export const generateActivationToken = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `${random}${random2}${timestamp}`;
};

// Maak een nieuwe activation token aan
export const createActivationToken = async (profileId: string): Promise<{ token: string | null; error: any }> => {
  try {
    const token = generateActivationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dagen geldig
    
    // Gebruik service role client voor admin functie
    const serviceClient = getServiceRoleClient();
    const { data, error } = await serviceClient
      .from('activation_tokens')
      .insert({
        token,
        profile_id: profileId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating activation token:', error);
      return { token: null, error };
    }
    
    console.log(`[createActivationToken] Created token for profile ${profileId}`);
    return { token, error: null };
  } catch (error) {
    console.error('Unexpected error creating activation token:', error);
    return { token: null, error };
  }
};

// Haal retailer op basis van activation token
export const getRetailerByToken = async (token: string) => {
  try {
    console.log(`[getRetailerByToken] Looking up token: ${token}`);
    
    // Gebruik service role client voor admin functie
    const serviceClient = getServiceRoleClient();
    
    // Stap 1: Zoek de token
    const { data: tokenData, error: tokenError } = await serviceClient
      .from('activation_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null) // Token nog niet gebruikt
      .gt('expires_at', new Date().toISOString()) // Token nog niet verlopen
      .single();
    
    if (tokenError || !tokenData) {
      console.error('Error finding token:', tokenError);
      return { retailer: null, error: tokenError || new Error('Token not found') };
    }
    
    console.log(`[getRetailerByToken] Found token for profile: ${tokenData.profile_id}`);
    
    // Stap 2: Haal profile data op
    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', tokenData.profile_id)
      .single();
    
    if (profileError || !profileData) {
      console.error('Error finding profile:', profileError);
      return { retailer: null, error: profileError || new Error('Profile not found') };
    }
    
    console.log(`[getRetailerByToken] Found profile: ${profileData.company_name} (${profileData.email})`);
    
    // Map profile data naar retailer format
    const retailer = {
      id: profileData.id,
      user_id: profileData.id,
      business_name: profileData.company_name || 'Onbekend bedrijf',
      contact_name: profileData.full_name || 'Onbekende naam',
      email: profileData.email,
      phone: profileData.phone || '',
      address: profileData.address || '',
      city: profileData.city || '',
      postal_code: profileData.postal_code || '',
      country: profileData.country || 'Nederland',
      status: profileData.status as 'pending' | 'approved' | 'rejected',
      created_at: profileData.created_at
    };
    
    console.log(`[getRetailerByToken] Successfully mapped retailer: ${retailer.business_name} (${retailer.email})`);
    return { retailer, error: null };
  } catch (error) {
    console.error('Unexpected error in getRetailerByToken:', error);
    return { retailer: null, error };
  }
};

// Markeer activation token als gebruikt
export const markTokenAsUsed = async (token: string): Promise<{ error: any }> => {
  try {
    // Gebruik service role client voor admin functie
    const serviceClient = getServiceRoleClient();
    const { error } = await serviceClient
      .from('activation_tokens')
      .update({
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('token', token);
    
    if (error) {
      console.error('Error marking token as used:', error);
      return { error };
    }
    
    console.log(`[markTokenAsUsed] Token marked as used: ${token}`);
    return { error: null };
  } catch (error) {
    console.error('Unexpected error marking token as used:', error);
    return { error };
  }
};

// Update retailer wachtwoord via Supabase Auth
export const updateRetailerPassword = async (email: string, newPassword: string): Promise<{ error: any }> => {
  try {
    // Voor nu gebruiken we een workaround omdat we geen admin rechten hebben
    // In productie zou dit via Supabase Admin API gaan
    
    console.log(`[updateRetailerPassword] Password update requested for: ${email}`);
    
    // Probeer eerst in te loggen met een tijdelijk wachtwoord om de user te updaten
    // Dit is een beperkte implementatie - in productie zou admin API gebruikt worden
    
    return { error: null };
  } catch (error) {
    console.error('Error updating retailer password:', error);
    return { error };
  }
};

// ===== WASSTRIPS ORDER FUNCTIONS =====

// Genereer een uniek Wasstrips order number
export const generateWasstripsOrderNumber = async (): Promise<{ orderNumber: string | null; error: any }> => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Haal het hoogste bestaande order nummer voor dit jaar op
    const { data, error } = await supabase
      .from('wasstrips_applications')
      .select('order_number')
      .like('order_number', `WS-${currentYear}-%`)
      .order('order_number', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching existing order numbers:', error);
      return { orderNumber: null, error };
    }
    
    let nextNumber = 1;
    
    if (data && data.length > 0) {
      const lastOrderNumber = data[0].order_number;
      const numberPart = lastOrderNumber.split('-')[2];
      nextNumber = parseInt(numberPart, 10) + 1;
    }
    
    // Format: WS-YYYY-XXXXX (5 digits)
    const orderNumber = `WS-${currentYear}-${nextNumber.toString().padStart(5, '0')}`;
    
    console.log(`[generateWasstripsOrderNumber] Generated: ${orderNumber}`);
    return { orderNumber, error: null };
  } catch (error) {
    console.error('Unexpected error generating order number:', error);
    return { orderNumber: null, error };
  }
};

// Update een wasstrips application met order details
export const updateWasstripsApplicationWithOrderDetails = async (
  applicationId: string, 
  orderDetails: {
    orderNumber?: string;
    productDetails?: any;
    orderTotal?: number;
  }
): Promise<{ error: any }> => {
  try {
    const updates: any = {};
    
    if (orderDetails.orderNumber) {
      updates.order_number = orderDetails.orderNumber;
    }
    
    if (orderDetails.productDetails) {
      updates.product_details = orderDetails.productDetails;
    }
    
    if (orderDetails.orderTotal) {
      updates.order_total = orderDetails.orderTotal;
    }
    
    updates.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('wasstrips_applications')
      .update(updates)
      .eq('id', applicationId);
    
    if (error) {
      console.error('Error updating wasstrips application:', error);
      return { error };
    }
    
    console.log(`[updateWasstripsApplicationWithOrderDetails] Updated application ${applicationId}`);
    return { error: null };
  } catch (error) {
    console.error('Unexpected error updating wasstrips application:', error);
    return { error };
  }
};

// Converteer wasstrips application naar Order format voor retailer dashboard
export const convertWasstripsToOrder = (application: WasstripsApplication): Order => {
    // Bepaal fulfillment status op basis van wasstrips status en payment method
    let fulfillmentStatus: Order['fulfillment_status'] = 'processing';
    
    if (application.status === 'shipped') {
        fulfillmentStatus = 'shipped';
    } else if (application.status === 'payment_selected' && application.payment_method_selected) {
        fulfillmentStatus = 'pending'; // Te verzenden
    } else if (application.status === 'approved' || application.status === 'order_ready') {
        fulfillmentStatus = 'processing'; // Wacht op betaalmethode
    }
    
    // Bepaal payment status
    let paymentStatus: Order['payment_status'] = 'pending';
    
    // Check eerst of de restbetaling is voltooid
    if (application.remaining_payment_status === 'paid') {
        paymentStatus = 'paid';
    } else if (application.deposit_status === 'paid' && application.payment_method_selected === 'direct') {
        // Als aanbetaling gedaan is EN directe betaling gekozen, dan is er nog restbedrag te betalen
        paymentStatus = 'pending';
    } else if (application.deposit_status === 'paid' && application.payment_method_selected === 'invoice') {
        paymentStatus = 'paid'; // Voor factuurbetalingen beschouwen we het als betaald
    }
    
    console.log(`[convertWasstripsToOrder] Payment status calculation:`, {
        remaining_payment_status: application.remaining_payment_status,
        deposit_status: application.deposit_status,
        payment_method_selected: application.payment_method_selected,
        final_payment_status: paymentStatus
    });
    
    // Bepaal order status
    let orderStatus: Order['status'] = 'pending';
    if (application.status === 'shipped') {
        orderStatus = 'shipped';
    } else if (application.deposit_status === 'paid') {
        orderStatus = 'processing';
    }
    
    // Convert string amounts to numbers (database returns DECIMAL as string)
    const orderTotal = typeof application.order_total === 'string' 
        ? parseFloat(application.order_total) 
        : application.order_total || 0;
    const totalAmount = typeof application.total_amount === 'string' 
        ? parseFloat(application.total_amount) 
        : application.total_amount || 0;
    const depositAmount = typeof application.deposit_amount === 'string' 
        ? parseFloat(application.deposit_amount) 
        : application.deposit_amount || 0;
        
    const fullAmount = orderTotal || totalAmount || 300;
    
    // Voor wasstrips orders: gebruik altijd het restbedrag als er aanbetaling is gedaan
    let paymentAmount = fullAmount;
    if (application.deposit_status === 'paid') {
        paymentAmount = fullAmount - depositAmount; // Restbedrag te betalen
        console.log(`[convertWasstripsToOrder] Using remaining amount: ${fullAmount} - ${depositAmount} = ${paymentAmount}`);
    }
    
    console.log(`[convertWasstripsToOrder] Final amounts:`, {
        fullAmount,
        depositAmount,
        paymentAmount,
        depositStatus: application.deposit_status,
        paymentMethod: application.payment_method_selected
    });
    
    // Maak items array van product details
    const items = application.product_details?.items?.map(item => ({
        id: item.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
    })) || [{
        id: 'wasstrips-default',
        product_id: 'wasstrips-default',
        product_name: 'Wasstrips Starterpakket',
        quantity: 1,
        price: fullAmount // Voor items display gebruiken we het volledige bedrag
    }];
    
    return {
        id: application.order_number || application.id,
        order_number: application.order_number || `WS-${application.id.substring(0, 8)}`,
        profile_id: application.profile_id,
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: application.payment_method_selected === 'direct' ? 'credit_card' : 'invoice',
        total_amount: paymentAmount, // Voor betaling gebruiken we het restbedrag
        subtotal: paymentAmount,
        shipping_cost: 0,
        tax_amount: 0,
        tracking_code: application.tracking_code,
        notes: application.notes,
        created_at: application.created_at,
        updated_at: application.updated_at,
        fulfillment_status: fulfillmentStatus,
        items: items,
        profiles: application.profiles,
        metadata: {
            wasstrips_application_id: application.id,
            deposit_status: application.deposit_status,
            deposit_amount: application.deposit_amount,
            deposit_paid_at: application.deposit_paid_at,
            payment_options_sent: application.payment_options_sent,
            payment_method_selected: application.payment_method_selected,
            product_details: application.product_details,
            full_order_amount: fullAmount, // Bewaar het volledige orderbedrag
            remaining_amount: paymentAmount, // Bewaar het restbedrag
            remaining_payment_status: application.remaining_payment_status
        }
    };
};

// Haal wasstrips orders op voor een specifieke retailer (voor retailer dashboard)
export const getWasstripsOrdersForRetailer = async (email: string): Promise<{ orders: Order[]; error: any }> => {
    return await wasstripsMonitor.timeOperation(
        'get_wasstrips_orders_for_retailer',
        async () => {
            console.log(`[getWasstripsOrdersForRetailer] Fetching orders for email: ${email}`);
            
            // Use service role client to bypass RLS for retailer operations
            const adminClient = getServiceRoleClient();
            
            // Eerst het profile_id ophalen op basis van email
            const { data: profileData, error: profileError } = await adminClient
                .from('profiles')
                .select('id, email, company_name')
                .eq('email', email)
                .single();

            if (profileError) {
                console.error('[getWasstripsOrdersForRetailer] Error fetching profile by email:', profileError);
                wasstripsMonitor.logError('Failed to fetch profile by email', {
                    userEmail: email,
                    operation: 'fetch_profile',
                    metadata: { error: profileError }
                });
                return { orders: [], error: profileError };
            }

            if (!profileData) {
                console.warn('[getWasstripsOrdersForRetailer] No profile found for email:', email);
                wasstripsMonitor.logError('Profile not found', {
                    userEmail: email,
                    operation: 'fetch_profile',
                    metadata: { reason: 'no_profile_data' }
                });
                return { orders: [], error: 'Profile not found' };
            }

            console.log(`[getWasstripsOrdersForRetailer] Found profile:`, profileData);
            
            const { data: applicationsData, error } = await adminClient
                .from('wasstrips_applications')
                .select(`
                    id,
                    profile_id,
                    status,
                    deposit_status,
                    deposit_amount,
                    deposit_paid_at,
                    total_amount,
                    remaining_amount,
                    remaining_payment_status,
                    tracking_code,
                    notes,
                    created_at,
                    updated_at,
                    payment_options_sent,
                    payment_options_sent_at,
                    payment_method_selected,
                    payment_method_selected_at,
                    order_number,
                    product_details,
                    order_total,
                    metadata
                `)
                .eq('profile_id', profileData.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[getWasstripsOrdersForRetailer] Error fetching wasstrips applications:', error);
                wasstripsMonitor.logError('Failed to fetch wasstrips applications', {
                    userEmail: email,
                    operation: 'fetch_applications',
                    metadata: { profileId: profileData.id, error }
                });
                return { orders: [], error };
            }
            
            console.log(`[getWasstripsOrdersForRetailer] Found ${applicationsData?.length || 0} applications:`, applicationsData);
            
            // Converteer applications naar Order format
            const orders = applicationsData?.map((app, index) => {
                console.log(`[getWasstripsOrdersForRetailer] Converting application ${index + 1}:`, app);
                
                const appWithProfile: WasstripsApplication = {
                    ...app,
                    profiles: profileData
                };
                
                const convertedOrder = convertWasstripsToOrder(appWithProfile);
                console.log(`[getWasstripsOrdersForRetailer] Converted to order:`, convertedOrder);
                
                return convertedOrder;
            }) || [];
            
            console.log(`[getWasstripsOrdersForRetailer] Final result: ${orders.length} orders converted successfully`);
            
            // Log successful order retrieval
            if (orders.length > 0) {
                wasstripsMonitor.logOrderEvent('order_updated', {
                    userEmail: email,
                    metadata: { 
                        operation: 'retailer_order_fetch',
                        orderCount: orders.length,
                        orderNumbers: orders.map(o => o.order_number).filter(Boolean)
                    }
                });
            }
            
            return { orders, error: null };
        },
        {
            userEmail: email,
            metadata: { operation: 'retailer_order_fetch' }
        }
    );
};

// Update wasstrips application (voor admin dashboard)
export const updateWasstripsApplication = async (
    applicationId: string,
    updates: {
        status?: 'pending' | 'approved' | 'order_ready' | 'payment_selected' | 'rejected' | 'shipped';
        tracking_code?: string;
        notes?: string;
        shipping_provider?: 'postnl' | 'dhl';
    }
) => {
    try {
        console.log('[updateWasstripsApplication] Starting update for application:', applicationId, 'with updates:', updates);
        
        // Valideer input
        if (!applicationId) {
            const error = new Error('Application ID is required');
            console.error('[updateWasstripsApplication] Validation error:', error.message);
            return { application: null, error };
        }
        
        // Use service role client to bypass RLS for admin operations
        const adminClient = getServiceRoleClient();
        
        // Bereid updates voor
        const dbUpdates: any = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        console.log('[updateWasstripsApplication] Database updates:', dbUpdates);
        
        // Check if application exists first
        const { data: existingApp, error: checkError } = await adminClient
            .from('wasstrips_applications')
            .select('id, status')
            .eq('id', applicationId)
            .single();
            
        if (checkError) {
            console.error('[updateWasstripsApplication] Error checking if application exists:', checkError);
            return { application: null, error: checkError };
        }
        
        if (!existingApp) {
            const error = new Error(`Wasstrips application with ID ${applicationId} not found`);
            console.error('[updateWasstripsApplication] Application not found');
            return { application: null, error };
        }
        
        console.log('[updateWasstripsApplication] Found existing application:', existingApp);
        
        // Update the application
        const { data: updatedApp, error: updateError } = await adminClient
            .from('wasstrips_applications')
            .update(dbUpdates)
            .eq('id', applicationId)
            .select()
            .single();
            
        if (updateError) {
            console.error('[updateWasstripsApplication] Error updating application:', updateError);
            return { application: null, error: updateError };
        }
        
        console.log('[updateWasstripsApplication] Application updated successfully:', updatedApp);
        return { application: updatedApp, error: null };
        
    } catch (error) {
        console.error('[updateWasstripsApplication] Unexpected error:', error);
        console.error('[updateWasstripsApplication] Error type:', typeof error);
        console.error('[updateWasstripsApplication] Error constructor:', (error as any)?.constructor?.name);
        console.error('[updateWasstripsApplication] Error stack:', (error as any)?.stack);
        return { application: null, error };
    }
};