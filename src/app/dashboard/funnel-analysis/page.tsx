'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { FunnelStatistics, DropOffAnalysis } from '@/lib/database.types';

interface FunnelData {
  funnelStats: FunnelStatistics;
  dropOffAnalysis: DropOffAnalysis[];
}

export default function FunnelAnalysisPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFunnelData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/funnel/track', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Fout bij ophalen funnel data');
        }

        const data = await response.json();
        
        if (data.success) {
          setFunnelData({
            funnelStats: data.funnelStats,
            dropOffAnalysis: data.dropOffAnalysis
          });
        } else {
          setError(data.error || 'Onbekende fout');
        }
      } catch (err) {
        console.error('Error loading funnel data:', err);
        setError('Fout bij laden van funnel analyse');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && isAdmin) {
      loadFunnelData();
    }
  }, [user, isAdmin]);

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

  const funnelSteps = funnelData ? [
    { name: 'Uitnodigingen Verzonden', count: funnelData.funnelStats.total_invitations, rate: 100, color: 'bg-blue-500' },
    { name: 'Emails Verzonden', count: funnelData.funnelStats.emails_sent, rate: funnelData.funnelStats.sent_rate, color: 'bg-indigo-500' },
    { name: 'Emails Geopend', count: funnelData.funnelStats.emails_opened, rate: funnelData.funnelStats.open_rate, color: 'bg-purple-500' },
    { name: 'Links Geklikt', count: funnelData.funnelStats.emails_clicked, rate: funnelData.funnelStats.click_through_rate, color: 'bg-pink-500' },
    { name: 'Pagina Bezocht', count: funnelData.funnelStats.page_visited, rate: funnelData.funnelStats.page_visit_rate, color: 'bg-red-500' },
    { name: 'Registratie Gestart', count: funnelData.funnelStats.registration_started, rate: funnelData.funnelStats.start_rate, color: 'bg-orange-500' },
    { name: 'Formulier Ingevuld', count: funnelData.funnelStats.form_submitted, rate: funnelData.funnelStats.submit_rate, color: 'bg-yellow-500' },
    { name: 'Registratie Voltooid', count: funnelData.funnelStats.registration_completed, rate: funnelData.funnelStats.completion_rate, color: 'bg-green-500' },
    { name: 'Account Geactiveerd', count: funnelData.funnelStats.account_activated, rate: funnelData.funnelStats.activation_rate, color: 'bg-teal-500' },
    { name: 'Admin Goedgekeurd', count: funnelData.funnelStats.admin_approved, rate: funnelData.funnelStats.approval_rate, color: 'bg-cyan-500' }
  ] : [];

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
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">📊 Funnel Analyse</h1>
                  <p className="mt-2 text-gray-600">
                    Analyse van het retailer aanmeldingsproces - waar stoppen potentiële partners?
                  </p>
                </div>
                <div className="text-right">
                  <div className="mb-4">
                    <Link 
                      href="/dashboard/funnel-details"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      🔍 Gedetailleerde tracking →
                    </Link>
                  </div>
                  <p className="text-sm text-gray-500">Laatste 90 dagen</p>
                  {funnelData && (
                    <p className="text-2xl font-bold text-green-600">
                      {funnelData.funnelStats.overall_conversion_rate}%
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Totale conversie</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <svg className="animate-spin h-8 w-8 text-pink-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Laden van funnel analyse...</p>
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
              </div>
            ) : funnelData ? (
              <>
                {/* Conversion Funnel Visualization */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">🔄 Conversie Funnel</h2>
                  
                  <div className="space-y-4">
                    {funnelSteps.map((step, index) => (
                      <div key={step.name} className="relative">
                        <div className="flex items-center space-x-4">
                          {/* Step number */}
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-white text-sm font-bold`}>
                              {index + 1}
                            </div>
                          </div>
                          
                          {/* Step details */}
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium text-gray-900">{step.name}</h3>
                              <div className="text-right">
                                <span className="text-lg font-bold text-gray-900">{step.count}</span>
                                <span className="text-sm text-gray-500 ml-2">({step.rate}%)</span>
                              </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full ${step.color} transition-all duration-500`}
                                style={{ width: `${Math.max(step.rate, 2)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Drop-off indicator */}
                        {index < funnelSteps.length - 1 && (
                          <div className="flex items-center justify-center mt-2 mb-2">
                            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              ↓ {(100 - funnelSteps[index + 1].rate).toFixed(1)}% drop-off
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">📧</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Email Open Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{funnelData.funnelStats.open_rate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">🖱️</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Click Through Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{funnelData.funnelStats.click_through_rate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">📝</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Form Completion</dt>
                          <dd className="text-lg font-medium text-gray-900">{funnelData.funnelStats.completion_rate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-teal-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-sm">✅</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Activation Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{funnelData.funnelStats.activation_rate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drop-off Analysis */}
                {funnelData.dropOffAnalysis.length > 0 && (
                  <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">⚠️ Grootste Drop-off Punten</h2>
                    
                    <div className="space-y-4">
                      {funnelData.dropOffAnalysis.map((dropOff, index) => (
                        <div key={dropOff.drop_off_point} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div>
                            <h3 className="font-medium text-red-900">
                              #{index + 1} {dropOff.drop_off_point}
                            </h3>
                            <p className="text-sm text-red-700">
                              {dropOff.dropped_count} gebruikers verloren
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-red-900">
                              {dropOff.drop_off_percentage}%
                            </span>
                            <p className="text-xs text-red-600">van gebruikers</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Improvement suggestions */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">💡 Verbeter Suggesties</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Email open rate</strong>: Test verschillende onderwerpen en verzendtijden</li>
                        <li>• <strong>Click through rate</strong>: Optimaliseer call-to-action knoppen en email content</li>
                        <li>• <strong>Pagina bezoek</strong>: Controleer email tracking en link redirects</li>
                        <li>• <strong>Registratie start</strong>: Maak de eerste stap duidelijker en simpeler</li>
                        <li>• <strong>Formulier voltooien</strong>: Verkort het formulier en verbeter UX</li>
                        <li>• <strong>Account activatie</strong>: Verstuur snellere activatie emails</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 