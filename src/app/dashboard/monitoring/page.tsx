'use client';

import { useState, useEffect } from 'react';
import { wasstripsMonitor } from '@/lib/monitoring';
import type { MonitoringEvent } from '@/lib/monitoring';

export default function MonitoringPage() {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [errors, setErrors] = useState<MonitoringEvent[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState({
    averageOrderCreation: 0,
    averageOrderUpdate: 0,
    slowOperations: [] as MonitoringEvent[],
    errorRate: 0
  });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Refresh monitoring data
  const refreshData = () => {
    setEvents(wasstripsMonitor.getRecentEvents(100));
    setErrors(wasstripsMonitor.getRecentErrors(50));
    setPerformanceSummary(wasstripsMonitor.getPerformanceSummary());
  };

  useEffect(() => {
    // Initial load
    refreshData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(refreshData, 10000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get event type badge
  const getEventBadge = (eventType: MonitoringEvent['event_type']) => {
    switch (eventType) {
      case 'order_created':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Order Created</span>;
      case 'order_updated':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Order Updated</span>;
      case 'payment_status_change':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Payment Change</span>;
      case 'error':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Error</span>;
      case 'performance':
        return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">Performance</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">{eventType}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Wasstrips Monitoring</h1>
              <p className="mt-2 text-gray-600">Real-time monitoring van order workflow en performance</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={refreshData}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => wasstripsMonitor.clearEvents()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                🗑️ Clear Events
              </button>
            </div>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 font-semibold">⚡</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Order Creation</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceSummary.averageOrderCreation}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">📝</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Order Update</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceSummary.averageOrderUpdate}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <span className="text-red-600 font-semibold">⚠️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Error Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceSummary.errorRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">🐌</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Slow Operations</p>
                <p className="text-2xl font-semibold text-gray-900">{performanceSummary.slowOperations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Events</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Laatste {events.length} events van de wasstrips order workflow
            </p>
          </div>
          <div className="border-t border-gray-200">
            <div className="max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  Geen events gevonden. Start de applicatie en voer enkele acties uit om events te zien.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {events.map((event, index) => (
                    <li key={index} className="px-4 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getEventBadge(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {event.order_number && (
                                <span className="text-blue-600 mr-2">{event.order_number}</span>
                              )}
                              {event.user_email && (
                                <span className="text-gray-600">{event.user_email}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{formatTime(event.timestamp)}</p>
                          </div>
                          {event.status_from && event.status_to && (
                            <p className="text-sm text-gray-600">
                              Status: <span className="text-red-600">{event.status_from}</span> → <span className="text-green-600">{event.status_to}</span>
                            </p>
                          )}
                          {event.error_message && (
                            <p className="text-sm text-red-600">Error: {event.error_message}</p>
                          )}
                          {event.performance_metric && (
                            <p className="text-sm text-gray-600">
                              {event.performance_metric.operation}: {event.performance_metric.duration_ms}ms 
                              {!event.performance_metric.success && <span className="text-red-600 ml-1">(Failed)</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Error Summary */}
        {errors.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-red-50">
              <h3 className="text-lg leading-6 font-medium text-red-900">Recent Errors</h3>
              <p className="mt-1 max-w-2xl text-sm text-red-700">
                Laatste {errors.length} errors die aandacht vereisen
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="px-4 py-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-red-500 text-lg">⚠️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {error.order_number && (
                              <span className="text-blue-600 mr-2">{error.order_number}</span>
                            )}
                            {error.user_email && (
                              <span className="text-gray-600">{error.user_email}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{formatTime(error.timestamp)}</p>
                        </div>
                        <p className="text-sm text-red-600">{error.error_message}</p>
                        {error.metadata?.operation && (
                          <p className="text-xs text-gray-500">Operation: {error.metadata.operation}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
