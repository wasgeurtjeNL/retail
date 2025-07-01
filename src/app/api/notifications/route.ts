import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';

// Helper function to create default notification preferences
const createDefaultPreferences = (userId: string) => ({
  id: userId,
  email_order_updates: true,
  email_promotions: false,
  email_product_updates: true,
  email_retailer_updates: true,
  browser_notifications: false,
  whatsapp_notifications: false,
  notification_frequency: 'instant',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// GET notification preferences for the authenticated user
export async function GET() {
  try {
    // Get the current user
    const { user, error: userError } = await getCurrentUser();
    
    // For development mode, handle mock users more gracefully
    if (userError) {
      console.log('Auth error in notifications API:', userError);
      
      // If in development mode, return mock notification preferences
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(createDefaultPreferences('mock-user-id'));
      }
      
      return NextResponse.json({ 
        error: 'Authenticatie vereist' 
      }, { status: 401 });
    }
    
    if (!user) {
      // Return default preferences for development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(createDefaultPreferences('dev-user-id'));
      }
      
      return NextResponse.json({ 
        error: 'Gebruiker niet gevonden' 
      }, { status: 404 });
    }
    
    try {
      // Get notification preferences from the database
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Supabase error fetching notification preferences:', error);
        
        // Only treat PGRST116 as "not found", other errors are actual errors
        if (error.code !== 'PGRST116') {
          throw error;
        }
      }
      
      // If no preference record exists yet, return default values
      if (!data) {
        return NextResponse.json(createDefaultPreferences(user.id));
      }
      
      return NextResponse.json(data);
    } catch (dbError) {
      console.error('Database error in notifications API:', dbError);
      
      // In development mode, return mock data instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock notification preferences in development mode');
        return NextResponse.json(createDefaultPreferences(user.id));
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Error in notification preferences GET endpoint:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het ophalen van de notificatie-instellingen',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

// Update notification preferences for the authenticated user
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const preferences = await req.json();
    
    // Get the current user
    const { user, error: userError } = await getCurrentUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authenticatie vereist' 
      }, { status: 401 });
    }
    
    // Ensure user ID is included in the preferences data
    const preferencesWithId = {
      ...preferences,
      id: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Update or insert the notification preferences
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(preferencesWithId);
      
    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json({ 
        error: 'Fout bij opslaan van notificatie-instellingen' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notificatie-instellingen succesvol bijgewerkt' 
    });
  } catch (error) {
    console.error('Error in notification preferences POST endpoint:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het bijwerken van de notificatie-instellingen' 
    }, { status: 500 });
  }
} 