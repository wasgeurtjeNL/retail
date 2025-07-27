import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, Play, Pause, Mail, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EmailCampaignToggleState {
  enabled: boolean;
  loading: boolean;
  campaignsConfigured: boolean;
  error?: string;
  statistics?: {
    active_campaigns: number;
    queued_emails: number;
    prospects_ready: number;
    last_sent: string | null;
  };
}

interface EmailCampaignToggleControlProps {
  className?: string;
  onToggleChange?: (enabled: boolean) => void;
}

/**
 * Email Campaign Toggle Control Component
 * Geeft admins de mogelijkheid om email campaigns te pauzeren/activeren
 */
export default function EmailCampaignToggleControl({ className, onToggleChange }: EmailCampaignToggleControlProps) {
  const [state, setState] = useState<EmailCampaignToggleState>({
    enabled: false,
    loading: true,
    campaignsConfigured: false
  });

  const [reason, setReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

  // Laad huidige email campaign status
  useEffect(() => {
    loadToggleStatus();
    // Refresh statistics every 30 seconds when enabled
    const interval = setInterval(() => {
      if (state.enabled && !state.loading) {
        loadToggleStatus();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [state.enabled]);

  const loadToggleStatus = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/commercial/campaigns/toggle-status');
      
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
        campaignsConfigured: data.campaigns_configured,
        statistics: data.statistics,
        error: undefined
      });

    } catch (error) {
      console.error('[EmailCampaignToggle] Error loading status:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load email campaign status'
      }));
    }
  };

  const handleToggleClick = (newEnabled: boolean) => {
    if (newEnabled && !state.campaignsConfigured) {
      toast.error('Email campaigns must be configured before enabling');
      return;
    }

    setPendingToggle(newEnabled);
    setShowReasonInput(true);
  };

  const executeToggle = async () => {
    if (pendingToggle === null) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/commercial/campaigns/toggle', {
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
        statistics: data.statistics,
        error: undefined
      }));

      const action = data.enabled ? 'geactiveerd' : 'gepauzeerd';
      toast.success(data.message || `Email campaigns ${action}`);
      
      // Notify parent component
      onToggleChange?.(data.enabled);

      // Reset form
      setShowReasonInput(false);
      setPendingToggle(null);
      setReason('');

    } catch (error) {
      console.error('[EmailCampaignToggle] Error updating toggle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email campaign toggle';
      
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

  if (state.error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="font-medium text-red-800">Email Campaign Toggle Error</span>
        </div>
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
        <button
          onClick={loadToggleStatus}
          className="mt-3 px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Email Campaign Control</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Beheer email uitstuur automation - pauzeer of activeer wanneer je wilt
        </p>
      </div>

      <div className="p-6">
        {state.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading email campaign status...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {state.enabled ? (
                  <Play className="h-5 w-5 text-green-600" />
                ) : (
                  <Pause className="h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    Email campaigns zijn {state.enabled ? 'ACTIEF' : 'GEPAUZEERD'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {state.enabled 
                      ? 'Emails worden automatisch verstuurd naar prospects'
                      : 'Nieuwe emails worden niet verstuurd - prospects blijven veilig opgeslagen'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor="email-toggle" className="text-sm font-medium">
                  {state.enabled ? 'Actief' : 'Gepauzeerd'}
                </label>
                <input
                  id="email-toggle"
                  type="checkbox"
                  checked={state.enabled}
                  onChange={(e) => handleToggleClick(e.target.checked)}
                  disabled={state.loading}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
            </div>

            {/* Statistics */}
            {state.statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{state.statistics.active_campaigns}</div>
                  <div className="text-xs text-blue-700">Active Campaigns</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{state.statistics.queued_emails}</div>
                  <div className="text-xs text-orange-700">Emails in Queue</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{state.statistics.prospects_ready}</div>
                  <div className="text-xs text-green-700">Prospects Ready</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-600">Last Sent</div>
                  <div className="text-xs text-gray-700">
                    {state.statistics.last_sent 
                      ? new Date(state.statistics.last_sent).toLocaleString('nl-NL')
                      : 'Never'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* API Configuration Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Configuration Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  {state.campaignsConfigured ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={state.campaignsConfigured ? 'text-green-700' : 'text-red-700'}>
                    Email Campaigns: {state.campaignsConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason Input Modal */}
            {showReasonInput && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2">
                  {pendingToggle ? 'Activeer' : 'Pauzeer'} Email Campaigns
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Optioneel: voeg een reden toe voor deze wijziging (voor audit trail)
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={pendingToggle 
                    ? "Bijv: Starting new campaign cycle" 
                    : "Bijv: Pausing for campaign review"
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={executeToggle}
                    disabled={state.loading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {state.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                    ) : null}
                    {pendingToggle ? 'Activeer' : 'Pauzeer'}
                  </button>
                  <button
                    onClick={cancelToggle}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            {/* Usage Tips */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Usage Tips</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• <strong>Pauzeer</strong> tijdens prospect review of campaign optimization</li>
                <li>• <strong>Activeer</strong> wanneer je klaar bent om te mailen</li>
                <li>• Prospects blijven veilig opgeslagen ongeacht toggle status</li>
                <li>• Email queue blijft bestaan tijdens pauze periode</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 