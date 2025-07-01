import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate credentials
const isUsingValidCredentials = (() => {
  const isValidUrl = supabaseUrl && 
    !supabaseUrl.includes('your-supabase-url') &&
    !supabaseUrl.includes('example') &&
    !supabaseUrl.includes('placeholder');
  
  const isValidKey = supabaseAnonKey && 
    !supabaseAnonKey.includes('your-anon-key') &&
    !supabaseAnonKey.includes('example');
  
  return isValidUrl && isValidKey;
})();

// Initialize Supabase client
let supabase: SupabaseClient;

if (!isUsingValidCredentials) {
  throw new Error(
    'Supabase credentials zijn niet correct geconfigureerd. ' +
    'Controleer je .env.local bestand en zorg dat NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY zijn ingesteld.'
  );
}

supabase = createClient(supabaseUrl, supabaseAnonKey, { 
  auth: { 
    autoRefreshToken: true,
    persistSession: true
  }
});

export { supabase };

// Types
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
  hear_about_us?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock: number;
  category: string;
  created_at: string;
};

export type Order = {
  id: string;
  retailer_id: string;
  total_amount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    image_url?: string;
  }[];
  date: string;
  shipping_address?: {
    street?: string;
    city?: string;
    house_number?: string;
    house_number_addition?: string;
    postcode?: string;
  };
  payment_method: 'invoice' | 'stripe';
  payment_status: 'processing' | 'requires_action' | 'succeeded' | 'canceled' | 'failed' | 'pending' | 'paid' | 'expired' | 'requires_payment_method';
  fulfillment_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
  payment_due_date?: string;
  payment_intent_id?: string;
  stripe_session_id?: string;
  retailer_business_name?: string;
  notes?: string;
  tracking_code?: string;
  shipping_provider?: 'postnl' | 'dhl';
};

// Auth functions
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Get current user error:', error);
    return { user: null, error };
  }
};

// Product functions
export const getProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { products: data || [], error: null };
  } catch (error) {
    console.error('Get products error:', error);
    return { products: [], error };
  }
};

export const addProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return { product: data, error: null };
  } catch (error) {
    console.error('Add product error:', error);
    return { product: null, error };
  }
};

export const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { product: data, error: null };
  } catch (error) {
    console.error('Update product error:', error);
    return { product: null, error };
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Delete product error:', error);
    return { error };
  }
};

// Retailer functions
export const getRetailers = async (status?: 'pending' | 'approved' | 'rejected') => {
  try {
    let query = supabase
      .from('retailers')
      .select(`
        *,
        profiles!inner(
          id,
          email,
          full_name,
          company_name,
          phone,
          address,
          city,
          postal_code,
          country,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('profiles.status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match expected format
    const retailers = data?.map(item => ({
      id: item.id,
      user_id: item.profile_id,
      business_name: item.profiles.company_name || '',
      contact_name: item.profiles.full_name || '',
      email: item.profiles.email || '',
      phone: item.profiles.phone || '',
      address: item.profiles.address || '',
      city: item.profiles.city || '',
      postal_code: item.profiles.postal_code || '',
      country: item.profiles.country || 'Nederland',
      status: item.profiles.status || 'pending',
      created_at: item.created_at
    })) || [];

    return { retailers, error: null };
  } catch (error) {
    console.error('Get retailers error:', error);
    return { retailers: [], error };
  }
};

export const getPendingRetailers = async () => {
  return getRetailers('pending');
};

export const updateRetailerStatus = async (id: string, status: 'approved' | 'rejected') => {
  try {
    // First get the retailer to find the profile_id
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('profile_id')
      .eq('id', id)
      .single();

    if (retailerError) throw retailerError;

    // Update the profile status
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', retailer.profile_id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Update retailer status error:', error);
    return { error };
  }
};

export const deleteRetailer = async (id: string) => {
  try {
    const { error } = await supabase
      .from('retailers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Delete retailer error:', error);
    return { error };
  }
};

export const getRetailerByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        retailers!profile_id(*)
      `)
      .eq('email', email)
      .single();

    if (error) throw error;
    
    if (!data) return { retailer: null, error: null };

    // Transform to match expected format
    const retailer = {
      id: data.retailers?.[0]?.id || data.id,
      user_id: data.id,
      business_name: data.company_name || '',
      contact_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      postal_code: data.postal_code || '',
      country: data.country || 'Nederland',
      status: data.status || 'pending',
      created_at: data.created_at
    };

    return { retailer, error: null };
  } catch (error) {
    console.error('Get retailer by email error:', error);
    return { retailer: null, error };
  }
};

