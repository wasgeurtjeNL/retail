"use client";

import React, { useState, useEffect } from 'react';
import { RetailerSalesAdvice } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LightBulbIcon, 
  SparklesIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  TrophyIcon,
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface SalesAdviceWidgetProps {
  profileId?: string;
  className?: string;
}

interface SalesAdviceResponse {
  advice: RetailerSalesAdvice | null;
  needs_generation: boolean;
  message?: string;
}

export default function SalesAdviceWidget({ profileId, className = '' }: SalesAdviceWidgetProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [advice, setAdvice] = useState<RetailerSalesAdvice | null>(null);
  const [needsGeneration, setNeedsGeneration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualSummary, setManualSummary] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticationRequired, setAuthenticationRequired] = useState(false);

  const actualProfileId = profileId || user?.id;

  // Format advice text into beautiful sections
  const formatAdviceText = (text: string) => {
    const sections = text.split(/\d+\.\s\*\*/).filter(section => section.trim());
    
    return sections.map((section, index) => {
      if (index === 0 && section.includes('**')) {
        // Header section
        const title = section.split('**')[1];
        return (
          <div key={index} className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-2xl font-bold text-blue-900 mb-2 flex items-center">
              <TrophyIcon className="h-6 w-6 mr-2" />
              {title}
            </h2>
          </div>
        );
      }

      // Content sections
      const lines = section.trim().split('\n').filter(line => line.trim());
      const sectionTitle = lines[0]?.replace(/\*\*/g, '');
      const content = lines.slice(1).join('\n');
      
      const getIcon = (index: number) => {
        const icons = [LightBulbIcon, FireIcon, ChartBarIcon];
        const IconComponent = icons[index % icons.length];
        return <IconComponent className="h-5 w-5" />;
      };

      return (
        <div key={index} className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 text-blue-600">
              {getIcon(index)}
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {index + 1}. {sectionTitle}
              </h3>
              <div className="prose prose-sm max-w-none">
                <div 
                  className="text-gray-700 leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ 
                    __html: content
                      .replace(/- /g, '• ')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  // Fetch existing sales advice
  useEffect(() => {
    if (authLoading) {
      console.log('[SALES-ADVICE-WIDGET] Auth still loading...');
      return;
    }

    if (!user) {
      console.log('[SALES-ADVICE-WIDGET] No user - authentication required');
      setAuthenticationRequired(true);
      setIsLoading(false);
      return;
    }

    if (!actualProfileId) {
      console.log('[SALES-ADVICE-WIDGET] No profile ID available');
      setError('Profile ID not available');
      setIsLoading(false);
      return;
    }

    console.log('[SALES-ADVICE-WIDGET] User authenticated, fetching sales advice');
    setAuthenticationRequired(false);
    fetchSalesAdvice();
  }, [authLoading, user, actualProfileId]);

  const fetchSalesAdvice = async () => {
    if (!user || !actualProfileId) {
      console.log('[SALES-ADVICE-WIDGET] No user or profile ID available:', { user: !!user, actualProfileId });
      return;
    }

    console.log('[SALES-ADVICE-WIDGET] Fetching sales advice for profile:', actualProfileId);
    console.log('[SALES-ADVICE-WIDGET] User object:', { id: user.id, email: user.email });

    try {
      setIsLoading(true);
      setError(null);

      const url = `/api/sales-advice?profile_id=${actualProfileId}`;
      console.log('[SALES-ADVICE-WIDGET] Making fetch request to:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for auth like other components
      });

      console.log('[SALES-ADVICE-WIDGET] Response status:', response.status, response.statusText);

      if (response.status === 401) {
        // Authentication failed
        console.log('[SALES-ADVICE-WIDGET] Authentication failed - redirecting to login');
        setAuthenticationRequired(true);
        setError('Authentication required. Please log in.');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SALES-ADVICE-WIDGET] Error response:', errorText);
        throw new Error(`Failed to fetch sales advice: ${response.status} ${response.statusText}`);
      }

      const data: SalesAdviceResponse = await response.json();
      console.log('[SALES-ADVICE-WIDGET] Received data:', data);
      
      setAdvice(data.advice);
      setNeedsGeneration(data.needs_generation);

      // Show manual input if no advice and no data available
      if (!data.advice && !data.needs_generation) {
        setShowManualInput(true);
      } else if (data.advice) {
        // If we have advice, make sure we're showing it
        setNeedsGeneration(false);
        setShowManualInput(false);
        console.log('[SALES-ADVICE-WIDGET] Found existing advice, displaying it');
      } else if (data.needs_generation) {
        // If we need generation, show the generate button
        setAdvice(null);
        setShowManualInput(false);
        console.log('[SALES-ADVICE-WIDGET] Can generate advice, showing generate button');
      }

    } catch (error) {
      console.error('[SALES-ADVICE-WIDGET] Error fetching sales advice:', error);
      setError(`Failed to load sales advice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAdvice = async () => {
    if (!actualProfileId) return;

    console.log('[SALES-ADVICE-WIDGET] Generate advice for profile:', actualProfileId);

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/sales-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for auth like other components
        body: JSON.stringify({ profile_id: actualProfileId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate sales advice');
      }

      const data = await response.json();
      setAdvice(data.advice);
      setNeedsGeneration(false);
      setShowManualInput(false);

    } catch (error) {
      console.error('Error generating sales advice:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate sales advice');
    } finally {
      setIsGenerating(false);
    }
  };

  const submitManualSummary = async () => {
    if (!actualProfileId || !manualSummary.trim()) return;

    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/sales-advice', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for auth like other components
        body: JSON.stringify({ 
          profile_id: actualProfileId,
          manual_business_summary: manualSummary.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update business summary');
      }

      const data = await response.json();
      setAdvice(data.advice);
      setNeedsGeneration(false);
      setShowManualInput(false);
      setManualSummary('');

    } catch (error) {
      console.error('Error submitting manual summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to update business summary');
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Show authentication required message
  if (authenticationRequired) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-blue-800">Inloggen vereist</h3>
        </div>
        <p className="text-blue-700 mb-4">
          Om gepersonaliseerd verkoopadvies te ontvangen, moet je eerst inloggen met je retailer account.
        </p>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <LightBulbIcon className="h-5 w-5 mr-2" />
          Inloggen
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold text-red-800">Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchSalesAdvice}
          className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  // Show advice if available
  if (advice) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 rounded-full p-2">
              <LightBulbIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                🧠 Verkooptip op basis van jouw bedrijf
              </h3>
              <p className="text-sm text-blue-600">
                Gegenereerd op {new Date(advice.created_at).toLocaleDateString('nl-NL')}
                {advice.confidence_score && (
                  <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">
                    {Math.round(advice.confidence_score * 100)}% betrouwbaarheid
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={fetchSalesAdvice}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </button>
        </div>
        
        <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {formatAdviceText(advice.advice_text)}
          </div>
        </div>

        <div className="mt-4 flex items-center text-xs text-blue-600">
          <SparklesIcon className="h-4 w-4 mr-1" />
          <span>
            Gegenereerd met AI op basis van {advice.source === 'ai_analysis' ? 'website analyse' : 'bedrijfsinformatie'}
          </span>
        </div>
      </div>
    );
  }

  // Show generation option if data is available
  if (needsGeneration) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-yellow-500 rounded-full p-2">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-yellow-900">
            Verkoopadvies beschikbaar!
          </h3>
        </div>
        
        <p className="text-yellow-800 mb-4">
          We kunnen nu gepersonaliseerd verkoopadvies voor je genereren op basis van je bedrijfsinformatie.
        </p>

        <button
          onClick={generateAdvice}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              Genereren...
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5 mr-2" />
              Genereer verkoopadvies
            </>
          )}
        </button>
      </div>
    );
  }

  // Show manual input option
  if (showManualInput) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-gray-600 rounded-full p-2">
            <DocumentTextIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Verkoopadvies op maat
          </h3>
        </div>
        
        <p className="text-gray-700 mb-4">
          We hebben nog geen verkoopadvies voor je kunnen genereren. Geef hieronder een korte beschrijving van jouw winkel, dan ontvang je gepersonaliseerde tips!
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="manual-summary" className="block text-sm font-medium text-gray-700 mb-2">
              Beschrijf je bedrijf (wat verkoop je? wie zijn je klanten?)
            </label>
            <textarea
              id="manual-summary"
              rows={4}
              value={manualSummary}
              onChange={(e) => setManualSummary(e.target.value)}
              placeholder="Bijvoorbeeld: Kleine wasserij gespecialiseerd in eco-vriendelijke wasmiddelen. Onze klanten zijn vooral milieubewuste gezinnen in de lokale gemeenschap..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <button
            onClick={submitManualSummary}
            disabled={isGenerating || !manualSummary.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Verwerken...
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5 mr-2" />
                Genereer verkoopadvies
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Fallback - should not happen
  return null;
}