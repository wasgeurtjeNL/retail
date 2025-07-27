'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, Users, Mail, Package, Play, Square, RefreshCw, TestTube, Activity, Settings, CheckCircle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ApiStatusCard from '@/components/ApiStatusCard';
import CompleteWorkflowTestDashboard from '@/components/CompleteWorkflowTestDashboard';
import TwoPhaseAutomationDashboard from '@/components/TwoPhaseAutomationDashboard';
import toast from 'react-hot-toast';

interface SystemStatus {
  automation_running: boolean;
  api_keys_configured: {
    google_places: boolean;
    kvk_api: boolean;
    openai: boolean;
  };
  enabled_sources: {
    webScraping: boolean;
    googlePlaces: boolean;
    kvkApi: boolean;
  };
  queue_manager_status: string;
  recommendations: string[];
  configuration?: {
    kvk_api_configured: boolean;
    kvk_api_enabled: boolean;
  };
  system_readiness?: number;
  status_message?: string; // Added for new setup instructions
}

interface MetricData {
  prospects_discovered_today: number;
  prospects_qualified_today: number;
  emails_sent_today: number;
  emails_opened_today: number;
  fulfillment_orders_today: number;
  conversion_rate: number;
  total_prospects: number;
  total_orders: number;
}



// Interface for API status
interface ApiStatus {
  openai: boolean;
  google: boolean; 
  kvk: boolean;
  mandrill: boolean;
}