export const getRetailerById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('retailers')
      .select(`
        *,
        profiles!inner(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    if (!data) return { retailer: null, error: null };

    // Transform to match expected format
    const retailer = {
      id: data.id,
      user_id: data.profile_id,
      business_name: data.profiles.company_name || '',
      contact_name: data.profiles.full_name || '',
      email: data.profiles.email || '',
      phone: data.profiles.phone || '',
      address: data.profiles.address || '',
      city: data.profiles.city || '',
      postal_code: data.profiles.postal_code || '',
      country: data.profiles.country || 'Nederland',
      status: data.profiles.status || 'pending',
      created_at: data.created_at
    };

    return { retailer, error: null };
  } catch (error) {
    console.error('Get retailer by id error:', error);
    return { retailer: null, error };
  }
};

export const registerRetailer = async (retailerData: Omit<Retailer, 'id' | 'user_id' | 'status' | 'created_at'>) => {
  try {
    // First create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        email: retailerData.email,
        full_name: retailerData.contact_name,
        company_name: retailerData.business_name,
        phone: retailerData.phone,
        address: retailerData.address,
        city: retailerData.city,
        postal_code: retailerData.postal_code,
        country: retailerData.country || 'Nederland',
        status: 'pending'
      }])
      .select()
      .single();

    if (profileError) throw profileError;

    // Then create the retailer record
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .insert([{
        profile_id: profile.id,
        activation_token: crypto.randomUUID(),
        activation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }])
      .select()
      .single();

    if (retailerError) throw retailerError;

    return { 
      retailer: {
        ...retailer,
        ...retailerData,
        id: retailer.id,
        user_id: profile.id,
        status: 'pending',
        created_at: retailer.created_at
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Register retailer error:', error);
    return { retailer: null, error };
  }
};

// Order functions
export const getOrders = async (
  retailerId?: string,
  fulfillmentStatus?: Order['fulfillment_status'],
  paymentStatus?: Order['payment_status']
) => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .order('created_at', { ascending: false });

    if (retailerId) {
      query = query.eq('retailer_id', retailerId);
    }
    if (fulfillmentStatus) {
      query = query.eq('status', fulfillmentStatus);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match expected format
    const orders = data?.map(order => ({
      id: order.id,
      retailer_id: order.retailer_id,
      total_amount: Number(order.total_amount),
      items: order.order_items?.map((item: any) => ({
        id: item.id,
        name: item.product_name,
        quantity: item.quantity,
        price: Number(item.unit_price),
        image_url: null // TODO: Join with products table if needed
      })) || [],
      date: order.created_at,
      shipping_address: {
        street: order.shipping_address,
        city: order.shipping_city,
        postcode: order.shipping_postal_code
      },
      payment_method: order.payment_method || 'invoice',
      payment_status: order.payment_status || 'pending',
      fulfillment_status: order.status || 'pending',
      stripe_session_id: order.stripe_session_id,
      notes: order.notes,
      tracking_code: order.tracking_code
    })) || [];

    return { orders, error: null };
  } catch (error) {
    console.error('Get orders error:', error);
    return { orders: [], error };
  }
};

export const getOrderById = async (orderId: string) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    if (!data) return { order: null, error: null };

    // Transform data to match expected format
    const order = {
      id: data.id,
      retailer_id: data.retailer_id,
      total_amount: Number(data.total_amount),
      items: data.order_items?.map((item: any) => ({
        id: item.id,
        name: item.product_name,
        quantity: item.quantity,
        price: Number(item.unit_price),
        image_url: null
      })) || [],
      date: data.created_at,
      shipping_address: {
        street: data.shipping_address,
        city: data.shipping_city,
        postcode: data.shipping_postal_code
      },
      payment_method: data.payment_method || 'invoice',
      payment_status: data.payment_status || 'pending',
      fulfillment_status: data.status || 'pending',
      stripe_session_id: data.stripe_session_id,
      notes: data.notes,
      tracking_code: data.tracking_code
    };

    return { order, error: null };
  } catch (error) {
    console.error('Get order by id error:', error);
    return { order: null, error };
  }
};

export const updateOrder = async (
  orderId: string, 
  updates: Partial<Pick<Order, 'payment_status' | 'fulfillment_status' | 'notes' | 'tracking_code' | 'shipping_provider'>>
) => {
  try {
    const updateData: any = {};
    
    if (updates.payment_status) updateData.payment_status = updates.payment_status;
    if (updates.fulfillment_status) updateData.status = updates.fulfillment_status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.tracking_code !== undefined) updateData.tracking_code = updates.tracking_code;
    if (updates.shipping_provider !== undefined) updateData.metadata = { shipping_provider: updates.shipping_provider };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { order: data, error: null };
  } catch (error) {
    console.error('Update order error:', error);
    return { order: null, error };
  }
};

export const deleteOrder = async (orderId: string) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Delete order error:', error);
    return { error };
  }
};

// Utility functions
export const resetApplicationData = () => {
  console.warn('Reset application data is not available with Supabase. Please use database migrations.');
};

export const clearPersistentAuthIfNeeded = () => {
  // This is handled by Supabase Auth automatically
};