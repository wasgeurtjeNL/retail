'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  id: string;
  email_order_updates: boolean;
  email_promotions: boolean;
  email_product_updates: boolean;
  email_retailer_updates: boolean;
  browser_notifications: boolean;
  whatsapp_notifications: boolean;
  notification_frequency: 'instant' | 'daily' | 'weekly';
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    id: '',
    email_order_updates: true,
    email_promotions: false,
    email_product_updates: true,
    email_retailer_updates: true,
    browser_notifications: false,
    whatsapp_notifications: false,
    notification_frequency: 'instant',
  });

  // Fetch notification preferences from API
  useEffect(() => {
    async function fetchNotificationPreferences() {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get notification preferences from API
        const response = await fetch('/api/notifications', {
          // Add cache: 'no-store' to prevent caching issues
          cache: 'no-store'
        });
        
        // Check for network errors first
        if (!response) {
          throw new Error('Network error - failed to connect to API');
        }
        
        // Try to parse the JSON even if the response is not OK
        // This helps debug by capturing any error messages from the API
        const data = await response.json().catch(e => {
          console.error('Error parsing JSON response:', e);
          throw new Error('Invalid response format from API');
        });
        
        // If the request failed but returned structured error data
        if (!response.ok) {
          if (data && data.error) {
            throw new Error(data.error);
          }
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        // Successfully got notification preferences
        setPreferences({
          id: data.id || '',
          email_order_updates: data.email_order_updates ?? true,
          email_promotions: data.email_promotions ?? false,
          email_product_updates: data.email_product_updates ?? true,
          email_retailer_updates: data.email_retailer_updates ?? true,
          browser_notifications: data.browser_notifications ?? false,
          whatsapp_notifications: data.whatsapp_notifications ?? false,
          notification_frequency: data.notification_frequency || 'instant',
        });
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        
        // Use default preferences in development mode instead of failing
        if (process.env.NODE_ENV === 'development') {
          console.log('Using default notification preferences in development mode');
          // Keep the existing default values that were set in useState
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchNotificationPreferences();
  }, [user]);

  // Handle form submission via API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Send notification preferences to API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error saving notification preferences');
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      setSaveError(error.message || 'Er is een fout opgetreden bij het opslaan van uw notificatie-instellingen.');
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle changes
  const handleToggleChange = (field: keyof NotificationPreferences) => {
    setPreferences({
      ...preferences,
      [field]: !preferences[field],
    });
  };
  
  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPreferences({
      ...preferences,
      notification_frequency: e.target.value as 'instant' | 'daily' | 'weekly',
    });
  };

  if (loading) {
    return <div className="py-4 text-gray-500">Notificatie-instellingen laden...</div>;
  }

  return (
    <div>
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Notificatie Instellingen</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bepaal hoe en wanneer u notificaties wilt ontvangen.
          </p>
          <div className="mt-6 bg-blue-50 p-4 rounded-md border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800">Tips voor notificaties:</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Blijf op de hoogte van belangrijke bestellingen</li>
              <li>Ontvang updates over nieuwe producten</li>
              <li>Stel de frequentie in om meldingsmoeheid te voorkomen</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="bg-white shadow sm:rounded-md">
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Email Notificaties</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email_order_updates"
                        name="email_order_updates"
                        type="checkbox"
                        checked={preferences.email_order_updates}
                        onChange={() => handleToggleChange('email_order_updates')}
                        className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email_order_updates" className="font-medium text-gray-700">
                        Bestelstatusupdates
                      </label>
                      <p className="text-gray-500">Ontvang emails over wijzigingen in de status van uw bestellingen.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email_promotions"
                        name="email_promotions"
                        type="checkbox"
                        checked={preferences.email_promotions}
                        onChange={() => handleToggleChange('email_promotions')}
                        className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email_promotions" className="font-medium text-gray-700">
                        Promoties en aanbiedingen
                      </label>
                      <p className="text-gray-500">Ontvang emails over speciale aanbiedingen en kortingen.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email_product_updates"
                        name="email_product_updates"
                        type="checkbox"
                        checked={preferences.email_product_updates}
                        onChange={() => handleToggleChange('email_product_updates')}
                        className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email_product_updates" className="font-medium text-gray-700">
                        Productupdates
                      </label>
                      <p className="text-gray-500">Ontvang emails over nieuwe producten en productwijzigingen.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email_retailer_updates"
                        name="email_retailer_updates"
                        type="checkbox"
                        checked={preferences.email_retailer_updates}
                        onChange={() => handleToggleChange('email_retailer_updates')}
                        className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email_retailer_updates" className="font-medium text-gray-700">
                        Retailer-updates
                      </label>
                      <p className="text-gray-500">Ontvang emails over belangrijk retailer-nieuws en updates.</p>
                    </div>
                  </div>
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mt-8 mb-4">Andere Notificaties</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="browser_notifications"
                        name="browser_notifications"
                        type="checkbox"
                        checked={preferences.browser_notifications}
                        onChange={() => handleToggleChange('browser_notifications')}
                        className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="browser_notifications" className="font-medium text-gray-700">
                        Browser notificaties
                      </label>
                      <p className="text-gray-500">Ontvang notificaties in uw browser wanneer u bent ingelogd.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="whatsapp_notifications"
                        name="whatsapp_notifications"
                        type="checkbox"
                        checked={preferences.whatsapp_notifications}
                        onChange={() => handleToggleChange('whatsapp_notifications')}
                        className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="whatsapp_notifications" className="font-medium text-gray-700">
                        WhatsApp notificaties
                      </label>
                      <p className="text-gray-500">Ontvang updates via WhatsApp (alleen belangrijke berichten).</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label htmlFor="notification_frequency" className="block text-sm font-medium text-gray-700">
                      Notificatie frequentie
                    </label>
                    <select
                      id="notification_frequency"
                      name="notification_frequency"
                      value={preferences.notification_frequency}
                      onChange={handleSelectChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md text-gray-900"
                    >
                      <option value="instant">Direct (per gebeurtenis)</option>
                      <option value="daily">Dagelijks overzicht</option>
                      <option value="weekly">Wekelijks overzicht</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Bepaal hoe vaak u niet-kritieke notificaties wilt ontvangen.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300"
                  >
                    {saving ? 'Opslaan...' : 'Voorkeuren opslaan'}
                  </button>
                </div>
                
                {saveSuccess && (
                  <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-md">
                    Uw notificatie-instellingen zijn succesvol bijgewerkt.
                  </div>
                )}
                
                {saveError && (
                  <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md">
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 