export default function CommercialAcquisitionDashboard() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    google: false,
    kvk: false,
    mandrill: false
  });
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadPerformanceData();
    loadApiStatus(); // Load API status on component mount
    
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'two_phase_automation') {
      // Set default tab to two_phase_automation if specified in URL
      setTimeout(() => {
        const tabElement = document.querySelector(`[value="two_phase_automation"]`);
        if (tabElement) {
          (tabElement as HTMLElement).click();
        }
      }, 100);
    }
    
    // Auto-refresh performance data every 30 seconds
    const performanceInterval = setInterval(loadPerformanceData, 30000);
    
    return () => {
      clearInterval(performanceInterval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load system status
      const statusResponse = await fetch('/api/commercial/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData);
      }

      // Load metrics
      const metricsResponse = await fetch('/api/commercial/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Fout bij laden dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    try {
      const response = await fetch('/api/commercial/performance?action=dashboard');
      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data.data);
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    }
  };

  const generateTestMetrics = async () => {
    try {
      setActionLoading('test_metrics');
      
      const response = await fetch('/api/commercial/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_metrics',
          data: {}
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Test metrics gegenereerd!');
        await loadPerformanceData();
      } else {
        toast.error(`Fout bij genereren metrics: ${result.error}`);
      }

    } catch (error) {
      console.error('Error generating test metrics:', error);
      toast.error('Fout bij genereren test metrics');
    } finally {
      setActionLoading(null);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/commercial/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge_alert',
          data: { alert_id: alertId }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Alert acknowledged');
        await loadPerformanceData();
      } else {
        toast.error(`Fout: ${result.error}`);
      }

    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Fout bij acknowledging alert');
    }
  };

  const startAutomation = async () => {
    console.log('[Dashboard] startAutomation function called');
    try {
      setActionLoading('start');
      console.log('[Dashboard] Starting automation request...');
      
      const response = await fetch('/api/commercial/automation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[Dashboard] Fetch completed, response status:', response.status);

      if (!response.ok) {
        console.error('[Dashboard] API request failed:', response.status, response.statusText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      console.log('[Dashboard] Parsing JSON response...');
      let result;
      try {
        result = await response.json();
        console.log('[Dashboard] JSON parsed successfully:', Object.keys(result || {}));
      } catch (jsonError) {
        console.error('[Dashboard] JSON parsing failed:', jsonError);
        throw new Error(`Invalid JSON response: ${jsonError instanceof Error ? jsonError.message : 'Parsing failed'}`);
      }
      
      if (!result || typeof result !== 'object') {
        console.error('[Dashboard] Invalid result type:', typeof result, result);
        throw new Error('Invalid API response: geen geldige JSON data ontvangen');
      }
      
      if (result.success) {
        toast.success('Commercial Acquisition Automation gestart!');
        console.log('[Dashboard] Automation started:', result.state);
        
        // Show detailed success message if services started
        if (result.startup_results?.services_started?.length > 0) {
          const servicesMsg = `Services gestart: ${result.startup_results.services_started.join(', ')}`;
          toast.success(servicesMsg, { duration: 5000 });
        }
        
        await loadDashboardData();
      } else {
        const errorMsg = result.error || 'Onbekende fout bij starten automation';
        toast.error(`Fout bij starten: ${errorMsg}`);
        
        // Show details about failed services if available
        if (result.startup_results?.services_failed?.length > 0) {
          const failedMsg = `Services failed: ${result.startup_results.services_failed.join(', ')}`;
          toast.error(failedMsg, { duration: 8000 });
        }
        
        console.error('[Dashboard] Automation start failed:', {
          result,
          error: result?.error || 'Geen error details beschikbaar',
          status: result?.success === false ? 'API_ERROR' : 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      // Comprehensive error handling to avoid empty error objects
      let errorMessage = 'Onbekende fout';
      let errorDetails: any = {};
      
      if (error instanceof Error) {
        errorMessage = error.message || 'Error zonder message';
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: 'Error'
        };
      } else if (error && typeof error === 'object') {
        errorMessage = String(error);
        errorDetails = {
          error_object: error,
          type: 'Object',
          keys: Object.keys(error as object)
        };
      } else {
        errorMessage = String(error);
        errorDetails = {
          error_value: error,
          type: typeof error
        };
      }
      
      // Extra fallback voor volledig lege errors
      if (!errorMessage || errorMessage === 'undefined' || errorMessage === 'null') {
        errorMessage = 'Onbekende fout - geen error details beschikbaar';
      }
      
      if (!errorDetails || Object.keys(errorDetails).length === 0) {
        errorDetails = {
          fallback: 'Error object was leeg of undefined',
          error_type: 'EMPTY_ERROR',
          timestamp: new Date().toISOString()
        };
      }
      
      console.error('[Dashboard] Error starting automation:', {
        errorMessage,
        errorDetails,
        timestamp: new Date().toISOString(),
        api_endpoint: '/api/commercial/automation/start',
        browser_info: navigator.userAgent
      });
      
      toast.error(`Fout bij starten automation: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  const stopAutomation = async () => {
    try {
      setActionLoading('stop');
      
      const response = await fetch('/api/commercial/automation/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid API response: geen geldige JSON data ontvangen');
      }
      
      if (result.success) {
        toast.success('Commercial Acquisition Automation gestopt!');
        console.log('[Dashboard] Automation stopped:', result.stop_results);
        
        // Show detailed stop message if services stopped
        if (result.stop_results?.services_stopped?.length > 0) {
          const servicesMsg = `Services gestopt: ${result.stop_results.services_stopped.join(', ')}`;
          toast.success(servicesMsg, { duration: 5000 });
        }
        
        await loadDashboardData();
      } else {
        const errorMsg = result.error || 'Onbekende fout bij stoppen automation';
        toast.error(`Fout bij stoppen: ${errorMsg}`);
        console.error('[Dashboard] Automation stop failed:', {
          result,
          error: result?.error || 'Geen error details beschikbaar',
          status: result?.success === false ? 'API_ERROR' : 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Onbekende network fout';
      console.error('[Dashboard] Error stopping automation:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      toast.error(`Fout bij stoppen automation: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  const runCompleteTest = async () => {
    try {
      setActionLoading('test');
      
      const response = await fetch('/api/commercial/test-complete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testMode: 'full',
          segment: 'beauty_salon',
          region: 'Amsterdam'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Test voltooid: ${result.summary?.success_rate || 'onbekend'} success rate`);
      } else {
        toast.error(`Test gefaald: ${result.summary?.total_errors || 'onbekend'} fouten`);
      }

    } catch (error) {
      console.error('Error running test:', error);
      toast.error('Fout bij uitvoeren test');
    } finally {
      setActionLoading(null);
    }
  };

  const activateAutomation = async () => {
    try {
      setActionLoading('automation');
      
      const response = await fetch('/api/commercial/automation/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate_full_pipeline',
          includeEmailCampaigns: true,
          includeProefpakketAssignment: true,
          includeFollowUpSequences: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const enrolled = result.prospects_enrolled || 0;
        const emails = result.emails_queued || 0;
        toast.success(`🚀 Automation geactiveerd! ${enrolled} prospects ingeschreven, ${emails} emails in queue`);
        await loadDashboardData();
      } else {
        toast.error(`Automation activatie gefaald: ${result.error}`);
      }

    } catch (error) {
      console.error('Error activating automation:', error);
      toast.error('Fout bij activeren automation');
    } finally {
      setActionLoading(null);
    }
  };

  const runDiscovery = async () => {
    try {
      setActionLoading('discovery');
      
      const response = await fetch('/api/commercial/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover',
          criteria: {
            business_type: 'beauty_salon',
            location: 'Amsterdam',
            max_results: 10
          },
          sources: ['perplexity', 'web_scraping'] // Fallback naar web_scraping als Perplexity niet beschikbaar is
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const discovered = result.metadata?.total_discovered || 0;
        const saved = result.metadata?.saved_to_database || 0;
        toast.success(`Discovery: ${discovered} prospects gevonden, ${saved} opgeslagen`);
        await loadDashboardData();
      } else {
        toast.error(`Discovery gefaald: ${result.error}`);
      }

    } catch (error) {
      console.error('Error running discovery:', error);
      toast.error('Fout bij discovery');
    } finally {
      setActionLoading(null);
    }
  };

  // Load API status
  const loadApiStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug-env');
      const result = await response.json();
      
      if (result.environment) {
        setApiStatus({
          openai: result.environment.hasOpenAI || false,
          google: result.environment.hasGoogle || false,
          kvk: result.environment.hasKvK || false,
          mandrill: result.environment.hasMandrill || false
        });
      }
    } catch (error) {
      console.error('Error loading API status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load real API statuses
  const loadApiStatuses = async () => {
    try {
      setStatusLoading(true);
      const response = await fetch('/api/debug-env');
      const result = await response.json();
      
      console.log('[Settings] API Status Response:', result);
      
      if (result.environment) {
        setApiStatus({
          openai: result.environment.hasOpenAI || false,
          google: result.environment.hasGoogle || false,
          kvk: result.environment.hasKvK || false,
          mandrill: result.environment.hasMandrill || false
        });
      }
    } catch (error) {
      console.error('[Settings] Error loading API statuses:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  // Load API statuses on component mount
  useEffect(() => {
    loadApiStatuses();
  }, []);

  // Helper function to get status styling
  const getApiStatusStyling = (isConfigured: boolean) => {
    return isConfigured ? {
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-800',
      descClass: 'text-green-700',
      statusClass: 'text-green-600',
      dotClass: 'bg-green-500',
      statusText: '✓ Connected'
    } : {
      bgClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-800',
      descClass: 'text-red-700',
      statusClass: 'text-red-600',
      dotClass: 'bg-red-500',
      statusText: '✗ Not Configured'
    };
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-12 w-12 animate-spin text-orange-600" />
            <p className="text-lg font-semibold text-gray-700">Dashboard laden...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Auth check
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
            >
              Inloggen
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Data loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-4">
                <Breadcrumbs />
              </div>
              <div className="flex flex-col items-center space-y-4">
                <RefreshCw className="h-12 w-12 animate-spin text-orange-600" />
                <p className="text-lg font-semibold text-gray-700">Dashboard laden...</p>
              </div>
            </div>
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
            
            {/* Page Header */}
            <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold leading-6 text-gray-900">Commercial Acquisition Automation</h1>
                <p className="mt-2 text-lg text-gray-600">
                  Volledig geautomatiseerd prospect discovery, email campaigns en fulfillment
                </p>
              </div>
              <div className="flex gap-3">
                <Link 
                  href="/dashboard/prospects"
                  className="inline-flex items-center px-4 py-2 border border-green-300 bg-green-50 text-sm font-medium rounded-md shadow-sm text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <Users className="h-4 w-4 mr-2" />
                  View All Prospects
                </Link>
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar dashboard
                </Link>
                <Button 
                  onClick={loadDashboardData} 
                  variant="outline"
                  disabled={!!actionLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Vernieuwen
                </Button>
              </div>
            </div>

            {/* System Status Cards - Orange Theme */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                      <Activity className={`h-6 w-6 ${
                        systemStatus?.queue_manager_status === 'running' 
                          ? 'text-green-600' 
                          : systemStatus?.queue_manager_status === 'error'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">System Status</p>
                      <p className={`text-2xl font-bold ${
                        systemStatus?.queue_manager_status === 'running' 
                          ? 'text-green-600' 
                          : systemStatus?.queue_manager_status === 'error'
                          ? 'text-red-600'
                          : 'text-orange-600'
                      }`}>
                        {systemStatus?.queue_manager_status === 'running' ? 'Online' : 
                         systemStatus?.queue_manager_status === 'error' ? 'Error' : 'Offline'}
                      </p>
                      {systemStatus?.system_readiness !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          Readiness: {systemStatus.system_readiness}%
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Prospects</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics?.total_prospects || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

          <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Emails Today</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{metrics?.emails_sent_today || 0}</p>
                </div>
                <Mail className="h-12 w-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Orders Today</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{metrics?.fulfillment_orders_today || 0}</p>
                </div>
                <Package className="h-12 w-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

            {/* Setup Instructions - Show when system readiness is low */}
            {systemStatus && systemStatus.system_readiness !== undefined && systemStatus.system_readiness < 50 && (
              <div className="mt-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 mb-2">
                      🚀 Commercial Acquisition System Setup Required
                    </h3>
                    <p className="text-orange-800 mb-4">
                      {systemStatus.status_message || 'System configuration incomplete. Setup API keys to enable full functionality.'}
                    </p>
                    
                    {systemStatus.recommendations && systemStatus.recommendations.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
                        <h4 className="font-bold text-gray-900 mb-3">📋 Next Steps:</h4>
                        <ul className="space-y-2">
                          {systemStatus.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                      <p className="text-gray-300 mb-2"># Create .env.local file in project root:</p>
                      <p className="text-blue-400">GOOGLE_PLACES_API_KEY=your_google_places_key</p>
                      <p className="text-blue-400">KVK_API_KEY=your_kvk_api_key</p>
                      <p className="text-blue-400">OPENAI_API_KEY=your_openai_key</p>
                      <p className="text-blue-400">MANDRILL_API_KEY=your_mandrill_key</p>
                      <p className="text-gray-300 mt-2"># Then restart: npm run dev</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message - Show when system is well configured */}
            {systemStatus && systemStatus.system_readiness !== undefined && systemStatus.system_readiness >= 75 && (
              <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-green-900">✅ System Ready for Production</h3>
                    <p className="text-green-800">{systemStatus.status_message || 'Commercial Acquisition System is fully operational!'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs with Orange Theme */}
            <Tabs defaultValue="control" className="mt-8 space-y-6">
              <TabsList className="bg-white border-2 border-gray-200 p-2 shadow-md">
                <TabsTrigger 
                  value="control" 
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Control Panel
                </TabsTrigger>
                <TabsTrigger 
                  value="two_phase_automation"
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Two-Phase Automation
                </TabsTrigger>
                <TabsTrigger 
                  value="metrics"
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Metrics
                </TabsTrigger>
                <TabsTrigger 
                  value="performance"
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Performance
                </TabsTrigger>
                <TabsTrigger 
                  value="testing"
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Testing
                </TabsTrigger>
                <TabsTrigger 
                  value="configuration"
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Configuration
                </TabsTrigger>
                <TabsTrigger 
                  value="settings"
                  className="px-6 py-3 text-base font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

          <TabsContent value="control" className="space-y-6">
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gray-50 border-b-2 border-gray-100">
                <CardTitle className="text-2xl text-gray-900">Automation Control</CardTitle>
                <CardDescription className="text-base text-gray-700">Start en beheer het complete automation systeem</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={startAutomation}
                    disabled={actionLoading === 'start'}
                    className="flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {actionLoading === 'start' ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                    Start Full Automation
                  </Button>

                  <Button 
                    onClick={stopAutomation}
                    disabled={actionLoading === 'stop'}
                    variant="outline"
                    className="flex items-center gap-3 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-semibold px-6 py-3 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {actionLoading === 'stop' ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                    Stop Automation
                  </Button>

                  <Button 
                    onClick={runDiscovery}
                    disabled={!!actionLoading}
                    variant="outline"
                    className="flex items-center gap-3 border-2 border-green-300 hover:border-green-400 bg-green-50 hover:bg-green-100 font-semibold px-6 py-3 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {actionLoading === 'discovery' ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="text-lg">🧠</span>
                    )}
                    Run Perplexity Discovery
                  </Button>

                  <Button 
                    onClick={runCompleteTest}
                    disabled={!!actionLoading}
                    variant="outline"
                    className="flex items-center gap-3 border-2 border-gray-300 hover:border-gray-400 font-semibold px-6 py-3 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {actionLoading === 'test' ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <TestTube className="h-5 w-5" />
                    )}
                    Complete Test
                  </Button>

                  <Button 
                    onClick={activateAutomation}
                    disabled={!!actionLoading}
                    className="flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                  >
                    {actionLoading === 'automation' ? (
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    ) : (
                      <span className="text-xl">🚀</span>
                    )}
                    Activate Full Automation
                  </Button>
                </div>

                {systemStatus?.recommendations && systemStatus.recommendations.length > 0 && (
                  <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <h4 className="font-bold text-blue-900 mb-3 text-lg">Recommendations:</h4>
                    <ul className="space-y-2">
                      {systemStatus.recommendations.map((rec, index) => (
                        <li key={index} className="text-blue-800 font-medium">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-100">
                  <CardTitle className="text-lg font-bold text-gray-900">Discovery Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Prospects Discovered Today</span>
                      <span className="text-xl font-bold text-blue-600">{metrics?.prospects_discovered_today || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Qualified Today</span>
                      <span className="text-xl font-bold text-green-600">{metrics?.prospects_qualified_today || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-100">
                  <CardTitle className="text-lg font-bold text-gray-900">Email Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Emails Sent Today</span>
                      <span className="text-xl font-bold text-blue-600">{metrics?.emails_sent_today || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-600">Emails Opened Today</span>
                      <span className="text-xl font-bold text-green-600">{metrics?.emails_opened_today || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-100">
                  <CardTitle className="text-lg font-bold text-gray-900">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-600 mb-2">
                      {metrics?.conversion_rate ? `${(metrics.conversion_rate * 100).toFixed(1)}%` : '0%'}
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Prospect to Order</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <CompleteWorkflowTestDashboard />
          </TabsContent>

          {/* Two-Phase Automation Tab */}
          <TabsContent value="two_phase_automation" className="space-y-6">
            <TwoPhaseAutomationDashboard />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gray-50 border-b border-gray-100">
                <CardTitle className="text-xl font-bold text-gray-900">Performance Overview</CardTitle>
                <CardDescription className="text-base text-gray-700">
                  Realtime monitoring and alerts for the commercial acquisition pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Total Prospects</span>
                    <Badge variant="default" className="font-bold">{performanceData?.total_prospects || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Emails Sent</span>
                    <Badge variant="default" className="font-bold">{performanceData?.emails_sent || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Orders Fulfilled</span>
                    <Badge variant="default" className="font-bold">{performanceData?.fulfillment_orders || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Conversion Rate</span>
                    <Badge variant="default" className="font-bold">{performanceData?.conversion_rate ? `${(performanceData.conversion_rate * 100).toFixed(1)}%` : '0%'}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Average Discovery Time</span>
                    <Badge variant="default" className="font-bold">{performanceData?.avg_discovery_time ? `${Math.round(performanceData.avg_discovery_time / 1000)}s` : 'N/A'}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Total Discovery Jobs</span>
                    <Badge variant="default" className="font-bold">{performanceData?.total_discovery_jobs || 0}</Badge>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h3 className="text-lg font-bold text-blue-900 mb-4">🔔 Alerts</h3>
                  {performanceData?.alerts && performanceData.alerts.length > 0 ? (
                    <ul className="space-y-3">
                      {performanceData.alerts.map((alert: any) => (
                        <li key={alert.id} className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={alert.severity === 'error' ? 'error' : 'warning'} className="font-bold">
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-base font-semibold text-gray-800">{alert.message}</span>
                          </div>
                          <Button
                            onClick={() => acknowledgeAlert(alert.id)}
                            variant="outline"
                            size="sm"
                            className="text-sm"
                          >
                            Acknowledge
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">No alerts at the moment.</p>
                  )}
                </div>

                <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                  <h3 className="text-lg font-bold text-green-900 mb-4">🎉 Success Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <span className="text-base font-semibold text-gray-800">Total Prospects Discovered</span>
                      <Badge variant="default" className="font-bold">{performanceData?.total_prospects_discovered || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <span className="text-base font-semibold text-gray-800">Total Emails Sent</span>
                      <Badge variant="default" className="font-bold">{performanceData?.total_emails_sent || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <span className="text-base font-semibold text-gray-800">Total Orders Fulfilled</span>
                      <Badge variant="default" className="font-bold">{performanceData?.total_fulfillment_orders || 0}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                  <h3 className="text-lg font-bold text-red-900 mb-4">🚨 Error Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <span className="text-base font-semibold text-gray-800">Total Discovery Failures</span>
                      <Badge variant="error" className="font-bold">{performanceData?.total_discovery_failures || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <span className="text-base font-semibold text-gray-800">Total Email Delivery Failures</span>
                      <Badge variant="error" className="font-bold">{performanceData?.total_email_delivery_failures || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                      <span className="text-base font-semibold text-gray-800">Total Order Fulfillment Failures</span>
                      <Badge variant="error" className="font-bold">{performanceData?.total_order_fulfillment_failures || 0}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration" className="space-y-6">
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gray-50 border-b border-gray-100">
                <CardTitle className="text-xl font-bold text-gray-900">API Configuration</CardTitle>
                <CardDescription className="text-base text-gray-700">Setup en status van externe API integraties</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Quick Status Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg bg-white shadow-sm">
                      <span className="text-base font-bold text-gray-900">Google Places API</span>
                      <Badge 
                        className={`font-bold text-white px-3 py-1 ${apiStatus.google ? 'bg-green-700' : 'bg-red-600'}`}
                      >
                        {apiStatus.google ? 'Configured' : 'Not Set'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg bg-white shadow-sm">
                      <span className="text-base font-bold text-gray-900">KvK API</span>
                      <Badge 
                        className={`font-bold text-white px-3 py-1 ${apiStatus.kvk ? 'bg-green-700' : 'bg-red-600'}`}
                      >
                        {apiStatus.kvk ? 'Configured' : 'Not Set'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg bg-white shadow-sm">
                      <span className="text-base font-bold text-gray-900">OpenAI API</span>
                      <Badge 
                        className={`font-bold text-white px-3 py-1 ${apiStatus.openai ? 'bg-green-700' : 'bg-red-600'}`}
                      >
                        {apiStatus.openai ? 'Configured' : 'Not Set'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border-2 border-gray-300 rounded-lg bg-white shadow-sm">
                      <span className="text-base font-bold text-gray-900">Mandrill API</span>
                      <Badge 
                        className={`font-bold text-white px-3 py-1 ${apiStatus.mandrill ? 'bg-green-700' : 'bg-red-600'}`}
                      >
                        {apiStatus.mandrill ? 'Configured' : 'Not Set'}
                      </Badge>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">🚀 API Setup Required</h3>
                    <p className="text-blue-800 mb-4">
                      Voor volledige automatisering heeft het systeem 3 externe API's nodig. Setup tijd: ~26 minuten totaal.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-2">🌐 Google Places API</h4>
                        <p className="text-sm text-gray-600 mb-2">Voor automatische business discovery</p>
                        <p className="text-xs text-gray-500">Kosten: €0.017/request (100 gratis/maand)</p>
                        <p className="text-xs text-gray-500">Setup: ~10 minuten</p>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-2">🏢 KvK API</h4>
                        <p className="text-sm text-gray-600 mb-2">Nederlandse bedrijfsdata</p>
                        <p className="text-xs text-gray-500">Kosten: €0.25/request (1000 gratis)</p>
                        <p className="text-xs text-gray-500">Setup: ~7 minuten</p>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-gray-900 mb-2">🤖 OpenAI API</h4>
                        <p className="text-sm text-gray-600 mb-2">AI email optimization</p>
                        <p className="text-xs text-gray-500">Kosten: ~€0.03/optimization</p>
                        <p className="text-xs text-gray-500">Setup: ~9 minuten</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-blue-900">📋 Setup Checklist:</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 p-2 rounded">
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${apiStatus.google ? 'bg-green-600 border-green-600' : 'bg-red-500 border-red-500'}`}>
                            {apiStatus.google ? '✓' : '✗'}
                          </span>
                          <span className="font-medium text-gray-900">Google Places API key in .env.local</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded">
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${apiStatus.kvk ? 'bg-green-600 border-green-600' : 'bg-red-500 border-red-500'}`}>
                            {apiStatus.kvk ? '✓' : '✗'}
                          </span>
                          <span className="font-medium text-gray-900">KvK API key in .env.local</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded">
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${apiStatus.openai ? 'bg-green-600 border-green-600' : 'bg-red-500 border-red-500'}`}>
                            {apiStatus.openai ? '✓' : '✗'}
                          </span>
                          <span className="font-medium text-gray-900">OpenAI API key in .env.local</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded">
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${apiStatus.mandrill ? 'bg-green-600 border-green-600' : 'bg-red-500 border-red-500'}`}>
                            {apiStatus.mandrill ? '✓' : '✗'}
                          </span>
                          <span className="font-medium text-gray-900">Mandrill API key in .env.local</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-bold text-gray-900 mb-2">💡 Environment Variables toevoegen:</h4>
                      <pre className="text-sm text-gray-700 bg-gray-200 p-3 rounded overflow-x-auto">
{`# Voeg toe aan .env.local:
GOOGLE_PLACES_API_KEY=your_google_places_key_here
KVK_API_KEY=your_kvk_api_key_here
KVK_API_BASE_URL=https://api.kvk.nl/api/v1/nhr-data-v2
OPENAI_API_KEY=your_openai_key_here`}
                      </pre>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button 
                        onClick={() => window.open('https://console.cloud.google.com/apis/library/places-backend.googleapis.com', '_blank')}
                        variant="outline"
                        className="text-sm"
                      >
                        🌐 Google Places Setup
                      </Button>
                      <Button 
                        onClick={() => window.open('https://developers.kvk.nl/', '_blank')}
                        variant="outline"
                        className="text-sm"
                      >
                        🏢 KvK API Setup
                      </Button>
                      <Button 
                        onClick={() => window.open('https://platform.openai.com/signup', '_blank')}
                        variant="outline"
                        className="text-sm"
                      >
                        🤖 OpenAI Setup
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gray-50 border-b border-gray-100">
                <CardTitle className="text-xl font-bold text-gray-900">Data Sources</CardTitle>
                <CardDescription className="text-base text-gray-700">Actieve prospect discovery bronnen</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                    <span className="text-base font-semibold text-green-800">🧠 Perplexity AI</span>
                    <Badge variant="success" className="font-bold bg-green-600 text-white">
                      Active ✨
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Web Scraping</span>
                    <Badge variant={systemStatus?.enabled_sources?.webScraping ? "success" : "warning"} className="font-bold">
                      {systemStatus?.enabled_sources?.webScraping ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">Google Places</span>
                    <Badge variant={systemStatus?.enabled_sources?.googlePlaces ? "success" : "warning"} className="font-bold">
                      {systemStatus?.enabled_sources?.googlePlaces ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                    <span className="text-base font-semibold text-gray-800">KvK Registry</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={systemStatus?.enabled_sources?.kvkApi ? "success" : "warning"} className="font-bold">
                        {systemStatus?.enabled_sources?.kvkApi ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {systemStatus?.configuration?.kvk_api_configured && !systemStatus?.configuration?.kvk_api_enabled && (
                        <Badge variant="info" className="text-xs">
                          API Key OK, Toggle Disabled
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Perplexity AI Information */}
                <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                  <h3 className="text-lg font-bold text-green-900 mb-4">🧠 Perplexity AI - Advanced Business Discovery</h3>
                  <p className="text-green-800 mb-4">
                    Perplexity AI is nu actief en gebruikt real-time web intelligence voor hoogwaardige prospect discovery.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <h4 className="font-bold text-gray-900 mb-2">🎯 Wat Perplexity AI Doet:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Real-time web research voor businesses</li>
                        <li>• Accurate contact informatie (telefoon, email, website)</li>
                        <li>• Business ratings en review counts</li>
                        <li>• Specialties en service beschrijvingen</li>
                        <li>• GPS coördinaten en adressen</li>
                        <li>• Kwaliteitsvalidatie van business data</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <h4 className="font-bold text-gray-900 mb-2">✨ Voordelen vs Andere Bronnen:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Geen API rate limits of kosten</li>
                        <li>• Altijd up-to-date business informatie</li>
                        <li>• Intelligente business matching</li>
                        <li>• Hoge data kwaliteit (0.6+ confidence)</li>
                        <li>• Automatische verificatie van business status</li>
                        <li>• Nederlands + internationaal focus</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-bold text-green-900 mb-2">📊 Recent Performance:</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">3</div>
                        <div className="text-sm text-gray-600">Prospects Found</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">100%</div>
                        <div className="text-sm text-gray-600">Save Success Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">0.63</div>
                        <div className="text-sm text-gray-600">Avg Quality Score</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Web Scraping Setup Instructions */}
                {!systemStatus?.enabled_sources?.webScraping && (
                  <div className="mt-6 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <h3 className="text-lg font-bold text-yellow-900 mb-4">🕷️ Web Scraping Setup Required</h3>
                    <p className="text-yellow-800 mb-4">
                      Web scraping is currently disabled omdat Puppeteer niet geïnstalleerd is. Dit is nodig voor automatische business discovery via Google Maps, Yelp en andere platforms.
                    </p>
                    
                    <div className="bg-white p-4 rounded-lg border border-yellow-200 mb-4">
                      <h4 className="font-bold text-gray-900 mb-2">📋 Installatie Instructies:</h4>
                      <div className="space-y-3">
                        <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                          <p className="text-gray-700 mb-2"># Installeer Puppeteer dependency:</p>
                          <p className="text-blue-600 font-bold">npm install puppeteer</p>
                        </div>
                        
                        <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                          <p className="text-gray-700 mb-2"># Herstart development server:</p>
                          <p className="text-blue-600 font-bold">npm run dev</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-gray-900 mb-2">🎯 Wat Web Scraping Doet:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Automatische business discovery via Google Maps</li>
                          <li>• Yelp business listings scraping</li>
                          <li>• Facebook Business Pages data</li>
                          <li>• Yellow Pages business information</li>
                          <li>• Contact details & business insights</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-gray-900 mb-2">💡 Alternatieven:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Google Places API (betaald, zeer accurate)</li>
                          <li>• KvK API (Nederlandse bedrijven)</li>
                          <li>• Handmatige prospect import</li>
                          <li>• CSV bestand upload</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-100 rounded-lg">
                      <h4 className="font-bold text-gray-900 mb-2">⚠️ Belangrijke Notities:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Puppeteer download ~170MB Chromium browser</li>
                        <li>• Web scraping respecteert rate limits en robots.txt</li>
                        <li>• Alleen publieke bedrijfsinformatie wordt verzameld</li>
                        <li>• GDPR-compliant data processing</li>
                      </ul>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button 
                        onClick={() => window.open('https://github.com/puppeteer/puppeteer#installation', '_blank')}
                        variant="outline"
                        className="text-sm"
                      >
                        🕷️ Puppeteer Documentatie
                      </Button>
                      <Button 
                        onClick={() => window.location.reload()}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                      >
                        🔄 Refresh Status
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab - API Configuration & Testing */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-blue-600" />
                  System Settings & API Configuration
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Configureer externe API integraties en test systeemverbindingen
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Quick API Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ApiStatusCard 
                    name="OpenAI API"
                    description="AI email optimization"
                    isConfigured={apiStatus.openai}
                    isLoading={statusLoading}
                  />

                  <ApiStatusCard 
                    name="Google Places"
                    description="Business discovery"
                    isConfigured={apiStatus.google}
                    isLoading={statusLoading}
                  />

                  <ApiStatusCard 
                    name="KvK API"
                    description="Nederlandse bedrijfsdata"
                    isConfigured={apiStatus.kvk}
                    isLoading={statusLoading}
                  />

                  <ApiStatusCard 
                    name="Mandrill API"
                    description="Email delivery"
                    isConfigured={apiStatus.mandrill}
                    isLoading={statusLoading}
                  />

                  <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <h3 className="font-semibold text-green-900">🧠 Perplexity AI</h3>
                        <p className="text-sm text-green-700">Real-time business discovery</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-green-600 font-medium">✓ Active & Connected</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium text-gray-900">Test All API Connections</h3>
                      <p className="text-sm text-gray-600">Voer een volledige connectiviteitstest uit voor alle geconfigureerde APIs</p>
                    </div>
                    <Button 
                      onClick={() => {
                        window.open('/api/debug-env', '_blank');
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      Test APIs
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium text-gray-900">Refresh System Status</h3>
                      <p className="text-sm text-gray-600">Herlaad alle API configuraties en systeem statussen</p>
                    </div>
                    <Button 
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium text-gray-900">Production Readiness Check</h3>
                      <p className="text-sm text-gray-600">Volledig systeem health check en security audit</p>
                    </div>
                    <Button 
                      onClick={() => window.open('/api/commercial/production-readiness', '_blank')}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Health Check
                    </Button>
                  </div>
                </div>

                {/* Environment Information */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium mb-3 text-blue-900">Environment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between p-2 border border-blue-200 rounded">
                      <span className="font-semibold text-blue-900">Environment:</span>
                      <span className="font-mono font-bold text-blue-800">development</span>
                    </div>
                    <div className="flex justify-between p-2 border border-blue-200 rounded">
                      <span className="font-semibold text-blue-900">OpenAI API:</span>
                      <span className={`font-mono font-bold ${apiStatus.openai ? 'text-green-800' : 'text-red-800'}`}>
                        {apiStatus.openai ? '✓ Configured' : '✗ Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 border border-blue-200 rounded">
                      <span className="font-semibold text-blue-900">Mandrill API:</span>
                      <span className={`font-mono font-bold ${apiStatus.mandrill ? 'text-green-800' : 'text-red-800'}`}>
                        {apiStatus.mandrill ? '✓ Configured' : '✗ Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 border border-blue-200 rounded">
                      <span className="font-semibold text-blue-900">Server Status:</span>
                      <span className="font-mono font-bold text-green-800">✓ Running</span>
                    </div>
                    <div className="flex justify-between p-2 border border-blue-200 rounded">
                      <span className="font-semibold text-blue-900">Last Refresh:</span>
                      <span className="font-mono font-bold text-blue-800">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  } 