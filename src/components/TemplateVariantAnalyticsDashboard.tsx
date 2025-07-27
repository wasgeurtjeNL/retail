import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, TrendingDown, Target, 
  Zap, Users, Mail, Globe, Eye, MousePointer, 
  CheckCircle, AlertTriangle, Calendar, Filter,
  Download, RefreshCw, Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// =====================================================
// INTERFACES & TYPES
// =====================================================

interface TemplatePerformance {
  template_id: string;
  variant_name: string;
  template_type: 'email' | 'landing_page';
  segment: string;
  
  // Volume metrics
  emails_sent: number;
  conversions: number;
  conversion_rate: number;
  
  // Benchmarks
  benchmark_rate: number;
  above_benchmark: boolean;
  
  // Timing
  avg_time_to_conversion: number;
  
  // Status
  active: boolean;
  last_updated: string;
  
  // Trend data
  daily_performance: Array<{
    date: string;
    emails: number;
    conversions: number;
    rate: number;
  }>;
}

interface FunnelStageData {
  stage_name: string;
  count: number;
  percentage: number;
  conversion_rate: number;
  color: string;
}

interface SegmentAnalytics {
  segment: string;
  
  // Overall metrics
  total_journeys: number;
  total_conversions: number;
  overall_conversion_rate: number;
  
  // Funnel stages
  funnel_stages: FunnelStageData[];
  
  // Template performance
  email_templates: TemplatePerformance[];
  landing_templates: TemplatePerformance[];
  
  // Optimization
  last_optimization_check: string;
  optimization_recommendations: any[];
}

