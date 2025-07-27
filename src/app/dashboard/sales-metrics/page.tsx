'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChartBarIcon, 
  UserGroupIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  SparklesIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface Metrics {
  overview: {
    total_retailers: number;
    active_retailers_week: number;
    total_advice_generated: number;
    total_advice_completed: number;
    completion_rate: string;
  };
  engagement: {
    actions_last_month: number;
    by_type: Record<string, number>;
    daily_activity: Record<string, any>;
  };
  top_performers: Array<{
    business_name: string;
    city: string;
    points: number;
    level: number;
    advice_completed: number;
    revenue_impact: number;
  }>;
  achievements: {
    total_unlocked: number;
    by_type: Record<string, number>;
  };
  advice_performance: Record<string, any>;
  streaks: {
    active_streaks: number;
    avg_current_streak: number;
    longest_streak: number;
  };
  revenue_impact: {
    total_impact: number;
    avg_impact_per_retailer: number;
    retailers_with_impact: number;
  };
  generated_at: string;
}

export default function SalesMetricsDashboard() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/sales-advice/metrics', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-xl text-gray-600">Loading sales metrics...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-4">
                <Breadcrumbs />
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading metrics</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={fetchMetrics}
                        className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-4">
                <Breadcrumbs />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Access Denied</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>This dashboard is only available for admin users.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600">No metrics data available</p>
            <button
              onClick={fetchMetrics}
              className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Load Metrics
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Helper functions
  const dailyActivityData = Object.entries(metrics.engagement.daily_activity).map(([date, data]: [string, any]) => ({
    date: new Date(date).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' }),
    total: data.total || 0,
    completed: data.completed || 0,
    started: data.started || 0,
    viewed: data.viewed || 0
  })).slice(-7);

  const getAdviceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      product_positioning: 'Product Positionering',
      market_analysis: 'Markt Analyse',
      competitor_insights: 'Concurrent Inzichten',
      customer_targeting: 'Klant Targeting',
      pricing_strategy: 'Pricing Strategie'
    };
    return labels[type] || type;
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      viewed: 'Bekeken',
      started: 'Gestart',
      completed: 'Voltooid',
      skipped: 'Overgeslagen',
      shared: 'Gedeeld'
    };
    return labels[type] || type;
  };

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
                <h1 className="text-3xl font-bold leading-6 text-gray-900 flex items-center gap-3">
                  <ChartBarIcon className="h-8 w-8 text-orange-600" />
                  Sales Metrics Dashboard
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Real-time inzichten in retailer engagement en ROI
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchMetrics}
                  disabled={refreshing}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
                <Link
                  href="/dashboard"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </div>
            </div>

            {/* Overview Stats */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {/* Total Retailers */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Totaal Retailers
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.overview.total_retailers}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active This Week */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FireIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Actief Deze Week
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.overview.active_retailers_week}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advice Generated */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <SparklesIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Advies Gegenereerd
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.overview.total_advice_generated}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advice Completed */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrophyIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Advies Voltooid
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.overview.total_advice_completed}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartPieIcon className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Voltooiingspercentage
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.overview.completion_rate}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Streaks & Revenue Impact */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Active Streaks */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CalendarDaysIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Actieve Streaks
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.streaks.active_streaks}
                        </dd>
                        <dd className="text-sm text-gray-600">
                          Gem: {metrics.streaks.avg_current_streak} dagen
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Revenue Impact */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CurrencyEuroIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Totaal Revenue Impact
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          +{metrics.revenue_impact.total_impact}%
                        </dd>
                        <dd className="text-sm text-gray-600">
                          {metrics.revenue_impact.retailers_with_impact} retailers
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Average Impact */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Gem. Impact per Retailer
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          +{metrics.revenue_impact.avg_impact_per_retailer}%
                        </dd>
                        <dd className="text-sm text-gray-600">
                          Langste streak: {metrics.streaks.longest_streak} dagen
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performers Table */}
            <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Performers</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Beste presterende retailers gebaseerd op advice completion en impact
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retailer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Advice Voltooid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.top_performers.map((performer, index) => (
                      <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index < 3 && (
                              <TrophyIcon className={`h-5 w-5 mr-2 ${
                                index === 0 ? 'text-yellow-500' : 
                                index === 1 ? 'text-gray-400' : 'text-orange-600'
                              }`} />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {performer.business_name}
                              </div>
                              <div className="text-sm text-gray-500">{performer.city}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                            Level {performer.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {performer.points.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {performer.advice_completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">
                            +{performer.revenue_impact}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Engagement & Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 mt-8">
              {/* Engagement by Type */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Engagement per Actie Type
                </h3>
                <div className="space-y-3">
                  {Object.entries(metrics.engagement.by_type).map(([type, count]) => {
                    const total = metrics.engagement.actions_last_month;
                    const percentage = total ? (count / total * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            {getActionTypeLabel(type)}
                          </span>
                          <span className="text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="mt-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              type === 'completed' ? 'bg-green-600' :
                              type === 'started' ? 'bg-blue-600' :
                              type === 'viewed' ? 'bg-purple-600' :
                              type === 'shared' ? 'bg-pink-600' :
                              'bg-gray-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Totaal {metrics.engagement.actions_last_month} acties in de afgelopen 30 dagen
                  </p>
                </div>
              </div>

              {/* Advice Performance */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Performance per Advies Type
                </h3>
                <div className="space-y-4">
                  {Object.entries(metrics.advice_performance).map(([type, stats]: [string, any]) => (
                    <div key={type} className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="font-medium text-gray-900">
                        {getAdviceTypeLabel(type)}
                      </h4>
                      <div className="mt-1 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Voltooid:</span>
                          <span className="ml-2 font-medium">{stats.count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gem. Impact:</span>
                          <span className="ml-2 font-medium text-green-600">
                            +{stats.avg_revenue_impact.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Totaal:</span>
                          <span className="ml-2 font-medium">
                            +{stats.total_revenue_impact}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dagelijkse Activiteit (Laatste 7 dagen)
              </h3>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex items-end justify-between h-64 px-4">
                    {dailyActivityData.map((day, index) => {
                      const maxValue = Math.max(...dailyActivityData.map(d => d.total));
                      const height = maxValue ? (day.total / maxValue * 100) : 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div className="relative w-full max-w-[60px] h-full flex items-end">
                            <div 
                              className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-500"
                              style={{ height: `${height}%` }}
                            >
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700">
                                {day.total}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">{day.date}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Voltooid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Gestart</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Bekeken</span>
                </div>
              </div>
            </div>

            {/* Achievement Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-yellow-500" />
                Achievement Statistieken
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {metrics.achievements.total_unlocked}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Totaal Unlocked</div>
                </div>
                {Object.entries(metrics.achievements.by_type).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600 mt-1 capitalize">{type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Updated */}
            <div className="mt-8 text-center text-sm text-gray-500">
              Laatste update: {new Date().toLocaleString('nl-NL')}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 