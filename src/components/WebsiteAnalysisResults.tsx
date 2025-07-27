'use client';

import { WebsiteAnalysisData } from './WebsiteAnalysisSection';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  CheckBadgeIcon,
  SparklesIcon,
  LinkIcon,
  ListBulletIcon,
  ChartBarIcon,
  LightBulbIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

interface WebsiteAnalysisResultsProps {
  analysis: WebsiteAnalysisData;
}

interface WebsiteAnalysisResultsCompactProps {
  analysis: WebsiteAnalysisData;
  showWebsiteUrl?: boolean;
  className?: string;
}

const InfoCard = ({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string | number | undefined | null }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start">
    <div className="flex-shrink-0">
      <Icon className="h-6 w-6 text-gray-500" />
    </div>
    <div className="ml-4">
      <dt className="text-sm font-medium text-gray-600">{title}</dt>
      <dd className="mt-1 text-sm text-gray-900 font-semibold">{value || 'Onbekend'}</dd>
    </div>
  </div>
);

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
      <Icon className="w-6 h-6 mr-3 text-blue-600" />
      {title}
    </h3>
    <div className="bg-gray-50/80 border border-gray-200 rounded-lg p-6 space-y-6">
      {children}
    </div>
  </div>
);

const renderList = (items: string[] | undefined | null) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500">Geen data beschikbaar</p>;
  }
  return (
    <ul className="list-disc list-inside space-y-2 text-gray-700">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
};

// Compact version for admin lists
export function WebsiteAnalysisResultsCompact({ 
  analysis, 
  showWebsiteUrl = false, 
  className = "" 
}: WebsiteAnalysisResultsCompactProps) {
  if (!analysis.analysis_data) {
    return (
      <div className={`text-center py-4 bg-white rounded-lg border border-gray-200 ${className}`}>
        <p className="text-gray-600 text-sm">Analyse niet voltooid</p>
      </div>
    );
  }

  const {
    businessType,
    confidenceScore,
    location,
    businessDescription,
  } = analysis.analysis_data;

  const confidenceText = confidenceScore ? `${Math.round(confidenceScore * 100)}%` : '0%';
  const confidenceColor = confidenceScore && confidenceScore >= 0.8 
    ? 'text-green-600 bg-green-100' 
    : confidenceScore && confidenceScore >= 0.5 
    ? 'text-yellow-600 bg-yellow-100' 
    : 'text-red-600 bg-red-100';

  return (
    <div className={`${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {showWebsiteUrl && (
            <div className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2">
              <GlobeAltIcon className="w-4 h-4 mr-1" />
              <a 
                href={analysis.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="truncate font-medium hover:underline"
              >
                {analysis.website_url}
              </a>
            </div>
          )}
          
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {businessType || 'Onbekend bedrijfstype'}
          </h4>
          
          {location && (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <MapPinIcon className="w-4 h-4 mr-1" />
              {location}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}>
            <CheckBadgeIcon className="w-3 h-3 mr-1" />
            {confidenceText}
          </span>
        </div>
      </div>

      {businessDescription && (
        <p className="text-sm text-gray-700 leading-relaxed">
          {businessDescription.length > 150 
            ? businessDescription.substring(0, 150) + '...' 
            : businessDescription}
        </p>
      )}
    </div>
  );
}

export default function WebsiteAnalysisResults({ analysis }: WebsiteAnalysisResultsProps) {
  if (!analysis.analysis_data) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-600">De analyse is nog niet voltooid of bevat geen gegevens.</p>
      </div>
    );
  }

  const {
    businessType,
    confidenceScore,
    location,
    mainActivities,
    targetMarket,
    businessDescription,
    keyServices,
    marketingInsights,
    recommendations,
    competitorAnalysis,
  } = analysis.analysis_data;

  const confidenceText = confidenceScore ? `${Math.round(confidenceScore * 100)}%` : 'Onbekend';

  return (
    <div className="space-y-8">
      {/* Key Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard icon={BuildingOffice2Icon} title="Bedrijfstype" value={businessType} />
        <InfoCard icon={CheckBadgeIcon} title="Betrouwbaarheid" value={confidenceText} />
        <InfoCard icon={MapPinIcon} title="Locatie" value={location} />
      </div>

      {/* Business Overview */}
      <Section icon={SparklesIcon} title="Bedrijfsoverzicht">
        <p className="text-gray-800 leading-relaxed">{businessDescription || 'Geen beschrijving beschikbaar.'}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Kernactiviteiten</h4>
            {renderList(mainActivities)}
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Diensten</h4>
            {renderList(keyServices)}
          </div>
        </div>
        <div className="pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Doelgroep</h4>
          <p className="text-gray-700">{targetMarket || 'Niet gespecificeerd.'}</p>
        </div>
      </Section>

      {/* Marketing & Competitor Insights */}
      {(marketingInsights || competitorAnalysis) && (
        <Section icon={ChartBarIcon} title="Marketing & Concurrentie">
           {marketingInsights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
               <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Unieke Verkooppunten</h4>
                  {renderList(marketingInsights.uniqueSellingPoints)}
               </div>
               <div>
                 <h4 className="font-semibold text-gray-800 mb-3">Positionering</h4>
                 <p className="text-gray-700">{marketingInsights.positioning || 'Niet gespecificeerd.'}</p>
               </div>
            </div>
           )}
           {competitorAnalysis && (
             <div className="pt-6">
               <h4 className="font-semibold text-gray-800 mb-3">Concurrentievoordelen</h4>
               {renderList(competitorAnalysis.competitiveAdvantages)}
             </div>
           )}
        </Section>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Section icon={LightBulbIcon} title="Aanbevelingen">
          {renderList(recommendations)}
        </Section>
      )}
    </div>
  );
} 