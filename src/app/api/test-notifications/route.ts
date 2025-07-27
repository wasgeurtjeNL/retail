import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    console.log('[TEST-NOTIFICATIONS] Testing notifications for:', email);
    
    const supabase = getSupabase();
    
    // Haal eerst het retailer profiel op
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();
      
    if (profileError || !profile) {
      console.log('[TEST-NOTIFICATIONS] No profile found for email:', email);
      return NextResponse.json({ 
        error: 'Profile not found', 
        email,
        profileError: profileError?.message 
      }, { status: 404 });
    }
    
    // Haal wasstrips applicaties op voor deze retailer
    const { data: applications, error: appsError } = await supabase
      .from('wasstrips_applications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
      
    if (appsError) {
      console.error('[TEST-NOTIFICATIONS] Error loading applications:', appsError);
      return NextResponse.json({ 
        error: 'Error loading applications', 
        appsError: appsError.message 
      }, { status: 500 });
    }
    
    console.log('[TEST-NOTIFICATIONS] Raw applications from database:', applications);
    
    // Filter applicaties die een betaling nodig hebben
    const relevantApplications = applications?.filter((app: any) => {
      const needsDepositPayment = app.deposit_status === 'sent' && (app.status === 'approved' || app.status === 'pending');
      const needsRemainingPayment = app.remaining_payment_status === 'sent' && app.deposit_status === 'paid';
      
      console.log(`[TEST-NOTIFICATIONS] Checking app ${app.id}: deposit_status=${app.deposit_status}, remaining_payment_status=${app.remaining_payment_status}, status=${app.status}`);
      console.log(`[TEST-NOTIFICATIONS] needsDepositPayment=${needsDepositPayment}, needsRemainingPayment=${needsRemainingPayment}`);
      
      return needsDepositPayment || needsRemainingPayment;
    }) || [];
    
    console.log('[TEST-NOTIFICATIONS] Relevant applications (need payment):', relevantApplications);
    
    return NextResponse.json({
      email,
      profile_id: profile.id,
      total_applications: applications?.length || 0,
      relevant_applications: relevantApplications.length,
      applications: relevantApplications.map(app => ({
        id: app.id,
        deposit_status: app.deposit_status,
        remaining_payment_status: app.remaining_payment_status,
        status: app.status,
        created_at: app.created_at
      }))
    });
    
  } catch (error) {
    console.error('[TEST-NOTIFICATIONS] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 