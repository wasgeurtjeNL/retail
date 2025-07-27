'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useFunnelTracker } from '@/lib/funnel-tracker';

export default function CommercialPartnerPage() {
  const searchParams = useSearchParams();
  const prospectToken = searchParams.get('token'); // Voor tracking
  const segment = searchParams.get('segment') || 'beauty_salon';
  const source = searchParams.get('source') || 'email';
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [visitorCount, setVisitorCount] = useState(847);
  const [timeLeft, setTimeLeft] = useState({ hours: 47, minutes: 32 });
  
  const funnelTracker = useFunnelTracker();

  // Track pagina bezoek
  useEffect(() => {
    if (funnelTracker) {
      funnelTracker.trackEvent('commercial_landing_page_visited', {
        prospectToken,
        segment,
        source,
        pageUrl: window.location.href
      });
    }
  }, [funnelTracker, prospectToken, segment, source]);

  // Simuleer real-time visitor counter
  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorCount(prev => prev + Math.floor(Math.random() * 3));
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59 };
        }
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Segment-specifieke content
  const getSegmentContent = (segment: string) => {
    const segmentData: { [key: string]: any } = {
      beauty_salon: {
        title: 'Schoonheidssalons',
        benefit: 'Creëer een luxe geurervaring die je klanten nog weken herinnert',
        testimonial: '"Onze klanten vragen nu specifiek naar de Wasgeurtje behandeling. Het verschil is enorm!"',
        testimonialAuthor: 'Sarah van der Berg, Pure Beauty Salon Amsterdam',
        painPoint: 'Onderscheid je van andere salons met een unieke zintuiglijke ervaring',
        icon: '💆‍♀️'
      },
      hair_salon: {
        title: 'Kappers & Haarsalons',
        benefit: 'Laat klanten niet alleen met mooi haar, maar ook met een onvergetelijke geurervaring vertrekken',
        testimonial: '"Klanten ruiken thuis nog dagen de salon. Ze komen eerder terug voor hun volgende afspraak!"',
        testimonialAuthor: 'Marco Visser, Hair Studio Visser',
        painPoint: 'Verhoog klantloyaliteit en mond-tot-mond reclame',
        icon: '💇‍♀️'
      },
      wellness_spa: {
        title: 'Wellness & Spa Centra',
        benefit: 'Maak van je spa een holistische ervaring waar alle zintuigen worden verwend',
        testimonial: '"De perfecte aanvulling op onze wellness filosofie. Gasten zijn compleet ontspannen!"',
        testimonialAuthor: 'Linda Janssen, Wellness Resort Zandvoort',
        painPoint: 'Versterk de ontspanning en luxe uitstraling van je centrum',
        icon: '🧖‍♀️'
      },
      hotel_bnb: {
        title: 'Hotels & Accommodaties',
        benefit: 'Zorg dat gasten je accommodatie letterlijk niet meer vergeten',
        testimonial: '"Onze gasten noemen het hun favoriete hotel vanwege die heerlijke geur overal!"',
        testimonialAuthor: 'Robert de Vries, Boutique Hotel De Gouden Leeuw',
        painPoint: 'Verhoog guest satisfaction en repeat bookings',
        icon: '🏨'
      },
      retail_fashion: {
        title: 'Kledingwinkels',
        benefit: 'Maak van elke kledingkast een geurig statement die klanten associëren met jouw winkel',
        testimonial: '"Klanten komen binnen en zeggen direct: dit ruikt zo lekker hier!"',
        testimonialAuthor: 'Emma Bakker, Fashion Boutique EMMA',
        painPoint: 'Creëer een herkenbare winkelervaring die klanten trekt',
        icon: '👗'
      },
      cleaning_service: {
        title: 'Schoonmaakbedrijven',
        benefit: 'Laat klanten niet alleen zien, maar ook ruiken dat jullie werk af is',
        testimonial: '"Klanten zijn nu echt enthousiast over ons werk. Ze ruiken de kwaliteit!"',
        testimonialAuthor: 'Jan Peters, Schoon & Fris Cleaning',
        painPoint: 'Maak je schoonmaakresultaat zichtbaar én ruikbaar',
        icon: '🧽'
      },
      laundromat: {
        title: 'Wasserettes',
        benefit: 'Bied klanten de ultieme frisse wasresultaat ervaring',
        testimonial: '"Onze wasserette staat bekend om de beste geur resultaten in de stad!"',
        testimonialAuthor: 'Sandra Wit, WasPoint Centrum',
        painPoint: 'Word de wasserette waar iedereen naartoe wil',
        icon: '🧺'
      }
    };

    return segmentData[segment] || segmentData['beauty_salon'];
  };

  const segmentContent = getSegmentContent(segment);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEmailError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const businessName = formData.get('business_name') as string;
    const phoneNumber = formData.get('phone') as string;

    // Track form submission
    if (funnelTracker) {
      funnelTracker.trackEvent('commercial_registration_started', {
        prospectToken,
        segment,
        email,
        businessName
      });
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Track successful submission
      if (funnelTracker) {
        funnelTracker.trackEvent('commercial_registration_completed', {
          prospectToken,
          segment,
          email,
          businessName,
          phone: phoneNumber
        });
      }

      setFormSubmitted(true);
    } catch (error) {
      setEmailError('Er ging iets mis. Probeer het opnieuw.');
      
      // Track error
      if (funnelTracker) {
        funnelTracker.trackError('commercial_registration_failed', 'Submission error', {
          email,
          segment
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex flex-col justify-center items-center px-4">
        <div className="max-w-2xl text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎉 Gefeliciteerd!
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Je bent officieel geselecteerd als Wasgeurtje Partner
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Wat gebeurt er nu?
            </h2>
            <div className="text-left space-y-4">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <p className="text-gray-700">
                  <strong>Binnen 24 uur</strong> ontvang je een persoonlijke email van ons team met je partnernummer
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <p className="text-gray-700">
                  <strong>Binnen 3-5 werkdagen</strong> versturen wij je gratis proefpakket naar je bedrijfsadres
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <p className="text-gray-700">
                  <strong>Direct na ontvangst</strong> kun je beginnen met het testen van onze premium wasgeuren
                </p>
              </div>
            </div>
          </div>

          <p className="text-lg text-gray-600 mb-6">
            Welkom bij de exclusieve groep van <span className="font-bold text-pink-600">150+ officiële Wasgeurtje partners</span> in Nederland!
          </p>

          <Link 
            href="/"
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 transition-colors"
          >
            Terug naar hoofdpagina
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image 
                src="/assets/images/branding/logo.svg" 
                alt="Wasgeurtje" 
                width={120} 
                height={40}
                className="h-10 w-auto"
              />
              <div className="hidden sm:block">
                <span className="bg-pink-100 text-pink-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  EXCLUSIEVE UITNODIGING
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Live bezoekers:</div>
              <div className="text-lg font-bold text-pink-600">{visitorCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="text-center">
            {/* Exclusivity Badge */}
            <div className="inline-flex items-center bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-6">
              <span className="mr-2">{segmentContent.icon}</span>
              SPECIAAL VOOR {segmentContent.title.toUpperCase()}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Je bent <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">uitgekozen</span><br />
              als Wasgeurtje Partner
            </h1>

            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-4xl mx-auto">
              {segmentContent.benefit}
            </p>

            {/* Urgency Timer */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 max-w-md mx-auto">
              <div className="text-red-600 font-semibold text-sm mb-2">
                ⏰ BEPERKTE AANBIEDING
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {timeLeft.hours}u {timeLeft.minutes}m resterend
              </div>
              <div className="text-sm text-gray-600">
                om je gratis proefpakket te claimen
              </div>
            </div>

            {/* Social Proof Counter */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-8 max-w-sm mx-auto">
              <div className="text-sm text-gray-600 mb-1">Vandaag aangesloten partners:</div>
              <div className="text-2xl font-bold text-green-600">+12</div>
              <div className="text-xs text-gray-500">Nog 3 plekken beschikbaar in jouw regio</div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-50 -z-10"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-30 -z-10"></div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Waarom kiezen 150+ bedrijven voor Wasgeurtje?
            </h2>
            <p className="text-xl text-gray-600">
              {segmentContent.painPoint}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🇳🇱</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nederlandse Kwaliteit</h3>
              <p className="text-gray-600">
                Premium geuren, geproduceerd in Nederland volgens de hoogste kwaliteitsstandaarden
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌿</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Duurzaam & Veilig</h3>
              <p className="text-gray-600">
                Milieuvriendelijke formules, hypoallergeen en veilig voor alle stoffen
              </p>
            </div>

            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Exclusieve Distributie</h3>
              <p className="text-gray-600">
                Niet overal verkrijgbaar - alleen via geselecteerde kwaliteitspartners
              </p>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-8 text-white text-center">
            <div className="text-2xl mb-4">⭐⭐⭐⭐⭐</div>
            <blockquote className="text-xl md:text-2xl font-medium mb-4">
              {segmentContent.testimonial}
            </blockquote>
            <cite className="text-pink-100">
              — {segmentContent.testimonialAuthor}
            </cite>
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Claim je <span className="text-pink-600">GRATIS</span> proefpakket
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                Volledig vrijblijvend • Geen verplichtingen • Verzending binnen 3-5 werkdagen
              </p>
              
              {/* Package Value */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="text-green-800 font-semibold">
                  🎁 Proefpakket waarde: €47,50
                </div>
                <div className="text-green-600 text-sm">
                  Voor jou vandaag: €0,00
                </div>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrijfsnaam *
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    name="business_name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                    placeholder="Jouw bedrijfsnaam"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-mailadres *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                    placeholder="je@bedrijf.nl"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefoonnummer
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  placeholder="06-12345678 (optioneel)"
                />
              </div>

              {emailError && (
                <div className="text-red-600 text-sm">{emailError}</div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Aanmelding wordt verwerkt...
                  </span>
                ) : (
                  '🎯 JA, IK WIL MIJN GRATIS PROEFPAKKET'
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                ✅ 100% vrijblijvend • ✅ Geen automatische facturen • ✅ Nederlandse klantenservice
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Sluit je aan bij 150+ tevreden partners
            </h2>
            <p className="text-xl text-gray-600">
              Van Amsterdam tot Maastricht, van kleine salons tot grote keten
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-yellow-400 text-xl mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-4">
                "Binnen 2 weken merkten we al verschil in klantreacties. Mensen vragen nu specifiek naar onze geurgammen!"
              </p>
              <div className="text-sm text-gray-600">
                <strong>Lisa de Jong</strong><br />
                Beauty Studio LISA, Utrecht
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-yellow-400 text-xl mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-4">
                "Fantastische kwaliteit en onze klanten zijn er dol op. De samenwerking verloopt heel prettig."
              </p>
              <div className="text-sm text-gray-600">
                <strong>Thomas van der Berg</strong><br />
                Hair & Beauty Thomas, Rotterdam
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-yellow-400 text-xl mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 mb-4">
                "Onze gasten zeggen altijd: 'Het ruikt hier zo heerlijk!' Het maakt echt het verschil."
              </p>
              <div className="text-sm text-gray-600">
                <strong>Sandra Bakker</strong><br />
                Wellness Retreat De Bron, Zandvoort
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Nog vragen? We helpen je graag!
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Bel ons direct op <span className="font-semibold text-pink-400">085-1234567</span><br />
            of mail naar <span className="font-semibold text-pink-400">partners@wasgeurtje.nl</span>
          </p>
          <div className="text-sm text-gray-400">
            Nederlandse klantenservice • Ma-Vr 9:00-17:00 • Altijd persoonlijk contact
          </div>
        </div>
      </div>
    </div>
  );
} 