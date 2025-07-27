'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from 'react-hot-toast';

// Interface voor discovery setting configuratie
interface DiscoverySetting {
  id: string;
  name: string;
  description?: string;
  perplexity_model: string;
  perplexity_temperature: number;
  perplexity_max_tokens: number;
  max_results_per_search: number;
  search_radius: number;
  min_confidence_score: number;
  require_email: boolean;
  require_website: boolean;
  require_phone: boolean;
  min_rating: number;
  enable_web_scraping: boolean;
  enable_google_places: boolean;
  enable_kvk_api: boolean;
  enable_perplexity: boolean;
  default_business_segments: string[];
  default_regions: string[];
  auto_discovery_enabled: boolean;
  discovery_frequency: string;
  max_daily_discoveries: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Beschikbare opties voor configuratie
const PERPLEXITY_MODELS = [
  { value: 'sonar', label: 'Sonar - Basic (Fast & Affordable)' },
  { value: 'sonar-pro', label: 'Sonar Pro - Advanced (More Capabilities)' },
  { value: 'sonar-reasoning', label: 'Sonar Reasoning - Chain of Thought' },
  { value: 'sonar-deep-research', label: 'Sonar Deep Research - Comprehensive Analysis' }
];

const DISCOVERY_FREQUENCIES = [
  { value: 'hourly', label: 'Elk uur' },
  { value: 'daily', label: 'Dagelijks' },
  { value: 'weekly', label: 'Wekelijks' },
  { value: 'manual', label: 'Handmatig' }
];

const BUSINESS_SEGMENTS = [
  'beauty_salon', 'hair_salon', 'restaurant', 'retail_fashion', 
  'pharmacy', 'wellness_spa', 'fitness_gym', 'coffee_shop',
  'bookstore', 'electronics', 'jewelry', 'home_decor'
];

const REGIONS = [
  'Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen',
  'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Enschede'
];

export default function DiscoverySettingsManager() {
  const [settings, setSettings] = useState<DiscoverySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<Partial<DiscoverySetting>>({});

  // Laadt alle discovery settings bij component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Haalt alle discovery settings op van de API
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/commercial/discovery/settings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings');
      }

