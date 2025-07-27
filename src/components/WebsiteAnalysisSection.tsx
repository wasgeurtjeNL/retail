'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WebsiteAnalysisResults from './WebsiteAnalysisResults';

export interface WebsiteAnalysisData {
  id: string;
  website_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  analysis_data: {
    businessType?: string;
    mainActivities?: string[];
    targetMarket?: string;
    businessDescription?: string;
    industryCategory?: string;
    keyServices?: string[];
    location?: string;
    confidenceScore?: number;
    timestamp?: string;
    recommendations?: string[];
    marketingInsights?: {
      uniqueSellingPoints?: string[];
      positioning?: string;
    };
    competitorAnalysis?: {
      competitiveAdvantages?: string[];
    };
  } | null;
  analyzed_at: string;
  is_active: boolean;
}

interface WebsiteAnalysisSectionProps {
  websiteUrl: string;
  onAnalysisUpdate?: (analysis: WebsiteAnalysisData | null) => void;
}

export default function WebsiteAnalysisSection({ 
  websiteUrl, 
  onAnalysisUpdate 
}: WebsiteAnalysisSectionProps) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<WebsiteAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevWebsiteUrlRef = useRef<string>();

  // Automatisch analyse ophalen wanneer component laadt of URL daadwerkelijk wijzigt
  useEffect(() => {
    if (websiteUrl && websiteUrl !== prevWebsiteUrlRef.current) {
      fetchExistingAnalysis(websiteUrl);
      prevWebsiteUrlRef.current = websiteUrl;
    }
  }, [websiteUrl]);

  // Notify parent component when analysis updates
  useEffect(() => {
    if (onAnalysisUpdate) {
      onAnalysisUpdate(analysis);
    }
  }, [analysis, onAnalysisUpdate]);

  /**
   * Haal bestaande analyse op voor de huidige website URL
   */
  const fetchExistingAnalysis = async (urlToFetch: string) => {
    if (!urlToFetch || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/analyze-website', window.location.origin);
      url.searchParams.set('url', urlToFetch);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('[WEBSITE_ANALYSIS] Fetch response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('[WEBSITE_ANALYSIS] Fetch result:', result);

      if (response.ok && result.success && result.data) {
        // De API kan zowel een voltooide analyse als een 'processing' status teruggeven.
        // We verwerken beide gevallen.
        if (result.data.status === 'completed') {
          setAnalysis(result.data);
          console.log('[WEBSITE_ANALYSIS] Existing analysis loaded:', result.data);
        } else if (result.data.status === 'processing') {
          setAnalysis(null); // Reset, want er is nog geen resultaat om te tonen
          setError('Analyse wordt momenteel uitgevoerd. Probeer het over een minuut opnieuw.');
          console.log('[WEBSITE_ANALYSIS] Analysis is still processing.');
        } else {
           setAnalysis(result.data); // Handel andere statussen af (bv. 'failed')
        }
      } else if (response.status === 404) {
        // Geen bestaande analyse gevonden - dat is normaal
        setAnalysis(null);
        console.log('[WEBSITE_ANALYSIS] No existing analysis found for:', urlToFetch);
      } else {
        console.warn('[WEBSITE_ANALYSIS] Failed to fetch analysis:', result.error);
        setError(result.error || 'Kon analyse niet ophalen');
      }
    } catch (error) {
      console.error('[WEBSITE_ANALYSIS] Fetch error:', error);
      setError('Netwerkfout bij ophalen analyse');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start nieuwe website analyse
   */
  const startAnalysis = async (forceReanalyze = false) => {
    if (!websiteUrl) {
      setError('Geen website URL opgegeven');
      return;
    }

    if (!user) {
      console.warn('[WEBSITE_ANALYSIS] No user found, attempting analysis without authentication');
      // Don't return here - let the API handle the development bypass
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('[WEBSITE_ANALYSIS] Starting analysis for:', websiteUrl);
      console.log('[WEBSITE_ANALYSIS] User info:', { hasUser: !!user, userId: user?.id });

      const response = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          websiteUrl: websiteUrl,
          options: {
            forceReanalyze,
            includeRecommendations: true,
            includeCompetitorAnalysis: true
          }
        }),
      });

      console.log('[WEBSITE_ANALYSIS] Response status:', response.status);
      const result = await response.json();
      console.log('[WEBSITE_ANALYSIS] Response data:', result);

      if (result.success) {
        console.log('[WEBSITE_ANALYSIS] API success response:', result);
        
        // Update analysis state met nieuwe data
        if (result.data) {
          setAnalysis(result.data);
          console.log('[WEBSITE_ANALYSIS] Analysis state updated:', result.data);
          
          // Toon de juiste boodschap gebaseerd op de status
          if (result.data.status === 'completed' || result.data.status === 'processing') {
             setError(null); // Reset error on success/processing
          } else if (result.message) {
            setError(result.message);
          }
        }
      } else {
        console.error('[WEBSITE_ANALYSIS] Analysis failed:', result.error);
        
        // Provide specific error messages for different failure types
        if (result.error === 'Authentication required') {
          setError('Authenticatie vereist. Probeer opnieuw in te loggen of neem contact op met support.');
        } else if (result.error?.includes('Rate limit')) {
          setError('Rate limit bereikt. Probeer het later opnieuw.');
        } else {
          setError(result.error || 'Analyse mislukt');
        }
      }
    } catch (error) {
      console.error('[WEBSITE_ANALYSIS] Analysis error:', error);
      setError('Netwerkfout bij starten analyse. Controleer je internetverbinding.');
    } finally {
      setIsAnalyzing(false);
    }
  };



  /**
   * Valideer of URL geschikt is voor analyse
   */
  const isValidWebsiteUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validUrl = isValidWebsiteUrl(websiteUrl);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Website Analyse
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-gestuurde analyse van uw bedrijfswebsite
          </p>
        </div>
        
        {validUrl && (
          <div className="flex gap-2">
            {analysis && (
              <button
                onClick={() => startAnalysis(true)}
                disabled={isAnalyzing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Heranalyseren...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Heranalyseren
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={() => startAnalysis(false)}
              disabled={isAnalyzing || !user}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyseren...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {analysis ? 'Opnieuw analyseren' : 'Analyseren'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Website URL Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Website:</span>
          {websiteUrl ? (
            <a 
              href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {websiteUrl}
            </a>
          ) : (
            <span className="ml-2 text-sm text-gray-500">Geen website URL ingesteld</span>
          )}
        </div>
        {!validUrl && websiteUrl && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Ongeldige website URL. Zorg voor een geldig formaat (bijv. https://example.com)
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Fout bij website analyse</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Analysis State */}
      {!isLoading && !analysis && !error && validUrl && (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nog geen analyse uitgevoerd</h3>
          <p className="mt-1 text-sm text-gray-500">
            Klik op 'Analyseren' om een AI-gedreven analyse van uw website te starten.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <svg className="animate-spin mx-auto h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm text-gray-600">Analyse ophalen...</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isLoading && (
        <WebsiteAnalysisResults analysis={analysis} />
      )}

      {/* Invalid URL State */}
      {!validUrl && (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Website URL vereist</h3>
          <p className="mt-1 text-sm text-gray-500">
            Voeg een geldige website URL toe aan uw profiel om een analyse uit te voeren.
          </p>
        </div>
      )}

      {!isLoading && analysis && analysis.status !== 'completed' && (
         <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Analyse status: <span className="font-semibold">{analysis.status}</span>.</p>
            {analysis.status === 'failed' && <p className="text-red-600">{analysis.error_message}</p>}
            <button
              onClick={() => fetchExistingAnalysis(websiteUrl)}
              disabled={isLoading}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Herlaad Status
            </button>
         </div>
      )}
    </div>
  );
} 