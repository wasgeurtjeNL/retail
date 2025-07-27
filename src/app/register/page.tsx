"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RegistrationForm from "@/components/RegistrationForm";
import PostcodeCheck from "@/components/PostcodeCheck";
import { useFunnelTracker } from "@/lib/funnel-tracker";

interface Address {
  street?: string;
  city?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postcode?: string;
}

interface ProspectPersonalization {
  prospect?: {
    id: string;
    business_name: string;
    contact_name?: string;
    business_segment: string;
    city?: string;
    email: string;
    invitation_code: string;
    visits_count: number;
    is_return_visitor: boolean;
    already_registered: boolean;
  };
  personalization?: {
    segment_config: {
      title: string;
      description: string;
      color_scheme: string;
      icon: string;
      package_focus: string;
    };
    welcome_message: string;
    benefits: string[];
    testimonial: {
      text: string;
      author: string;
    };
  };
}

export default function RegisterPage() {
  const [addressValidated, setAddressValidated] = useState(false);
  const [validatedAddress, setValidatedAddress] = useState<Address | null>(null);
  const [personalization, setPersonalization] = useState<ProspectPersonalization | null>(null);
  const [isLoadingPersonalization, setIsLoadingPersonalization] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const funnelTracker = useFunnelTracker();

  // Load personalization data from invitation code
  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    
    if (inviteCode) {
      setIsLoadingPersonalization(true);
      fetchPersonalizationData(inviteCode);
    }
  }, [searchParams]);

  // Track page visit on component mount
  useEffect(() => {
    if (funnelTracker) {
      console.log('[REGISTER_PAGE] Page loaded, tracking registration page visit');
      funnelTracker.trackEvent('registration_page_loaded', {
        hasInvitationToken: funnelTracker.getSessionInfo().hasInvitation,
        hasPersonalInvite: !!searchParams.get('invite'),
        pageLoadTime: new Date().toISOString()
      });
    }
  }, [funnelTracker, searchParams]);

  const fetchPersonalizationData = async (inviteCode: string) => {
    try {
      console.log(`[REGISTER_PAGE] Fetching personalization for invite: ${inviteCode}`);
      
      const response = await fetch(`/api/prospect-invite?code=${encodeURIComponent(inviteCode)}`);
      const data = await response.json();

      if (data.success) {
        setPersonalization(data);
        setInvitationError(null);
        console.log(`[REGISTER_PAGE] Loaded personalization for ${data.prospect.business_name}`);
      } else {
        setInvitationError(data.error || 'Invalid invitation code');
        console.log(`[REGISTER_PAGE] Failed to load personalization: ${data.error}`);
      }
    } catch (error) {
      setInvitationError('Failed to load invitation details');
      console.error('[REGISTER_PAGE] Error fetching personalization:', error);
    } finally {
      setIsLoadingPersonalization(false);
    }
  };

  const handleAddressValidation = (validated: boolean, address: Address) => {
    setAddressValidated(validated);
    setValidatedAddress(address);
    
    // Track address validation completion
    if (funnelTracker && validated) {
      funnelTracker.trackEvent('address_validated', {
        address: address,
        validationSuccess: validated
      });
    }
  };

  // Strategic segment configurations with motivation-focused content
  const getStrategicSegmentConfig = (segment: string) => {
    const strategicConfigs: Record<string, any> = {
      beauty_salon: {
        gradient: "from-pink-50 via-rose-50 to-purple-50",
        accent: "text-pink-600",
        badge: "bg-pink-100 text-pink-800 border-pink-200",
        button: "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600",
        icon: "✨",
        title: "Exclusief voor Schoonheidssalons",
        hero_title: "Verhoog Uw Salon's Luxe Uitstraling",
        hook: "Uw klanten verdienen meer dan gewoon handhygiëne - ze willen een luxe ervaring",
        strategic_benefits: [
          {
            icon: "💎",
            title: "Premium Positionering",
            description: "Onderscheid uw salon met een luxe handwas ervaring die klanten niet vergeten"
          },
          {
            icon: "📈",
            title: "40% Meer Klanttevredenheid",
            description: "Bewezen resultaten: salons rapporteren significant hogere waarderingen"
          },
          {
            icon: "🏆",
            title: "Exclusieve Territorialrechten",
            description: "Slechts één salon per wijk - bescherm uw concurrentievoordeel"
          },
          {
            icon: "💰",
            title: "Extra Inkomstenstroom",
            description: "Verdien bij elke verkoop, zonder extra personeel of voorraadrisico"
          }
        ],
        social_proof: {
          stats: "150+ salons",
          result: "25% hogere omzet per klant",
          testimonial: "Onze klanten vragen nu specifiek naar ons vanwege de bijzondere handwas ervaring. Het heeft ons echt anders gepositioneerd dan andere salons.",
          author: "Sandra M., Beauty Salon Elite Amsterdam"
        },
        urgency: "Laatste kans: slechts 3 plekken beschikbaar in uw regio",
        cta_primary: "Claim Uw Exclusieve Positie",
        guarantee: "100% risicovrij - gratis proefpakket, geen verplichtingen"
      },
      hair_salon: {
        gradient: "from-purple-50 via-indigo-50 to-blue-50",
        accent: "text-purple-600",
        badge: "bg-purple-100 text-purple-800 border-purple-200",
        button: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600",
        icon: "💇‍♀️",
        title: "Speciaal voor Kapperszaken",
        hero_title: "Maak Uw Kapsalon Onvergetelijk",
        hook: "Elke klant wil zich speciaal voelen - geef hen een reden om terug te komen",
        strategic_benefits: [
          {
            icon: "🎯",
            title: "Klantbinding Versterken",
            description: "Professionele handwas tussen treatments - klanten blijven langer en komen vaker"
          },
          {
            icon: "⭐",
            title: "45% Meer Repeat Klanten",
            description: "Kappers met Wasgeurtje zien significant meer terugkerende klanten"
          },
          {
            icon: "🛡️",
            title: "Concurrentievoordeel",
            description: "Eén kapper per wijk - bescherm uw marktpositie tegen concurrentie"
          },
          {
            icon: "💎",
            title: "Premium Service Level",
            description: "Verhoog uw service standard zonder extra personeel of complexiteit"
          }
        ],
        social_proof: {
          stats: "200+ kappers",
          result: "45% meer repeat klanten",
          testimonial: "Klanten boeken nu hun volgende afspraak vóór ze weggaan. De handwas ervaring maakt echt het verschil in hoe ze onze salon ervaren.",
          author: "Marco R., Hairstylist Rotterdam"
        },
        urgency: "Beperkt beschikbaar: nog 2 kappersplaatsen in uw stad",
        cta_primary: "Versterk Uw Klantbinding Nu",
        guarantee: "Gratis proefpakket - ervaar zelf het verschil"
      },
      restaurant: {
        gradient: "from-amber-50 via-yellow-50 to-orange-50",
        accent: "text-amber-600",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        button: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
        icon: "🍽️",
        title: "Voor Restaurants & Horeca",
        hero_title: "Verhoog Uw Restaurant's Reputatie",
        hook: "In de horeca telt elke detail - laat zien dat u kwaliteit serieus neemt",
        strategic_benefits: [
          {
            icon: "🌟",
            title: "Betere Google Reviews",
            description: "Gasten waarderen hygiëne premium - zie uw reviews stijgen"
          },
          {
            icon: "🏆",
            title: "Fine Dining Standard",
            description: "Premium handwas faciliteit die past bij uw kwaliteitsniveau"
          },
          {
            icon: "👥",
            title: "Gast Tevredenheid",
            description: "Kleine details maken grote indruk - gasten voelen zich beter verzorgd"
          },
          {
            icon: "📊",
            title: "Hoger Uitgavengemiddelde",
            description: "Gasten in premium omgeving besteden gemiddeld 18% meer"
          }
        ],
        social_proof: {
          stats: "80+ restaurants",
          result: "22% betere online reviews",
          testimonial: "Gasten merken de details op. De premium handwas past perfect bij onze fine dining ervaring en verhoogt echt onze service standard.",
          author: "Chef Patricia, Restaurant De Gouden Lepel Utrecht"
        },
        urgency: "Exclusieve kans: laatste restaurant plek in uw regio",
        cta_primary: "Verhoog Uw Service Standard",
        guarantee: "Gratis proefpakket - ervaar de kwaliteitsverschil"
      },
      retail_fashion: {
        gradient: "from-blue-50 via-indigo-50 to-slate-50",
        accent: "text-blue-600",
        badge: "bg-blue-100 text-blue-800 border-blue-200",
        button: "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600",
        icon: "👗",
        title: "Voor Kledingwinkels",
        hero_title: "Creëer Een Luxe Shopping Ervaring",
        hook: "Mode draait om gevoel - laat klanten zich bijzonder voelen in uw winkel",
        strategic_benefits: [
          {
            icon: "💫",
            title: "Luxe Winkelervaring",
            description: "Premium handwas service die uw winkel onderscheidt van webshops"
          },
          {
            icon: "⏰",
            title: "Langere Winkelbezoeken",
            description: "Klanten blijven langer wanneer ze zich welkom en verzorgd voelen"
          },
          {
            icon: "🎯",
            title: "Uniek Verkoopargument",
            description: "Iets wat online winkels nooit kunnen bieden - fysieke luxe ervaring"
          },
          {
            icon: "💝",
            title: "Hogere Klantloyaliteit",
            description: "Klanten onthouden hoe u hen laat voelen, niet alleen wat u verkoopt"
          }
        ],
        social_proof: {
          stats: "65+ fashion retailers",
          result: "30% langere winkelbezoeken",
          testimonial: "Klanten ervaren onze winkel nu als veel luxer. Ze nemen de tijd voor hun aankoop en kopen vaker meer items per bezoek.",
          author: "Linda K., Fashion Boutique Style Den Haag"
        },
        urgency: "Beperkte beschikbaarheid: nog 1 fashion retailer per winkelgebied",
        cta_primary: "Versterk Uw Retail Ervaring",
        guarantee: "Risicovrij testen - gratis proefpakket zonder verplichtingen"
      },
      pharmacy: {
        gradient: "from-green-50 via-emerald-50 to-teal-50",
        accent: "text-green-600",
        badge: "bg-green-100 text-green-800 border-green-200",
        button: "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
        icon: "💊",
        title: "Voor Apotheken",
        hero_title: "Verhoog Uw Professionele Uitstraling",
        hook: "In healthcare is vertrouwen alles - toon uw toewijding aan kwaliteit en hygiëne",
        strategic_benefits: [
          {
            icon: "🏥",
            title: "Medische Hygiëne Standard",
            description: "Premium hygiëne oplossing die past bij uw medische professionaliteit"
          },
          {
            icon: "👨‍⚕️",
            title: "Verhoogd Vertrouwen",
            description: "Patiënten zien uw toewijding aan kwaliteit en hygiëne"
          },
          {
            icon: "⚕️",
            title: "Professionele Imago",
            description: "Onderscheid uw apotheek als premium zorgverlener"
          },
          {
            icon: "📈",
            title: "Extra Service Differentiatie",
            description: "Bied meer dan alleen medicijnen - bied een complete zorgervaring"
          }
        ],
        social_proof: {
          stats: "45+ apotheken",
          result: "35% hogere klanttevredenheid",
          testimonial: "Patiënten waarderen onze aandacht voor detail. Het versterkt hun vertrouwen in onze professionele zorgverlening.",
          author: "Apotheker Hans, Farmacia Prima Eindhoven"
        },
        urgency: "Exclusief: één apotheek per wijk voor optimale service",
        cta_primary: "Versterk Uw Zorgkwaliteit",
        guarantee: "Medisch geteste kwaliteit - gratis proefpakket"
      },
      wellness_spa: {
        gradient: "from-teal-50 via-cyan-50 to-blue-50",
        accent: "text-teal-600",
        badge: "bg-teal-100 text-teal-800 border-teal-200",
        button: "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600",
        icon: "🧘‍♀️",
        title: "Voor Wellness & Spa",
        hero_title: "Voltooi Uw Wellness Filosofie",
        hook: "Wellness is totaal comfort - elke aanraking moet perfect zijn",
        strategic_benefits: [
          {
            icon: "🕯️",
            title: "Holistische Wellness",
            description: "Luxe handwas ervaring die perfect aansluit bij uw wellness filosofie"
          },
          {
            icon: "🌿",
            title: "Natuurlijke Ingrediënten",
            description: "Premium, skin-friendly formules die passen bij uw natural approach"
          },
          {
            icon: "✨",
            title: "Complete Spa Ervaring",
            description: "Van behandeling tot aftercare - elke touch point is luxe"
          },
          {
            icon: "💆‍♀️",
            title: "Verhoogde Wellness Beleving",
            description: "Gasten voelen zich volledig verzorgd en ontspannen"
          }
        ],
        social_proof: {
          stats: "30+ wellness centra",
          result: "40% langere wellness sessies",
          testimonial: "De luxe handwas past perfect bij onze wellness filosofie. Gasten voelen zich compleet verzorgd van begin tot eind.",
          author: "Wellness Centrum Serenity, Maastricht"
        },
        urgency: "Premium exclusiviteit: beperkt aantal wellness partners",
        cta_primary: "Voltooi Uw Wellness Ervaring",
        guarantee: "Wellness-approved kwaliteit - gratis proberen"
      }
    };

    return strategicConfigs[segment] || strategicConfigs['beauty_salon'];
  };

  const config = personalization?.prospect ? 
    getStrategicSegmentConfig(personalization.prospect.business_segment) : 
    getStrategicSegmentConfig('beauty_salon');

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} flex flex-col`}>
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative">
          {/* Decorative elements */}
          <div className="absolute top-10 left-0 w-20 h-20 bg-white/20 rounded-full blur-sm -z-10"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-md -z-10"></div>
          <div className="absolute top-1/2 right-0 w-16 h-16 bg-white/15 rounded-full blur-sm -z-10"></div>
          
          {/* Loading State */}
          {isLoadingPersonalization && (
            <div className="text-center mb-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Uw persoonlijke uitnodiging wordt geladen...</p>
            </div>
          )}

          {/* Error State */}
          {invitationError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8 max-w-2xl mx-auto">
              <p><strong>Fout:</strong> {invitationError}</p>
              <p className="text-sm mt-2">Neem contact op met ons team voor ondersteuning.</p>
            </div>
          )}

          {/* Strategic Personalized Content */}
          {personalization && personalization.prospect && !isLoadingPersonalization && (
            <div className="text-center mb-12">
              {/* Hero Section */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${config.badge} border font-semibold text-sm mb-6`}>
                <span className="text-2xl mr-2">{config.icon}</span>
                {config.title}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {config.hero_title}
              </h1>
              
              <p className="text-xl md:text-2xl font-semibold text-gray-700 mb-2">
                Welkom {personalization.prospect.business_name}!
              </p>
              
              <div className={`w-24 h-1 ${config.accent.replace('text-', 'bg-')} mx-auto mb-8`}></div>
              
              {/* Hook */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 mb-8 max-w-4xl mx-auto shadow-lg">
                <p className="text-lg text-gray-700 italic mb-6">
                  "{config.hook}"
                </p>
                
                {personalization.prospect.is_return_visitor && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      👋 <strong>Welkom terug!</strong> We waarderen uw interesse. Dit is uw {personalization.prospect.visits_count}e bezoek.
                    </p>
                  </div>
                )}

                {/* Strategic Benefits Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {config.strategic_benefits.map((benefit: any, index: number) => (
                    <div key={index} className="text-left">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{benefit.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                          <p className="text-gray-600 text-sm">{benefit.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Proof */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 mb-6">
                  <div className="text-center mb-4">
                    <div className="flex justify-center items-center space-x-8 mb-4">
                      <div>
                        <div className={`text-2xl font-bold ${config.accent}`}>{config.social_proof.stats}</div>
                        <div className="text-sm text-gray-600">vertrouwen ons</div>
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${config.accent}`}>{config.social_proof.result}</div>
                        <div className="text-sm text-gray-600">gemiddelde verbetering</div>
                      </div>
                    </div>
                  </div>
                  
                  <blockquote className="text-gray-700 italic text-center mb-4">
                    "{config.social_proof.testimonial}"
                  </blockquote>
                  <cite className={`text-sm font-semibold ${config.accent} text-center block`}>
                    — {config.social_proof.author}
                  </cite>
                </div>

                {/* Urgency */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center">
                    <span className="text-red-500 mr-2">⚡</span>
                    <p className="text-red-700 font-semibold text-sm">
                      {config.urgency}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                  <button className={`${config.button} text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform transition hover:scale-105 hover:shadow-xl`}>
                    {config.cta_primary}
                  </button>
                  <p className="text-sm text-gray-600 mt-3">
                    ✅ {config.guarantee}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Default Content (when no personalization) */}
          {!personalization && !isLoadingPersonalization && (
            <div className="text-center mb-12">
              <div className="inline-block p-2 px-5 bg-pink-100 rounded-full text-pink-800 font-semibold text-sm mb-3">
                Word partner
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
                Word een Wasgeurtje Retailer
              </h1>
              <div className="w-20 h-1 bg-pink-500 mx-auto mb-6"></div>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Sluit je aan bij meer dan 150 retailers die sterke verkoopcijfers behalen met onze premium wasgeuren.
                {!addressValidated && " Controleer eerst uw adres voordat u zich aanmeldt."}
              </p>
            </div>
          )}
            
          {/* Proefpakket Information Box */}
          {!isLoadingPersonalization && !invitationError && (
            <div className="max-w-2xl mx-auto mt-8 mb-8">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-green-800">Gratis Proefpakket</h3>
                    <div className="mt-2 text-green-700 text-sm">
                      <p>
                        Na goedkeuring van je aanmelding sturen wij een <strong>gratis proefpakket</strong> met onze 
                        bestsellers naar je bedrijf. Hiermee kun je direct aan de slag en je klanten laten kennismaken 
                        met onze producten.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 max-w-3xl mx-auto">
            {!addressValidated ? (
              <PostcodeCheck onComplete={handleAddressValidation} />
            ) : (
              <RegistrationForm initialAddress={validatedAddress} />
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 