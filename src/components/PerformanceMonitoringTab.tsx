// =====================================================
// PERFORMANCE MONITORING TAB COMPONENT
// Real-time system monitoring with metrics and alerts
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Activity, RefreshCw, Bell, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PerformanceData {
  real_time_metrics: Array<{
    metric_name: string;
    metric_value: number;
    metric_unit: string;
    timestamp: string;
    category: string;
  }>;
  active_alerts: Array<{
    id: string;
    metric_name: string;
    current_value: number;
    threshold: number;
    severity: string;
    message: string;
    triggered_at: string;
  }>;
  system_health: {
    overall_score: number;
    component_scores: Record<string, number>;
    last_updated: string;
  };
}

export default function PerformanceMonitoringTab() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPerformanceData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    try {
      const response = await fetch('/api/commercial/performance?action=dashboard');
      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data.data);
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Fout bij laden performance data');
    } finally {
      setLoading(false);
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

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">System Health</p>
                <p className={`text-3xl font-bold mt-2 ${getHealthColor(performanceData?.system_health?.overall_score || 0)}`}>
                  {performanceData?.system_health?.overall_score || 0}%
                </p>
              </div>
              <Activity className={`h-12 w-12 ${getHealthColor(performanceData?.system_health?.overall_score || 0)}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Alerts</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{performanceData?.active_alerts?.length || 0}</p>
              </div>
              <Bell className="h-12 w-12 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Discovery Health</p>
                <p className={`text-3xl font-bold mt-2 ${getHealthColor(performanceData?.system_health?.component_scores?.discovery || 0)}`}>
                  {Math.round(performanceData?.system_health?.component_scores?.discovery || 0)}%
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Email Health</p>
                <p className={`text-3xl font-bold mt-2 ${getHealthColor(performanceData?.system_health?.component_scores?.email || 0)}`}>
                  {Math.round(performanceData?.system_health?.component_scores?.email || 0)}%
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Performance Controls</CardTitle>
          <CardDescription className="text-base text-gray-700">Beheer real-time monitoring en metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={loadPerformanceData}
              disabled={!!actionLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>

            <Button 
              onClick={generateTestMetrics}
              disabled={actionLoading === 'test_metrics'}
              variant="outline"
              className="flex items-center gap-2"
            >
              {actionLoading === 'test_metrics' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Generate Test Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {performanceData?.active_alerts && performanceData.active_alerts.length > 0 && (
        <Card className="border-2 border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <CardTitle className="text-xl font-bold text-red-900">🚨 Active Alerts</CardTitle>
            <CardDescription className="text-base text-red-700">
              System alerts die aandacht vereisen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {performanceData.active_alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border-2 border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-4">
                    <Badge variant={getSeverityColor(alert.severity) as any} className="font-bold">
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-semibold text-gray-900">{alert.message}</p>
                      <p className="text-sm text-gray-600">
                        Current: {alert.current_value} | Threshold: {alert.threshold}
                      </p>
                      <p className="text-xs text-gray-500">
                        Triggered: {new Date(alert.triggered_at).toLocaleString('nl-NL')}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => acknowledgeAlert(alert.id)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Metrics */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Real-time Metrics</CardTitle>
          <CardDescription className="text-base text-gray-700">Laatste system performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceData?.real_time_metrics?.slice(0, 9).map((metric, index) => (
              <div key={index} className="p-4 border-2 border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {metric.metric_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <Badge variant="default" size="sm" className="text-xs">
                    {metric.category}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {typeof metric.metric_value === 'number' 
                    ? Math.round(metric.metric_value * 100) / 100 
                    : metric.metric_value
                  } 
                  <span className="text-sm text-gray-500 ml-1">{metric.metric_unit}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(metric.timestamp).toLocaleTimeString('nl-NL')}
                </p>
              </div>
            ))}
          </div>

          {(!performanceData?.real_time_metrics || performanceData.real_time_metrics.length === 0) && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Geen recente metrics beschikbaar</p>
              <p className="text-sm text-gray-500 mt-2">
                Klik op "Generate Test Metrics" om sample data te maken
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Health Breakdown */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardHeader className="bg-gray-50 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Component Health Breakdown</CardTitle>
          <CardDescription className="text-base text-gray-700">Detailed health scores per system component</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {performanceData?.system_health?.component_scores && 
             Object.entries(performanceData.system_health.component_scores).map(([component, score]) => (
              <div key={component} className="p-4 border-2 border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 capitalize">
                  {component.replace(/_/g, ' ')}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        score >= 80 ? 'bg-green-500' :
                        score >= 60 ? 'bg-yellow-500' :
                        score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(score, 0)}%` }}
                    ></div>
                  </div>
                  <span className={`font-bold text-sm ${getHealthColor(score)}`}>
                    {Math.round(score)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 