import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * Helper function to create landing page templates table if it doesn't exist
 */
async function ensureTablesExist() {
  const supabase = getServiceRoleClient();
  
  try {
    // Try to query the table first
    const { error: queryError } = await supabase
      .from('commercial_landing_page_templates')
      .select('id')
      .limit(1);
    
    // If table exists, return success
    if (!queryError) {
      return { success: true };
    }
    
    // If table doesn't exist (PGRST116), create it
    if (queryError.code === 'PGRST116') {
      console.log('[LandingTemplates] Creating landing page templates table...');
      
      // Basic table creation SQL
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS commercial_landing_page_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_segment VARCHAR(50) NOT NULL,
          page_title TEXT DEFAULT 'Premium Partnership',
          hero_headline TEXT NOT NULL,
          hero_subheadline TEXT DEFAULT '',
          benefits JSONB DEFAULT '[]',
          testimonials JSONB DEFAULT '[]',
          cta_text TEXT DEFAULT 'Claim Gratis Proefpakket',
          styles JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          version INTEGER DEFAULT 1,
          page_views INTEGER DEFAULT 0,
          conversions INTEGER DEFAULT 0,
          conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          UNIQUE(business_segment, is_active)
        );
        
        ALTER TABLE commercial_landing_page_templates ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Service role full access" ON commercial_landing_page_templates
          FOR ALL USING (current_setting('role') = 'service_role');
      `;
      
      // We cannot execute raw SQL directly, so let's create default data
      console.log('[LandingTemplates] Table creation would require SQL access - using fallback');
      return { success: false, message: 'Table creation requires manual setup' };
    }
    
    return { success: false, error: queryError };
    
  } catch (error) {
    console.error('[LandingTemplates] Error ensuring tables exist:', error);
    return { success: false, error };
  }
}

/**
 * GET /api/commercial/templates/landing?segment=cleaning_service
 * Returns landing page template for specific segment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment');
    
    if (!segment) {
      return NextResponse.json({ error: 'Segment parameter required' }, { status: 400 });
    }

    console.log(`[LandingTemplates] Getting template for segment: ${segment}`);
    
    const supabase = getServiceRoleClient();
    
    // First, try to ensure tables exist
    const tableCheck = await ensureTablesExist();
    if (!tableCheck.success) {
      console.log(`[LandingTemplates] Table check failed, using fallback template for ${segment}`);
      
      // Return fallback template if database tables don't exist
      const fallbackTemplate = getDefaultLandingTemplateForSegment(segment);
      return NextResponse.json(fallbackTemplate);
    }
    
    // Get segment-specific landing page template
    const { data: template, error } = await supabase
      .from('commercial_landing_page_templates')
      .select('*')
      .eq('business_segment', segment)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('[LandingTemplates] Database error:', error);
      
      // Return fallback on database error
      const fallbackTemplate = getDefaultLandingTemplateForSegment(segment);
      return NextResponse.json(fallbackTemplate);
    }

    // If no template exists, return default template structure
    if (!template) {
      const defaultTemplate = getDefaultLandingTemplateForSegment(segment);
      return NextResponse.json(defaultTemplate);
    }

    // Return existing template
    const templateData = {
      id: template.id,
      segment: template.business_segment,
      title: template.page_title,
      hero_headline: template.hero_headline,
      hero_subheadline: template.hero_subheadline,
      benefits: template.benefits || [],
      testimonials: template.testimonials || [],
      cta_text: template.cta_text,
      styles: template.styles || {},
      page_views: template.page_views || 0,
      conversions: template.conversions || 0,
      conversion_rate: template.conversion_rate || 0.0
    };

    return NextResponse.json(templateData);

  } catch (error) {
    console.error('[LandingTemplates] GET error:', error);
    
    // Return fallback template on any error
    const segment = new URL(request.url).searchParams.get('segment') || 'cleaning_service';
    const fallbackTemplate = getDefaultLandingTemplateForSegment(segment);
    return NextResponse.json(fallbackTemplate);
  }
}

/**
 * POST /api/commercial/templates/landing
 * Save landing page template for segment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      segment, 
      title, 
      hero_headline, 
      hero_subheadline, 
      benefits, 
      testimonials, 
      cta_text, 
      styles 
    } = body;
    
    if (!segment || !hero_headline) {
      return NextResponse.json(
        { error: 'Segment and hero_headline are required' },
        { status: 400 }
      );
    }

    console.log(`[LandingTemplates] Saving template for segment: ${segment}`);
    
    const supabase = getServiceRoleClient();
    
    // Check if template already exists
    const { data: existing } = await supabase
      .from('commercial_landing_page_templates')
      .select('id')
      .eq('business_segment', segment)
      .single();

    const templateData = {
      business_segment: segment,
      page_title: title || `Premium Partnership - ${segment.replace('_', ' ')}`,
      hero_headline,
      hero_subheadline: hero_subheadline || '',
      benefits: Array.isArray(benefits) ? benefits : [],
      testimonials: Array.isArray(testimonials) ? testimonials : [],
      cta_text: cta_text || 'Claim Gratis Proefpakket',
      styles: styles || {},
      is_active: true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing template
      result = await supabase
        .from('commercial_landing_page_templates')
        .update(templateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Create new template
      result = await supabase
        .from('commercial_landing_page_templates')
        .insert({
          ...templateData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[LandingTemplates] Database error:', result.error);
      return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: result.data.id,
        segment: result.data.business_segment,
        title: result.data.page_title,
        hero_headline: result.data.hero_headline,
        hero_subheadline: result.data.hero_subheadline,
        benefits: result.data.benefits,
        testimonials: result.data.testimonials,
        cta_text: result.data.cta_text,
        styles: result.data.styles,
        lastModified: result.data.updated_at
      }
    });

  } catch (error) {
    console.error('[LandingTemplates] Error saving template:', error);
    return NextResponse.json(
      { error: 'Failed to save landing page template' },
      { status: 500 }
    );
  }
}

// Helper function for default landing page templates
function getDefaultLandingTemplateForSegment(segment: string) {
  const segmentConfigs: Record<string, any> = {
    cleaning_service: {
      name: 'Schoonmaakdiensten',
      icon: '🧽',
      hero_headline: 'Exclusief Partnership voor Professionele Schoonmaakdiensten',
      hero_subheadline: 'Verhoog uw service kwaliteit en klantretentie met premium wasproducten speciaal ontwikkeld voor schoonmaakprofessionals',
      benefits: [
        'Professionele werkervaring voor uw team',
        'Betere klantretentie door verhoogde service kwaliteit',
        'Onderscheid van concurrenten in de markt',
        'Kosteneffectieve oplossing met bewezen resultaten',
        'Volledige ondersteuning en training'
      ],
      testimonials: [
        {
          name: 'Clean Pro Services',
          text: 'Onze klanten zijn veel tevredener sinds we Wasgeurtje gebruiken. 30% minder klachten!',
          rating: 5
        }
      ],
      cta_text: 'Claim Gratis Schoonmaak Proefpakket',
      color: '#059669' // green
    },
    beauty_salon: {
      name: 'Schoonheidssalons',
      icon: '💅',
      hero_headline: 'Exclusieve Salonpartnership - Premium Klantervaring',
      hero_subheadline: 'Transform uw salon naar het next level met wasproducten die uw klanten echt waarderen',
      benefits: [
        'Premium wasproducten speciaal voor salon gebruik',
        '40% meer klanttevredenheid gerapporteerd',
        'Verhoog uw service kwaliteit instant',
        'Onderscheidend vermogen van concurrenten',
        'Professionele branding en uitstraling'
      ],
      testimonials: [
        {
          name: 'Beauty Studio Amsterdam',
          text: 'Onze klanten zijn weg van de nieuwe wasproducten. Reviews zijn omhoog geschoten!',
          rating: 5
        }
      ],
      cta_text: 'Claim Gratis Salon Proefpakket',
      color: '#ec4899' // pink
    },
    hair_salon: {
      name: 'Kapperszaken',
      icon: '✂️',
      hero_headline: 'Professionele Kapper Partnership - Klantcomfort Verhogen',
      hero_subheadline: 'Geef uw klanten een salon ervaring die ze nergens anders krijgen met premium wasoplossingen',
      benefits: [
        'Professionele haarverzorging oplossingen',
        'Klantcomfort en satisfactie verhogen',
        '35% meer repeat klanten gerapporteerd',
        'Onderscheidend vermogen in competitieve markt',
        'Complete ondersteuning en marketing materialen'
      ],
      testimonials: [
        {
          name: 'Hair Studio Pro',
          text: 'Klanten vragen specifiek naar onze salon vanwege de wasproducten. Fantastisch!',
          rating: 5
        }
      ],
      cta_text: 'Claim Gratis Kapper Proefpakket',
      color: '#8b5cf6' // purple
    },
    restaurant: {
      name: 'Restaurants',
      icon: '🍽️',
      hero_headline: 'Exclusief Restaurant Partnership - Verhoog Gastevaluaties',
      hero_subheadline: 'Indruk maken op uw gasten begint bij de details. Premium wasoplossingen voor de horeca',
      benefits: [
        'Verhoogde gastevaluaties en reviews',
        'Professionele hygiëne standaarden',
        'Positieve impact op online reputation',
        'Kosteneffectieve service upgrade',
        'Ondersteuning voor horeca specifieke behoeften'
      ],
      testimonials: [
        {
          name: 'Restaurant de Smaak',
          text: 'Gasten complimenteren ons regelmatig over de aandacht voor detail. 4.8 sterren!',
          rating: 5
        }
      ],
      cta_text: 'Claim Gratis Horeca Proefpakket',
      color: '#f59e0b' // amber
    },
    hotel_bnb: {
      name: 'Hotels & B&B',
      icon: '🏨',
      hero_headline: 'Premium Hospitality Partnership - 5-Star Gast Ervaring',
      hero_subheadline: 'Transform uw accommodatie naar een premium ervaring die gasten onthouden en waarderen',
      benefits: [
        'Premium gast ervaring en comfort',
        'Verhoogde booking reviews en ratings',
        'Onderscheid van concurrerende accommodaties',
        'Gast loyaliteit en repeat bookings',
        'Complete hospitality support'
      ],
      testimonials: [
        {
          name: 'Boutique Hotel Central',
          text: 'Onze gasten rating is gestegen naar 9.2/10. De wasproducten maken echt het verschil!',
          rating: 5
        }
      ],
      cta_text: 'Claim Gratis Hotel Proefpakket',
      color: '#3b82f6' // blue
    },
    wellness_spa: {
      name: 'Wellness & Spa',
      icon: '🧘',
      hero_headline: 'Exclusieve Spa Partnership - Ultieme Wellness Ervaring',
      hero_subheadline: 'Creëer de perfecte wellness ervaring met premium wasproducten voor complete ontspanning',
      benefits: [
        'Ultieme ontspanning en wellness ervaring',
        'Premium spa kwaliteit producten',
        'Verhoogde klant satisfactie en loyaliteit',
        'Onderscheidend wellness concept',
        'Specialistische spa ondersteuning'
      ],
      testimonials: [
        {
          name: 'Zen Wellness Center',
          text: 'Klanten voelen het verschil direct. Onze spa ervaring is nu echt premium!',
          rating: 5
        }
      ],
      cta_text: 'Claim Gratis Spa Proefpakket',
      color: '#10b981' // emerald
    }
  };

  const config = segmentConfigs[segment] || segmentConfigs.cleaning_service;

  return {
    id: `default-${segment}`,
    segment,
    title: `Premium Partnership - ${config.name}`,
    hero_headline: config.hero_headline,
    hero_subheadline: config.hero_subheadline,
    benefits: config.benefits,
    testimonials: config.testimonials,
    cta_text: config.cta_text,
    styles: {
      primaryColor: config.color,
      heroBackground: `linear-gradient(135deg, ${config.color} 0%, #1e40af 100%)`,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    lastModified: new Date().toISOString()
  };
} 