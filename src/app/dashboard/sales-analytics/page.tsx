'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  TrendingUp, 
  Trophy, 
  RefreshCw,
  Download,
  Award,
  DollarSign,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    total_retailers: number;
    active_last_7_days: number;
    active_last_30_days: number;
    engagement_rate_7_days: number;
    total_revenue_impact: number;
    avg_roi_per_retailer: number;
    total_actions: number;
    completion_rate: string;
  };
  advice_metrics: Array<{
    advice_type: string;
    category: string;
    total_advice: number;
    viewed_count: number;
    started_count: number;
    completed_count: number;
    skipped_count: number;
    avg_completed_roi: number;
    avg_hours_to_complete: number;
  }>;
  engagement_trend: Array<{
    date: string;
    active_users: number;
    completions: number;
    revenue_impact: number;
  }>;
  category_performance: Array<{
    category: string;
    total_advice: number;
    advice_with_actions: number;
    completed_advice: number;
    avg_roi: number;
    total_revenue_impact: number;
  }>;
  activity_heatmap: number[][];
  last_updated: string;
}

const DAYS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

export default function SalesAnalyticsPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('engagement');

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/sales-advice/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/sales-advice/analytics/refresh', { method: 'POST' });
      await fetchAnalytics();
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="mb-4">
                <Breadcrumbs />
              </div>
              <div className="text-center">
                <p className="text-red-600">Failed to load analytics data</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);

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
                <h1 className="text-3xl font-bold leading-6 text-gray-900">Sales Advice Analytics</h1>
                <p className="mt-2 text-lg text-gray-600">
                  Comprehensive insights into retailer engagement and performance
                </p>
              </div>
              <div className="flex gap-3">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar dashboard
                </Link>
                <button
                  onClick={refreshAnalytics}
            disabled={refreshing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active Retailers</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.overview.active_last_7_days}</div>
          <p className="text-xs text-gray-600 mt-1">
            {data.overview.engagement_rate_7_days.toFixed(1)}% engagement rate
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full" 
              style={{ width: `${data.overview.engagement_rate_7_days}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue Impact</h3>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.total_revenue_impact)}</div>
          <p className="text-xs text-gray-600 mt-1">
            {formatCurrency(data.overview.avg_roi_per_retailer)} per retailer
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Completion Rate</h3>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.overview.completion_rate}%</div>
          <p className="text-xs text-gray-600 mt-1">
            {data.overview.total_actions} total actions
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Retailers</h3>
            <Trophy className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.overview.total_retailers}</div>
          <p className="text-xs text-gray-600 mt-1">
            Active retailers in system
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            {['engagement', 'performance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Engagement Tab */}
          {activeTab === 'engagement' && (
            <div className="space-y-6">
              {/* Engagement Trend */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Trend</h3>
                <div className="space-y-2">
                  {data.engagement_trend.slice(0, 7).map((day) => (
                    <div key={day.date} className="flex items-center space-x-4">
                      <div className="w-24 text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div 
                            className="absolute top-0 left-0 bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${(day.active_users / Math.max(...data.engagement_trend.map(d => d.active_users))) * 100}%` }}
                          >
                            <span className="text-xs text-white font-medium">{day.active_users}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 w-32 text-right">
                          {formatCurrency(day.revenue_impact)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Heatmap */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Heatmap</h3>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-25 gap-1 min-w-[600px]">
                    <div></div>
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} className="text-xs text-center text-gray-600">{i}</div>
                    ))}
                    {DAYS.map((day, dayIndex) => (
                      <>
                        <div key={`day-${dayIndex}`} className="text-xs text-right pr-2 text-gray-600">{day}</div>
                        {data.activity_heatmap[dayIndex].map((value, hourIndex) => {
                          const intensity = Math.min(value / 10, 1);
                          return (
                            <div
                              key={`${dayIndex}-${hourIndex}`}
                              className="w-full aspect-square rounded-sm"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                                opacity: intensity === 0 ? 0.1 : 1
                              }}
                              title={`${day} ${hourIndex}:00 - ${value} actions`}
                            />
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Advice Type Performance</h3>
                <div className="space-y-4">
                  {data.advice_metrics.map((metric) => (
                    <div key={metric.advice_type} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{metric.advice_type}</h4>
                          <p className="text-sm text-gray-600">{metric.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{metric.avg_completed_roi?.toFixed(0)}% ROI</p>
                          <p className="text-xs text-gray-600">{metric.avg_hours_to_complete?.toFixed(1)}h avg completion</p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <div className="flex-1 text-center p-2 bg-gray-100 rounded">
                          <div className="font-medium text-gray-900">{metric.viewed_count}</div>
                          <div className="text-gray-600">Viewed</div>
                        </div>
                        <div className="flex-1 text-center p-2 bg-yellow-100 rounded">
                          <div className="font-medium text-gray-900">{metric.started_count}</div>
                          <div className="text-gray-600">Started</div>
                        </div>
                        <div className="flex-1 text-center p-2 bg-green-100 rounded">
                          <div className="font-medium text-gray-900">{metric.completed_count}</div>
                          <div className="text-gray-600">Completed</div>
                        </div>
                        <div className="flex-1 text-center p-2 bg-red-100 rounded">
                          <div className="font-medium text-gray-900">{metric.skipped_count}</div>
                          <div className="text-gray-600">Skipped</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Category Performance</h3>
                <div className="space-y-2">
                  {data.category_performance.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium text-gray-900">{cat.category}</span>
                        <span className="ml-2 text-sm text-gray-600">
                          ({cat.completed_advice}/{cat.total_advice} completed)
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{formatCurrency(cat.total_revenue_impact)}</div>
                        <div className="text-xs text-gray-600">{cat.avg_roi?.toFixed(0)}% avg ROI</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

            {/* Last Updated */}
            <div className="mt-6 text-sm text-gray-600 text-right">
              Last updated: {new Date(data.last_updated).toLocaleString('nl-NL')}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 