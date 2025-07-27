'use client';

// =====================================================
// COMPLETE WORKFLOW TEST DASHBOARD - Full Implementation
// Complete end-to-end testing interface for commercial acquisition system
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  BarChart3,
  Users,
  Mail,
  Target,
  Activity,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  TestTube,
  Settings,
  Database,
  Globe,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkflowStep {
  step: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started?: string;
  completed?: string;
  duration?: number;
  data?: any;
  error?: string;
  progress?: number;
}

interface WorkflowTestResult {
  success: boolean;
  totalDuration: number;
  stepsCompleted: number;
  stepsFailed: number;
  steps: WorkflowStep[];
  summary: {
    prospectsDiscovered: number;
    prospectsEnriched: number;
    emailsCampaignCreated: number;
    campaignsScheduled: number;
    emailsSent: number;
    emailsOpened: number;
    conversions: number;
    overallHealthScore: number;
    performanceMetrics: {
      avgResponseTime: number;
      errorRate: number;
      throughput: number;
    };
  };
  metadata: {
    testId: string;
    timestamp: string;
    environment: string;
    testConfiguration: any;
  };
}

interface TestConfiguration {
  testScope: 'full' | 'discovery_only' | 'campaigns_only' | 'api_only' | 'performance_only';
  testData: {
    location: string;
    businessTypes: string[];
    maxProspectsPerType: number;
    enableAI: boolean;
    enableRealEmails: boolean;
    mockMode: boolean;
  };
  performanceSettings: {
    concurrentRequests: number;
    timeoutMs: number;
    retryAttempts: number;
  };
  validationSettings: {
    validateEmailDelivery: boolean;
    validateAPIResponses: boolean;
    validateDatabaseIntegrity: boolean;
    validateSecurityCompliance: boolean;
  };
}

interface TestHistory {
  tests: WorkflowTestResult[];
  statistics: {
    totalTests: number;
    successRate: number;
    avgDuration: number;
    lastTestDate: string;
  };
}

