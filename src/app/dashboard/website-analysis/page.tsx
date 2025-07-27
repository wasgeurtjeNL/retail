'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { WebsiteAnalysisResultsCompact } from '@/components/WebsiteAnalysisResults';
import { WebsiteAnalysisData } from '@/components/WebsiteAnalysisSection';

interface WebsiteAnalysisWithProfile extends WebsiteAnalysisData {
  profile?: {
    id: string;
    full_name: string;
    company_name: string;
    email: string;
  };
}

export default function WebsiteAnalysisAdminPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [analyses, setAnalyses] = useState<WebsiteAnalysisWithProfile[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<WebsiteAnalysisWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'business_type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByConfidence, setFilterByConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterByActive, setFilterByActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showStats, setShowStats] = useState(true);

  // Breadcrumbs voor navigatie
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Website Analyses', href: '/dashboard/website-analysis' }
  ];

  /**
   * Haal alle website analyses op via API
   */
  const fetchAnalyses = async () => {
    if (!user || !isAdmin) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze-website?admin=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setAnalyses(result.data);
        setFilteredAnalyses(result.data);
        console.log('[ADMIN] Loaded', result.data.length, 'website analyses');
      } else {
        console.error('[ADMIN] Failed to load analyses:', result.error);
        setAnalyses([]);
        setFilteredAnalyses([]);
      }
    } catch (error) {
      console.error('[ADMIN] Error loading analyses:', error);
      setAnalyses([]);
      setFilteredAnalyses([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Effect voor het laden van analyses
   */
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      fetchAnalyses();
    }
  }, [user, isAdmin, authLoading]);

  /**
   * Effect voor filtering en zoeken
   */
  useEffect(() => {
    let filtered = [...analyses];

    // Zoeken in website URL, business type, en company name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(analysis => 
        analysis.website_url.toLowerCase().includes(term) ||
        analysis.business_type?.toLowerCase().includes(term) ||
        analysis.profile?.company_name?.toLowerCase().includes(term) ||
        analysis.profile?.full_name?.toLowerCase().includes(term)
      );
    }

    // Filter op betrouwbaarheid
    if (filterByConfidence !== 'all') {
      filtered = filtered.filter(analysis => {
        const confidence = analysis.confidence_score || 0;
        switch (filterByConfidence) {
          case 'high':
            return confidence >= 0.8;
          case 'medium':
            return confidence >= 0.5 && confidence < 0.8;
          case 'low':
            return confidence < 0.5;
          default:
            return true;
        }
      });
    }

    // Filter op actieve status
    if (filterByActive !== 'all') {
      filtered = filtered.filter(analysis => 
        filterByActive === 'active' ? analysis.is_active : !analysis.is_active
      );
    }

    // Sorteren
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.analyzed_at).getTime();
          bValue = new Date(b.analyzed_at).getTime();
          break;
        case 'confidence':
          aValue = a.confidence_score || 0;
          bValue = b.confidence_score || 0;
          break;
        case 'business_type':
          aValue = a.business_type || '';
          bValue = b.business_type || '';
          break;
        default:
          aValue = a.analyzed_at;
          bValue = b.analyzed_at;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredAnalyses(filtered);
  }, [analyses, searchTerm, sortBy, sortOrder, filterByConfidence, filterByActive]);

  /**
   * Bereken statistieken
   */
  const stats = {
    total: analyses.length,
    active: analyses.filter(a => a.is_active).length,
    highConfidence: analyses.filter(a => (a.confidence_score || 0) >= 0.8).length,
    mediumConfidence: analyses.filter(a => (a.confidence_score || 0) >= 0.5 && (a.confidence_score || 0) < 0.8).length,
    lowConfidence: analyses.filter(a => (a.confidence_score || 0) < 0.5).length,
    businessTypes: Array.from(new Set(analyses.map(a => a.business_type).filter(Boolean))).length,
    last7Days: analyses.filter(a => {
      const analysisDate = new Date(a.analyzed_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return analysisDate >= weekAgo;
    }).length
  };

  /**
   * Reset alle filters
   */
  const resetFilters = () => {
    setSearchTerm('');
    setSortBy('date');
    setSortOrder('desc');
    setFilterByConfidence('all');
    setFilterByActive('all');
  };

  /**
   * Format datum voor display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Niet geauthoriseerd
  if (!authLoading && (!user || !isAdmin)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang Geweigerd</h1>
            <p className="text-gray-600">Je hebt geen toegang tot deze pagina.</p>
            <Link href="/dashboard" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Terug naar Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Website Analyses</h1>
              <p className="text-gray-600 mt-2">Overzicht van alle uitgevoerde website analyses</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {showStats ? 'Verberg' : 'Toon'} Statistieken
              </button>
              <button
                onClick={fetchAnalyses}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Laden...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Verversen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Statistieken */}
        {showStats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Totaal Analyses</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Actieve Analyses</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0V9a2 2 0 012-2h2a2 2 0 012 2v4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Bedrijfstypes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.businessTypes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Laatste 7 Dagen</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.last7Days}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters en Zoeken */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Zoeken */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Zoeken
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-gray-900"
                  placeholder="Zoek op website, bedrijf, of type..."
                />
              </div>
            </div>

            {/* Sorteren */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sorteren op
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'confidence' | 'business_type')}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900"
              >
                <option value="date">Datum</option>
                <option value="confidence">Betrouwbaarheid</option>
                <option value="business_type">Bedrijfstype</option>
              </select>
            </div>

            {/* Sorteervolgorde */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                Volgorde
              </label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900"
              >
                <option value="desc">Aflopend</option>
                <option value="asc">Oplopend</option>
              </select>
            </div>

            {/* Betrouwbaarheid Filter */}
            <div>
              <label htmlFor="confidenceFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Betrouwbaarheid
              </label>
              <select
                id="confidenceFilter"
                value={filterByConfidence}
                onChange={(e) => setFilterByConfidence(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900"
              >
                <option value="all">Alle</option>
                <option value="high">Hoog (≥80%)</option>
                <option value="medium">Gemiddeld (50-80%)</option>
                <option value="low">Laag (&lt;50%)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="activeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="activeFilter"
                value={filterByActive}
                onChange={(e) => setFilterByActive(e.target.value as 'all' | 'active' | 'inactive')}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900"
              >
                <option value="all">Alle</option>
                <option value="active">Actief</option>
                <option value="inactive">Inactief</option>
              </select>
            </div>
          </div>

          {/* Reset Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filters
            </button>
          </div>
        </div>

        {/* Analyses List */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex items-center">
                <svg className="animate-spin h-8 w-8 text-blue-600 mr-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg text-gray-600">Analyses laden...</span>
              </div>
            </div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Geen analyses gevonden</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterByConfidence !== 'all' || filterByActive !== 'all' 
                  ? 'Probeer andere filters of zoektermen.'
                  : 'Er zijn nog geen website analyses uitgevoerd.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAnalyses.map((analysis) => (
                <div key={analysis.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Profile Info */}
                      {analysis.profile && (
                        <div className="mb-4 flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium">
                            {analysis.profile.company_name || analysis.profile.full_name}
                          </span>
                          <span className="mx-2">•</span>
                          <span>{analysis.profile.email}</span>
                        </div>
                      )}

                      {/* Analysis Results */}
                      <WebsiteAnalysisResultsCompact
                        analysis={analysis}
                        showWebsiteUrl={true}
                        className="border-0 p-0 bg-transparent"
                      />
                    </div>

                    <div className="ml-4 flex-shrink-0 text-right">
                      <div className="text-sm text-gray-500">
                        {formatDate(analysis.analyzed_at)}
                      </div>
                      <div className="mt-2 flex items-center justify-end space-x-2">
                        {analysis.is_active && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actief
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          ID: {analysis.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Placeholder */}
        {filteredAnalyses.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Toont {filteredAnalyses.length} van {analyses.length} analyses
            </p>
            {/* Hier kan later paginatie worden toegevoegd */}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
} 