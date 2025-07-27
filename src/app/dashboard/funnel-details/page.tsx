'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

interface DetailedEvent {
  event_id: string;
  event_type: string;
  event_timestamp: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  page_url?: string;
  metadata?: any;
  invitation_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  phone?: string;
  invitation_status: string;
  invited_at: string;
  expires_at: string;
  final_status?: string;
  hours_since_invitation: number;
  timing_status: string;
}

interface PageVisit {
  invitation_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  invited_at: string;
  invitation_status: string;
  total_page_visits: number;
  unique_pages_visited: number;
  first_page_visit?: string;
  last_activity?: string;
  visited_pages?: string;
  unique_sessions: number;
  session_ids?: string;
  referrers?: string;
}

interface SessionAnalysis {
  session_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  session_start: string;
  session_end: string;
  session_duration_minutes: number;
  events_in_session: number;
  unique_pages_in_session: number;
  event_types: string;
  pages_visited?: string;
  first_event: string;
  last_event: string;
  user_agent?: string;
  ip_address?: string;
}

interface PagePopularity {
  page_url: string;
  total_visits: number;
  unique_visitors: number;
  unique_sessions: number;
  first_visit: string;
  last_visit: string;
  avg_hours_after_invitation: number;
  referrers?: string;
  visits_with_referrer: number;
  event_types_on_page: string;
}

type ViewType = 'events' | 'page_visits' | 'sessions' | 'timeline' | 'pages';

