import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface AuthResult {
  user: any | null;
  profile: any | null;
  error: string | null;
  isAdmin: boolean;
}

// Get the authenticated user's profile from the request
export async function getProfileFromRequest(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }
    
    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('[Auth Utils] Profile error:', profileError);
      return null;
    }
    
    return profile;
  } catch (error) {
    console.error('[Auth Utils] Error getting profile:', error);
    return null;
  }
}

// Authenticate request with full user and profile information
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        user: null,
        profile: null,
        error: 'Authenticatie vereist',
        isAdmin: false
      };
    }
    
    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('[Auth Utils] Profile error:', profileError);
      return {
        user,
        profile: null,
        error: 'Profiel niet gevonden',
        isAdmin: false
      };
    }
    
    return {
      user,
      profile,
      error: null,
      isAdmin: profile.role === 'admin'
    };
  } catch (error) {
    console.error('[Auth Utils] Error authenticating:', error);
    return {
      user: null,
      profile: null,
      error: 'Authenticatie fout',
      isAdmin: false
    };
  }
}

// Require admin authentication
export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const authResult = await authenticateRequest(req);
  
  if (authResult.error) {
    return authResult;
  }
  
  if (!authResult.isAdmin) {
    return {
      ...authResult,
      error: 'Admin rechten vereist'
    };
  }
  
  return authResult;
} 