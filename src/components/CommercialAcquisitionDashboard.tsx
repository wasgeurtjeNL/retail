'use client';

// =====================================================
// COMMERCIAL ACQUISITION DASHBOARD - Integrated Admin Interface
// Complete commercial acquisition management within admin panel
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle, 
  PauseCircle, 
  BarChart3, 
  Users, 
  Mail, 
  Target,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Eye,
  MousePointer,
  UserPlus,
  DollarSign,
  Activity,
  Loader2,
  TestTube,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import existing dashboard components
import PuppeteerScrapingDashboard from './PuppeteerScrapingDashboard';
import CompleteWorkflowTestDashboard from './CompleteWorkflowTestDashboard';
import PerformanceMonitoringTab from './PerformanceMonitoringTab';
import APIConfigurationDashboard from './APIConfigurationDashboard';

interface SystemHealth {
  overall: number;
  apis: {
    googlePlaces: boolean;
    kvk: boolean;
    openai: boolean;
    mandrill: boolean;
  };
  services: {
    emailQueue: boolean;
    discovery: boolean;
    campaigns: boolean;
  };
}

interface AutomationStatus {
  isRunning: boolean;
  startedAt?: string;
  totalProspects: number;
  activeEmails: number;
  activeCampaigns: number;
  lastActivity?: string;
}