      setSettings(data.settings || []);
    } catch (error: any) {
      console.error('Error loading discovery settings:', error);
      toast.error(`Failed to load settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Activeert een specifieke configuratie (deactiveert alle anderen)
  const activateConfiguration = async (id: string) => {
    try {
      // Eerst alle configuraties deactiveren
      const deactivatePromises = settings
        .filter(s => s.is_active && s.id !== id)
        .map(s => updateSetting(s.id, { is_active: false }));
      
      await Promise.all(deactivatePromises);

      // Dan de geselecteerde activeren
      await updateSetting(id, { is_active: true });
      
      toast.success('Configuratie geactiveerd!');
      
      // Invalidate configuration cache
      try {
        await fetch('/api/commercial/discovery/settings/invalidate-cache', {
          method: 'POST'
        });
      } catch (cacheError) {
        console.warn('Failed to invalidate cache:', cacheError);
      }
      
      loadSettings();
    } catch (error: any) {
      console.error('Error activating configuration:', error);
      toast.error('Failed to activate configuration');
    }
  };

  // Update een bestaande setting
  const updateSetting = async (id: string, updates: Partial<DiscoverySetting>) => {
    const response = await fetch('/api/commercial/discovery/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update setting');
    }

    return response.json();
  };

  // Slaat wijzigingen op (create of update)
  const saveSetting = async () => {
    try {
      const isNew = !editingId;
      const url = '/api/commercial/discovery/settings';
      const method = isNew ? 'POST' : 'PATCH';
      const body = isNew ? formData : { id: editingId, ...formData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save setting');
      }

      toast.success(isNew ? 'Configuratie aangemaakt!' : 'Configuratie bijgewerkt!');
      
      // Invalidate configuration cache
      try {
        await fetch('/api/commercial/discovery/settings/invalidate-cache', {
          method: 'POST'
        });
      } catch (cacheError) {
        console.warn('Failed to invalidate cache:', cacheError);
      }
      
      setEditingId(null);
      setShowCreateForm(false);
      setFormData({});
      loadSettings();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  // Verwijdert een configuratie
  const deleteSetting = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze configuratie wilt verwijderen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/commercial/discovery/settings?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete setting');
      }

      toast.success('Configuratie verwijderd!');
      loadSettings();
    } catch (error: any) {
      console.error('Error deleting setting:', error);
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Start editing van een bestaande configuratie
  const startEditing = (setting: DiscoverySetting) => {
    setEditingId(setting.id);
    setFormData({ ...setting });
    setShowCreateForm(false);
  };

  // Start create nieuwe configuratie
  const startCreating = () => {
    setShowCreateForm(true);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      perplexity_model: 'sonar',
      perplexity_temperature: 0.3,
      perplexity_max_tokens: 2000,
      max_results_per_search: 10,
      search_radius: 5000,
      min_confidence_score: 0.6,
      require_email: false,
      require_website: false,
      require_phone: false,
      min_rating: 3.0,
      enable_web_scraping: true,
      enable_google_places: false,
      enable_kvk_api: false,
      enable_perplexity: true,
      default_business_segments: [],
      default_regions: [],
      auto_discovery_enabled: false,
      discovery_frequency: 'daily',
      max_daily_discoveries: 50,
      is_active: false
    });
  };

  // Cancelt editing/creating
  const cancelEditing = () => {
    setEditingId(null);
    setShowCreateForm(false);
    setFormData({});
  };

  // Update form data helper
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Discovery settings laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Discovery Settings</h2>
        <Button 
          onClick={startCreating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Nieuwe Configuratie
        </Button>
      </div>

      {/* Settings overzicht */}
      <div className="space-y-4 mb-8">
        {settings.map((setting) => (
          <div 
            key={setting.id} 
            className={`border rounded-lg p-4 ${setting.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{setting.name}</h3>
                  {setting.is_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      ACTIEF
                    </span>
                  )}
                </div>
                {setting.description && (
                  <p className="text-gray-600 mb-3">{setting.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Model:</span>
                    <span className="ml-2 text-gray-900">{setting.perplexity_model}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Max Results:</span>
                    <span className="ml-2 text-gray-900">{setting.max_results_per_search}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Temperature:</span>
                    <span className="ml-2 text-gray-900">{setting.perplexity_temperature}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Daily Max:</span>
                    <span className="ml-2 text-gray-900">{setting.max_daily_discoveries}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                {!setting.is_active && (
                  <Button
                    onClick={() => activateConfiguration(setting.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Activeren
                  </Button>
                )}
                <Button
                  onClick={() => startEditing(setting)}
                  size="sm"
                  variant="outline"
                >
                  Bewerken
                </Button>
                {!setting.is_active && (
                  <Button
                    onClick={() => deleteSetting(setting.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Verwijderen
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit formulier */}
      {(showCreateForm || editingId) && (
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {showCreateForm ? 'Nieuwe Configuratie' : 'Configuratie Bewerken'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basis informatie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naam *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="bijv. high_volume_discovery"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="Korte beschrijving van deze configuratie"
              />
            </div>

            {/* Perplexity configuratie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perplexity Model
              </label>
              <select
                value={formData.perplexity_model || 'sonar'}
                onChange={(e) => updateFormData('perplexity_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                {PERPLEXITY_MODELS.map(model => (
                  <option key={model.value} value={model.value} className="text-gray-900">
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (0.0 - 1.0)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={formData.perplexity_temperature || 0.3}
                onChange={(e) => updateFormData('perplexity_temperature', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                min="500"
                max="4000"
                value={formData.perplexity_max_tokens || 2000}
                onChange={(e) => updateFormData('perplexity_max_tokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Results per Search
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.max_results_per_search || 10}
                onChange={(e) => updateFormData('max_results_per_search', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Confidence Score (0.0 - 1.0)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={formData.min_confidence_score || 0.6}
                onChange={(e) => updateFormData('min_confidence_score', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discovery Frequency
              </label>
              <select
                value={formData.discovery_frequency || 'daily'}
                onChange={(e) => updateFormData('discovery_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                {DISCOVERY_FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value} className="text-gray-900">
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Daily Discoveries
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.max_daily_discoveries || 50}
                onChange={(e) => updateFormData('max_daily_discoveries', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
          </div>

          {/* Checkboxes voor features */}
          <div className="mt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Feature Instellingen</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'enable_perplexity', label: 'Perplexity API' },
                { key: 'enable_web_scraping', label: 'Web Scraping' },
                { key: 'enable_google_places', label: 'Google Places API' },
                { key: 'enable_kvk_api', label: 'KVK API' },
                { key: 'auto_discovery_enabled', label: 'Auto Discovery' },
                { key: 'require_email', label: 'Email Vereist' },
                { key: 'require_website', label: 'Website Vereist' },
                { key: 'require_phone', label: 'Telefoon Vereist' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData[key as keyof DiscoverySetting] as boolean || false}
                    onChange={(e) => updateFormData(key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Form actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button onClick={saveSetting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {showCreateForm ? 'Aanmaken' : 'Bijwerken'}
            </Button>
            <Button onClick={cancelEditing} variant="outline">
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 