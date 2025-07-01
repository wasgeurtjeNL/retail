import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';

// GET profile for the authenticated user
export async function GET() {
  try {
    // Get the current user
    const { user, error: userError } = await getCurrentUser();
    
    // For development mode, handle mock users more gracefully
    if (userError) {
      console.log('Auth error in profile API:', userError);
      
      // If in development mode, return mock profile data
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          id: 'mock-user-id',
          email: 'mock@example.com',
          full_name: 'Mock User',
          company_name: 'Mock Company',
          phone: '1234567890',
          preferred_language: 'nl',
          profile_image_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      return NextResponse.json({ 
        error: 'Authenticatie vereist' 
      }, { status: 401 });
    }
    
    if (!user) {
      // Return a default profile for development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          id: 'dev-user-id',
          email: 'dev@example.com',
          full_name: 'Development User',
          company_name: 'Development Company',
          phone: '1234567890',
          preferred_language: 'nl',
          profile_image_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      return NextResponse.json({ 
        error: 'Gebruiker niet gevonden' 
      }, { status: 404 });
    }
    
    try {
      // Get profile data from the database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Supabase error fetching profile:', error);
        
        // Only treat PGRST116 as "not found", other errors are actual errors
        if (error.code !== 'PGRST116') {
          throw error;
        }
      }
      
      // If no profile record exists yet, return minimal data
      if (!data) {
        return NextResponse.json({
          id: user.id,
          email: user.email,
          full_name: '',
          company_name: '',
          phone: '',
          preferred_language: 'nl',
          profile_image_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      // Add email from auth user to profile data
      return NextResponse.json({
        ...data,
        email: user.email
      });
    } catch (dbError) {
      console.error('Database error in profile API:', dbError);
      
      // In development mode, return mock data instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock profile data in development mode');
        return NextResponse.json({
          id: user.id,
          email: user.email || 'dev@example.com',
          full_name: 'Development User',
          company_name: 'Development Company',
          phone: '1234567890',
          preferred_language: 'nl',
          profile_image_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Error in profile GET endpoint:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het ophalen van het profiel',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

// Update profile for the authenticated user
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const profileData = await req.json();
    
    // Get the current user
    const { user, error: userError } = await getCurrentUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authenticatie vereist' 
      }, { status: 401 });
    }
    
    // Remove email field if present (cannot be changed here)
    const { email, ...profileToUpdate } = profileData;
    
    // Ensure user ID is included in the profile data
    const profileWithId = {
      ...profileToUpdate,
      id: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Update or insert the profile
    const { error } = await supabase
      .from('profiles')
      .upsert(profileWithId);
      
    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ 
        error: 'Fout bij opslaan van profiel' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Profiel succesvol bijgewerkt' 
    });
  } catch (error) {
    console.error('Error in profile POST endpoint:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het bijwerken van het profiel' 
    }, { status: 500 });
  }
} 