"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import RetailerTips from "@/components/RetailerTips";
import BusinessGrowthStrategies from "@/components/BusinessGrowthStrategies";
import SocialMediaGuide from "@/components/SocialMediaGuide";
import RetailerRewardsProgram from "@/components/RetailerRewardsProgram";
import BackButton from "@/components/BackButton";

type MarketingSection = 'overview' | 'social-media' | 'business-partners' | 'growth-strategy' | 'tips-tricks';

export default function MarketingToolsPage() {
  const { user, retailerName } = useAuth();
  const [activeSection, setActiveSection] = useState<MarketingSection>('overview');

  const marketingSections = [
    {
      id: 'social-media' as MarketingSection,
      title: 'Social Media Omzet Booster',
      description: 'Bewezen sjablonen & strategieën om direct uw kassa te laten rinkelen',
      icon: '💰',
      color: 'from-purple-500 to-indigo-600',
      benefit: 'Tot +€1.250 extra omzet per maand'
  },
  {
      id: 'business-partners' as MarketingSection,
      title: 'Wasgeurtje Business Partners Program',
      description: 'Exclusieve events. Premium producten. Gegarandeerde omzetgroei.',
      icon: '🏆',
      color: 'from-pink-500 to-purple-600',
      benefit: 'Tot €140 aan premium producten/maand'
  },
  {
      id: 'growth-strategy' as MarketingSection,
      title: 'Groeistrategie voor marktleiderschap',
      description: 'Strategieën om uw marktpositie te versterken en omzet maximaliseren',
      icon: '💡',
      color: 'from-blue-500 to-purple-600',
      benefit: 'Verhoog omzet met 30-50%'
    },
    {
      id: 'tips-tricks' as MarketingSection,
      title: 'Tips & Tricks voor meer verkoop',
      description: 'Bewezen strategieën om uw wasparfum verkoop te verhogen',
      icon: '💡',
      color: 'from-pink-500 to-purple-600',
      benefit: 'Direct toepasbare tactieken'
  }
];

  const renderContent = () => {
    switch (activeSection) {
      case 'social-media':
        return <SocialMediaGuide />;
      case 'business-partners':
        return <RetailerRewardsProgram />;
      case 'growth-strategy':
        return <BusinessGrowthStrategies />;
      case 'tips-tricks':
        return <RetailerTips />;
      default:
  return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Marketing Tools & Strategieën
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Boost uw verkoop met onze bewezen marketing strategieën en tools. 
                Kies een categorie om te beginnen met het vergroten van uw omzet.
        </p>
      </div>
      
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {marketingSections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                >
                  <div className={`bg-gradient-to-r ${section.color} p-6 text-white min-h-[200px] flex flex-col justify-between`}>
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-4xl">{section.icon}</div>
                        <div className="text-right">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium">
                            {section.benefit}
          </div>
        </div>
        </div>
                      
                      <h3 className="text-xl font-bold mb-2">{section.title}</h3>
                      <p className="text-white/90 text-sm leading-relaxed">
                        {section.description}
                      </p>
      </div>
      
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                        Klik om te openen
                      </span>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
      
            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-6 text-white mt-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">🎯 Uw Marketing Potentieel</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">+€1.250</div>
                    <div className="text-sm">Extra omzet/maand mogelijk</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">50%</div>
                    <div className="text-sm">Omzetgroei haalbaar</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">€140</div>
                    <div className="text-sm">Premium producten/maand</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        {activeSection !== 'overview' && (
          <div className="mb-6">
            <button
              onClick={() => setActiveSection('overview')}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Terug naar overzicht
            </button>
        </div>
      )}

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
} 