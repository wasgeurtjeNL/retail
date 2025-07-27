/**
 * Cache Monitor Component
 * Toont cache statistieken, health status, en management controls
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface CacheMetrics {
  overall: {
    totalEntries: number;
    memoryUsage: number;
    hitRate: number;
    totalRequests: number;
  };
  breakdown: {
    scraped: {
      entries: number;
      hitRate: number;
      size: number;
    };
    ai: {
      entries: number;
      hitRate: number;
      size: number;
    };
    analysis: {
      entries: number;
      hitRate: number;
      size: number;
    };
  };
}

interface CacheHealth {
  isHealthy: boolean;
  warnings: string[];
  recommendations: string[];
}

interface CacheStatus {
  isInitialized: boolean;
  uptime: number;
  config: {
    maxSize: number;
    maxEntries: number;
    defaultTTL: number;
    cleanupInterval: number;
  };
}

interface CacheData {
  status: CacheStatus;
  metrics: CacheMetrics;
  health: CacheHealth;
  timestamp: string;
}

export default function CacheMonitor() {
  const [cacheData, setCacheData] = useState<CacheData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Haal cache data op
  const fetchCacheData = async () => {
    try {
      const response = await fetch('/api/cache?detailed=true');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch cache data');
      }

      setCacheData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching cache data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cache operation
  const performCacheOperation = async (operation: string, target?: string, urls?: string[]) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/cache', {
        method: operation === 'clear_all' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: operation === 'clear_all' ? undefined : JSON.stringify({
          operation: operation === 'clear_all' ? 'clear' : operation,
          target,
          urls
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Cache operation failed');
      }

      toast.success(result.message);
      
      // Refresh data after operation
      await fetchCacheData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(errorMessage);
      console.error('Cache operation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh toggle
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    
    if (!autoRefresh) {
      // Start auto refresh
      const interval = setInterval(fetchCacheData, 30000); // 30 seconds
      setRefreshInterval(interval);
    } else {
      // Stop auto refresh
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchCacheData();
    
    // Cleanup on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  // Loading state
  if (loading && !cacheData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Monitor</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">Cache Monitor - Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchCacheData}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cacheData) {
    return null;
  }

  const { status, metrics, health } = cacheData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cache Monitor</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleAutoRefresh}
              className={`px-3 py-1 text-sm rounded-md ${
                autoRefresh
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {autoRefresh ? 'Auto Refresh: ON' : 'Auto Refresh: OFF'}
            </button>
            <button
              onClick={fetchCacheData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                status.isInitialized 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {status.isInitialized ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-2">
              {formatUptime(status.uptime)}
            </p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Health</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                health.isHealthy 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {health.isHealthy ? 'Healthy' : 'Needs Attention'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-2">
              {health.warnings.length} warnings
            </p>
            <p className="text-sm text-gray-600">Active issues</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hit Rate</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                metrics.overall.hitRate >= 70 
                  ? 'bg-green-100 text-green-800' 
                  : metrics.overall.hitRate >= 50
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {metrics.overall.hitRate >= 70 ? 'Good' : metrics.overall.hitRate >= 50 ? 'Fair' : 'Poor'}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-2">
              {metrics.overall.hitRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Cache hit rate</p>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Cache Statistics</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{formatNumber(metrics.overall.totalEntries)}</p>
            <p className="text-sm text-gray-600">Total Entries</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{metrics.overall.memoryUsage.toFixed(1)}MB</p>
            <p className="text-sm text-gray-600">Memory Usage</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{metrics.overall.hitRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Hit Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{formatNumber(metrics.overall.totalRequests)}</p>
            <p className="text-sm text-gray-600">Total Requests</p>
          </div>
        </div>

        {/* Cache Breakdown */}
        <div className="space-y-4">
          <h5 className="font-semibold text-gray-900">Cache Breakdown</h5>
          
          {Object.entries(metrics.breakdown).map(([type, stats]) => (
            <div key={type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-gray-900 capitalize">{type} Cache</h6>
                <span className="text-sm text-gray-600">{stats.entries} entries</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Hit Rate</p>
                  <p className="font-semibold text-gray-900">{stats.hitRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Size</p>
                  <p className="font-semibold text-gray-900">{stats.size.toFixed(1)}MB</p>
                </div>
                <div>
                  <p className="text-gray-600">Entries</p>
                  <p className="font-semibold text-gray-900">{stats.entries}</p>
                </div>
              </div>
              
              {/* Progress bar for hit rate */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      stats.hitRate >= 70 ? 'bg-green-600' : 
                      stats.hitRate >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${stats.hitRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Status */}
      {(!health.isHealthy || health.warnings.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6">
          <h4 className="text-lg font-semibold text-yellow-900 mb-4">Health Warnings</h4>
          
          {health.warnings.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-yellow-800 mb-2">Warnings:</h5>
              <ul className="space-y-1">
                {health.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {health.recommendations.length > 0 && (
            <div>
              <h5 className="font-medium text-yellow-800 mb-2">Recommendations:</h5>
              <ul className="space-y-1">
                {health.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cache Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Cache Management</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Clear Cache</h5>
            <div className="space-y-2">
              <button
                onClick={() => performCacheOperation('clear', 'all')}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                Clear All Caches
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => performCacheOperation('clear', 'scraped')}
                  className="bg-gray-600 text-white px-2 py-1 text-sm rounded hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  Scraped
                </button>
                <button
                  onClick={() => performCacheOperation('clear', 'ai')}
                  className="bg-gray-600 text-white px-2 py-1 text-sm rounded hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  AI Analysis
                </button>
                <button
                  onClick={() => performCacheOperation('clear', 'analysis')}
                  className="bg-gray-600 text-white px-2 py-1 text-sm rounded hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  Final
                </button>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-2">Configuration</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Max Size:</span>
                <span className="font-semibold text-gray-900">{status.config.maxSize}MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Entries:</span>
                <span className="font-semibold text-gray-900">{status.config.maxEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Default TTL:</span>
                <span className="font-semibold text-gray-900">{status.config.defaultTTL}min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cleanup Interval:</span>
                <span className="font-semibold text-gray-900">{status.config.cleanupInterval}min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 