interface PerformanceMetrics {
  discovery: {
    prospectsFound: number;
    qualityScore: number;
    sourcesActive: number;
  };
  email: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  fulfillment: {
    orders: number;
    shipped: number;
    delivered: number;
    fulfillmentRate: number;
  };
  revenue: {
    pipeline: number;
    converted: number;
    avgOrderValue: number;
    roi: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'prospect_discovered' | 'email_sent' | 'email_opened' | 'email_clicked' | 'order_created' | 'order_fulfilled';
  description: string;
  timestamp: string;
  metadata?: any;
}

export default function CommercialAcquisitionDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingAutomation, setIsStartingAutomation] = useState(false);

  // Load data on mount and set up periodic refresh
  useEffect(() => {
    loadDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load all dashboard data
   */
  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadSystemHealth(),
        loadAutomationStatus(),
        loadPerformanceMetrics(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load system health status
   */
  const loadSystemHealth = async () => {
    try {
      console.log('[Dashboard] Loading system health...');
      const response = await fetch('/api/commercial/config/apis');
      console.log('[Dashboard] API response status:', response.status);
      
      if (!response.ok) {
        console.error('[Dashboard] API response not ok:', response.status, response.statusText);
        return;
      }
      
      const result = await response.json();
      console.log('[Dashboard] API Config Response:', result);
      
      if (result.success) {
        const config = result.data.configuration;
        console.log('[Dashboard] API Configuration:', config);
        
        setSystemHealth({
          overall: result.data.summary.systemReadiness,
          apis: {
            googlePlaces: config.googlePlaces.working,
            kvk: config.kvkAPI.working,
            openai: config.openAI.working,
            mandrill: config.mandrill.working
          },
          services: {
            emailQueue: true, // Assume working if no errors
            discovery: config.googlePlaces.working || config.kvkAPI.working,
            campaigns: config.mandrill.working
          }
        });
        
        console.log('[Dashboard] System health updated:', {
          overall: result.data.summary.systemReadiness,
          openai: config.openAI.working
        });
      } else {
        console.error('[Dashboard] API Config Error:', result.error);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading system health:', error);
    }
  };

  /**
   * Load automation status
   */
  const loadAutomationStatus = async () => {
    try {
      const response = await fetch('/api/commercial/automation/status');
      const result = await response.json();
      
      if (result.success) {
        setAutomationStatus(result.data);
      }
    } catch (error) {
      console.error('Error loading automation status:', error);
    }
  };

  /**
   * Load performance metrics
   */
  const loadPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/commercial/metrics');
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  };

  /**
   * Load recent activity
   */
  const loadRecentActivity = async () => {
    try {
      const response = await fetch('/api/commercial/activity');
      const result = await response.json();
      
      if (result.success) {
        setRecentActivity(result.data.slice(0, 10)); // Show last 10 activities
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  /**
   * Start full automation
   */
  const startAutomation = async () => {
    setIsStartingAutomation(true);
    console.log('[Dashboard] Starting automation from CommercialAcquisitionDashboard...');
    
    try {
      const response = await fetch('/api/commercial/automation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableDiscovery: true,
          enableCampaigns: true,
          enableFulfillment: true
        })
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
        console.log('[Dashboard] Automation started successfully:', result);
        await loadAutomationStatus();
      } else {
        const errorMsg = result.error || 'Onbekende fout bij starten automation';
        toast.error(`Fout bij starten automation: ${errorMsg}`);
        console.error('[Dashboard] Automation start failed:', {
          result,
          error: result?.error || 'Geen error details beschikbaar',
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
      
      console.error('[Dashboard] Error starting automation:', {
        errorMessage,
        errorDetails,
        timestamp: new Date().toISOString(),
        api_endpoint: '/api/commercial/automation/start',
        component: 'CommercialAcquisitionDashboard'
      });
      
      toast.error(`Error bij starten automation: ${errorMessage}`);
    } finally {
      setIsStartingAutomation(false);
    }
  };

  /**
   * Stop automation
   */
  const stopAutomation = async () => {
    try {
      const response = await fetch('/api/commercial/automation/stop', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Automation gestopt');
        await loadAutomationStatus();
      } else {
        toast.error(`Fout bij stoppen automation: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error bij stoppen automation');
      console.error('Stop automation error:', error);
    }
  };

  /**
   * Get health color based on percentage
   */
  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get activity icon
   */
  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'prospect_discovered':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'email_sent':
        return <Mail className="w-4 h-4 text-purple-500" />;
      case 'email_opened':
        return <Eye className="w-4 h-4 text-green-500" />;
      case 'email_clicked':
        return <MousePointer className="w-4 h-4 text-orange-500" />;
      case 'order_created':
        return <UserPlus className="w-4 h-4 text-cyan-500" />;
      case 'order_fulfilled':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commercial Acquisition</h1>
          <p className="text-gray-600">Volledig geautomatiseerd prospect discovery en email campaigns</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={loadDashboardData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          {automationStatus?.isRunning ? (
            <Button 
              onClick={stopAutomation}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Stop Automation</span>
            </Button>
          ) : (
            <Button 
              onClick={startAutomation}
              disabled={isStartingAutomation || (systemHealth?.overall || 0) < 50}
              className="flex items-center space-x-2"
            >
              {isStartingAutomation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              <span>Start Automation</span>
            </Button>
          )}
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth && systemHealth.overall < 80 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            System health is {systemHealth.overall}%. Check API configuration and service status before starting automation.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>System Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className={`text-2xl font-bold ${getHealthColor(systemHealth?.overall || 0)}`}>
                    {systemHealth?.overall || 0}%
                  </div>
                  {systemHealth?.overall && systemHealth.overall >= 80 && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <Progress value={systemHealth?.overall || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Total Prospects</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{automationStatus?.totalProspects || 0}</div>
                <p className="text-xs text-gray-600">In pipeline</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Active Campaigns</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{automationStatus?.activeCampaigns || 0}</div>
                <p className="text-xs text-gray-600">Running</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Pipeline Value</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{metrics?.revenue.pipeline || 0}</div>
                <p className="text-xs text-gray-600">Estimated</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Performance</CardTitle>
                  <CardDescription>Email campaign effectiveness</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Open Rate</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={metrics.email.openRate} className="w-20" />
                        <span className="text-sm font-medium">{metrics.email.openRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Click Rate</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={metrics.email.clickRate} className="w-20" />
                        <span className="text-sm font-medium">{metrics.email.clickRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Conversion Rate</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={metrics.email.conversionRate} className="w-20" />
                        <span className="text-sm font-medium">{metrics.email.conversionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.slice(0, 6).map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No recent activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Automation Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Automation Status</span>
                <Badge variant={automationStatus?.isRunning ? "default" : "outline"}>
                  {automationStatus?.isRunning ? 'Running' : 'Stopped'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Current status of the commercial acquisition automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {automationStatus?.isRunning ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Started:</span>
                    <span>{automationStatus.startedAt ? new Date(automationStatus.startedAt).toLocaleString() : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Emails:</span>
                    <span>{automationStatus.activeEmails}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Activity:</span>
                    <span>{automationStatus.lastActivity ? new Date(automationStatus.lastActivity).toLocaleString() : 'No recent activity'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Automation is currently stopped</p>
                  <p className="text-sm text-gray-500 mt-1">
                    System health must be ≥80% to start automation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Tab */}
        <TabsContent value="discovery">
          <PuppeteerScrapingDashboard />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaign Management</CardTitle>
              <CardDescription>
                Manage automated email campaigns and sequences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Campaign management interface</p>
                <p className="text-sm text-gray-500 mt-1">
                  Advanced email campaign controls coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing">
          <CompleteWorkflowTestDashboard />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <PerformanceMonitoringTab />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <APIConfigurationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
} 