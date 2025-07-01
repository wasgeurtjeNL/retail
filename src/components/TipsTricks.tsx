'use client';

import React, { useState } from 'react';
import { 
  ChevronRightIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

const TipsTricks: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const toggleSection = (sectionId: string) => {
    if (activeSection === sectionId) {
      setActiveSection(null);
    } else {
      setActiveSection(sectionId);
    }
  };
  
  const tipSections = [
    {
      id: 'display-tips',
      title: 'Presentatie in de Winkel',
      tips: [
        'Plaats wasparfum bij de kassa voor impulsaankopen',
        'Creëer een ruikstation waar klanten alle geuren kunnen ervaren',
        'Groepeer producten per geur-familie (fris, bloemig, kruidig)',
        'Gebruik beeldmateriaal met beelden van schone, geurende was',
        'Voeg tester-strips toe zodat klanten kunnen ruiken zonder de flessen te openen'
      ]
    },
    {
      id: 'sales-tips',
      title: 'Verkooptechnieken',
      tips: [
        'Laat klanten twee contrasterende geuren ruiken voor een duidelijk verschil',
        'Bied "geur van de week" met 10% korting aan',
        'Benadruk de houdbaarheid van 12 weken als kosteneffectief voordeel',
        'Vraag naar de specifieke wensen en stel gerichte vragen over voorkeuren',
        'Creëer een 3+1 aanbieding voor klanten die meerdere geuren willen proberen'
      ]
    },
    {
      id: 'stock-tips',
      title: 'Voorraad & Bestellingen',
      tips: [
        'Houd minimaal 5 stuks van populaire geuren in voorraad',
        'Plan bestellingen zo dat nieuwe voorraad binnenkomt als topgeuren onder 3 stuks komen',
        'Bewaar producten op een koele, donkere plaats voor behoud van kwaliteit',
        'Gebruik FIFO (First In, First Out) voor producten met beperkte houdbaarheid',
        'Houd bij welke geuren het beste verkopen per seizoen voor toekomstige bestellingen'
      ]
    },
    {
      id: 'upsell-tips',
      title: 'Upsell & Cross-sell',
      tips: [
        'Bied complementaire producten aan, zoals geursticks voor in de kledingkast',
        'Stel seizoensgebonden bundels samen met korting (bijv. lente-schoonmaakpakket)',
        'Bij grote aankopen: geef een kleine tester van een nieuwe geur mee',
        'Bied een VIP-kaart aan bij aankopen vanaf €50 voor toekomstige korting',
        'Suggereer geschikte wasparfums op basis van gekochte kledingitems in uw winkel'
      ]
    }
  ];
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Klikbare header die altijd zichtbaar is */}
      <div 
        className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <LightBulbIcon className="h-6 w-6 text-white mr-2" />
            <h2 className="text-lg font-bold text-white">Tips & Tricks voor meer verkoop</h2>
          </div>
          <div className="flex items-center">
            <div className="bg-white text-orange-700 px-3 py-1 rounded-full text-xs font-bold mr-3 flex items-center">
              <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
              <span>Verhoog uw conversie met 25%</span>
            </div>
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-white" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        {!expanded && (
          <p className="text-orange-100 text-sm mt-1">
            Klik om praktische verkooptips te bekijken die direct resultaat opleveren
          </p>
        )}
        {expanded && (
          <p className="text-orange-100 text-sm mt-1">
            Praktische verkooptips die direct resultaat opleveren
          </p>
        )}
      </div>

      {/* Uitklapbare inhoud die alleen getoond wordt als expanded=true */}
      {expanded && (
        <div className="p-4">
          <div className="space-y-3">
            {tipSections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-base font-medium text-gray-900">{section.title}</h3>
                  <ChevronRightIcon
                    className={`h-5 w-5 text-gray-500 transition-transform ${
                      activeSection === section.id ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {activeSection === section.id && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-amber-50">
                    <ul className="space-y-2">
                      {section.tips.map((tip, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="bg-amber-200 text-amber-800 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                            {index + 1}
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TipsTricks;