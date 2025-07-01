import React, { useState, useEffect, useCallback } from 'react';
import { getAllSettings, saveSetting } from '@/lib/settings-service';

// Eigen implementatie van debounce (vervangt lodash dependency)
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper function voor veilig loggen van fouten
const logError = (prefix: string, error: any) => {
  try {
    if (error instanceof Error) {
      console.error(`${prefix}: ${error.name}: ${error.message}`);
      return;
    }
    
    if (typeof error === 'object' && error !== null) {
      if (Object.keys(error).length === 0) {
        console.error(`${prefix}: [Leeg object - mogelijk een netwerkfout]`);
        return;
      }
      
      try {
        const stringified = JSON.stringify(error);
        console.error(`${prefix}: ${stringified === '{}' ? '[Leeg foutobject]' : stringified}`);
      } catch (e) {
        console.error(`${prefix}: [Niet-serialiseerbaar object]`);
      }
      return;
    }
    
    console.error(`${prefix}: ${String(error)}`);
  } catch (loggingError) {
    console.error(`${prefix}: [Fout bij loggen]`);
  }
};

// Kleurenpalet preset opties
const colorPresets = [
  { name: 'Roze (Standaard)', primary: '#e91e63', secondary: '#f48fb1', accent: '#880e4f' },
  { name: 'Blauw', primary: '#2196f3', secondary: '#90caf9', accent: '#0d47a1' },
  { name: 'Groen', primary: '#4caf50', secondary: '#a5d6a7', accent: '#1b5e20' },
  { name: 'Paars', primary: '#9c27b0', secondary: '#ce93d8', accent: '#4a148c' },
  { name: 'Oranje', primary: '#ff9800', secondary: '#ffcc80', accent: '#e65100' },
];

