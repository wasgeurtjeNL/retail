'use client';

import React, { useState } from 'react';
import { ChevronRightIcon, LightBulbIcon, ChartBarIcon, PresentationChartLineIcon, ShoppingBagIcon, SparklesIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

// Type voor een Tip
interface SalesTip {
  id: string;
  title: string;
  description: string;
  image: string;
  increase: number; // Verwachte verkoopstijging in percentage
  icon: React.ReactNode;
  content: React.ReactNode;
}

const RetailerTips: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  // Collectie van tips met mooie vormgeving
  const salesTips: SalesTip[] = [
    {
      id: 'tip-1',
      title: 'Waskleed Demonstratie',
      description: 'Was een kleed met wasparfum en plaats het in uw winkel',
      image: '/assets/images/tips/carpet-demo.jpg',
      increase: 40,
      icon: <SparklesIcon className="h-5 w-5 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-900">
            Door een kleed te wassen met onze wasparfum en deze in uw winkel te plaatsen, 
            creëert u een zintuiglijke ervaring die klanten onmiddellijk opmerken. 
            Deze simpele aanpak heeft bij onze retailers tot <span className="font-bold">40% meer verkopen</span> geleid!
          </p>
          <div className="bg-emerald-50 p-4 rounded-lg">
            <h4 className="font-medium text-emerald-800 mb-2">Hoe te implementeren:</h4>
            <ol className="list-decimal list-inside space-y-2 text-emerald-900">
              <li>Was een kleed of tapijt met een opvallende wasgeurtje (we raden Morning Vapor aan)</li>
              <li>Plaats het kleed op een strategische locatie in uw winkel waar klanten het kunnen aanraken</li>
              <li>Voeg een kleine standaard toe met de tekst "Voel en ruik het verschil" en productinformatie</li>
              <li>Ververs het kleed elke 2-3 weken met een nieuw geurtje om het fris te houden</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'tip-2',
      title: 'Geurhoek Inrichten',
      description: 'Creëer een speciale plek waar klanten geuren kunnen ervaren',
      image: '/assets/images/tips/scent-corner.jpg',
      increase: 35,
      icon: <ShoppingBagIcon className="h-5 w-5 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-900">
            Een speciale "geurhoek" in uw winkel waar klanten verschillende wasgeurtjes kunnen ruiken en ervaren 
            zorgt voor een verbetering van <span className="font-bold">35% in conversie</span>. Het aanmoedigen van 
            zintuiglijke ervaringen helpt klanten bij het kiezen van hun favoriete geur.
          </p>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h4 className="font-medium text-indigo-800 mb-2">Zo richt u een effectieve geurhoek in:</h4>
            <ul className="list-disc list-inside space-y-2 text-indigo-900">
              <li>Reserveer een hoek van min. 1 vierkante meter met goede verlichting</li>
              <li>Plaats stofstaaltjes of katoenen doekjes gedrenkt in verschillende wasgeurtjes</li>
              <li>Label elk staaltje duidelijk en voeg productkaartjes toe met de eigenschappen</li>
              <li>Voeg een display toe met de volledige collectie wasgeurtjes</li>
              <li>Zorg voor een kleine tafel waar klanten producten kunnen bekijken</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'tip-3',
      title: 'Voor-en-Na Demonstratie',
      description: 'Toon tastbare resultaten met een split-demonstratie',
      image: '/assets/images/tips/before-after.jpg',
      increase: 50,
      icon: <PresentationChartLineIcon className="h-5 w-5 text-pink-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-900">
            Door een "voor en na" demonstratie te tonen met identieke kledingstukken waarbij één is gewassen met regulier wasmiddel 
            en de andere met wasparfum, maken retailers een <span className="font-bold">verkoopstijging van tot wel 50%</span> mee. 
            Deze visuele en tastbare vergelijking overtuigt klanten direct van de toegevoegde waarde.
          </p>
          <div className="bg-pink-50 p-4 rounded-lg">
            <h4 className="font-medium text-pink-800 mb-2">Effectieve voor-en-na demonstratie:</h4>
            <ul className="list-disc list-inside space-y-2 text-pink-900">
              <li>Gebruik twee identieke witte handdoeken of t-shirts</li>
              <li>Was één item met regulier wasmiddel, de andere met wasparfum</li>
              <li>Label ze duidelijk als "Standaard gewassen" en "Met wasparfum"</li>
              <li>Plaats ze naast elkaar waar klanten beide kunnen aanraken en ruiken</li>
              <li>Voeg een klein kaartje toe met uitleg over de langdurige geur (tot 12 weken!)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'tip-4',
      title: 'Geursets Combineren',
      description: 'Creëer thematische sets met complementaire geuren',
      image: '/assets/images/tips/seasonal-sets.jpg',
      increase: 30,
      icon: <ChartBarIcon className="h-5 w-5 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-900">
            Door thematische wasparfum-sets samen te stellen (zoals "Lente Editie" of "Winterwarmte"), 
            verhogen retailers hun verkoop met <span className="font-bold">gemiddeld 30%</span>. 
            Klanten kopen graag complementaire geuren als set, vooral als cadeau.
          </p>
          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2">Populaire thematische sets:</h4>
            <ul className="list-disc list-inside space-y-2 text-amber-900">
              <li><strong>Seizoensgebonden sets:</strong> Combineer geuren die passen bij het huidige seizoen</li>
              <li><strong>Cadeau-sets:</strong> Verpak 3 complementaire geuren in cadeauverpakking</li>
              <li><strong>Wellness-sets:</strong> Combineer kalmerende en rustgevende geuren zoals lavendel en vanille</li>
              <li><strong>Proefpakket:</strong> Stel mini-samples samen van bestverkopende geuren</li>
            </ul>
          </div>
          <div className="bg-amber-100 p-3 rounded-lg text-amber-900 text-sm font-medium">
            <span className="flex items-center">
              <LightBulbIcon className="h-4 w-4 mr-2" />
              TIP: Bied een kortingspercentage van 10-15% op sets om de aankoop aantrekkelijker te maken!
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'tip-5',
      title: 'Workshops Organiseren',
      description: 'Organiseer laundry-care workshops voor klanten',
      image: '/assets/images/tips/workshop.jpg',
      increase: 60,
      icon: <LightBulbIcon className="h-5 w-5 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-900">
            Retailers die kleine workshops organiseren over wasparfum en textielonderhoud zien een 
            <span className="font-bold"> indrukwekkende verkoopstijging van 60%</span> tijdens en na deze events. 
            Niet alleen het evenement zelf, maar ook de mond-tot-mond reclame die eruit voortkomt, draagt bij aan dit succes.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Workshop ideeën die werken:</h4>
            <ul className="list-disc list-inside space-y-2 text-blue-900">
              <li>Demonstreer hoe wasparfum correct te gebruiken voor maximale resultaten</li>
              <li>Organiseer een "Creëer je eigen wasgeur" evenement waar klanten kunnen experimenteren</li>
              <li>Host een "Luxe wasdag" workshop over het upgraden van de wekelijkse wasroutine</li>
              <li>Organiseer een klantenavond met proeverijen van nieuwe geuren</li>
            </ul>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-blue-900 text-sm">
            <p className="font-medium mb-1">Planning tip:</p>
            <p>Plan workshops op een rustige winkeldag (zoals donderdagavond) met een limiet van 8-10 deelnemers. Maak een aantrekkelijke aanbieding die alleen geldig is op de avond zelf.</p>
          </div>
        </div>
      )
    }
  ];

  const toggleTip = (tipId: string) => {
    if (expandedTip === tipId) {
      setExpandedTip(null);
    } else {
      setExpandedTip(tipId);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div 
        className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gradient-to-r from-pink-600 to-purple-600 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center">
            <LightBulbIcon className="h-6 w-6 mr-2" />
            Tips & Tricks voor meer verkoop
          </h2>
          <div>
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-white" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        {!expanded && (
          <p className="mt-1 text-sm text-pink-100">
            Klik om bewezen strategieën te bekijken om uw wasparfum verkoop te verhogen
          </p>
        )}
        {expanded && (
          <p className="mt-1 text-sm text-pink-100">
            Bewezen strategieën van succesvolle retailers om uw wasparfum verkoop te verhogen
          </p>
        )}
      </div>
      
      {expanded && (
        <>
          <div className="divide-y divide-gray-200">
            {salesTips.map((tip) => (
              <div key={tip.id} className="overflow-hidden">
                <button
                  onClick={() => toggleTip(tip.id)}
                  className="w-full px-4 py-5 sm:px-6 text-left focus:outline-none focus:bg-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {tip.icon}
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">{tip.title}</h3>
                        <p className="text-sm text-gray-800">{tip.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        +{tip.increase}% verkoop
                      </span>
                      <ChevronRightIcon
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          expandedTip === tip.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>
                </button>
                
                {expandedTip === tip.id && (
                  <div className="px-4 pb-5 sm:px-6 pt-2 bg-gray-50">
                    <div className="sm:flex sm:gap-8">
                      <div className="mb-4 sm:mb-0 sm:w-1/3 lg:w-1/4">
                        <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-200">
                          <img
                            src={tip.image}
                            alt={tip.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback als de afbeelding niet bestaat
                              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/pink/white?text=Wasparfum+Tip';
                            }}
                          />
                        </div>
                        <div className="mt-2 hidden sm:block">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            +{tip.increase}% gemiddelde verkoop
                          </span>
                        </div>
                      </div>
                      <div className="sm:flex-1">
                        {tip.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-700 flex items-center justify-between">
              <p>Heeft u zelf een succesvolle verkooptip? Deel deze met ons!</p>
              <button 
                className="inline-flex items-center px-3 py-1.5 border border-pink-600 text-xs font-medium rounded-md text-pink-600 bg-white hover:bg-pink-50 focus:outline-none"
              >
                Tip delen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RetailerTips; 