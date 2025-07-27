'use client';

import React, { useState, useEffect } from 'react';

interface ApiStatuses {
  openai: boolean;
  google: boolean;
  kvk: boolean;
  mandrill: boolean;
}

export default function DynamicApiStatus() {
  const [apiStatuses, setApiStatuses] = useState<ApiStatuses>({
    openai: false,
    google: false,
    kvk: false,
    mandrill: false
  });
  const [loading, setLoading] = useState(true);

  // Load API statuses from debug endpoint
  const loadApiStatuses = async () => {
    try {
      setLoading(true);
      console.log('[DynamicApiStatus] Loading API statuses...');
      
      const response = await fetch('/api/debug-env');
      const result = await response.json();
      
      console.log('[DynamicApiStatus] API Response:', result);
      
      if (result.environment) {
        const newStatuses = {
          openai: result.environment.hasOpenAI || false,
          google: result.environment.hasGoogle || false,
          kvk: result.environment.hasKvK || false,
          mandrill: result.environment.hasMandrill || false
        };
        
        console.log('[DynamicApiStatus] Setting statuses:', newStatuses);
        setApiStatuses(newStatuses);
      }
    } catch (error) {
      console.error('[DynamicApiStatus] Error loading API statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadApiStatuses();
  }, []);

  // Helper to get styling based on status
  const getStatusStyling = (isConfigured: boolean) => {
    return isConfigured ? {
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-800',
      descClass: 'text-green-700',
      statusClass: 'text-green-600',
      dotClass: 'bg-green-500',
      statusText: '✓ Connected'
    } : {
      bgClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-800',
      descClass: 'text-red-700',
      statusClass: 'text-red-600',
      dotClass: 'bg-red-500',
      statusText: '✗ Not Configured'
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['OpenAI API', 'Google Places', 'KvK API', 'Mandrill API'].map((name) => (
          <div key={name} className="p-4 border rounded-lg bg-gray-50 border-gray-200 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-600">{name}</span>
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
            <p className="text-sm text-gray-500">Loading...</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Checking status...</p>
          </div>
        ))}
      </div>
    );
  }

  const apis = [
    { key: 'openai', name: 'OpenAI API', description: 'AI email optimization' },
    { key: 'google', name: 'Google Places', description: 'Business discovery' },
    { key: 'kvk', name: 'KvK API', description: 'Nederlandse bedrijfsdata' },
    { key: 'mandrill', name: 'Mandrill API', description: 'Email delivery' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {apis.map((api) => {
        const isConfigured = apiStatuses[api.key as keyof ApiStatuses];
        const styling = getStatusStyling(isConfigured);
        
        return (
          <div key={api.key} className={`p-4 border rounded-lg ${styling.bgClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${styling.textClass}`}>{api.name}</span>
              <div className={`w-3 h-3 rounded-full ${styling.dotClass}`}></div>
            </div>
            <p className={`text-sm ${styling.descClass}`}>{api.description}</p>
            <p className={`text-xs mt-1 font-medium ${styling.statusClass}`}>{styling.statusText}</p>
          </div>
        );
      })}
    </div>
  );
} 