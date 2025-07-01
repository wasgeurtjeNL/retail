'use client';

import React, { useState } from 'react';
import { 
  ChevronRightIcon, 
  ChartBarIcon, 
  ShoppingBagIcon, 
  GlobeAltIcon, 
  UserGroupIcon, 
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

interface StrategyCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  strategies: Strategy[];
}

interface Strategy {
  id: string;
  title: string;
  description: string;
  steps: string[];
  roi: string;
  timeframe: string;
  investmentLevel: 'Laag' | 'Gemiddeld' | 'Hoog';
}

const BusinessGrowthStrategies: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  const strategyCategories: StrategyCategory[] = [
    {
      id: 'social-media',
      title: 'Social Media Strategie',
      icon: <GlobeAltIcon className="h-6 w-6 text-blue-600" />,
      description: 'Effectieve social media strategieën voor retailers',
      strategies: [
        {
          id: 'social-1',
          title: 'Reels en Stories Campagne',
          description: 'Creëer visueel aantrekkelijke korte video\'s die het wasproces en de resultaten tonen',
          steps: [
            'Maak 3-5 korte video\'s (15-30 sec) die het "voor en na" wasproces tonen',
            'Focus op de zichtbare resultaten en benadruk de geur die lang blijft hangen',
            'Gebruik populaire muziek en trends om bereik te vergroten',
            'Eindig elke video met een call-to-action naar uw winkel',
            'Post 2x per week op een vast tijdstip voor maximale betrokkenheid'
          ],
          roi: 'Typisch 20-35% meer winkelverkeer van lokale klanten binnen 4-6 weken',
          timeframe: '4-6 weken voor meetbare resultaten',
          investmentLevel: 'Laag'
        },
        {
          id: 'social-2',
          title: 'Local Hashtag Strategie',
          description: 'Gebruik lokale en niche hashtags om specifieke doelgroepen in uw regio te bereiken',
          steps: [
            'Onderzoek populaire lokale hashtags in uw regio (bijv. #Rotterdam, #WinkelenUtrecht)',
            'Combineer altijd lokale hashtags met product hashtags (#Wasparfum #LangdurigeGeur)',
            'Creëer een unieke branded hashtag voor uw winkel (#WasparfumBijLinda)',
            'Moedig klanten aan deze hashtag te gebruiken bij hun eigen posts',
            'Monitor dagelijks hashtags en reageer op relevante posts'
          ],
          roi: 'Gemiddeld 15-25% meer online zichtbaarheid en 10-15% meer in-store bezoekers',
          timeframe: '2-3 maanden consistente toepassing',
          investmentLevel: 'Laag'
        },
        {
          id: 'social-3',
          title: 'Influencer Samenwerking',
          description: 'Werk samen met lokale micro-influencers om geloofwaardigheid en bereik te vergroten',
          steps: [
            'Identificeer 3-5 lokale micro-influencers (5.000-15.000 volgers) in lifestyle of home decor',
            'Bied een gratis wasparfum pakket aan in ruil voor authentieke content',
            'Vraag om specifieke content: unboxing, toepassing en resultaat na 8 weken',
            'Maak een speciale kortingscode per influencer om ROI te tracken',
            'Hergebruik influencer content op uw eigen kanalen (met toestemming)'
          ],
          roi: '25-40% toename in nieuwe klanten, met name uit jongere doelgroepen',
          timeframe: '1-3 maanden voor volledige campagne',
          investmentLevel: 'Gemiddeld'
        }
      ]
    },
    {
      id: 'retail-experience',
      title: 'Retail Experience',
      icon: <ShoppingBagIcon className="h-6 w-6 text-pink-600" />,
      description: 'Strategieën om de winkelervaring te optimaliseren',
      strategies: [
        {
          id: 'retail-1',
          title: 'Sensory Shopping Experience',
          description: 'Creëer een meeslepende zintuiglijke ervaring in uw winkel die de unieke eigenschappen van wasparfum benadrukt',
          steps: [
            'Richt een "Geur-Bar" in met testers van alle wasparfum varianten',
            'Toon stoffen met verschillende texturen gewassen met wasparfum',
            'Installeer subtiele verlichting die de productpresentatie verbetert',
            'Speel zachte achtergrondmuziek die past bij de premium uitstraling',
            'Bied klanten een "geur-kaart" aan waarop ze hun favoriete geuren kunnen noteren'
          ],
          roi: 'Gemiddeld 30-45% hogere conversie en 25% toename in gemiddelde orderwaarde',
          timeframe: '1 maand voor implementatie, 2-3 maanden voor maximale resultaten',
          investmentLevel: 'Gemiddeld'
        },
        {
          id: 'retail-2',
          title: 'Seizoensgebonden Displays',
          description: 'Creëer wisselende seizoensgebonden displays die inspelen op actuele trends en behoeften',
          steps: [
            'Ontwikkel 4 seizoensdisplays met bijpassende wasparfums (lente, zomer, herfst, winter)',
            'Koppel elk seizoen aan specifieke geuren die passen bij het seizoen',
            'Creëer thematische presentaties (bijv. "Zomerse Frisheid", "Winterse Warmte")',
            'Ververs displays elke 2-3 maanden en kondig dit aan via social media',
            'Bied seizoensgebonden bundelaanbiedingen aan met bijpassende geuren'
          ],
          roi: '20-30% toename in verkoop tijdens seizoenswisselingen',
          timeframe: 'Doorlopend met kwartaalplanning',
          investmentLevel: 'Gemiddeld'
        },
        {
          id: 'retail-3',
          title: 'Workshop Woensdagen',
          description: 'Organiseer wekelijkse mini-workshops die klanten educeren en betrekken',
          steps: [
            'Plan elke woensdag een 30 minuten durende mini-workshop na sluitingstijd',
            'Roteer tussen verschillende thema\'s: wasparfum selecteren, kledingonderhoud, toepassing',
            'Beperk deelname tot 8-10 personen voor persoonlijke aandacht',
            'Bied exclusieve workshop-deelnemerskorting van 10% op aankopen',
            'Verzamel e-mailadressen voor follow-up en nieuws over toekomstige workshops'
          ],
          roi: '50-70% conversie onder deelnemers en 25% word-of-mouth aanbevelingen',
          timeframe: 'Wekelijks, resultaten binnen 2 maanden',
          investmentLevel: 'Gemiddeld'
        }
      ]
    },
    {
      id: 'b2b-growth',
      title: 'B2B Groeistrategie',
      icon: <ChartBarIcon className="h-6 w-6 text-amber-600" />,
      description: 'Strategieën om samen met Wasgeurtje te groeien',
      strategies: [
        {
          id: 'b2b-1',
          title: 'Cross-Retail Samenwerkingen',
          description: 'Werk samen met complementaire retailers voor wederzijdse groei',
          steps: [
            'Identificeer 3-5 niet-concurrerende retailers met vergelijkbare klanten (interieurwinkels, kledingzaken, geschenkwinkels)',
            'Ontwikkel een wederzijds verwijzingsprogramma (10% korting bij wederzijdse aankoop)',
            'Creëer gezamenlijke productbundels die in beide winkels verkocht worden',
            'Organiseer gezamenlijke evenementen zoals "lifestyle-avonden"',
            'Deel klantdata en inzichten voor betere targeting (met inachtneming van AVG)'
          ],
          roi: '15-25% nieuwe klanten via kruisverwijzingen, 20-30% hogere omzet',
          timeframe: '3-6 maanden voor volledige implementatie',
          investmentLevel: 'Laag'
        },
        {
          id: 'b2b-2',
          title: 'Retailer Kennisplatform',
          description: 'Creëer een gemeenschap van Wasgeurtje retailers voor kennisdeling en best practices',
          steps: [
            'Stel een privé Facebook- of WhatsApp-groep in voor alle aangesloten retailers',
            'Deel wekelijks succesvolle verkoopstrategieën en resultaten',
            'Organiseer maandelijkse online kennisuitwisselingssessies',
            'Voer een retailer van de maand programma in voor beste prestaties',
            'Creëer een gezamenlijke databank van effectieve marketing materialen'
          ],
          roi: 'Gemiddeld 20% omzetverhoging door toepassing van best practices',
          timeframe: 'Direct starten, 1-2 maanden voor actieve community',
          investmentLevel: 'Laag'
        },
        {
          id: 'b2b-3',
          title: 'Lokale PR Campagne',
          description: 'Zet een gecoördineerde lokale PR-strategie op met alle retailers',
          steps: [
            'Werk samen met Wasgeurtje aan een nationale PR template die lokaal aangepast kan worden',
            'Benader lokale kranten en magazines voor artikelen over duurzaam wassen',
            'Organiseer "Geur-Expert" interviews met retailers voor lokale media',
            'Creëer een perskit die elke retailer kan gebruiken bij lokale media',
            'Coördineer timing van persberichten voor maximale landelijke impact'
          ],
          roi: '30-50% toename in merkbekendheid, 15-25% nieuwe klanten',
          timeframe: '2-3 maanden voorbereiding, 4-6 maanden uitvoering',
          investmentLevel: 'Hoog'
        }
      ]
    },
    {
      id: 'customer-loyalty',
      title: 'Klantloyaliteit & Retentie',
      icon: <UserGroupIcon className="h-6 w-6 text-green-600" />,
      description: 'Strategieën om klanten te behouden en hun levensduurwaarde te verhogen',
      strategies: [
        {
          id: 'loyalty-1',
          title: 'Geur Abonnement Programma',
          description: 'Creëer een abonnementsdienst voor wasparfum met regelmatige leveringen',
          steps: [
            'Ontwikkel 3 abonnementsniveaus (basis, premium, luxe) met verschillende leverschema\'s',
            'Bied 10-15% korting op abonnementsproducten ten opzichte van eenmalige aankopen',
            'Voeg exclusieve monsters van nieuwe geuren toe aan elke zending',
            'Implementeer een eenvoudig online beheersysteem voor klanten om leveringen aan te passen',
            'Beloon trouwe abonnees met speciale jubileumgeschenken (na 6 maanden, 1 jaar, etc.)'
          ],
          roi: '25-40% hogere customer lifetime value, 30% meer voorspelbare omzet',
          timeframe: '2 maanden opzetten, 6-12 maanden voor maximaal rendement',
          investmentLevel: 'Gemiddeld'
        },
        {
          id: 'loyalty-2',
          title: 'Referral Rewards Programma',
          description: 'Stimuleer klanten om vrienden en familie te verwijzen naar uw winkel',
          steps: [
            'Creëer een digitaal en fysiek verwijzingssysteem met unieke codes per klant',
            'Beloon zowel de verwijzer (15% korting op volgende aankoop) als de nieuwe klant (10% korting)',
            'Implementeer een tier-systeem met toenemende beloningen bij meerdere verwijzingen',
            'Vier mijlpalen (5, 10, 25 verwijzingen) met speciale geschenken',
            'Deel "verwijzingssuccesverhalen" op social media om het programma te promoten'
          ],
          roi: '20-30% nieuwe klanten via verwijzingen met 40% hogere retentie',
          timeframe: '1 maand implementatie, continue uitvoering',
          investmentLevel: 'Laag'
        },
        {
          id: 'loyalty-3',
          title: 'Wasparfum Masterclass Serie',
          description: 'Ontwikkel een serie diepgaande masterclasses voor de meest geïnteresseerde klanten',
          steps: [
            'Creëer een 4-delige masterclass over verschillende aspecten van wasparfum en textielzorg',
            'Bied exclusieve toegang voor trouwe klanten of tegen een premium prijs',
            'Organiseer elk kwartaal een nieuwe masterclass-serie met verschillende thema\'s',
            'Maak professioneel uitziende certificaten voor deelnemers',
            'Creëer een "Wasparfum Ambassador" programma voor afgestudeerden van alle masterclasses'
          ],
          roi: '75-90% retentie van deelnemers, 35% verhoging van gemiddelde besteding',
          timeframe: '3 maanden ontwikkeling, kwartaal uitvoering',
          investmentLevel: 'Hoog'
        }
      ]
    }
  ];

  const toggleCategory = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
    setExpandedStrategy(null);
  };

  const toggleStrategy = (strategyId: string) => {
    if (expandedStrategy === strategyId) {
      setExpandedStrategy(null);
    } else {
      setExpandedStrategy(strategyId);
    }
  };

  const getInvestmentLevelClass = (level: string) => {
    switch (level) {
      case 'Laag':
        return 'bg-green-100 text-green-800';
      case 'Gemiddeld':
        return 'bg-amber-100 text-amber-800';
      case 'Hoog':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div 
        className="bg-gradient-to-r from-indigo-600 to-blue-700 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <LightBulbIcon className="h-6 w-6 text-white mr-2" />
            <h2 className="text-lg font-bold text-white">Groeistrategie voor marktleiderschap</h2>
          </div>
          <div className="flex items-center">
            <div className="bg-white text-blue-700 px-3 py-1 rounded-full text-xs font-bold mr-3 flex items-center">
              <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
              <span>Verhoog omzet met 30-50%</span>
            </div>
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-white" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        {!expanded && (
          <p className="text-indigo-200 text-sm mt-1">
            Klik om strategieën te bekijken die uw marktpositie versterken en omzet maximaliseren
          </p>
        )}
        {expanded && (
          <p className="text-indigo-200 text-sm mt-1">
            Strategische aanpak om Wasgeurtje tot marktleider te maken en retaileromzet te maximaliseren
          </p>
        )}
      </div>
      
      {expanded && (
        <div className="divide-y divide-gray-200">
          {strategyCategories.map((category) => (
            <div key={category.id} className="overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-6 py-5 text-left focus:outline-none focus:bg-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {category.icon}
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-800">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {category.strategies.length} strategieën
                    </span>
                    <ChevronRightIcon
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedCategory === category.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </button>
              
              {expandedCategory === category.id && (
                <div className="px-6 pb-5 bg-gray-50">
                  <div className="space-y-4">
                    {category.strategies.map((strategy) => (
                      <div key={strategy.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <button
                          onClick={() => toggleStrategy(strategy.id)}
                          className="w-full px-4 py-3 text-left focus:outline-none hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-medium text-gray-900">{strategy.title}</h4>
                              <p className="text-sm text-gray-800">{strategy.description}</p>
                            </div>
                            <div className="flex items-center ml-4">
                              <span className={`mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInvestmentLevelClass(strategy.investmentLevel)}`}>
                                {strategy.investmentLevel}
                              </span>
                              <ChevronRightIcon
                                className={`h-5 w-5 text-gray-400 transition-transform ${
                                  expandedStrategy === strategy.id ? 'rotate-90' : ''
                                }`}
                              />
                            </div>
                          </div>
                        </button>
                        
                        {expandedStrategy === strategy.id && (
                          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <div className="space-y-4">
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Implementatie stappen:</h5>
                                <ul className="list-disc list-inside space-y-1 text-gray-900">
                                  {strategy.steps.map((step, index) => (
                                    <li key={index} className="text-sm">{step}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-md bg-indigo-50 p-3">
                                  <h5 className="text-sm font-medium text-indigo-800 mb-1">Verwachte ROI</h5>
                                  <p className="text-sm text-indigo-900">{strategy.roi}</p>
                                </div>
                                
                                <div className="rounded-md bg-blue-50 p-3">
                                  <h5 className="text-sm font-medium text-blue-800 mb-1">Tijdlijn</h5>
                                  <p className="text-sm text-blue-900">{strategy.timeframe}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700 mb-2 sm:mb-0">
                Heeft u een strategie succesvol geïmplementeerd? Deel uw resultaten met het Wasgeurtje team!
              </p>
              <button 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                Resultaten delen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessGrowthStrategies; 