export default function FunnelDetailsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('events');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [emailFilter, setEmailFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        view: activeView,
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      });

      if (emailFilter) params.append('email', emailFilter);
      if (sessionFilter) params.append('session', sessionFilter);
      if (eventTypeFilter) params.append('event_type', eventTypeFilter);

      const response = await fetch(`/api/funnel/details?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Fout bij ophalen gedetailleerde data');
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
        setTotalItems(result.pagination?.total || 0);
      } else {
        setError(result.error || 'Onbekende fout');
      }
    } catch (err) {
      console.error('Error loading detailed data:', err);
      setError('Fout bij laden van gedetailleerde tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/funnel/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
          filters: {
            event_type: eventTypeFilter || undefined,
            session_id: sessionFilter || undefined
          },
          limit: itemsPerPage
        })
      });

      if (!response.ok) {
        throw new Error('Fout bij zoeken');
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.results || []);
        setTotalItems(result.resultCount || 0);
        setCurrentPage(1); // Reset to first page
      } else {
        setError(result.error || 'Zoekfout');
      }
    } catch (err) {
      console.error('Error searching:', err);
      setError('Fout bij zoeken in tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin, activeView, currentPage, emailFilter, sessionFilter, eventTypeFilter]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('nl-NL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes < 0) return '0s';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'registration_page_visited': return '🌐';
      case 'registration_started': return '📝';
      case 'registration_form_submitted': return '📋';
      case 'registration_completed': return '✅';
      case 'form_interaction': return '⌨️';
      case 'error_occurred': return '⚠️';
      case 'page_exit': return '🚪';
      default: return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'used': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
            <p className="text-gray-600 mb-6">
              U heeft geen toegang tot deze pagina. Log in als admin om toegang te krijgen.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
            >
              Inloggen
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>

            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">🔍 Gedetailleerde Funnel Tracking</h1>
                  <p className="mt-2 text-gray-600">
                    Bekijk individuele gebruikersactiviteit en pagina bezoeken in detail
                  </p>
                </div>
                <div className="text-right">
                  <Link 
                    href="/dashboard/funnel-analysis"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    ← Terug naar overzicht
                  </Link>
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  {[
                    { key: 'events', label: '📊 Events', desc: 'Alle tracking events' },
                    { key: 'page_visits', label: '🌐 Pagina Bezoeken', desc: 'Per gebruiker' },
                    { key: 'sessions', label: '🕐 Sessies', desc: 'Sessie analyse' },
                    { key: 'timeline', label: '📈 Timeline', desc: 'Chronologisch' },
                    { key: 'pages', label: '📄 Pagina\'s', desc: 'Populariteit' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveView(tab.key as ViewType);
                        setCurrentPage(1);
                      }}
                      className={`group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-6 text-sm font-medium text-center hover:bg-gray-50 focus:z-10 ${
                        activeView === tab.key
                          ? 'text-pink-600 border-b-2 border-pink-600'
                          : 'text-gray-500 border-b-2 border-transparent'
                      }`}
                    >
                      <span className="block">{tab.label}</span>
                      <span className="block text-xs text-gray-400">{tab.desc}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Filters */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zoeken (email, bedrijf, pagina)
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Zoek in tracking data..."
                        className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 rounded-l-md focus:ring-pink-500 focus:border-pink-500 text-sm text-gray-900"
                      />
                      <button
                        onClick={handleSearch}
                        className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                      >
                        🔍
                      </button>
                    </div>
                  </div>

                  {/* Email Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email filter
                    </label>
                    <input
                      type="text"
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      placeholder="user@example.com"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 text-sm text-gray-900"
                    />
                  </div>

                  {/* Event Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event type
                    </label>
                    <select
                      value={eventTypeFilter}
                      onChange={(e) => setEventTypeFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500 text-sm text-gray-900"
                    >
                      <option value="">Alle events</option>
                      <option value="registration_page_visited">Pagina bezocht</option>
                      <option value="registration_started">Registratie gestart</option>
                      <option value="registration_form_submitted">Formulier verzonden</option>
                      <option value="registration_completed">Registratie voltooid</option>
                      <option value="form_interaction">Formulier interactie</option>
                      <option value="error_occurred">Error</option>
                      <option value="page_exit">Pagina verlaten</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <svg className="animate-spin h-8 w-8 text-pink-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Laden van tracking data...</p>
              </div>
            ) : error ? (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <div className="text-red-500 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Fout bij laden</h3>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => loadData()}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
                >
                  Opnieuw proberen
                </button>
              </div>
            ) : (
              <>
                {/* Events View */}
                {activeView === 'events' && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        📊 Tracking Events ({data.length} van {totalItems})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Alle geregistreerde gebeurtenissen in chronologische volgorde
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Event
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gebruiker
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pagina
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Timing
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.map((event: DetailedEvent, index: number) => (
                            <tr key={`event-${index}-${event.event_id || 'unknown'}-${event.event_timestamp}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-lg mr-2">{getEventTypeIcon(event.event_type)}</span>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {event.event_type.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatTimestamp(event.event_timestamp)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{event.email}</div>
                                {event.business_name && (
                                  <div className="text-xs text-gray-500">{event.business_name}</div>
                                )}
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.invitation_status)}`}>
                                  {event.invitation_status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {event.page_url ? (
                                  <div className="text-sm text-gray-900 max-w-xs truncate">
                                    {event.page_url}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                                {event.referrer && (
                                  <div className="text-xs text-gray-500 max-w-xs truncate">
                                    Van: {event.referrer}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  +{event.hours_since_invitation !== undefined ? Math.round(event.hours_since_invitation * 10) / 10 : 0}h
                                </div>
                                <div className={`text-xs ${event.timing_status === 'within_timeframe' ? 'text-green-600' : 'text-red-600'}`}>
                                  {event.timing_status === 'within_timeframe' ? 'Op tijd' : 'Te laat'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {event.session_id && (
                                  <div>Sessie: {event.session_id.slice(-6)}</div>
                                )}
                                {event.ip_address && (
                                  <div>IP: {event.ip_address}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Page Visits View */}
                {activeView === 'page_visits' && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        🌐 Pagina Bezoeken per Gebruiker ({data.length})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Overzicht van welke pagina's elke gebruiker heeft bezocht
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gebruiker
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bezoeken
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bezochte Pagina's
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Activiteit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sessies
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.map((visit: PageVisit, index: number) => (
                            <tr key={`visit-${index}-${visit.invitation_id || 'unknown'}-${visit.email}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{visit.email}</div>
                                {visit.business_name && (
                                  <div className="text-xs text-gray-500">{visit.business_name}</div>
                                )}
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.invitation_status)}`}>
                                  {visit.invitation_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {visit.total_page_visits} totaal
                                </div>
                                <div className="text-xs text-gray-500">
                                  {visit.unique_pages_visited} unieke pagina's
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-md">
                                  {visit.visited_pages || 'Geen pagina\'s bezocht'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {visit.first_page_visit && (
                                  <div className="text-xs text-gray-500">
                                    Eerste: {formatTimestamp(visit.first_page_visit)}
                                  </div>
                                )}
                                {visit.last_activity && (
                                  <div className="text-xs text-gray-500">
                                    Laatste: {formatTimestamp(visit.last_activity)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {visit.unique_sessions} sessie(s)
                                </div>
                                {visit.referrers && (
                                  <div className="text-xs text-gray-500 max-w-xs truncate">
                                    Van: {visit.referrers}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sessions View */}
                {activeView === 'sessions' && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        🕐 Sessie Analyse ({data.length})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Gedetailleerde analyse van gebruikerssessies
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sessie
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gebruiker
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duur & Events
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pagina's & Events
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Technisch
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.map((session: SessionAnalysis, index: number) => (
                            <tr key={`session-${index}-${session.session_id || 'unknown'}-${session.session_start}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {session.session_id ? session.session_id.slice(-8) : 'Geen sessie ID'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatTimestamp(session.session_start)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{session.email}</div>
                                {session.business_name && (
                                  <div className="text-xs text-gray-500">{session.business_name}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {session.session_duration_minutes !== undefined ? formatDuration(session.session_duration_minutes) : 'Onbekend'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {session.events_in_session} events
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {session.unique_pages_in_session} pagina's
                                </div>
                                <div className="text-xs text-gray-500 max-w-xs truncate">
                                  {session.event_types}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {session.ip_address && (
                                  <div className="text-xs text-gray-500">
                                    IP: {session.ip_address}
                                  </div>
                                )}
                                {session.user_agent && (
                                  <div className="text-xs text-gray-500 max-w-xs truncate">
                                    {session.user_agent.split(' ')[0]}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pages View */}
                {activeView === 'pages' && (
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">
                        📄 Pagina Populariteit ({data.length})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Welke pagina's worden het meest bezocht
                      </p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pagina URL
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bezoeken
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bezoekers
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Timing
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Events
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.map((page: PagePopularity, index: number) => (
                            <tr key={`page-${index}-${page.page_url || 'unknown'}`} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                                  {page.page_url}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {page.total_visits} bezoeken
                                </div>
                                <div className="text-xs text-gray-500">
                                  #{index + 1} populairste
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {page.unique_visitors} bezoekers
                                </div>
                                <div className="text-xs text-gray-500">
                                  {page.unique_sessions} sessies
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs text-gray-500">
                                  Gemiddeld na {Math.round(page.avg_hours_after_invitation * 10) / 10}h
                                </div>
                                <div className="text-xs text-gray-500">
                                  Eerste: {formatTimestamp(page.first_visit)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs text-gray-500 max-w-xs">
                                  {page.event_types_on_page}
                                </div>
                                {page.referrers && (
                                  <div className="text-xs text-gray-400 max-w-xs truncate">
                                    Van: {page.referrers}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalItems > itemsPerPage && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow mt-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Vorige
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(Math.ceil(totalItems / itemsPerPage), currentPage + 1))}
                        disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Volgende
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Toont <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> tot{' '}
                          <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> van{' '}
                          <span className="font-medium">{totalItems}</span> resultaten
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Vorige
                          </button>
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageNum === currentPage
                                    ? 'z-10 bg-pink-50 border-pink-500 text-pink-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setCurrentPage(Math.min(Math.ceil(totalItems / itemsPerPage), currentPage + 1))}
                            disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Volgende
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 