import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: This endpoint is for development only!
// Remove or secure this in production!

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      // Update existing user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingProfile.id,
        { password }
      );

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Admin password updated successfully',
        email
      });
    }

    // Create new admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      throw authError;
    }

    // Create admin profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: 'Admin User',
        company_name: 'Wasgeurtje Admin',
        role: 'admin',
        status: 'active'
      });

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      email
    });

  } catch (error) {
    console.error('[Create Admin] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

// GET endpoint to show instructions
export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with { email, password } to create/update an admin user',
    warning: 'This endpoint is for development only! Remove in production!',
    example: {
      email: 'admin@wasgeurtje.nl',
      password: 'your-secure-password'
    }
  });
} 