// =====================================================
// KVK API TOGGLE CONTROL COMPONENT
// Admin component voor het in-/uitschakelen van KvK API
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Settings, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface KvKToggleState {
  enabled: boolean;
  loading: boolean;
  apiKeyConfigured: boolean;
  error?: string;
}

interface KvKToggleControlProps {
  className?: string;
  onToggleChange?: (enabled: boolean) => void;
}

/**
 * KvK API Toggle Control Component
 * Geeft admins de mogelijkheid om KvK API in/uit te schakelen
 */
export default function KvKToggleControl({ className, onToggleChange }: KvKToggleControlProps) {
  const [state, setState] = useState<KvKToggleState>({
    enabled: false,
    loading: true,
    apiKeyConfigured: false
  });

  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

  // Laad huidige KvK toggle status
  useEffect(() => {
    loadToggleStatus();
  }, []);

  const loadToggleStatus = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/commercial/config/kvk-toggle');
      
      if (!response.ok) {
        if (response.status === 401) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Unauthorized - Admin access required' 
          }));
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setState({
        enabled: data.enabled,
        loading: false,
        apiKeyConfigured: !!process.env.NEXT_PUBLIC_KVK_API_CONFIGURED || false, // Via build-time env
        error: undefined
      });

    } catch (error) {
      console.error('[KvKToggle] Error loading status:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load KvK toggle status'
      }));
    }
  };

  const handleToggleClick = (newEnabled: boolean) => {
    if (newEnabled && !state.apiKeyConfigured) {
      toast.error('KvK API key must be configured before enabling');
      return;
    }

    setPendingToggle(newEnabled);
    setShowReasonInput(true);
  };

  const executeToggle = async () => {
    if (pendingToggle === null) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/commercial/config/kvk-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: pendingToggle,
          reason: reason || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        enabled: data.enabled,
        loading: false,
        error: undefined
      }));

      toast.success(data.message || `KvK API ${data.enabled ? 'enabled' : 'disabled'} successfully`);
      
      // Notify parent component
      onToggleChange?.(data.enabled);

      // Reset form
      setShowReasonInput(false);
      setPendingToggle(null);
      setReason('');

    } catch (error) {
      console.error('[KvKToggle] Error updating toggle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update KvK toggle';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      toast.error(errorMessage);
    }
  };

  const cancelToggle = () => {
    setShowReasonInput(false);
    setPendingToggle(null);
    setReason('');
  };

  if (state.error && state.error.includes('Unauthorized')) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Admin access required</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-gray-200 ${className}`}>
      <CardHeader className="bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="h-6 w-6 text-orange-600" />
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                KvK API Controle
              </CardTitle>
              <CardDescription className="text-base text-gray-700">
                Nederlandse Kamer van Koophandel API in-/uitschakelen
              </CardDescription>
            </div>
          </div>
          
          <Badge 
            variant={state.enabled ? "success" : "default"} 
            className="font-bold text-sm"
          >
            {state.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {state.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">Loading KvK status...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {state.enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    KvK API is currently {state.enabled ? 'enabled' : 'disabled'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {state.enabled 
                      ? 'Dutch business data enrichment is active'
                      : 'Business data enrichment will skip KvK API calls'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor="kvk-toggle" className="text-sm font-medium">
                  {state.enabled ? 'Enabled' : 'Disabled'}
                </label>
                <input
                  id="kvk-toggle"
                  type="checkbox"
                  checked={state.enabled}
                  onChange={(e) => handleToggleClick(e.target.checked)}
                  disabled={state.loading}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                />
              </div>
            </div>

            {/* API Key Status */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">Configuration Status</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">API Key Configured:</span>
                  <Badge variant={state.apiKeyConfigured ? "success" : "warning"}>
                    {state.apiKeyConfigured ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <Badge variant={state.enabled ? "success" : "default"}>
                    {state.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Configuration Note */}
            {!state.apiKeyConfigured && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 mb-1">API Key Required</p>
                    <p className="text-sm text-yellow-800">
                      Configure KVK_API_KEY in environment variables before enabling.
                      See the API Configuration Guide for setup instructions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Input Dialog */}
            {showReasonInput && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">
                  {pendingToggle ? 'Enable' : 'Disable'} KvK API
                </h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="reason" className="text-sm font-medium text-gray-700">
                      Reason (optional)
                    </label>
                    <input
                      id="reason"
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter reason for this change..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={executeToggle} 
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={state.loading}
                    >
                      Confirm {pendingToggle ? 'Enable' : 'Disable'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={cancelToggle}
                      disabled={state.loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {state.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">Error</p>
                    <p className="text-sm text-red-800">{state.error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadToggleStatus}
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 