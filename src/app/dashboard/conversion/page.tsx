// =====================================================
// CONVERSION ANALYTICS DASHBOARD
// ROI tracking and conversion performance monitoring
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Users,
  DollarSign,
  Package,
  Mail,
  Phone,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';

interface ConversionOverview {
  period: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    journeys: number;
    proefpakketten_sent: number;
    delivered: number;
    feedback_received: number;
    conversions: number;
    total_investment: number;
    total_revenue: number;
  };
  rates: {
    delivery_rate: number;
    feedback_rate: number;
    conversion_rate: number;
    interest_rate: number;
    roi_percentage: number;
  };
  averages: {
    days_to_delivery: number;
    days_to_conversion: number;
    feedback_rating: number;
    ltv_per_conversion: number;
    cost_per_conversion: number;
  };
}

interface ROIMetrics {
  summary: {
    total_investment: number;
    total_revenue: number;
    net_profit: number;
    roi_percentage: number;
    conversion_count: number;
    total_journeys: number;
  };
  breakdowns: {
    by_status: any[];
    by_country: any[];
    by_enrichment_score: any[];
    by_timeframe: any[];
  };
  cost_analysis: {
    avg_proefpakket_cost: number;
    avg_shipping_cost: number;
    avg_follow_up_cost: number;
    cost_per_conversion: number;
  };
}

