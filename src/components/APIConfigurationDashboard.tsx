'use client';

// =====================================================
// API CONFIGURATION DASHBOARD - Complete API Management
// Interactive interface for configuring and testing external APIs
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  RefreshCw,
  ExternalLink,
  Globe,
  Bot,
  Mail,
  Building,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface APIConfig {
  name: string;
  icon: React.ComponentType;
  description: string;
  configured: boolean;
  working: boolean;
  lastTested?: string;
  error?: string;
  setupUrl?: string;
  documentation?: string;
  testEndpoint?: string;
}

interface APITestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
  details?: any;
}

export default function APIConfigurationDashboard() {
  const [apiConfigs, setApiConfigs] = useState<Record<string, APIConfig>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingStates, setTestingStates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});

  // API definitions
  const apiDefinitions = {
    google_places: {
      name: 'Google Places API',
      icon: Globe,
      description: 'Voor automatische business discovery en locatiegegevens',
      setupUrl: 'https://console.cloud.google.com/apis/credentials',
      documentation: 'https://developers.google.com/maps/documentation/places/web-service',
      envKey: 'GOOGLE_PLACES_API_KEY',
      testEndpoint: 'google_places'
    },
    kvk: {
      name: 'KvK API',
      icon: Building,
      description: 'Nederlandse Kamer van Koophandel bedrijfsdata',
      setupUrl: 'https://developers.kvk.nl/',
      documentation: 'https://developers.kvk.nl/documentation',
      envKey: 'KVK_API_KEY',
      testEndpoint: 'kvk'
    },
    openai: {
      name: 'OpenAI API',
      icon: Bot,
      description: 'AI-powered email optimization en content generatie',
      setupUrl: 'https://platform.openai.com/api-keys',
      documentation: 'https://platform.openai.com/docs/api-reference',
      envKey: 'OPENAI_API_KEY',
      testEndpoint: 'openai'
    },
    mandrill: {
      name: 'Mandrill API',
      icon: Mail,
      description: 'Mailchimp Transactional Email Service',
      setupUrl: 'https://mandrillapp.com/settings',
      documentation: 'https://mailchimp.com/developer/transactional/',
      envKey: 'MANDRILL_API_KEY',
      testEndpoint: 'mandrill'
    }
  };

  useEffect(() => {
    loadAPIConfigurations();
  }, []);

  const loadAPIConfigurations = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/commercial/config/apis');
      if (response.ok) {
        const data = await response.json();
        const configs: Record<string, APIConfig> = {};
        
        Object.entries(apiDefinitions).forEach(([key, def]) => {
          const apiData = data[key] || {};
          configs[key] = {
            ...def,
            configured: apiData.configured || false,
            working: apiData.working || false,
            lastTested: apiData.lastTested,
            error: apiData.error
          };
        });
        
        setApiConfigs(configs);
      }
    } catch (error) {
      console.error('Error loading API configurations:', error);
      toast.error('Fout bij laden API configuraties');
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async (apiKey: string) => {
    setTestingStates(prev => ({ ...prev, [apiKey]: true }));
    
    try {
      const response = await fetch('/api/commercial/config/apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          service: apiConfigs[apiKey].testEndpoint
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setApiConfigs(prev => ({
          ...prev,
          [apiKey]: {
            ...prev[apiKey],
            working: true,
            lastTested: new Date().toISOString(),
            error: undefined
          }
        }));
        toast.success(`${apiConfigs[apiKey].name} test succesvol!`);
      } else {
        setApiConfigs(prev => ({
          ...prev,
          [apiKey]: {
            ...prev[apiKey],
            working: false,
            lastTested: new Date().toISOString(),
            error: result.error || 'Test gefaald'
          }
        }));
        toast.error(`${apiConfigs[apiKey].name} test gefaald`);
      }
    } catch (error) {
      console.error(`Error testing ${apiKey}:`, error);
      toast.error(`Fout bij testen ${apiConfigs[apiKey].name}`);
    } finally {
      setTestingStates(prev => ({ ...prev, [apiKey]: false }));
    }
  };

  const testAllAPIs = async () => {
    try {
      const response = await fetch('/api/commercial/config/apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          testAll: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`API tests voltooid! ${result.data.testResults?.filter((r: any) => r.success).length || 0} van ${result.data.testResults?.length || 0} geslaagd`);
        await loadAPIConfigurations(); // Refresh status
      } else {
        toast.error('Fout bij uitvoeren API tests');
      }
    } catch (error) {
      console.error('Error testing all APIs:', error);
      toast.error('Fout bij uitvoeren API tests');
    }
  };

  const toggleKeyVisibility = (apiKey: string) => {
    setShowKeys(prev => ({ ...prev, [apiKey]: !prev[apiKey] }));
  };

  const getStatusBadge = (config: APIConfig) => {
    if (!config.configured) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">Not Configured</span>;
    }
    if (config.working) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">Connected</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">Connection Failed</span>;
  };

  const getSetupInstructions = () => (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">API Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Klik op "Setup" naast elke API om naar de provider te gaan</li>
            <li>Maak een account aan en genereer API keys</li>
            <li>Voeg de keys toe aan je <code>.env.local</code> file</li>
            <li>Restart de applicatie en test de verbindingen</li>
          </ol>
          <p className="text-xs text-gray-600 mt-2">
            💡 Tip: Voor development kun je test keys gebruiken. Production keys zijn verplicht voor live gebruik.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading API configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Configuration</h2>
          <p className="text-gray-600">Configure and test external API integrations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAPIConfigurations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          <Button onClick={testAllAPIs} variant="outline">
            <TestTube className="h-4 w-4 mr-2" />
            Test All APIs
          </Button>
        </div>
      </div>

      {getSetupInstructions()}

      {/* API Configuration Cards */}
      <div className="grid gap-6">
        {Object.entries(apiConfigs).map(([key, config]) => {
          const IconComponent = config.icon as React.ComponentType<{ className?: string }>;
          
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(config)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Status Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <p className="text-sm text-gray-900">
                      {config.configured ? 'Configured' : 'Not Configured'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Tested</p>
                    <p className="text-sm text-gray-900">
                      {config.lastTested 
                        ? new Date(config.lastTested).toLocaleString('nl-NL')
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Environment Variable</p>
                    <p className="text-sm text-gray-900 font-mono">
                      {apiDefinitions[key as keyof typeof apiDefinitions].envKey}
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {config.error && (
                  <Alert variant="error">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Connection Error:</strong> {config.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => testAPI(key)}
                    disabled={testingStates[key] || !config.configured}
                    variant="outline"
                    size="sm"
                  >
                    {testingStates[key] ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>

                  <Button
                    onClick={() => window.open(config.setupUrl, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Setup Guide
                  </Button>

                  {config.documentation && (
                    <Button
                      onClick={() => window.open(config.documentation, '_blank')}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(apiConfigs).filter(c => c.configured && c.working).length}
              </div>
              <p className="text-sm text-gray-600">Connected APIs</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(apiConfigs).filter(c => c.configured && !c.working).length}
              </div>
              <p className="text-sm text-gray-600">Connection Issues</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {Object.values(apiConfigs).filter(c => !c.configured).length}
              </div>
              <p className="text-sm text-gray-600">Not Configured</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((Object.values(apiConfigs).filter(c => c.configured && c.working).length / Object.values(apiConfigs).length) * 100)}%
              </div>
              <p className="text-sm text-gray-600">System Readiness</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 