'use client';

import React, { useState, useEffect } from 'react';
import { 
  GiftIcon, 
  CalendarDaysIcon, 
  UsersIcon, 
  SparklesIcon, 
  CheckBadgeIcon,
  FireIcon,
  ShoppingBagIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  DocumentCheckIcon,
  CameraIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  StarIcon,
  ChartBarIcon,
  CurrencyEuroIcon,
  BuildingStorefrontIcon,
  TagIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';
import Image from 'next/image';

interface EventType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiredAttendees: number;
  duration: string;
  reward: string;
  rewardValue: string;
  color: string;
  steps: string[];
  impact: string;
  successRate: string;
  testimonial?: {
    quote: string;
    author: string;
    business: string;
    location: string;
  };
  verificationRequired: Array<{
    type: string;
    name: string;
    description: string;
    required: boolean;
  }>;
  roi: {
    investment: string;
    return: string;
    timeframe: string;
  };
  difficulty: number;
}

interface RetailerStats {
  eventsCompleted: number;
  pointsEarned: number;
  productsEarned: number;
  level: number;
  nextMilestone: number;
  ranking?: number;
  totalRetailers?: number;
}

const RetailerRewardsProgram: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);
  const [showSuccessStories, setShowSuccessStories] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [retailerStats, setRetailerStats] = useState<RetailerStats>({
    eventsCompleted: 7,
    pointsEarned: 1250,
    productsEarned: 16,
    level: 2,
    nextMilestone: 1500,
    ranking: 23,
    totalRetailers: 126
  });
  const [hasUnclaimedRewards, setHasUnclaimedRewards] = useState(true);
  
  // Load retailer stats from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStats = localStorage.getItem('dev-retailer-rewards-stats');
      if (savedStats) {
        setRetailerStats(JSON.parse(savedStats));
      } else {
        // Initialize with default stats for development
        localStorage.setItem('dev-retailer-rewards-stats', JSON.stringify(retailerStats));
      }
    }
  }, []);

  // Event types met hun details
  const eventTypes: EventType[] = [
    {
      id: 'geur-avond',
      name: 'Exclusieve Geur-Avond Experience',
      description: 'Creëer een premium avond waar uw klanten een VIP wasgeurtjes-ervaring beleven',
      icon: <SparklesIcon className="h-8 w-8 text-pink-500" />,
      requiredAttendees: 10,
      duration: '2 uur',
      reward: '3 premium wasgeurtjes + VIP promotiepakket',
      rewardValue: '€44,85',
      color: 'from-pink-500 to-purple-600',
      steps: [
        'Selecteer een datum in onze planning app (voorkeursadvies: donderdagavond 19:00-21:00)',
        'Ontvang gepersonaliseerde digitale uitnodigingen met uw branding voor uw klanten',
        'Wij sturen een luxe proefpakket met alle benodigde materialen',
        'Organiseer uw Geur-Avond met minimaal 10 deelnemers volgens de handleiding',
        'Upload verificatiemateriaal via onze app binnen 48 uur na het evenement'
      ],
      impact: 'Gemiddeld €350-€450 directe omzet + 30% herhalingsaankopen binnen 3 maanden',
      successRate: '92% van retailers behaalt of overtreft de omzetdoelstelling',
      testimonial: {
        quote: "De geur-avond heeft niet alleen direct €412 opgeleverd, maar ook een blijvende klantenkring die regelmatig terugkomt voor nieuwe producten.",
        author: "Marianne Hendricks",
        business: "Wasserette De Zeepbel",
        location: "Eindhoven"
      },
      verificationRequired: [
        { type: 'deelnemerslijst', name: 'Geverifieerde deelnemerslijst', description: 'Digitale check-in lijst met contactgegevens (wij zorgen voor een QR-code systeem)', required: true },
        { type: 'fotos', name: 'Foto\'s van het evenement', description: 'Minimaal 3 foto\'s van verschillende momenten tijdens het evenement', required: true },
        { type: 'aankoop-bewijs', name: 'Verkoopoverzicht', description: 'Upload vanuit uw kassasysteem of maak gebruik van onze speciale event-verkoop app', required: true },
        { type: 'feedback', name: 'Deelnemersfeedback', description: 'Automatisch via ons systeem - deelnemers ontvangen feedback verzoek', required: true }
      ],
      roi: {
        investment: "Tijd: 3 uur (voorbereiding + event) | Kosten: €0 (wij leveren alle materialen)",
        return: "€350-450 directe omzet + waarde van nieuwe vaste klanten",
        timeframe: "Directe opbrengst tijdens event + vervolgaankopen gedurende 3 maanden"
      },
      difficulty: 2
    },
    {
      id: 'workshops',
      name: 'Expert Wasgeurtje Workshop',
      description: 'Positioneer uw zaak als expert met een interactieve workshop over optimaal wasgeurtje gebruik',
      icon: <UsersIcon className="h-8 w-8 text-blue-500" />,
      requiredAttendees: 8,
      duration: '1-1,5 uur',
      reward: '2 premium wasgeurtjes + exclusief workshopmateriaal',
      rewardValue: '€34,90',
      color: 'from-blue-500 to-sky-600',
      steps: [
        'Boek een tijdslot op een zaterdagmiddag in onze planning app',
        'Ontvang een kant-en-klaar workshoppakket inclusief professionele handleiding',
        'Gebruik ons online inschrijfsysteem voor uw klanten (minimaal 8 deelnemers)',
        'Leid de workshop met behulp van onze stap-voor-stap video-instructies',
        'Deelnemers ontvangen een digitaal certificaat en kortingscode voor volgende aankoop'
      ],
      impact: 'Gemiddeld 80% van de deelnemers koopt direct een product + toename van 45% in klantloyaliteit',
      successRate: '88% van retailers rapporteert nieuwe vaste klanten na de workshop',
      testimonial: {
        quote: "De workshop heeft mijn imago als expert versterkt. Klanten komen nu specifiek naar mij toe voor wasgeurtje-advies.",
        author: "Karel Vos",
        business: "WasPro",
        location: "Rotterdam"
      },
      verificationRequired: [
        { type: 'video', name: 'Video van de workshop', description: 'Een korte video (min. 2 minuten) van de workshop - kan met smartphone', required: true },
        { type: 'deelnemerslijst', name: 'Deelnemersregistratie', description: 'Automatisch gegenereerd via ons digitale check-in systeem', required: true },
        { type: 'fotos', name: 'Workshopfoto\'s', description: 'Minimaal 4 foto\'s van de workshop in verschillende stadia', required: true },
        { type: 'verkopen', name: 'Verkoopgegevens', description: 'Upload vanuit kassasysteem of gebruik onze speciale QR-codes per product', required: true }
      ],
      roi: {
        investment: "Tijd: 2,5 uur (voorbereiding + workshop) | Kosten: €0 (alle materialen inbegrepen)",
        return: "€200-300 directe verkopen + verhoogde expertise-status in uw markt",
        timeframe: "Onmiddellijk + blijvend effect op uw reputatie als expert"
      },
      difficulty: 1
    },
    {
      id: 'seasonal',
      name: 'Exclusieve Seizoenslancering',
      description: 'Bied uw trouwe klanten VIP-toegang tot nieuwe seizoensgeuren vóór de officiële release',
      icon: <CalendarDaysIcon className="h-8 w-8 text-amber-500" />,
      requiredAttendees: 15,
      duration: '3 uur',
      reward: '4 premium wasgeurtjes + luxe displaymaterialen + voorraad nieuwe collectie',
      rewardValue: '€69,80 + voorrangslevering nieuwe collectie',
      color: 'from-amber-500 to-orange-600',
      steps: [
        'Plan uw event 2 weken vóór de officiële release van de nieuwe seizoenscollectie',
        'Ontvang exclusieve voorraad van nieuwe geuren die niemand anders nog heeft',
        'Wij leveren een complete pop-up shop experience kit voor uw winkel',
        'Nodig minimaal 15 VIP-klanten uit met onze gepersonaliseerde digitale uitnodigingen',
        'Bied aanwezigen speciale pre-order kortingen en exclusieve bundels'
      ],
      impact: 'Gemiddeld €600-€800 aan directe verkopen + pre-orders voor het hele seizoen',
      successRate: '94% van de retailers verkoopt de volledige voorraad binnen 72 uur',
      testimonial: {
        quote: "De exclusiviteit van de pre-release geeft onze klanten het gevoel dat ze bij een select gezelschap horen. Dit heeft niet alleen tot €750 aan verkopen geleid, maar ook tot een wachtlijst voor toekomstige events.",
        author: "José Ruiter",
        business: "Fris & Schoon",
        location: "Amsterdam"
      },
      verificationRequired: [
        { type: 'livestream', name: 'Event verificatie', description: 'Korte livestream of video-call met een Wasgeurtje vertegenwoordiger', required: true },
        { type: 'uitnodigingen', name: 'VIP uitnodigingen', description: 'Verzonden vanuit ons systeem met uw branding', required: true },
        { type: 'fotos', name: 'Evenementfoto\'s', description: 'Minimaal 6 hoogwaardige foto\'s voor uw sociale media (wij helpen met editing)', required: true },
        { type: 'bestellingen', name: 'Verkoopgegevens', description: 'Via onze speciale seizoenslaunch app die klanten direct laat betalen', required: true },
        { type: 'social-media', name: 'Social media promotie', description: 'Wij leveren kant-en-klare posts die u kunt delen', required: true }
      ],
      roi: {
        investment: "Tijd: 4-5 uur (voorbereiding + event) | Kosten: €0 (alles verzorgd door ons)",
        return: "€600-800 directe verkopen + voorsprong op concurrentie + verhoogde klantloyaliteit",
        timeframe: "Onmiddellijk + gedurende het hele seizoen via vervolgaankopen"
      },
      difficulty: 3
    },
    {
      id: 'loyalty',
      name: 'Premium Loyaliteitsdag',
      description: 'Transformeer uw winkel in een exclusieve shopping experience voor uw trouwste klanten',
      icon: <CheckBadgeIcon className="h-8 w-8 text-green-500" />,
      requiredAttendees: 20,
      duration: 'Hele dag',
      reward: '5 premium wasgeurtjes + luxe loyaliteitspakketten voor klanten + €50 marketingbudget',
      rewardValue: '€139,75',
      color: 'from-green-500 to-emerald-600',
      steps: [
        'Gebruik onze data-analyse tool om uw top 20+ klanten te identificeren',
        'Verzend gepersonaliseerde luxe uitnodigingen (digitaal én fysiek, verzorgd door ons)',
        'Ontvang een complete winkel-transformatie kit met exclusieve displays en decoratie',
        'Wij leveren luxe goodiebags voor alle deelnemers (t.w.v. €15 per stuk)',
        'Elke deelnemer ontvangt een gepersonaliseerde loyaliteitskaart met speciale voordelen'
      ],
      impact: 'Gemiddeld 95% herhalingsaankopen + gemiddeld €900-€1200 omzet + sociale media exposure',
      successRate: '97% van retailers rapporteert dit als hun meest winstgevende event',
      testimonial: {
        quote: "Deze dag heeft mijn omzet met €1150 verhoogd en mijn klanten voelden zich echt gewaardeerd. Het heeft mijn business getransformeerd met een wachtlijst van klanten die willen deelnemen aan volgende events.",
        author: "Thomas Willems",
        business: "Wasserij Prinses",
        location: "Utrecht"
      },
      verificationRequired: [
        { type: 'voorregistratie', name: 'Voorregistratie', description: 'Volledige eventplanning via onze premium evenement-management tool', required: true },
        { type: 'klantgeschiedenis', name: 'Klanthistorie', description: 'Geautomatiseerde selectie van top-klanten via ons CRM-systeem', required: true },
        { type: 'live-check', name: 'Live verificatie', description: 'Korte video-call met een Wasgeurtje vertegenwoordiger tijdens het event', required: true },
        { type: 'handtekeningen', name: 'Digitale check-in', description: 'Via onze tablet-app die wij voor het event toesturen', required: true },
        { type: 'fotos', name: 'Professionele fotografie', description: 'Optioneel: wij kunnen een fotograaf sturen (tegen meerprijs)', required: false },
        { type: 'verkoopdata', name: 'Verkoopdata', description: 'Automatisch via onze event-specifieke kassasoftware', required: true }
      ],
      roi: {
        investment: "Tijd: 8 uur (verspreid over planning en eventdag) | Kosten: €0 (volledig verzorgd)",
        return: "€900-1200 directe omzet + langdurige klantloyaliteit + sociale media bereik",
        timeframe: "Directe resultaten + aanhoudende loyaliteit gedurende minimaal 12 maanden"
      },
      difficulty: 4
    }
  ];

  // Voordelen van het programma - verbeterd met concrete data
  const benefits = [
    {
      title: 'Omzetverhoging',
      description: 'Gemiddeld €480 extra omzet per event (bewezen resultaten)',
      icon: <ChartBarIcon className="h-5 w-5 text-pink-600" />,
      stat: '+37%',
      context: 'gemiddelde omzetverhoging'
    },
    {
      title: 'Gratis producten',
      description: 'Verdien tot €140 aan premium producten per maand',
      icon: <GiftIcon className="h-5 w-5 text-pink-600" />,
      stat: '€1680',
      context: 'jaarlijkse productwaarde'
    },
    {
      title: 'Klantloyaliteit',
      description: '78% van eventdeelnemers wordt vaste klant',
      icon: <UserGroupIcon className="h-5 w-5 text-pink-600" />,
      stat: '3.6×',
      context: 'hogere klantenretentie'
    },
    {
      title: 'Expertisepositie',
      description: 'Versterk uw marktpositie als premium retailer',
      icon: <TrophyIcon className="h-5 w-5 text-pink-600" />,
      stat: '94%',
      context: 'merkherkenning in regio'
    }
  ];

  // Nieuwe ROI statistieken
  const roiStats = [
    {
      value: '€5,760',
      label: 'Gemiddelde jaaromzet via events',
      icon: <CurrencyEuroIcon className="h-8 w-8 text-green-500" />
    },
    {
      value: '126',
      label: 'Nieuwe klanten per jaar via events',
      icon: <UserGroupIcon className="h-8 w-8 text-blue-500" />
    },
    {
      value: '19.5×',
      label: 'Return on Investment (ROI)',
      icon: <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
    },
    {
      value: '4.8/5',
      label: 'Gemiddelde deelnemerstevredenheid',
      icon: <StarIconSolid className="h-8 w-8 text-amber-500" />
    }
  ];
  
  // Successtories van retailers
  const successStories = [
    {
      retailer: "Wasserij Zeepbel",
      location: "Amsterdam",
      quote: "De geur-avonden hebben onze omzet met 42% verhoogd en een geheel nieuwe klantenkring aangetrokken die we anders nooit hadden bereikt.",
      results: "€12,400 extra jaaromzet | 68 nieuwe vaste klanten",
      image: "/images/retailers/testimonial-1.jpg"
    },
    {
      retailer: "Stomerij De Vries",
      location: "Rotterdam",
      quote: "In het begin was ik sceptisch over het concept, maar na onze eerste workshop waren we overtuigd. De ROI is indrukwekkend en het kost minimale voorbereiding.",
      results: "€8,750 extra jaaromzet | 40% toename in premium verkopen",
      image: "/images/retailers/testimonial-2.jpg"
    },
    {
      retailer: "Waswinkel Fris & Schoon",
      location: "Utrecht",
      quote: "De seizoensgebonden lanceringen hebben ons geholpen om een wachtlijst van klanten op te bouwen die als eerste nieuwe producten willen proberen.",
      results: "41 VIP-klanten | €920 gemiddelde omzet per lancering",
      image: "/images/retailers/testimonial-3.jpg"
    }
  ];

  // Verificatie informatie - geprofessionaliseerd
  const verificationInfo = {
    title: "Premium Event Verificatiesysteem",
    description: "Ons geavanceerde verificatiesysteem zorgt voor kwaliteitscontrole en maximaliseert uw resultaten tijdens elk event.",
    process: [
      "Events worden vooraf gepland via ons online platform en ontvangen een kwaliteitsgarantie",
      "Ons digitale check-in systeem zorgt voor eenvoudige deelnemersregistratie en follow-up", 
      "Geautomatiseerde deelnemersverificatie via e-mail zorgt voor betrouwbare resultaten",
      "AI-ondersteunde analyse van event materiaal zorgt voor objectieve beoordeling",
      "Elk succesvol event verhoogt uw retailer-status en ontgrendelt extra voordelen"
    ],
    benefits: [
      "Professionele ondersteuning bij elke stap van het proces",
      "Hoogwaardige marketingmaterialen voor maximale impact",
      "Gegarandeerde productbeschikbaarheid voor uw events",
      "Prioritaire verzending van evenementmaterialen"
    ],
    timelineInfo: "Na het indienen van alle verificatiematerialen wordt uw event binnen 3 werkdagen beoordeeld. Bij positieve verificatie worden uw beloningen direct verzonden en worden punten toegekend aan uw retailer-account."
  };

  // Handle Event Registration
  const handleEventRegistration = (eventId: string) => {
    setRegistering(eventId);
    
    // Simulate registration process
    setTimeout(() => {
      // In real implementation, this would connect to an API
      const event = eventTypes.find(e => e.id === eventId);
      setRegistering(null);
      
      // Show success message and update stats
      if (event) {
        const updatedStats = {
          ...retailerStats,
          pointsEarned: retailerStats.pointsEarned + 25,
        };
        
        setRetailerStats(updatedStats);
        
        // Save to localStorage for development
        if (typeof window !== 'undefined') {
          localStorage.setItem('dev-retailer-rewards-stats', JSON.stringify(updatedStats));
          localStorage.setItem(`dev-retailer-event-${eventId}-registered`, 'true');
          
          // Set a popup message in localStorage
          localStorage.setItem('dev-retailer-rewards-message', `Event ${event.name} succesvol aangemeld. U ontvangt binnenkort een bevestigingsmail met alle details.`);
        }
        
        // Activate that event tab
        setActiveEvent(eventId);
      }
    }, 1500);
  };

  const handleEventClick = (id: string) => {
    if (activeEvent === id) {
      setActiveEvent(null);
    } else {
      setActiveEvent(id);
    }
  };
  
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 border border-gray-100">
      {/* Header section with gradient background */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="bg-gradient-to-r from-pink-600 to-purple-700 px-6 py-5 cursor-pointer"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2.5 rounded-full">
              <TrophyIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">Wasgeurtje Business Partners Program</h2>
              <p className="text-pink-100 text-sm">Exclusieve events. Premium producten. Gegarandeerde omzetgroei.</p>
            </div>
          </div>
          <div className="flex items-center">
            {/* Retailer status indicator */}
            <div className="hidden md:flex mr-4 items-center bg-white/10 rounded-full px-3 py-1">
              <div className="flex space-x-0.5 mr-2">
                {[...Array(5)].map((_, i) => (
                  <StarIconSolid key={i} className={`h-3.5 w-3.5 ${i < retailerStats.level ? 'text-amber-400' : 'text-white/20'}`} />
                ))}
              </div>
              <span className="text-xs font-medium text-white">
                <span className="font-bold">Level {retailerStats.level}</span> Partner
              </span>
            </div>
            
            {hasUnclaimedRewards && (
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full mr-3 flex items-center">
                <SparklesIcon className="h-3 w-3 mr-1" />
                <span>Beloning te claimen</span>
              </span>
            )}
            
            <span className="bg-white text-pink-600 text-xs font-bold px-3 py-1 rounded-full mr-3 hidden sm:flex items-center">
              <FireIcon className="h-3 w-3 mr-1" />
              <span>Tot €140 aan premium producten/maand</span>
            </span>
            
            {expanded ? (
              <ChevronUpIcon className="h-5 w-5 text-white" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Retailer Stats Overview */}
      {expanded && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-3 border-b border-pink-100">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-white rounded-lg shadow-sm flex items-center justify-center">
                <TrophyIcon className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Uw rewards status</p>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-gray-900">{retailerStats.pointsEarned} punten</h3>
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" 
                      style={{ width: `${Math.min(100, (retailerStats.pointsEarned / retailerStats.nextMilestone) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{retailerStats.nextMilestone - retailerStats.pointsEarned} tot level {retailerStats.level + 1}</span>
                </div>
              </div>
            </div>
            <div className="sm:flex items-center space-x-4 text-center hidden">
              <div className="px-3">
                <p className="text-xs text-gray-600">Events georganiseerd</p>
                <p className="font-bold text-gray-900">{retailerStats.eventsCompleted}</p>
              </div>
              <div className="px-3 border-l border-r border-gray-200">
                <p className="text-xs text-gray-600">Producten verdiend</p>
                <p className="font-bold text-gray-900">{retailerStats.productsEarned}</p>
              </div>
              <div className="px-3">
                <p className="text-xs text-gray-600">Partner ranking</p>
                <p className="font-bold text-gray-900">#{retailerStats.ranking} van {retailerStats.totalRetailers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 sm:p-6">
          {/* Key ROI Stats row */}
          <div className="mb-8">
            <h3 className="text-gray-800 font-semibold mb-4 text-lg">Bewezen resultaten voor partners</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {roiStats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                  <div className="flex items-center mb-2">
                    <div className="p-2 rounded-md bg-gray-50">{stat.icon}</div>
                  </div>
                  <div className="font-bold text-2xl text-gray-900">{stat.value}</div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits row */}
          <div className="mb-8">
            <h3 className="text-gray-800 font-semibold mb-4 text-lg">Voordelen voor uw business</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex flex-col bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
                  <div className="flex items-start mb-2">
                    <div className="mr-3 p-2 bg-pink-50 rounded-md">
                      {benefit.icon}
                    </div>
                    <div>
                      <span className="bg-pink-100 text-pink-800 text-xs font-semibold px-2 py-0.5 rounded-md">
                        {benefit.stat} {benefit.context}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{benefit.title}</h4>
                  <p className="text-sm text-gray-700">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Success Stories Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800 font-semibold text-lg">Succesverhalen van partners</h3>
              <button 
                onClick={() => setShowSuccessStories(!showSuccessStories)}
                className="text-sm text-pink-600 hover:text-pink-800 flex items-center"
              >
                {showSuccessStories ? "Toon minder" : "Bekijk alle succesverhalen"}
                {showSuccessStories ? (
                  <ChevronUpIcon className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 ml-1" />
                )}
              </button>
            </div>
            
            {showSuccessStories ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {successStories.map((story, index) => (
                  <div key={index} className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                    <div className="h-32 bg-gray-200 relative">
                      {/* In a real implementation, these would be actual images */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <BuildingStorefrontIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">{story.retailer}</h4>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{story.location}</span>
                      </div>
                      <p className="text-gray-700 text-sm mb-3 italic">"{story.quote}"</p>
                      <div className="bg-green-50 p-2 rounded text-sm text-green-800 font-medium">
                        Resultaten: {story.results}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row items-start">
                    <div className="w-full md:w-1/3 mb-4 md:mb-0 md:mr-6">
                      <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                        <BuildingStorefrontIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                    <div className="w-full md:w-2/3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 text-lg">Wasserij Zeepbel</h4>
                        <span className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600">Amsterdam</span>
                      </div>
                      <p className="text-gray-700 mb-4 italic text-lg">
                        "De geur-avonden hebben onze omzet met 42% verhoogd en een geheel nieuwe klantenkring aangetrokken die we anders nooit hadden bereikt. Het beste zakelijke besluit dat we in jaren hebben genomen."
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-3 rounded">
                          <span className="block text-green-700 font-semibold text-lg">€12,400</span>
                          <span className="text-sm text-green-800">Extra jaaromzet</span>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <span className="block text-blue-700 font-semibold text-lg">68</span>
                          <span className="text-sm text-blue-800">Nieuwe vaste klanten</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trusted Verification System Banner */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-start mb-3 sm:mb-0">
              <ShieldCheckIcon className="h-10 w-10 text-blue-700 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-blue-900 font-medium text-base">Geverifieerd Premium Partner Programma</h3>
                <p className="text-blue-800 text-sm">Ons geavanceerde verificatiesysteem zorgt voor betrouwbare resultaten en eerlijke beloning</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowVerificationInfo(!showVerificationInfo);
              }}
              className="text-sm px-4 py-2 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-md flex items-center shadow-sm"
            >
              <DocumentCheckIcon className="h-4 w-4 mr-2" />
              {showVerificationInfo ? "Verberg details" : "Bekijk verificatie-eisen"}
            </button>
          </div>

          {/* Verification Process Explanation */}
          {showVerificationInfo && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
              <div className="flex items-center mb-4">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-700 mr-2" />
                <h3 className="text-gray-900 font-medium text-lg">{verificationInfo.title}</h3>
              </div>
              <p className="text-base text-gray-700 mb-6">{verificationInfo.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div>
                  <h4 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                    <DocumentCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                    Ons verificatieproces
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    {verificationInfo.process.map((step, index) => (
                      <li key={index} className="text-gray-700">{step}</li>
                    ))}
                  </ol>
                </div>
                
                <div>
                  <h4 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                    <SparklesIcon className="h-5 w-5 text-pink-600 mr-2" />
                    Voordelen voor partners
                  </h4>
                  <ul className="space-y-2">
                    {verificationInfo.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-pink-500 mr-2">•</span>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
                <div className="flex">
                  <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-yellow-800 font-medium">Belangrijke informatie</h4>
                    <p className="text-sm text-yellow-800">
                      Het programma is gebaseerd op eerlijke verificatie om de integriteit te waarborgen. 
                      Valse verificatiepogingen leiden tot verwijdering uit het programma voor 12 maanden.
                      Bij twijfel over de vereisten, neem contact op met uw accountmanager.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-gray-50 p-4 rounded-md">
                <h4 className="text-base font-medium text-gray-800 mb-2">Goedkeuringsproces:</h4>
                <p className="text-gray-700">{verificationInfo.timelineInfo}</p>
              </div>
            </div>
          )}

          {/* Event cards */}
          <div className="mb-8">
            <h3 className="text-gray-800 font-semibold mb-4 text-lg">Premium Partner Events</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {eventTypes.map((event) => (
                <div 
                  key={event.id}
                  className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                    activeEvent === event.id 
                      ? 'shadow-md border-pink-300' 
                      : 'shadow-sm hover:shadow-md border-gray-200'
                  }`}
                >
                  <div 
                    onClick={() => handleEventClick(event.id)} 
                    className="cursor-pointer"
                  >
                    <div className={`bg-gradient-to-r ${event.color} p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="bg-white/20 p-2 rounded-full">
                          {event.icon}
                        </div>
                        <div className="flex items-center">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <StarIconSolid 
                                key={i} 
                                className={`h-3 w-3 ${i < event.difficulty ? 'text-amber-400' : 'text-white/30'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <h3 className="text-white font-bold mt-3 text-lg">{event.name}</h3>
                      <p className="text-white/90 text-sm mt-1">{event.description}</p>
                      
                      <div className="flex justify-between items-center mt-3">
                        <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                          <UserGroupIcon className="h-3 w-3 mr-1" />
                          {event.requiredAttendees}+ deelnemers
                        </span>
                        <span className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                          {event.duration}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500 flex items-center">
                          <TrophyIcon className="h-4 w-4 mr-1 text-amber-500" />
                          Beloning:
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{event.reward}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-gray-500">Waarde:</span>
                        <span className="text-sm font-bold text-pink-600">{event.rewardValue}</span>
                      </div>
                      
                      <div className="bg-green-50 p-2 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-green-800">Slagingspercentage:</span>
                          <span className="text-xs font-bold text-green-800">{event.successRate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded details */}
                  {activeEvent === event.id && (
                    <div className="border-t border-gray-200">
                      {/* Testimonial */}
                      {event.testimonial && (
                        <div className="p-4 bg-gray-50">
                          <div className="flex items-start">
                            <div className="text-pink-500 flex-shrink-0 mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 italic mb-2">{event.testimonial.quote}</p>
                              <p className="text-xs text-gray-500">
                                - <span className="font-medium text-gray-700">{event.testimonial.author}</span>, 
                                {event.testimonial.business}, {event.testimonial.location}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    
                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Event stappenplan</h4>
                            <ol className="text-sm text-gray-600 space-y-2 pl-5 list-decimal">
                              {event.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Business Impact</h4>
                            <div className="bg-pink-50 p-3 rounded-md border border-pink-100 mb-3">
                              <h5 className="font-medium text-pink-800 text-sm flex items-center">
                                <ChartBarIcon className="h-4 w-4 mr-1" />
                                Resultaten voor retailers
                              </h5>
                              <p className="text-sm text-pink-900">{event.impact}</p>
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                              <h5 className="font-medium text-blue-800 text-sm mb-1">Return on Investment</h5>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Investering:</span>
                                  <span className="text-blue-900">{event.roi.investment}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Opbrengst:</span>
                                  <span className="text-blue-900">{event.roi.return}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-700">Tijdsbestek:</span>
                                  <span className="text-blue-900">{event.roi.timeframe}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Verification requirements */}
                      <div className="p-4 bg-white border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <ShieldCheckIcon className="h-4 w-4 mr-1 text-blue-700" />
                          Vereiste verificatiematerialen
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {event.verificationRequired.map((item, index) => (
                            <div key={index} className="flex items-start bg-gray-50 p-2 rounded-md">
                              <div className="mt-0.5 mr-2">
                                {item.type === 'fotos' ? (
                                  <CameraIcon className="h-4 w-4 text-blue-600" />
                                ) : item.type === 'deelnemerslijst' ? (
                                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <DocumentCheckIcon className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 leading-tight">{item.name}</p>
                                <p className="text-xs text-gray-600">{item.description}</p>
                              </div>
                              {item.required && (
                                <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">Verplicht</span>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="bg-yellow-50 border-l-2 border-yellow-400 p-3 mb-4 text-sm text-yellow-800">
                          <p className="flex items-center mb-1">
                            <ExclamationCircleIcon className="h-4 w-4 mr-1.5 text-yellow-600" />
                            <span className="font-medium">Belangrijk:</span>
                          </p>
                          <p className="ml-5.5">
                            Alle evenementen moeten vooraf worden aangemeld en goedgekeurd. 
                            Een borgsom van €20 wordt terugbetaald na succesvolle afronding.
                          </p>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventRegistration(event.id);
                          }}
                          disabled={registering === event.id}
                          className="w-full flex items-center justify-center text-sm bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-4 rounded-md font-medium transition-all hover:shadow-md disabled:opacity-70"
                        >
                          {registering === event.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Aanmelding verwerken...
                            </>
                          ) : (
                            <>
                              <span>Event aanmelden & planning starten</span>
                              <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer with call to action */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Meer weten over het Wasgeurtje Business Partners Programma?
                </h3>
                <p className="text-gray-700">
                  Ontdek alle voordelen en vraag een persoonlijk gesprek aan met een van onze accountmanagers.
                  We helpen u graag verder met een op maat gemaakt plan voor uw specifieke situatie.
                </p>
              </div>
              <div className="md:col-span-4 flex flex-col space-y-2">
                <Link 
                  href="/retailer-dashboard/rewards"
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition-all duration-300 hover:shadow-md"
                >
                  Bekijk alle programma details
                </Link>
                <Link 
                  href="/retailer-dashboard/rewards/contact"
                  className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Vraag een gesprek aan
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailerRewardsProgram; 