export default function ConversionDashboard() {
  const [overview, setOverview] = useState<ConversionOverview | null>(null);
  const [roiMetrics, setROIMetrics] = useState<ROIMetrics | null>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [feedbackInsights, setFeedbackInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load overview data
      const overviewResponse = await fetch(`/api/conversion/analytics?action=overview&start_date=${dateRange.start}&end_date=${dateRange.end}`);
      const overviewData = await overviewResponse.json();

      if (overviewData.success) {
        setOverview(overviewData.data.overview);
      }

      // Load ROI metrics
      const roiResponse = await fetch(`/api/conversion/analytics?action=roi_metrics&start_date=${dateRange.start}&end_date=${dateRange.end}`);
      const roiData = await roiResponse.json();

      if (roiData.success) {
        setROIMetrics(roiData.data);
      }

      // Load funnel data
      const funnelResponse = await fetch(`/api/conversion/analytics?action=conversion_funnel&start_date=${dateRange.start}&end_date=${dateRange.end}`);
      const funnelResponseData = await funnelResponse.json();

      if (funnelResponseData.success) {
        setFunnelData(funnelResponseData.data);
      }

      // Load feedback insights
      const feedbackResponse = await fetch(`/api/conversion/analytics?action=feedback_insights&start_date=${dateRange.start}&end_date=${dateRange.end}`);
      const feedbackData = await feedbackResponse.json();

      if (feedbackData.success) {
        setFeedbackInsights(feedbackData.data);
      }

    } catch (err) {
      console.error('[Conversion Dashboard] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Target className="h-4 w-4 text-gray-500" />;
  };

  const getROIColor = (roi: number) => {
    if (roi >= 100) return 'text-green-600';
    if (roi >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !overview) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conversie Analytics</h1>
          <p className="text-gray-600 mt-1">ROI tracking en performance metrics voor proefpakket campagnes</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'roi', name: 'ROI Analysis', icon: DollarSign },
            { id: 'funnel', name: 'Conversion Funnel', icon: Target },
            { id: 'feedback', name: 'Feedback Insights', icon: Star }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Journeys Gestart</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.totals.journeys}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {overview.period.days} dagen periode
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conversies</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.totals.conversions}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {formatPercentage(overview.rates.conversion_rate)} conversie rate
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">ROI</p>
                    <p className={`text-2xl font-bold ${getROIColor(overview.rates.roi_percentage)}`}>
                      {formatPercentage(overview.rates.roi_percentage)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatCurrency(overview.totals.total_revenue - overview.totals.total_investment)} winst
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gem. Conversietijd</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(overview.averages.days_to_conversion)}d
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(overview.averages.days_to_delivery)}d tot levering
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Levering Success Rate</span>
                    <span className="font-semibold">{formatPercentage(overview.rates.delivery_rate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Feedback Response Rate</span>
                    <span className="font-semibold">{formatPercentage(overview.rates.feedback_rate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interest Rate</span>
                    <span className="font-semibold">{formatPercentage(overview.rates.interest_rate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gemiddelde Feedback Rating</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{overview.averages.feedback_rating.toFixed(1)}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${star <= overview.averages.feedback_rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financiële Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Totale Investering</span>
                    <span className="font-semibold">{formatCurrency(overview.totals.total_investment)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Totale Omzet</span>
                    <span className="font-semibold text-green-600">{formatCurrency(overview.totals.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gem. LTV per Conversie</span>
                    <span className="font-semibold">{formatCurrency(overview.averages.ltv_per_conversion)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cost per Conversie</span>
                    <span className="font-semibold">{formatCurrency(overview.averages.cost_per_conversion)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ROI Analysis Tab */}
      {activeTab === 'roi' && roiMetrics && (
        <div className="space-y-6">
          {/* ROI Summary */}
          <Card>
            <CardHeader>
              <CardTitle>ROI Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Totale Investering</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(roiMetrics.summary.total_investment)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Totale Omzet</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(roiMetrics.summary.total_revenue)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">ROI</p>
                  <p className={`text-3xl font-bold ${getROIColor(roiMetrics.summary.roi_percentage)}`}>
                    {formatPercentage(roiMetrics.summary.roi_percentage)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ROI by Country */}
          <Card>
            <CardHeader>
              <CardTitle>ROI per Land</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Journeys</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversies</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversie Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roiMetrics.breakdowns.by_country.map((country: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {country.country}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {country.journey_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {country.conversion_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPercentage(country.conversion_rate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getROIColor(country.roi_percentage)}>
                            {formatPercentage(country.roi_percentage)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversion Funnel Tab */}
      {activeTab === 'funnel' && funnelData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversie Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.conversion_rates.map((step: any, index: number) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-32 text-sm font-medium text-gray-700">
                      {step.step_name}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                      <div 
                        className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ width: `${step.percentage}%` }}
                      >
                        {step.count}
                      </div>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600">
                        {formatPercentage(step.percentage)}
                      </div>
                    </div>
                    {index > 0 && (
                      <div className="w-20 text-sm text-gray-500">
                        {formatPercentage(step.conversion_rate_from_previous)} van vorige
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Drop-off Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Drop-off Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.drop_off_analysis.filter((step: any) => step.drop_off_count > 0).map((step: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{step.step_name}</h4>
                      <p className="text-sm text-gray-600">
                        {step.drop_off_count} prospects verloren ({formatPercentage(step.drop_off_rate)})
                      </p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback Insights Tab */}
      {activeTab === 'feedback' && feedbackInsights && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Overzicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Totaal Feedback</span>
                    <span className="font-semibold">{feedbackInsights.summary.total_feedback}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gem. Overall Rating</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{feedbackInsights.summary.avg_ratings.overall.toFixed(1)}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Interest Rate</span>
                    <span className="font-semibold text-green-600">
                      {formatPercentage(feedbackInsights.summary.interest_stats.interest_rate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Verdeling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Positief (4-5 sterren)</span>
                    </div>
                    <span className="font-semibold">{feedbackInsights.summary.sentiment_distribution.positive}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Neutraal (3 sterren)</span>
                    </div>
                    <span className="font-semibold">{feedbackInsights.summary.sentiment_distribution.neutral}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Negatief (1-2 sterren)</span>
                    </div>
                    <span className="font-semibold">{feedbackInsights.summary.sentiment_distribution.negative}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Correlation */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback ↔ Conversie Correlatie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Hoge Rating (4-5⭐)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPercentage(feedbackInsights.conversion_correlation.high_rating_conversion_rate)}
                  </p>
                  <p className="text-xs text-gray-500">conversie rate</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Gemiddelde Rating (3⭐)</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatPercentage(feedbackInsights.conversion_correlation.medium_rating_conversion_rate)}
                  </p>
                  <p className="text-xs text-gray-500">conversie rate</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Lage Rating (1-2⭐)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatPercentage(feedbackInsights.conversion_correlation.low_rating_conversion_rate)}
                  </p>
                  <p className="text-xs text-gray-500">conversie rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 