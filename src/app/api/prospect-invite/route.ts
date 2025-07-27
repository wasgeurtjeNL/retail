// =====================================================
// PROSPECT INVITATION API
// Haalt prospect informatie op voor gepersonaliseerde registratie
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[ProspectInvite API] GET request received');
    
    const { searchParams } = request.nextUrl;
    const inviteCode = searchParams.get('code');
    
    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    console.log(`[ProspectInvite API] Looking up invitation code: ${inviteCode}`);

    const supabase = getServiceRoleClient();
    
    // Get prospect details from invitation code
    const { data: invitation, error: invitationError } = await supabase
      .from('prospect_invitation_codes')
      .select(`
        id,
        prospect_id,
        invitation_code,
        business_name,
        contact_name,
        business_segment,
        city,
        email,
        created_at,
        expires_at,
        visits_count,
        last_visited_at,
        registered_at,
        is_active
      `)
      .eq('invitation_code', inviteCode)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      console.log(`[ProspectInvite API] Invalid or expired invitation code: ${inviteCode}`);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation code' },
        { status: 404 }
      );
    }

    // Update visit tracking
    await supabase
      .from('prospect_invitation_codes')
      .update({
        visits_count: (invitation.visits_count || 0) + 1,
        last_visited_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Get segment-specific configuration
    const segmentConfig = getSegmentConfiguration(invitation.business_segment);

    console.log(`[ProspectInvite API] Found invitation for ${invitation.business_name} (segment: ${invitation.business_segment})`);

    return NextResponse.json({
      success: true,
      prospect: {
        id: invitation.prospect_id,
        business_name: invitation.business_name,
        contact_name: invitation.contact_name,
        business_segment: invitation.business_segment,
        city: invitation.city,
        email: invitation.email,
        invitation_code: invitation.invitation_code,
        visits_count: invitation.visits_count + 1,
        is_return_visitor: invitation.visits_count > 0,
        already_registered: !!invitation.registered_at
      },
      personalization: {
        segment_config: segmentConfig,
        welcome_message: generateWelcomeMessage(invitation),
        benefits: generateSegmentBenefits(invitation.business_segment),
        testimonial: getSegmentTestimonial(invitation.business_segment)
      }
    });

  } catch (error) {
    console.error('[ProspectInvite API] Error fetching invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getSegmentConfiguration(segment: string) {
  const configurations: Record<string, any> = {
    beauty_salon: {
      title: "Exclusief voor Schoonheidssalons",
      description: "Premium wasproducten speciaal ontwikkeld voor professionele schoonheidssalons",
      color_scheme: "pink",
      icon: "✨",
      package_focus: "salon_premium"
    },
    hair_salon: {
      title: "Speciaal voor Kapperszaken", 
      description: "Professionele handwas oplossingen voor kapperszaken en hairstylisten",
      color_scheme: "purple",
      icon: "💇‍♀️",
      package_focus: "hair_professional"
    },
    restaurant: {
      title: "Voor Restaurants & Horeca",
      description: "Hygiënische handwas oplossingen voor restaurants en horecagelegenheden",
      color_scheme: "amber",
      icon: "🍽️",
      package_focus: "horeca_hygiene"
    },
    retail_fashion: {
      title: "Voor Kledingwinkels",
      description: "Verbeter de klantervaring in uw kledingwinkel met premium handwas service",
      color_scheme: "blue",
      icon: "👗",
      package_focus: "retail_experience"
    },
    pharmacy: {
      title: "Voor Apotheken",
      description: "Hygiënische oplossingen speciaal ontwikkeld voor apothekers en farmaceutische omgevingen",
      color_scheme: "green",
      icon: "💊",
      package_focus: "pharma_hygiene"
    },
    wellness_spa: {
      title: "Voor Wellness & Spa",
      description: "Luxe handwas ervaring voor wellness centra en spa's",
      color_scheme: "teal",
      icon: "🧘‍♀️",
      package_focus: "wellness_luxury"
    }
  };

  return configurations[segment] || configurations['beauty_salon'];
}

function generateWelcomeMessage(invitation: any): string {
  const businessName = invitation.business_name;
  const city = invitation.city ? ` in ${invitation.city}` : '';
  const firstName = invitation.contact_name ? invitation.contact_name.split(' ')[0] : '';
  
  if (firstName) {
    return `Welkom ${firstName}! We zijn verheugd dat ${businessName}${city} interesse heeft in ons exclusieve partnership programma.`;
  } else {
    return `Welkom! We zijn verheugd dat ${businessName}${city} interesse heeft in ons exclusieve partnership programma.`;
  }
}

function generateSegmentBenefits(segment: string): string[] {
  const benefits: Record<string, string[]> = {
    beauty_salon: [
      "Verhoog de service kwaliteit in uw salon",
      "Premium wasproducten voor professioneel gebruik", 
      "Tevreden klanten komen sneller terug",
      "Exclusieve territoriumrechten in uw gebied"
    ],
    hair_salon: [
      "Professionele handwas tussen behandelingen",
      "Verbeter de salon ervaring voor uw klanten",
      "45% meer repeat klanten volgens onderzoek",
      "Geen concurrentie - één kapper per wijk"
    ],
    restaurant: [
      "Verhoog hygiëne standaarden in uw restaurant",
      "Maak indruk op uw gasten met premium service",
      "Betere gastevaluaties en reviews",
      "Exclusief verkooppunt in uw stad"
    ],
    retail_fashion: [
      "Onderscheid uzelf van de concurrentie",
      "Langere winkelbezoeken door betere ervaring",
      "Premium uitstraling voor uw winkel",
      "Exclusieve rechten in uw verkoopgebied"
    ],
    pharmacy: [
      "Hygiënische oplossingen voor apothekers",
      "Professionele uitstraling en service",
      "Verhoogde klanttevredenheid",
      "Exclusieve verkoop in uw apotheek"
    ],
    wellness_spa: [
      "Luxe handwas ervaring voor uw gasten",
      "Verhoog de wellness beleving",
      "Premium kwaliteit en uitstraling",
      "Exclusieve spa partnership"
    ]
  };

  return benefits[segment] || benefits['beauty_salon'];
}

function getSegmentTestimonial(segment: string): any {
  const testimonials: Record<string, any> = {
    beauty_salon: {
      text: "Sinds we de Wasgeurtje producten gebruiken, zijn onze klanten zichtbaar meer tevreden. Het verhoogt echt de kwaliteit van onze service!",
      author: "Sandra M., Schoonheidssalon Amsterdam"
    },
    hair_salon: {
      text: "Onze klanten vragen nu specifiek naar onze salon vanwege de bijzondere handwas ervaring. Het onderscheidt ons echt van andere kappers.",
      author: "Marco R., Hairstylist Rotterdam"
    },
    restaurant: {
      text: "Gasten waarderen de premium handwas faciliteit. Het past perfect bij onze fine dining ervaring en verhoogt onze service standard.",
      author: "Chef Patricia, Restaurant Utrecht"
    },
    retail_fashion: {
      text: "Klanten blijven langer in onze winkel en ervaren onze service als veel luxer. Een kleine investering met groot effect!",
      author: "Linda K., Fashion Boutique Den Haag"
    },
    pharmacy: {
      text: "Perfect voor onze apotheek - hygiënisch, professioneel en onze klanten voelen zich goed verzorgd.",
      author: "Apotheker Hans, Farmacia Eindhoven"
    },
    wellness_spa: {
      text: "De luxe handwas past perfect bij onze wellness filosofie. Onze gasten zijn er dol op!",
      author: "Wellness Centrum Zen, Maastricht"
    }
  };

  return testimonials[segment] || testimonials['beauty_salon'];
} 