export default function BrandingStudio() {
  // Basiselementen
  const [logo, setLogo] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [isCustomPalette, setIsCustomPalette] = useState(false);
  
  // Kleurenpaletten
  const [primaryColor, setPrimaryColor] = useState('#e91e63');
  const [secondaryColor, setSecondaryColor] = useState('#f48fb1');
  const [accentColor, setAccentColor] = useState('#880e4f');
  
  // Typography opties
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontWeight, setFontWeight] = useState('500');
  
  // UI state
  const [activeTab, setActiveTab] = useState('colors');
  const [activeMockup, setActiveMockup] = useState('website');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedState, setSavedState] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Laad bestaande instellingen
  useEffect(() => {
    loadSettings();
  }, []);

  // Bijhouden van onopgeslagen wijzigingen
  useEffect(() => {
    if (!loading) {
      setSavedState(false);
    }
  }, [logo, businessName, primaryColor, secondaryColor, accentColor, fontFamily, fontWeight]);

  // Laad huidige instellingen
    const loadSettings = async () => {
      setLoading(true);
    setMessage(null);
    
      try {
        const settings = await getAllSettings();
      
      // Verwerk de ingeladen instellingen
      if (settings.logo_url) setLogo(settings.logo_url);
      if (settings.business_name) setBusinessName(settings.business_name);
      
      // Kleurenpalet laden
      if (settings.primary_color) setPrimaryColor(settings.primary_color);
      if (settings.secondary_color) setSecondaryColor(settings.secondary_color);
      if (settings.accent_color) setAccentColor(settings.accent_color);
      
      // Typografie laden
      if (settings.font_family) setFontFamily(settings.font_family);
      if (settings.font_weight) setFontWeight(settings.font_weight);
      
      // Controleren of we een aangepast palet gebruiken
      const usingPresetPalette = colorPresets.some(preset => 
        preset.primary === settings.primary_color && 
        preset.secondary === settings.secondary_color && 
        preset.accent === settings.accent_color
      );
      
      setIsCustomPalette(!usingPresetPalette);
      
      // Check voor fallback data
      const isFallback = settings._meta?.isFallback === true;
      if (isFallback && settings._meta.showError !== false) {
        setMessage({
          type: 'info',
          text: 'Standaard huisstijl ingeladen. Wijzigingen worden lokaal opgeslagen.'
        });
      }
      
      // Wijzigingen zijn initieel opgeslagen
      setSavedState(true);
      
    } catch (error) {
      logError('Fout bij laden van huisstijl', error);
      setMessage({
        type: 'error',
        text: 'De huisstijl kon niet worden geladen. Standaardinstellingen worden gebruikt.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-save debounced functie
  const debouncedSave = useCallback(
    debounce(async (key: string, value: any) => {
      try {
        await saveSetting(key, value);
        // We hoeven hier geen succesmelding te tonen, auto-save gebeurt op de achtergrond
      } catch (error) {
        logError(`Auto-save fout voor ${key}`, error);
        setMessage({
          type: 'error',
          text: `Wijziging kon niet automatisch worden opgeslagen (${key})`
        });
      }
    }, 1500),
    []
  );

  // Upload logo functie
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In een echte applicatie zou je hier een file upload service gebruiken
    // Voor nu simuleren we een upload met een lokale URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const logoUrl = event.target?.result as string;
      setLogo(logoUrl);
      debouncedSave('logo_url', logoUrl);
    };
    reader.readAsDataURL(file);
  };

  // Sla een kleurenpalet preset toe
  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
    setIsCustomPalette(false);
    
    // Auto-save de kleuren
    debouncedSave('primary_color', preset.primary);
    debouncedSave('secondary_color', preset.secondary);
    debouncedSave('accent_color', preset.accent);
  };

  // Alle wijzigingen opslaan
  const saveAllSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const settingsToSave = [
        { key: 'business_name', value: businessName },
        { key: 'logo_url', value: logo },
        { key: 'primary_color', value: primaryColor },
        { key: 'secondary_color', value: secondaryColor },
        { key: 'accent_color', value: accentColor },
        { key: 'font_family', value: fontFamily },
        { key: 'font_weight', value: fontWeight },
      ];
      
      let errors = 0;
      
      // Save all settings in parallel
      await Promise.all(
        settingsToSave.map(async ({ key, value }) => {
          if (value !== null && value !== undefined) {
            try {
              const success = await saveSetting(key, value);
              if (!success) errors++;
            } catch (error) {
              logError(`Fout bij opslaan van ${key}`, error);
              errors++;
            }
          }
        })
      );
      
      if (errors > 0) {
        setMessage({
          type: 'error',
          text: `Niet alle instellingen konden worden opgeslagen (${errors} fouten)`
        });
      } else {
      setMessage({
        type: 'success',
          text: 'Huisstijl is succesvol opgeslagen'
      });
        setSavedState(true);
      }
    } catch (error) {
      logError('Onverwachte fout bij opslaan', error);
      setMessage({
        type: 'error',
        text: 'Er is een fout opgetreden bij het opslaan van de huisstijl'
      });
    } finally {
      setSaving(false);
    }
  };

  // Rendering helpers
  const renderColorDot = (color: string, isActive = false) => (
    <div 
      className={`
        h-6 w-6 rounded-full cursor-pointer transition-all
        ${isActive ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : 'hover:scale-105'}
      `}
      style={{ backgroundColor: color }}
    />
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-pink-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
          <p className="text-gray-500">Huisstijl configuratie laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Notification */}
      {message && (
        <div className={`p-4 border-l-4 ${
          message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
          message.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
          'bg-blue-50 border-blue-500 text-blue-700'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              {message.type === 'success' ? (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : message.type === 'error' ? (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-[600px]">
        {/* Left sidebar - Controls */}
        <div className="w-full lg:w-2/5 bg-gray-50 p-6 border-r border-gray-200">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Huisstijl Studio</h2>
            <p className="text-sm text-gray-500">Creëer een consistente visuele identiteit voor uw merk</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button 
              onClick={() => setActiveTab('basics')}
              className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'basics' ? 
                'text-pink-600 border-b-2 border-pink-600' : 
                'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Basis
            </button>
            <button 
              onClick={() => setActiveTab('colors')}
              className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'colors' ? 
                'text-pink-600 border-b-2 border-pink-600' : 
                'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Kleuren
            </button>
            <button 
              onClick={() => setActiveTab('typography')}
              className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'typography' ? 
                'text-pink-600 border-b-2 border-pink-600' : 
                'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Typografie
            </button>
      </div>

          {/* Basic tab */}
          {activeTab === 'basics' && (
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrijfsnaam
                </label>
            <input
              type="text"
              value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    debouncedSave('business_name', e.target.value);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                  placeholder="Uw bedrijfsnaam"
            />
          </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrijfslogo
                </label>
                {logo ? (
                  <div className="relative mb-2 bg-white p-4 border border-gray-200 rounded-md w-40 h-40 flex items-center justify-center">
                    <img 
                      src={logo} 
                      alt="Bedrijfslogo"
                      className="max-w-full max-h-full"
                    />
                    <button
                      onClick={() => {
                        setLogo(null);
                        debouncedSave('logo_url', null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="logo-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none"
                        >
                          <span>Upload een logo</span>
                          <input 
                            id="logo-upload" 
                            name="logo-upload" 
                            type="file" 
                            className="sr-only" 
                            onChange={handleLogoUpload}
                            accept="image/*"
                          />
                        </label>
                        <p className="pl-1">of sleep een bestand</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF tot 2MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Colors tab */}
          {activeTab === 'colors' && (
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Kleurpresets
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => applyColorPreset(preset)}
                      className={`
                        flex items-center p-3 border rounded-md text-left
                        ${!isCustomPalette && preset.primary === primaryColor ? 
                          'border-pink-500 bg-pink-50 ring-1 ring-pink-500' : 
                          'border-gray-200 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex space-x-1 mr-2">
                        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.primary }} />
                        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: preset.accent }} />
                      </div>
                      <span className="text-sm font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="relative inline-flex items-center mb-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={isCustomPalette}
                  onChange={() => setIsCustomPalette(!isCustomPalette)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">Aangepast kleurenpalet</span>
              </label>

              <div className={`space-y-4 ${isCustomPalette ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primaire Kleur
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setIsCustomPalette(true);
                        debouncedSave('primary_color', e.target.value);
                      }}
                      className="h-10 w-16 border-0 p-0 rounded"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setIsCustomPalette(true);
                        debouncedSave('primary_color', e.target.value);
                      }}
                      className="ml-2 block w-32 border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                    />
                    <div className="ml-auto text-sm text-gray-500">Hoofdkleur website</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secundaire Kleur
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setIsCustomPalette(true);
                        debouncedSave('secondary_color', e.target.value);
                      }}
                      className="h-10 w-16 border-0 p-0 rounded"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setIsCustomPalette(true);
                        debouncedSave('secondary_color', e.target.value);
                      }}
                      className="ml-2 block w-32 border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                    />
                    <div className="ml-auto text-sm text-gray-500">Achtergrond, sections</div>
        </div>
      </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Kleur
                  </label>
                  <div className="flex items-center">
            <input
              type="color"
              value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        setIsCustomPalette(true);
                        debouncedSave('accent_color', e.target.value);
                      }}
                      className="h-10 w-16 border-0 p-0 rounded"
            />
            <input
              type="text"
              value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        setIsCustomPalette(true);
                        debouncedSave('accent_color', e.target.value);
                      }}
                      className="ml-2 block w-32 border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                    />
                    <div className="ml-auto text-sm text-gray-500">Highlights, nadruk</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typography tab */}
          {activeTab === 'typography' && (
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lettertype
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    debouncedSave('font_family', e.target.value);
                  }}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="Inter">Inter (Modern Sans-Serif)</option>
                  <option value="Roboto">Roboto (Clean Sans-Serif)</option>
                  <option value="Merriweather">Merriweather (Elegant Serif)</option>
                  <option value="Montserrat">Montserrat (Modern Display)</option>
                  <option value="Playfair Display">Playfair Display (Classic Serif)</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fontgewicht (hoofdtekst)
                </label>
                <div className="flex space-x-2">
                  {['300', '400', '500', '600', '700'].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => {
                        setFontWeight(weight);
                        debouncedSave('font_weight', weight);
                      }}
                      className={`px-3 py-2 border ${
                        fontWeight === weight
                          ? 'bg-pink-50 border-pink-500 text-pink-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      } rounded text-sm font-medium flex-1`}
                      style={{ fontWeight: weight as any }}
                    >
                      {weight === '300' ? 'Light' :
                       weight === '400' ? 'Regular' :
                       weight === '500' ? 'Medium' :
                       weight === '600' ? 'SemiBold' : 'Bold'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div 
                  className="bg-white border border-gray-200 rounded-md p-4"
                  style={{ fontFamily }}
                >
                  <h3 style={{ fontWeight: '700' }} className="text-xl mb-2">Heading voorbeeld</h3>
                  <p style={{ fontWeight: fontWeight }} className="text-sm text-gray-700">
                    Dit is een voorbeeld van normale tekst in het gekozen lettertype en gewicht. 
                    Een goed gekozen typografie maakt uw merk professioneel en herkenbaar.
                  </p>
          </div>
        </div>
      </div>
          )}

          <div className="mt-10 pt-4 border-t border-gray-200">
        <button
              onClick={saveAllSettings}
              disabled={saving || savedState}
              className={`w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                savedState ? 'bg-green-600' : 'bg-pink-600 hover:bg-pink-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50`}
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Opslaan...
            </>
              ) : savedState ? (
                <>
                  <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Opgeslagen
                </>
              ) : (
                'Alle wijzigingen opslaan'
              )}
            </button>
          </div>
        </div>

        {/* Right side - Preview */}
        <div className="w-full lg:w-3/5 bg-white p-6">
          <div className="mb-4 border-b border-gray-200 pb-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">Live Preview</h3>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveMockup('website')}
                  className={`px-3 py-1.5 text-xs font-medium rounded ${
                    activeMockup === 'website'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Website
                </button>
                <button
                  onClick={() => setActiveMockup('email')}
                  className={`px-3 py-1.5 text-xs font-medium rounded ${
                    activeMockup === 'email'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setActiveMockup('profile')}
                  className={`px-3 py-1.5 text-xs font-medium rounded ${
                    activeMockup === 'profile'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Profiel
                </button>
              </div>
            </div>
          </div>

          {/* Website preview */}
          {activeMockup === 'website' && (
            <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm" style={{ fontFamily }}>
              {/* Mockup navigation */}
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center" style={{ backgroundColor: secondaryColor }}>
                <div className="flex items-center">
                  {logo ? (
                    <img src={logo} alt="Logo" className="h-8" />
                  ) : (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                  )}
                  <span className="ml-3 font-medium text-gray-800" style={{ color: accentColor }}>
                    {businessName || 'Uw Bedrijfsnaam'}
                  </span>
                </div>
                <div className="hidden md:flex space-x-4">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
              
              {/* Hero section */}
              <div className="px-4 py-16 bg-gradient-to-br from-gray-50 to-gray-100 text-center" style={{ backgroundColor: secondaryColor }}>
                <h1 className="text-3xl font-bold mb-4" style={{ color: primaryColor }}>
                  Welkom bij {businessName || 'Uw Bedrijf'}
                </h1>
                <p className="text-gray-600 max-w-lg mx-auto mb-8" style={{ fontWeight: fontWeight as any }}>
                  Dit is een voorbeeld van hoe uw huisstijl eruit zal zien op uw website. 
                  De kleuren, lettertypen en vormgeving zijn allemaal aangepast aan uw merkidentiteit.
                </p>
                <button 
                  className="px-6 py-2.5 rounded-md font-medium text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Meer informatie
                </button>
              </div>
              
              {/* Features section */}
              <div className="py-12 px-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg border border-gray-100 text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: primaryColor }}></div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: primaryColor }}>Functie {i}</h3>
                    <p className="text-sm text-gray-500" style={{ fontWeight: fontWeight as any }}>
                      Een korte beschrijving van deze functie met uw merkstijl.
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-6 text-center text-sm text-white" style={{ backgroundColor: primaryColor }}>
                <p>© 2023 {businessName || 'Uw Bedrijfsnaam'} - Alle rechten voorbehouden</p>
              </div>
            </div>
          )}

          {/* Email preview */}
          {activeMockup === 'email' && (
            <div className="border border-gray-200 rounded-md overflow-hidden" style={{ fontFamily }}>
              <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                <div className="flex justify-between">
                  <span>Van: {businessName || 'Uw Bedrijf'} &lt;info@bedrijf.nl&gt;</span>
                  <span>Vandaag, 12:34</span>
                </div>
                <div className="mt-1">
                  Aan: klant@email.nl
                </div>
                <div className="mt-1 font-medium">
                  Onderwerp: Welkom bij {businessName || 'Uw Bedrijf'}
                </div>
              </div>
              
              <div className="p-6 bg-white">
                <div className="mb-6 text-center">
                  {logo ? (
                    <img src={logo} alt="Logo" className="h-12 mx-auto" />
                  ) : (
                    <div className="h-12 w-40 bg-gray-200 rounded mx-auto"></div>
                  )}
                </div>
                
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold mb-4" style={{ color: primaryColor }}>
                    Welkom bij {businessName || 'Uw Bedrijf'}!
                  </h2>
                  <p className="text-gray-700 mb-4" style={{ fontWeight: fontWeight as any }}>
                    Beste klant,
                  </p>
                  <p className="text-gray-700 mb-4" style={{ fontWeight: fontWeight as any }}>
                    Hartelijk dank voor uw registratie bij {businessName || 'Uw Bedrijf'}. We zijn blij u te verwelkomen en kijken ernaar uit om u van dienst te zijn.
                  </p>
                  <div className="mt-6">
                    <a 
                      href="#" 
                      className="px-6 py-2.5 rounded-md font-medium text-white inline-block"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Bezoek uw account
                    </a>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 text-center">
                  <p className="mb-2" style={{ fontWeight: fontWeight as any }}>
                    © 2023 {businessName || 'Uw Bedrijfsnaam'}. Alle rechten voorbehouden.
                  </p>
                  <p style={{ fontWeight: fontWeight as any }}>
                    Voorbeeld adres 123, 1234 AB Amsterdam, Nederland
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile mockup */}
          {activeMockup === 'profile' && (
            <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm" style={{ fontFamily }}>
              <div 
                className="h-40 w-full relative" 
                style={{ backgroundColor: primaryColor }}
              >
                <div className="absolute bottom-0 left-0 w-full transform translate-y-1/2 text-center">
                  <div className="inline-block rounded-full border-4 border-white overflow-hidden" style={{ backgroundColor: 'white' }}>
                    {logo ? (
                      <img src={logo} alt="Logo" className="h-24 w-24 object-contain" />
                    ) : (
                      <div className="h-24 w-24 bg-gray-200"></div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-16 pb-8 px-6 text-center">
                <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {businessName || 'Uw Bedrijfsnaam'}
                </h2>
                <p className="text-gray-500 mt-1" style={{ fontWeight: fontWeight as any }}>
                  Premium leverancier
                </p>
                
                <div className="mt-6 flex justify-center space-x-4">
                  <div className="px-4 py-2 rounded-full text-white text-sm" style={{ backgroundColor: accentColor }}>
                    Bekijken
                  </div>
                  <div className="px-4 py-2 rounded-full text-white text-sm" style={{ backgroundColor: primaryColor }}>
                    Contacteren
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-8">
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: primaryColor }}>
                    Over ons
                  </h3>
                  <p className="text-gray-600" style={{ fontWeight: fontWeight as any }}>
                    {businessName || 'Uw Bedrijf'} staat voor kwaliteit en service. Wij leveren al jaren de beste producten met persoonlijke aandacht voor elke klant.
                  </p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: secondaryColor }}></div>
                        <span className="ml-2 font-medium" style={{ color: primaryColor }}>100+ producten</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded" style={{ backgroundColor: secondaryColor }}></div>
                        <span className="ml-2 font-medium" style={{ color: primaryColor }}>4,9/5 rating</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 