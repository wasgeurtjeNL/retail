"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import DiscoverySettingsManager from '@/components/DiscoverySettingsManager';
import BrandingSettings from '@/components/BrandingSettings';
import AccountSettings from '@/components/AccountSettings';
import NotificationSettings from '@/components/NotificationSettings';
import EmailTemplateEditor from '@/components/EmailTemplateEditor';
import EmailTemplateList from '@/components/EmailTemplateList';
import EmailDiagnostics from '@/components/EmailDiagnostics';
import MandrillDiagnostics from '@/components/MandrillDiagnostics';
import ApiStatusCard from '@/components/ApiStatusCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Brain, 
  Palette, 
  User, 
  Bell, 
  Mail, 
  Key, 
  Database, 
  Shield, 
  Activity,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Globe,
  Server,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiStatus {
  openai: boolean;
  google: boolean;
  kvk: boolean;
  mandrill: boolean;
  stripe: boolean;
  perplexity: boolean;
}

interface SystemHealth {
  database: boolean;
  email_service: boolean;
  stripe_service: boolean;
  storage: boolean;
  cache: boolean;
}

export default function AdminSettingsPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('discovery');
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    openai: false,
    google: false,
    kvk: false,
    mandrill: false,
    stripe: false,
    perplexity: false
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: false,
    email_service: false,
    stripe_service: false,
    storage: false,
    cache: false
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load API status en system health bij component mount
  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      setStatusLoading(true);
      
      // Load API status
      const apiResponse = await fetch('/api/commercial/status');
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setApiStatus({
          openai: apiData.api_keys_configured?.openai || false,
          google: apiData.api_keys_configured?.google_places || false,
          kvk: apiData.api_keys_configured?.kvk_api || false,
          mandrill: !!process.env.NEXT_PUBLIC_MANDRILL_API_KEY,
          stripe: !!process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY,
          perplexity: !!process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY
        });
      }

      // Load system health
      const healthResponse = await fetch('/api/system/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData.health || {
          database: true,
          email_service: true,
          stripe_service: true,
          storage: true,
          cache: true
        });
      }

    } catch (error) {
      console.error('Error loading system status:', error);
      toast.error('Fout bij laden systeem status');
    } finally {
      setStatusLoading(false);
    }
  };

  const refreshSystemStatus = async () => {
    setIsRefreshing(true);
    await loadSystemStatus();
    setIsRefreshing(false);
    toast.success('Systeem status ververst!');
  };

  const runProductionReadinessCheck = () => {
    window.open('/api/commercial/production-readiness', '_blank');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  // Access denied
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
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
            
            <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold leading-6 text-gray-900">Instellingen</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Beheer alle systeem instellingen, API configuraties en monitoring dashboard.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar dashboard
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="discovery" className="space-y-6">
                <TabsList className="grid w-full grid-cols-8 bg-white border border-gray-200 p-1">
                  <TabsTrigger 
                    value="discovery" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <Brain className="h-4 w-4" />
                    Discovery AI
                  </TabsTrigger>
                  <TabsTrigger 
                    value="apis" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <Key className="h-4 w-4" />
                    API Keys
                  </TabsTrigger>
                  <TabsTrigger 
                    value="email" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger 
                    value="branding" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <Palette className="h-4 w-4" />
                    Branding
                  </TabsTrigger>
                  <TabsTrigger 
                    value="payment" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </TabsTrigger>
                  <TabsTrigger 
                    value="system" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <Server className="h-4 w-4" />
                    System
                  </TabsTrigger>
                  <TabsTrigger 
                    value="account" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <User className="h-4 w-4" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                  >
                    <Bell className="h-4 w-4" />
                    Notificaties
                  </TabsTrigger>
                </TabsList>

                {/* Discovery AI Settings */}
                <TabsContent value="discovery" className="space-y-6">
                  <DiscoverySettingsManager />
                </TabsContent>

                {/* API Configuration */}
                <TabsContent value="apis" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-6 w-6 text-green-600" />
                        API Keys & External Services
                      </CardTitle>
                      <CardDescription>
                        Configureer en monitor alle externe API integraties
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* API Status Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ApiStatusCard 
                          name="Perplexity AI"
                          description="Real-time business discovery"
                          isConfigured={apiStatus.perplexity}
                          isLoading={statusLoading}
                        />
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
                          name="Mandrill Email"
                          description="Email delivery service"
                          isConfigured={apiStatus.mandrill}
                          isLoading={statusLoading}
                        />
                        <ApiStatusCard 
                          name="Stripe Payments"
                          description="Payment processing"
                          isConfigured={apiStatus.stripe}
                          isLoading={statusLoading}
                        />
                      </div>

                      {/* API Configuration Instructions */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-blue-900 mb-4">🚀 API Setup Instructions</h3>
                        <p className="text-blue-800 mb-4">
                          Voor volledige automatisering configureer de volgende API's in je .env.local bestand:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-gray-900 mb-2">🧠 Perplexity AI</h4>
                            <p className="text-sm text-gray-600 mb-2">Real-time business discovery</p>
                            <code className="text-xs bg-gray-100 p-1 rounded">PERPLEXITY_API_KEY=pplx-xxx</code>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-gray-900 mb-2">🌐 Google Places API</h4>
                            <p className="text-sm text-gray-600 mb-2">Business discovery fallback</p>
                            <code className="text-xs bg-gray-100 p-1 rounded">GOOGLE_PLACES_API_KEY=xxx</code>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-gray-900 mb-2">🏢 KvK API</h4>
                            <p className="text-sm text-gray-600 mb-2">Nederlandse bedrijfsdata</p>
                            <code className="text-xs bg-gray-100 p-1 rounded">KVK_API_KEY=xxx</code>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-gray-900 mb-2">📧 Mandrill Email</h4>
                            <p className="text-sm text-gray-600 mb-2">Transactional emails</p>
                            <code className="text-xs bg-gray-100 p-1 rounded">MANDRILL_API_KEY=xxx</code>
                          </div>
                        </div>
                      </div>

                      {/* System Actions */}
                      <div className="flex gap-4">
                        <Button 
                          onClick={refreshSystemStatus}
                          disabled={isRefreshing}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Refresh Status
                        </Button>
                        <Button 
                          onClick={runProductionReadinessCheck}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Production Check
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Email Settings */}
                <TabsContent value="email" className="space-y-6">
                  {/* Mandrill Diagnostics */}
                  <MandrillDiagnostics />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Email Templates</CardTitle>
                        <CardDescription>Beheer email templates voor automatische campaigns</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <EmailTemplateList onSelect={() => {}} selectedTemplateKey="" />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Email Diagnostics</CardTitle>
                        <CardDescription>Test en monitor email delivery</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <EmailDiagnostics />
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Template Editor</CardTitle>
                      <CardDescription>Maak en bewerk email templates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EmailTemplateEditor templateKey="" />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Branding Settings */}
                <TabsContent value="branding">
                  <BrandingSettings />
                </TabsContent>

                {/* Payment Settings */}
                <TabsContent value="payment" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-orange-600" />
                        Stripe Payment Configuration
                      </CardTitle>
                      <CardDescription>
                        Configureer Stripe voor automatische betalingen en order processing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Test Environment</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Publishable Key
                              </label>
                              <Input 
                                type="password"
                                placeholder="pk_test_..."
                                className="font-mono text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Secret Key
                              </label>
                              <Input 
                                type="password"
                                placeholder="sk_test_..."
                                className="font-mono text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Webhook Secret
                              </label>
                              <Input 
                                type="password"
                                placeholder="whsec_..."
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Production Environment</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Live Publishable Key
                              </label>
                              <Input 
                                type="password"
                                placeholder="pk_live_..."
                                className="font-mono text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Live Secret Key
                              </label>
                              <Input 
                                type="password"
                                placeholder="sk_live_..."
                                className="font-mono text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Live Webhook Secret
                              </label>
                              <Input 
                                type="password"
                                placeholder="whsec_..."
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-900 mb-2">💳 Stripe Configuration</h4>
                        <p className="text-orange-800 text-sm mb-3">
                          Voor automatische order processing en betalingen configureer Stripe webhooks:
                        </p>
                        <ul className="text-orange-800 text-sm space-y-1">
                          <li>• <code>checkout.session.completed</code></li>
                          <li>• <code>payment_intent.succeeded</code></li>
                          <li>• <code>invoice.payment_succeeded</code></li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* System Health & Monitoring */}
                <TabsContent value="system" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-6 w-6 text-red-600" />
                        System Health & Monitoring
                      </CardTitle>
                      <CardDescription>
                        Monitor system health, database, services en performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* System Health Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {Object.entries(systemHealth).map(([service, status]) => (
                          <div 
                            key={service}
                            className={`p-4 rounded-lg border-2 ${
                              status 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 capitalize">
                                {service.replace('_', ' ')}
                              </span>
                              {status ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="mt-1">
                              <Badge 
                                variant={status ? "default" : "error"}
                                className="text-xs"
                              >
                                {status ? 'Healthy' : 'Error'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Environment Information */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Environment Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Environment:</span>
                            <span className="ml-2">{process.env.NODE_ENV || 'development'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Database:</span>
                            <span className="ml-2">Supabase</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Storage:</span>
                            <span className="ml-2">Supabase Storage</span>
                          </div>
                        </div>
                      </div>

                      {/* System Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button 
                          onClick={refreshSystemStatus}
                          className="flex items-center gap-2"
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Refresh System Status
                        </Button>
                        <Button 
                          onClick={runProductionReadinessCheck}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Production Readiness Check
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Account Settings */}
                <TabsContent value="account">
                  <AccountSettings />
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications">
                  <NotificationSettings />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 