export default function CompleteWorkflowTestDashboard() {
  // State management
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<WorkflowTestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistory | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<string>('');

  // Test configuration
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    testScope: 'full',
    testData: {
      location: 'Amsterdam',
      businessTypes: ['beauty_salon', 'hair_salon', 'wellness_spa'],
      maxProspectsPerType: 5,
      enableAI: true,
      enableRealEmails: false,
      mockMode: true
    },
    performanceSettings: {
      concurrentRequests: 3,
      timeoutMs: 30000,
      retryAttempts: 2
    },
    validationSettings: {
      validateEmailDelivery: true,
      validateAPIResponses: true,
      validateDatabaseIntegrity: true,
      validateSecurityCompliance: true
    }
  });

  // Realtime test monitoring
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadTestHistory();
    loadSystemHealth();
    
    // Set up realtime monitoring
    const interval = setInterval(() => {
      if (isRunning) {
        loadRealTimeData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning]);

  /**
   * Load test history and statistics
   */
  const loadTestHistory = async () => {
    try {
      const response = await fetch('/api/commercial/test-complete-workflow/history');
      const result = await response.json();
      
      if (result.success) {
        setTestHistory(result.data);
      }
    } catch (error) {
      console.error('Error loading test history:', error);
    }
  };

  /**
   * Load system health for test readiness
   */
  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/commercial/system-health');
      const result = await response.json();
      
      if (result.success) {
        setSystemHealth(result.data);
      }
    } catch (error) {
      console.error('Error loading system health:', error);
    }
  };

  /**
   * Load realtime data during test execution
   */
  const loadRealTimeData = async () => {
    try {
      const response = await fetch('/api/commercial/test-complete-workflow/realtime');
      const result = await response.json();
      
      if (result.success) {
        setRealTimeData(result.data);
        setCurrentProgress(result.data.progress);
        setActiveStep(result.data.currentStep);
      }
    } catch (error) {
      console.error('Error loading realtime data:', error);
    }
  };

  /**
   * Execute complete workflow test
   */
  const executeWorkflowTest = async () => {
    setIsRunning(true);
    setCurrentTest(null);
    setCurrentProgress(0);
    setActiveStep('Initializing test environment...');

    try {
      const response = await fetch('/api/commercial/test-complete-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration: testConfig,
          testId: `test_${Date.now()}`,
          enableRealtime: true
        })
      });

      const result: WorkflowTestResult = await response.json();
      
      setCurrentTest(result);
      
      if (result.success) {
        toast.success(`Workflow test succesvol! Health Score: ${result.summary.overallHealthScore}%`);
      } else {
        toast.error(`Test gefaald: ${result.stepsFailed} stappen gefaald`);
      }

      // Refresh history
      await loadTestHistory();
      
    } catch (error) {
      console.error('Workflow test error:', error);
      toast.error('Error tijdens workflow test uitvoering');
    } finally {
      setIsRunning(false);
      setActiveStep('');
      setCurrentProgress(0);
    }
  };

  /**
   * Quick component tests
   */
  const runQuickTest = async (component: string) => {
    try {
      setActiveStep(`Testing ${component}...`);
      
      const response = await fetch(`/api/commercial/test-${component}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quick: true,
          config: testConfig.testData 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${component} test geslaagd!`);
      } else {
        toast.error(`${component} test gefaald: ${result.error}`);
      }

    } catch (error) {
      console.error(`Error testing ${component}:`, error);
      toast.error(`Fout bij testen van ${component}`);
    } finally {
      setActiveStep('');
    }
  };

  /**
   * Performance benchmark test
   */
  const runPerformanceBenchmark = async () => {
    try {
      setActiveStep('Running performance benchmark...');
      
      const response = await fetch('/api/commercial/test-performance-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig.performanceSettings)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Performance test voltooid! Avg response: ${result.avgResponseTime}ms`);
      } else {
        toast.error('Performance test gefaald');
      }

    } catch (error) {
      console.error('Performance test error:', error);
      toast.error('Fout bij performance test');
    } finally {
      setActiveStep('');
    }
  };

  /**
   * Get status icon for workflow step
   */
  const getStepStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  /**
   * Get overall test progress
   */
  const getOverallProgress = () => {
    if (!currentTest) return currentProgress;
    
    const totalSteps = currentTest.steps.length;
    const completedSteps = currentTest.steps.filter(s => s.status === 'completed').length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  };

  /**
   * Add business type to test config
   */
  const addBusinessType = (type: string) => {
    if (type && !testConfig.testData.businessTypes.includes(type)) {
      setTestConfig({
        ...testConfig,
        testData: {
          ...testConfig.testData,
          businessTypes: [...testConfig.testData.businessTypes, type]
        }
      });
    }
  };

  /**
   * Remove business type from test config
   */
  const removeBusinessType = (index: number) => {
    setTestConfig({
      ...testConfig,
      testData: {
        ...testConfig.testData,
        businessTypes: testConfig.testData.businessTypes.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complete Workflow Testing</h2>
          <p className="text-gray-600">End-to-end testing van het commercial acquisition systeem</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={loadTestHistory}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              System Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${systemHealth.overall >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                  {systemHealth.overall}%
                </div>
                <div className="text-sm text-gray-600">Overall Health</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${systemHealth.apis.ready ? 'text-green-600' : 'text-red-600'}`}>
                  {systemHealth.apis.ready ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">APIs Ready</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${systemHealth.database.connected ? 'text-green-600' : 'text-red-600'}`}>
                  {systemHealth.database.connected ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Database</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${systemHealth.queues.operational ? 'text-green-600' : 'text-red-600'}`}>
                  {systemHealth.queues.operational ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Queue System</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Test Configuratie
          </CardTitle>
          <CardDescription>
            Configureer de parameters voor de complete workflow test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Test Scope</label>
              <select
                value={testConfig.testScope}
                onChange={(e) => setTestConfig({
                  ...testConfig, 
                  testScope: e.target.value as TestConfiguration['testScope']
                })}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="full">Complete Workflow</option>
                <option value="discovery_only">Alleen Discovery</option>
                <option value="campaigns_only">Alleen Campaigns</option>
                <option value="api_only">Alleen API Tests</option>
                <option value="performance_only">Alleen Performance</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Locatie</label>
              <Input
                value={testConfig.testData.location}
                onChange={(e) => setTestConfig({
                  ...testConfig,
                  testData: { ...testConfig.testData, location: e.target.value }
                })}
                placeholder="Amsterdam, Rotterdam, Utrecht"
                className="text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Prospects per Type</label>
              <Input
                type="number"
                value={testConfig.testData.maxProspectsPerType}
                onChange={(e) => setTestConfig({
                  ...testConfig,
                  testData: { ...testConfig.testData, maxProspectsPerType: parseInt(e.target.value) }
                })}
                min="1"
                max="20"
                className="text-gray-900"
              />
            </div>
          </div>

          {/* Business Types Configuration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Business Types</label>
            <div className="flex flex-wrap gap-2 mb-2">
                             {testConfig.testData.businessTypes.map((type, index) => (
                 <div 
                   key={index} 
                   className="cursor-pointer hover:bg-red-50"
                   onClick={() => removeBusinessType(index)}
                 >
                   <Badge className="border border-gray-300">
                     {type} ✕
                   </Badge>
                 </div>
               ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Voeg business type toe (beauty_salon, hair_salon, etc.)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addBusinessType((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="text-gray-900"
              />
              <Button 
                onClick={() => {
                  const inputs = document.querySelectorAll('input[placeholder*="business type"]');
                  const input = inputs[inputs.length - 1] as HTMLInputElement;
                  if (input?.value) {
                    addBusinessType(input.value);
                    input.value = '';
                  }
                }}
                variant="outline"
              >
                Toevoegen
              </Button>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Test Opties</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={testConfig.testData.enableAI}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      testData: { ...testConfig.testData, enableAI: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Enable AI Optimization</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={testConfig.testData.enableRealEmails}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      testData: { ...testConfig.testData, enableRealEmails: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Send Real Emails (Test Mode)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={testConfig.testData.mockMode}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      testData: { ...testConfig.testData, mockMode: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Mock Mode (Geen echte API calls)</span>
                </label>
              </div>
            </div>

            {/* Validation Settings */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Validation Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={testConfig.validationSettings.validateEmailDelivery}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      validationSettings: { ...testConfig.validationSettings, validateEmailDelivery: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Email Delivery Validation</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={testConfig.validationSettings.validateAPIResponses}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      validationSettings: { ...testConfig.validationSettings, validateAPIResponses: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">API Response Validation</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={testConfig.validationSettings.validateDatabaseIntegrity}
                    onChange={(e) => setTestConfig({
                      ...testConfig,
                      validationSettings: { ...testConfig.validationSettings, validateDatabaseIntegrity: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Database Integrity Check</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button 
              onClick={executeWorkflowTest} 
              disabled={isRunning || (systemHealth?.overall || 0) < 50}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Start Complete Test</span>
            </Button>

            <Button 
              onClick={() => runQuickTest('discovery')}
              disabled={isRunning}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Test Discovery</span>
            </Button>

            <Button 
              onClick={() => runQuickTest('campaigns')}
              disabled={isRunning}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Test Campaigns</span>
            </Button>

            <Button 
              onClick={runPerformanceBenchmark}
              disabled={isRunning}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Performance Test</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Test Progress */}
      {(isRunning || currentTest) && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                <span>Test Execution</span>
              </div>
              <Badge 
                className={`font-bold px-3 py-1 ${
                  isRunning ? 'bg-blue-600 text-white' : 
                  (currentTest?.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                }`}
              >
                {isRunning ? 'Running' : (currentTest?.success ? 'Completed' : 'Failed')}
              </Badge>
            </CardTitle>
            {activeStep && (
              <CardDescription className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{activeStep}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} className="w-full" />
            </div>

            {/* Real-time Metrics */}
            {realTimeData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{realTimeData.prospectsProcessed || 0}</div>
                  <div className="text-xs text-gray-600">Prospects Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{realTimeData.emailsQueued || 0}</div>
                  <div className="text-xs text-gray-600">Emails Queued</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{realTimeData.apiCalls || 0}</div>
                  <div className="text-xs text-gray-600">API Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{realTimeData.avgResponseTime || 0}ms</div>
                  <div className="text-xs text-gray-600">Avg Response</div>
                </div>
              </div>
            )}

            {/* Test Steps */}
            {currentTest && (
              <div className="space-y-3">
                <h4 className="font-medium">Test Steps</h4>
                {currentTest.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="mt-0.5">
                      {getStepStatusIcon(step.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">{step.name}</h5>
                        {step.duration && (
                          <span className="text-sm text-gray-500">{step.duration}ms</span>
                        )}
                      </div>
                      
                      {step.progress !== undefined && step.status === 'running' && (
                        <Progress value={step.progress} className="mt-1" />
                      )}
                      
                      {step.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-red-600">
                            {step.error}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {step.data && step.status === 'completed' && (
                        <div className="mt-2 text-sm text-gray-600">
                          <details className="cursor-pointer">
                            <summary className="font-medium">View Details</summary>
                            <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto mt-1">
                              {JSON.stringify(step.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Results Summary */}
      {currentTest && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Test Results Summary
            </CardTitle>
            <CardDescription>
              Test voltooid in {currentTest.totalDuration}ms - {currentTest.stepsCompleted} van {currentTest.steps.length} stappen succesvol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{currentTest.summary.prospectsDiscovered}</div>
                <div className="text-sm text-gray-600">Prospects Discovered</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{currentTest.summary.emailsSent}</div>
                <div className="text-sm text-gray-600">Emails Sent</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{currentTest.summary.campaignsScheduled}</div>
                <div className="text-sm text-gray-600">Campaigns Created</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{currentTest.summary.conversions}</div>
                <div className="text-sm text-gray-600">Conversions</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-xl font-bold">{currentTest.summary.performanceMetrics.avgResponseTime}ms</div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-xl font-bold">{currentTest.summary.performanceMetrics.errorRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Error Rate</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-xl font-bold">{currentTest.summary.performanceMetrics.throughput}</div>
                <div className="text-sm text-gray-600">Requests/min</div>
              </div>
            </div>

            {/* Health Score */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className={`text-4xl font-bold mb-2 ${
                currentTest.summary.overallHealthScore >= 80 ? 'text-green-600' : 
                currentTest.summary.overallHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {currentTest.summary.overallHealthScore}%
              </div>
              <div className="text-lg font-medium text-gray-700">Overall Health Score</div>
              <div className="text-sm text-gray-600 mt-1">
                {currentTest.summary.overallHealthScore >= 80 ? 'Excellent' : 
                 currentTest.summary.overallHealthScore >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test History */}
      {testHistory && testHistory.statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Test History
            </CardTitle>
            <CardDescription>
              {testHistory.statistics.totalTests} tests uitgevoerd - {testHistory.statistics.successRate.toFixed(1)}% success rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testHistory.tests && testHistory.tests.slice(0, 5).map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {test.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {test.stepsCompleted}/{test.steps.length} stappen - Health Score: {test.summary.overallHealthScore}%
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(test.metadata.timestamp).toLocaleString('nl-NL')} • {test.totalDuration}ms
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {test.summary.prospectsDiscovered} prospects
                    </div>
                    <div className="text-xs text-gray-500">
                      {test.summary.campaignsScheduled} campaigns
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 