// Business segments voor filter
const BUSINESS_SEGMENTS = [
  { id: 'beauty_salon', name: 'Schoonheidssalons', icon: '💅' },
  { id: 'hair_salon', name: 'Kappers', icon: '✂️' },
  { id: 'cleaning_service', name: 'Schoonmaakdiensten', icon: '🧽' },
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️' },
  { id: 'hotel_bnb', name: 'Hotels & B&B', icon: '🏨' },
  { id: 'wellness_spa', name: 'Wellness & Spa', icon: '🧘' }
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function TemplateVariantAnalyticsDashboard() {
  // State management
  const [selectedSegment, setSelectedSegment] = useState('beauty_salon');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Analytics data
  const [segmentAnalytics, setSegmentAnalytics] = useState<SegmentAnalytics | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [realTimeStats, setRealTimeStats] = useState<any>(null);

  // Load data on mount and when filters change
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedSegment, dateRange]);

  // Real-time stats refresh
  useEffect(() => {
    const interval = setInterval(loadRealTimeStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [selectedSegment]);

  // =====================================================
  // DATA LOADING
  // =====================================================

  async function loadAnalyticsData() {
    try {
      setIsLoading(true);
      
      // Load segment analytics
      const analyticsResponse = await fetch(`/api/commercial/templates/analytics?${new URLSearchParams({
        segment: selectedSegment,
        start_date: dateRange.start,
        end_date: dateRange.end
      })}`);
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setSegmentAnalytics(analyticsData.analytics);
      }
      
      // Load optimization history
      const historyResponse = await fetch(`/api/commercial/templates/optimization-history?${new URLSearchParams({
        segment: selectedSegment,
        limit: '10'
      })}`);
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setOptimizationHistory(historyData.history || []);
      }
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Fout bij laden van analytics data');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRealTimeStats() {
    try {
      const response = await fetch(`/api/commercial/templates/real-time-stats?segment=${selectedSegment}`);
      if (response.ok) {
        const data = await response.json();
        setRealTimeStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  }

  async function runOptimizationCheck() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/commercial/templates/optimization-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segment: selectedSegment,
          auto_apply: false // Manual check, don't auto-apply
        })
      });
      
      if (response.ok) {
        toast.success('Optimization check uitgevoerd!');
        loadAnalyticsData(); // Refresh data
      } else {
        toast.error('Fout bij optimization check');
      }
    } catch (error) {
      console.error('Error running optimization check:', error);
      toast.error('Fout bij optimization check');
    } finally {
      setIsLoading(false);
    }
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  function getPerformanceColor(performance: TemplatePerformance): string {
    if (performance.above_benchmark) {
      return 'text-green-600';
    } else if (performance.conversion_rate >= performance.benchmark_rate * 0.8) {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  }

  function getPerformanceBadge(performance: TemplatePerformance): React.ReactElement {
    if (performance.above_benchmark) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <TrendingUp className="h-3 w-3 mr-1" />
          Above Benchmark
        </Badge>
      );
    } else {
      return (
        <Badge variant="error" className="bg-red-100 text-red-800">
          <TrendingDown className="h-3 w-3 mr-1" />
          Below Benchmark
        </Badge>
      );
    }
  }

  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('nl-NL').format(value);
  }

  const currentSegment = BUSINESS_SEGMENTS.find(s => s.id === selectedSegment);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Template Variant Analytics</h1>
          <p className="text-gray-600 mt-1">
            Complete funnel tracking & performance analytics zoals bedrijvenuitnodiging systeem
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={runOptimizationCheck}
            disabled={isLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Zap className="h-4 w-4" />
            <span>Run Optimization</span>
          </Button>
          
          <Button
            onClick={loadAnalyticsData}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-6">
            {/* Segment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Segment
              </label>
              <div className="flex space-x-2">
                {BUSINESS_SEGMENTS.map((segment) => (
                  <button
                    key={segment.id}
                    onClick={() => setSelectedSegment(segment.id)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedSegment === segment.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{segment.icon}</span>
                    {segment.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum Bereik
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="flex items-center text-gray-700 font-medium">tot</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Segment Info */}
      {currentSegment && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{currentSegment.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold">{currentSegment.name}</h2>
                  <p className="text-gray-600">Template Performance Analytics</p>
                </div>
              </div>
              
              {realTimeStats && (
                <div className="text-right">
                  <div className="text-sm text-gray-800 font-semibold">Real-time Today</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {realTimeStats.emails_sent_today || 0} emails
                  </div>
                  <div className="text-sm text-gray-600">
                    {realTimeStats.conversions_today || 0} conversions
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="funnel">Funnel Analysis</TabsTrigger>
          <TabsTrigger value="templates">Template Performance</TabsTrigger>
          <TabsTrigger value="optimization">Auto-Optimization</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {segmentAnalytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Journeys</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(segmentAnalytics.total_journeys)}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Conversions</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatNumber(segmentAnalytics.total_conversions)}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatPercentage(segmentAnalytics.overall_conversion_rate)}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Templates</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {segmentAnalytics.email_templates.filter(t => t.active).length + 
                           segmentAnalytics.landing_templates.filter(t => t.active).length}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Templates Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>Email Templates</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {segmentAnalytics.email_templates.map((template) => (
                        <div key={template.template_id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{template.variant_name}</div>
                            <div className="text-sm text-gray-500">
                              {formatNumber(template.emails_sent)} sent • {formatNumber(template.conversions)} conversions
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${getPerformanceColor(template)}`}>
                              {formatPercentage(template.conversion_rate)}
                            </div>
                            <Badge 
                              variant={template.conversion_rate >= template.benchmark_rate * 0.8 ? "success" : "error"}
                              className="ml-2"
                            >
                              {template.active ? 'Actief' : 'Inactief'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Landing Page Templates Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Landing Page Templates</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {segmentAnalytics.landing_templates.map((template) => (
                        <div key={template.template_id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{template.variant_name}</div>
                            <div className="text-sm text-gray-500">
                              {formatNumber(template.emails_sent)} visits • {formatNumber(template.conversions)} conversions
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${getPerformanceColor(template)}`}>
                              {formatPercentage(template.conversion_rate)}
                            </div>
                            <Badge variant="default" className="text-xs">
                              {template.active ? 'Actief' : 'Inactief'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Funnel Analysis Tab */}
        <TabsContent value="funnel" className="space-y-6">
          {segmentAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel - {currentSegment?.name}</CardTitle>
                <CardDescription>
                  Complete funnel van email send naar conversion (zoals bedrijvenuitnodiging systeem)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {segmentAnalytics.funnel_stages.map((stage, index) => (
                    <div key={stage.stage_name} className="relative">
                      {/* Stage Bar */}
                      <div className="flex items-center space-x-4">
                        <div className="w-32 text-sm font-medium text-gray-700">
                          {stage.stage_name}
                        </div>
                        
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
                            <div 
                              className={`h-full ${stage.color} transition-all duration-500`}
                              style={{ width: `${stage.percentage}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                              <span className="text-white font-medium text-sm">
                                {formatNumber(stage.count)}
                              </span>
                              <span className="text-white font-medium text-sm">
                                {formatPercentage(stage.percentage)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-20 text-right">
                          {index > 0 && (
                            <span className="text-sm text-gray-500">
                              {formatPercentage(stage.conversion_rate)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Drop-off indicator */}
                      {index < segmentAnalytics.funnel_stages.length - 1 && (
                        <div className="ml-36 mt-2 mb-2">
                          <div className="text-xs text-red-500">
                            ↓ {formatPercentage(100 - segmentAnalytics.funnel_stages[index + 1].conversion_rate)} drop-off
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Template Performance Tab */}
        <TabsContent value="templates" className="space-y-6">
          {segmentAnalytics && (
            <>
              {/* Email Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Email Template Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {segmentAnalytics.email_templates.map((template) => (
                      <div key={template.template_id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold flex items-center space-x-2">
                              <span>{template.variant_name}</span>
                              {template.active && (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  ACTIVE
                                </Badge>
                              )}
                              {getPerformanceBadge(template)}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Email Template • Last updated: {new Date(template.last_updated).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-800 font-medium">Emails Sent</div>
                            <div className="font-semibold">{formatNumber(template.emails_sent)}</div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">Conversions</div>
                            <div className="font-semibold">{formatNumber(template.conversions)}</div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">Conversion Rate</div>
                            <div className={`font-semibold ${getPerformanceColor(template)}`}>
                              {formatPercentage(template.conversion_rate)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">Benchmark</div>
                            <div className="font-semibold">{formatPercentage(template.benchmark_rate)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Landing Page Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Landing Page Template Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {segmentAnalytics.landing_templates.map((template) => (
                      <div key={template.template_id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold flex items-center space-x-2">
                              <span>{template.variant_name}</span>
                              {template.active && (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  ACTIVE
                                </Badge>
                              )}
                              {getPerformanceBadge(template)}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Landing Page Template • Last updated: {new Date(template.last_updated).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <Button
                            onClick={() => window.open(`/partner/${selectedSegment}?variant=${template.template_id}`, '_blank')}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-800 font-medium">Page Visits</div>
                            <div className="font-semibold">{formatNumber(template.emails_sent)}</div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">Conversions</div>
                            <div className="font-semibold">{formatNumber(template.conversions)}</div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">Conversion Rate</div>
                            <div className={`font-semibold ${getPerformanceColor(template)}`}>
                              {formatPercentage(template.conversion_rate)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-800 font-medium">Benchmark</div>
                            <div className="font-semibold">{formatPercentage(template.benchmark_rate)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Auto-Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Auto-Optimization Status</span>
              </CardTitle>
              <CardDescription>
                Automatic template switching op basis van performance benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-700 font-medium">
                Auto-optimization status en recommendations - Te implementeren
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Optimization History</span>
              </CardTitle>
              <CardDescription>
                Log van alle template switches en optimization acties
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizationHistory.length > 0 ? (
                <div className="space-y-4">
                  {optimizationHistory.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">
                          {entry.template_type} Template Switch
                        </h4>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {entry.notes || entry.switch_reason}
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-800 font-medium">Old Rate</div>
                          <div>{formatPercentage(entry.old_conversion_rate)}</div>
                        </div>
                        <div>
                          <div className="text-gray-800 font-medium">New Rate</div>
                          <div className="text-green-600 font-semibold">{formatPercentage(entry.new_conversion_rate)}</div>
                        </div>
                        <div>
                          <div className="text-gray-800 font-medium">Improvement</div>
                          <div className="text-green-600 font-semibold">+{formatPercentage(entry.improvement_percentage)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700 font-medium">
                  Geen optimization geschiedenis beschikbaar voor dit segment.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 