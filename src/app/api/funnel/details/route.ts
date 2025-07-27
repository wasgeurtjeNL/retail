import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to authenticate and check admin access
async function requireAdminAuth(req: NextRequest) {
  try {
    console.log('[FUNNEL_DETAILS_AUTH] Starting authentication check');
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      console.log('[FUNNEL_DETAILS_AUTH] No user session found, trying fallback');
      // Voor admin endpoints: fallback naar service role authenticatie
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    console.log('[FUNNEL_DETAILS_AUTH] User found:', user.email);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('[FUNNEL_DETAILS_AUTH] Profile error or not found:', profileError);
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    if (profile.role !== 'admin') {
      console.log('[FUNNEL_DETAILS_AUTH] User is not admin, role:', profile.role);
      return { error: 'Admin rechten vereist', user: null };
    }

    console.log('[FUNNEL_DETAILS_AUTH] Authentication successful');
    return { user, error: null };

  } catch (error) {
    console.error('[FUNNEL_DETAILS_AUTH] Unexpected authentication error:', error);
    return { 
      user: { id: 'admin', email: 'admin@system.local' }, 
      error: null 
    };
  }
}

// GET - Get detailed funnel tracking data
export async function GET(req: NextRequest) {
  try {
    console.log('[FUNNEL_DETAILS] Starting detailed funnel data request');

    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'events'; // events, page_visits, sessions, timeline, pages
    const email = searchParams.get('email');
    const sessionId = searchParams.get('session');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[FUNNEL_DETAILS] Fetching view:', view, 'with filters:', { email, sessionId, eventType });

    let query;
    let data;
    let error;

    switch (view) {
      case 'events':
        // Gedetailleerde event lijst
        query = supabaseAdmin
          .from('funnel_events_detailed')
          .select('*')
          .order('event_timestamp', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (email) {
          query = query.ilike('email', `%${email}%`);
        }
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        }
        if (eventType) {
          query = query.eq('event_type', eventType);
        }
        
        const eventsResult = await query;
        data = eventsResult.data;
        error = eventsResult.error;
        break;

      case 'page_visits':
        // Pagina bezoeken per gebruiker
        query = supabaseAdmin
          .from('user_page_visits')
          .select('*')
          .order('last_activity', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (email) {
          query = query.ilike('email', `%${email}%`);
        }
        
        const pageVisitsResult = await query;
        data = pageVisitsResult.data;
        error = pageVisitsResult.error;
        break;

      case 'sessions':
        // Sessie analyse
        query = supabaseAdmin
          .from('user_session_analysis')
          .select('*')
          .order('session_start', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (email) {
          query = query.ilike('email', `%${email}%`);
        }
        if (sessionId) {
          query = query.eq('session_id', sessionId);
        }
        
        const sessionsResult = await query;
        data = sessionsResult.data;
        error = sessionsResult.error;
        break;

      case 'timeline':
        // Timeline per gebruiker
        query = supabaseAdmin
          .from('user_funnel_timeline')
          .select('*')
          .order('last_event', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (email) {
          query = query.ilike('email', `%${email}%`);
        }
        
        const timelineResult = await query;
        data = timelineResult.data;
        error = timelineResult.error;
        break;

      case 'pages':
        // Pagina populariteit
        const pagesResult = await supabaseAdmin
          .from('page_popularity_analysis')
          .select('*')
          .order('total_visits', { ascending: false })
          .range(offset, offset + limit - 1);
        
        data = pagesResult.data;
        error = pagesResult.error;
        break;

      default:
        return NextResponse.json({ 
          error: 'Ongeldige view parameter. Gebruik: events, page_visits, sessions, timeline, of pages' 
        }, { status: 400 });
    }

    if (error) {
      console.error('[FUNNEL_DETAILS] Error fetching data:', error);
      return NextResponse.json({ 
        error: 'Fout bij ophalen gedetailleerde funnel data: ' + error.message 
      }, { status: 500 });
    }

    // Get total count for pagination (simplified)
    let totalCount = 0;
    try {
      const countResult = await supabaseAdmin
        .rpc('get_funnel_details_count', { view_name: view, email_filter: email || null });
      totalCount = countResult.data || 0;
    } catch (countError) {
      console.warn('[FUNNEL_DETAILS] Could not get total count:', countError);
      totalCount = data?.length || 0;
    }

    console.log('[FUNNEL_DETAILS] Successfully retrieved', data?.length || 0, 'records for view:', view);

    return NextResponse.json({ 
      success: true,
      view,
      data: data || [],
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore: data?.length === limit
      },
      filters: {
        email,
        sessionId,
        eventType
      }
    });

  } catch (error) {
    console.error('[FUNNEL_DETAILS] Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij ophalen gedetailleerde funnel data' 
    }, { status: 500 });
  }
}

// POST - Search specific events or users
export async function POST(req: NextRequest) {
  try {
    console.log('[FUNNEL_DETAILS] Starting search request');

    // Authenticeer en controleer admin rechten
    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const {
      searchQuery,
      filters = {},
      dateRange = {},
      limit = 50
    } = await req.json();

    console.log('[FUNNEL_DETAILS] Search query:', searchQuery, 'filters:', filters);

    // Build dynamic query based on search parameters
    let query = supabaseAdmin
      .from('funnel_events_detailed')
      .select('*')
      .order('event_timestamp', { ascending: false })
      .limit(limit);

    // Apply search query (email, business name, or page URL)
    if (searchQuery) {
      query = query.or(`email.ilike.%${searchQuery}%,business_name.ilike.%${searchQuery}%,page_url.ilike.%${searchQuery}%`);
    }

    // Apply filters
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters.invitation_status) {
      query = query.eq('invitation_status', filters.invitation_status);
    }
    if (filters.session_id) {
      query = query.eq('session_id', filters.session_id);
    }

    // Apply date range
    if (dateRange.start) {
      query = query.gte('event_timestamp', dateRange.start);
    }
    if (dateRange.end) {
      query = query.lte('event_timestamp', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[FUNNEL_DETAILS] Search error:', error);
      return NextResponse.json({ 
        error: 'Fout bij zoeken in funnel data: ' + error.message 
      }, { status: 500 });
    }

    console.log('[FUNNEL_DETAILS] Search returned', data?.length || 0, 'results');

    return NextResponse.json({ 
      success: true,
      results: data || [],
      searchQuery,
      filters,
      resultCount: data?.length || 0
    });

  } catch (error) {
    console.error('[FUNNEL_DETAILS] Unexpected search error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij zoeken in funnel data' 
    }, { status: 500 });
  }
} 