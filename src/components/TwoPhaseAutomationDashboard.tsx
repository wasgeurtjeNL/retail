import React, { useState, useEffect } from 'react';
import { Users, Mail, Play, Pause, Database, Settings, BarChart3, ArrowRight, CheckCircle, Clock, AlertCircle, Filter, MapPin, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EmailCampaignToggleControl from './EmailCampaignToggleControl';

interface DashboardStats {
  phase1: {
    total_prospects: number;
    qualified_prospects: number;
    last_discovery: string | null;
    discovery_rate: number;
  };
  phase2: {
    email_campaigns_enabled: boolean;
    queued_emails: number;
    emails_sent_today: number;
    active_campaigns: number;
  };
}

interface DiscoveryJob {
  running: boolean;
  progress?: {
    current: number;
    total: number;
    segment: string;
    region: string;
    found: number;
    with_email: number;
    duplicates_skipped: number;
  };
}

// Available business segments
const BUSINESS_SEGMENTS = [
  { id: 'cleaning_service', name: 'Schoonmaakdiensten', icon: '🧽' },
  { id: 'beauty_salon', name: 'Schoonheidssalons', icon: '💅' },
  { id: 'hair_salon', name: 'Kapperszaken', icon: '✂️' },
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️' },
  { id: 'hotel_bnb', name: 'Hotels & B&B', icon: '🏨' },
  { id: 'wellness_spa', name: 'Wellness & Spa', icon: '🧘' }
];

// Major Dutch cities
const DUTCH_CITIES = [
  'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven',
  'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen',
  'Haarlem', 'Enschede', 'Apeldoorn', 'Arnhem', 'Zaanstad',
  'Amersfoort', 'Dordrecht', 'Leiden', 'Zoetermeer', 'Maastricht'
];

/**
 * Two-Phase Automation Dashboard
 * Fase 1: Prospect Collection met filters
 * Fase 2: Email Campaign Control
 */
export default function TwoPhaseAutomationDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    phase1: {
      total_prospects: 0,
      qualified_prospects: 0,
      last_discovery: null,
      discovery_rate: 0
    },
    phase2: {
      email_campaigns_enabled: false,
      queued_emails: 0,
      emails_sent_today: 0,
      active_campaigns: 0
    }
  });

  const [discoveryJob, setDiscoveryJob] = useState<DiscoveryJob>({ running: false });
  const [loading, setLoading] = useState(true);
  
  // Discovery filters
  const [selectedSegments, setSelectedSegments] = useState<string[]>(['cleaning_service']);
  const [selectedCities, setSelectedCities] = useState<string[]>(['Amsterdam', 'Rotterdam']);
  const [maxResultsPerCall, setMaxResultsPerCall] = useState(50);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [requireEmail, setRequireEmail] = useState(true);

  useEffect(() => {
    loadDashboardStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Load Phase 1 stats (prospects)
      const prospectsResponse = await fetch('/api/commercial/prospects/stats');
      const prospectsData = prospectsResponse.ok ? await prospectsResponse.json() : null;
      
      // Load Phase 2 stats (email campaigns)
      const campaignsResponse = await fetch('/api/commercial/campaigns/toggle-status');
      const campaignsData = campaignsResponse.ok ? await campaignsResponse.json() : null;

      setStats({
        phase1: {
          total_prospects: prospectsData?.total_prospects || 0,
          qualified_prospects: prospectsData?.qualified_prospects || 0,
          last_discovery: prospectsData?.last_discovery || null,
          discovery_rate: prospectsData?.discovery_rate || 0
        },
        phase2: {
          email_campaigns_enabled: campaignsData?.enabled || false,
          queued_emails: campaignsData?.statistics?.queued_emails || 0,
          emails_sent_today: campaignsData?.statistics?.emails_sent_today || 0,
          active_campaigns: campaignsData?.statistics?.active_campaigns || 0
        }
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Fout bij laden dashboard statistieken');
    } finally {
      setLoading(false);
    }
  };

  const startMassDiscovery = async () => {
    if (selectedSegments.length === 0) {
      toast.error('Selecteer minimaal één business segment');
      return;
    }
    
    if (selectedCities.length === 0) {
      toast.error('Selecteer minimaal één stad');
      return;
    }

    try {
      setDiscoveryJob({ running: true });
      toast.success('🚀 Gefilterde Mass Discovery gestart!');
      
      let totalFound = 0;
      let totalWithEmail = 0;
      let totalDuplicatesSkipped = 0;
      let completedCalls = 0;
      const totalCalls = selectedSegments.length * selectedCities.length;
      
      console.log(`[Discovery] Starting filtered discovery: ${selectedSegments.length} segments × ${selectedCities.length} cities = ${totalCalls} calls`);
      
      for (const segment of selectedSegments) {
        for (const city of selectedCities) {
          setDiscoveryJob({
            running: true,
            progress: {
              current: completedCalls + 1,
              total: totalCalls,
              segment,
              region: city,
              found: totalFound,
              with_email: totalWithEmail,
              duplicates_skipped: totalDuplicatesSkipped
            }
          });
          
          try {
            const response = await fetch('/api/commercial/discovery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'discover',
                criteria: {
                  business_type: segment,
                  location: city,
                  max_results: maxResultsPerCall,
                  skip_duplicates: skipDuplicates,
                  require_email: requireEmail
                },
                sources: ['perplexity'],
                options: {
                  validate_email: requireEmail,
                  skip_existing: skipDuplicates,
                  quality_threshold: 0.6
                }
              })
            });
            
            const result = await response.json();
            if (result.success) {
              const found = result.metadata?.total_discovered || 0;
              const withEmail = result.metadata?.with_email || 0;
              const duplicates = result.metadata?.duplicates_skipped || 0;
              
              totalFound += found;
              totalWithEmail += withEmail;
              totalDuplicatesSkipped += duplicates;
              
              console.log(`[Discovery] ${segment} in ${city}: ${found} found, ${withEmail} with email, ${duplicates} duplicates skipped`);
            } else {
              console.warn(`[Discovery] Failed for ${segment} in ${city}:`, result.error);
            }
            
            completedCalls++;
            
            // Rate limiting: 2 second delay to respect Perplexity limits
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            console.error(`Discovery error for ${segment} in ${city}:`, error);
            completedCalls++;
          }
        }
      }
      
      setDiscoveryJob({ running: false });
      
      // Success message with details
      toast.success(
        `🎉 Discovery voltooid!\n` +
        `📊 ${totalFound} prospects gevonden\n` +
        `📧 ${totalWithEmail} met email adres\n` +
        `🔄 ${totalDuplicatesSkipped} duplicates overgeslagen`,
        { duration: 8000 }
      );
      
      await loadDashboardStats();
      
    } catch (error) {
      console.error('Mass discovery error:', error);
      setDiscoveryJob({ running: false });
      toast.error('Fout bij mass discovery');
    }
  };

  const handleEmailToggleChange = (enabled: boolean) => {
    // Reload stats when email campaigns are toggled
    loadDashboardStats();
    
    if (enabled) {
      toast.success('🚀 Email campaigns geactiveerd! Emails worden nu verstuurd.');
    } else {
      toast.success('⏸️ Email campaigns gepauzeerd. Prospects blijven veilig opgeslagen.');
    }
  };

  const toggleSegment = (segmentId: string) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const selectAllSegments = () => {
    setSelectedSegments(BUSINESS_SEGMENTS.map(s => s.id));
  };

  const selectAllCities = () => {
    setSelectedCities(DUTCH_CITIES);
  };

  const clearAllSegments = () => {
    setSelectedSegments([]);
  };

  const clearAllCities = () => {
    setSelectedCities([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading automation dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">2-Fase Automation Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Eerst prospects verzamelen, dan gecontroleerd mailen - volledig in jouw tempo
        </p>
      </div>

      {/* Phase Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phase 1: Prospect Collection */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">Fase 1: Prospect Collection</h2>
                <p className="text-blue-700 text-sm">Gefilterd verzamelen zonder mailen</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.phase1.qualified_prospects}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.phase1.total_prospects}</div>
              <div className="text-xs text-gray-600">Total Prospects</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.phase1.qualified_prospects}</div>
              <div className="text-xs text-gray-600">Qualified</div>
            </div>
          </div>

          {discoveryJob.running ? (
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Discovery Running...</span>
              </div>
              {discoveryJob.progress && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">
                    {discoveryJob.progress.current}/{discoveryJob.progress.total} - {discoveryJob.progress.segment} in {discoveryJob.progress.region}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(discoveryJob.progress.current / discoveryJob.progress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 grid grid-cols-3 gap-2">
                    <span>📊 {discoveryJob.progress.found} gevonden</span>
                    <span>📧 {discoveryJob.progress.with_email} met email</span>
                    <span>🔄 {discoveryJob.progress.duplicates_skipped} skipped</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={startMassDiscovery}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5" />
              <span>Start Mass Discovery</span>
            </button>
          )}

          <div className="mt-3 text-xs text-blue-700">
            💡 <strong>Gefilterd:</strong> Alleen geselecteerde segmenten & steden, geen duplicates
          </div>
        </div>

        {/* Phase 2: Email Campaign Control */}
        <div className="bg-gradient-to-br from-orange-50 to-red-100 p-6 rounded-xl border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stats.phase2.email_campaigns_enabled ? 'bg-green-600' : 'bg-orange-600'}`}>
                {stats.phase2.email_campaigns_enabled ? (
                  <Play className="h-6 w-6 text-white" />
                ) : (
                  <Pause className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-orange-900">Fase 2: Email Control</h2>
                <p className="text-orange-700 text-sm">
                  {stats.phase2.email_campaigns_enabled ? 'Actief - emails worden verstuurd' : 'Gepauzeerd - geen emails'}
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${stats.phase2.email_campaigns_enabled ? 'text-green-600' : 'text-orange-600'}`}>
              {stats.phase2.email_campaigns_enabled ? 'ON' : 'OFF'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.phase2.queued_emails}</div>
              <div className="text-xs text-gray-600">Emails in Queue</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.phase2.active_campaigns}</div>
              <div className="text-xs text-gray-600">Active Campaigns</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email Campaigns</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">
                  {stats.phase2.email_campaigns_enabled ? 'Actief' : 'Gepauzeerd'}
                </span>
                <button
                  onClick={() => {
                    // This would trigger the EmailCampaignToggleControl
                    // For now, just show a placeholder
                    toast('Toggle email campaigns in de sectie hieronder');
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    stats.phase2.email_campaigns_enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      stats.phase2.email_campaigns_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-orange-700">
            🔒 <strong>Controle:</strong> Jij bepaalt wanneer emails verstuurd worden
          </div>
        </div>
      </div>

      {/* Discovery Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <Filter className="h-6 w-6 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">Discovery Filters</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Business Segments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Business Segmenten</span>
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllSegments}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Alles
                </button>
                <button
                  onClick={clearAllSegments}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Wissen
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {BUSINESS_SEGMENTS.map((segment) => (
                <label key={segment.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedSegments.includes(segment.id)}
                    onChange={() => toggleSegment(segment.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xl">{segment.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{segment.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {selectedSegments.length} van {BUSINESS_SEGMENTS.length} geselecteerd
            </div>
          </div>

          {/* Cities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Steden</span>
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllCities}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Alles
                </button>
                <button
                  onClick={clearAllCities}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Wissen
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {DUTCH_CITIES.map((city) => (
                <label key={city} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedCities.includes(city)}
                    onChange={() => toggleCity(city)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{city}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {selectedCities.length} van {DUTCH_CITIES.length} geselecteerd
            </div>
          </div>
        </div>

        {/* Discovery Options */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Discovery Opties</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Max resultaten per call
              </label>
              <select
                value={maxResultsPerCall}
                onChange={(e) => setMaxResultsPerCall(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-900"
              >
                <option value={1}>1 prospect</option>
                <option value={3}>3 prospects</option>
                <option value={5}>5 prospects</option>
                <option value={10}>10 prospects</option>
                <option value={20}>20 prospects</option>
                <option value={50}>50 prospects</option>
                <option value={100}>100 prospects</option>
                <option value={200}>200 prospects</option>
                <option value={500}>500 prospects</option>
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Skip duplicates</span>
                  <p className="text-xs text-gray-500">Voorkom dubbele prospects</p>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={requireEmail}
                  onChange={(e) => setRequireEmail(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Require email</span>
                  <p className="text-xs text-gray-500">Alleen prospects met email</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Discovery Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <strong>Discovery Planning:</strong> {selectedSegments.length} segmenten × {selectedCities.length} steden = {selectedSegments.length * selectedCities.length} API calls
            {selectedSegments.length * selectedCities.length > 50 && (
              <span className="text-orange-600 ml-2">⚠️ Grote operatie - dit kan 10+ minuten duren</span>
            )}
            {selectedSegments.length * selectedCities.length > 20 && selectedSegments.length * selectedCities.length <= 50 && (
              <span className="text-orange-600 ml-2">⚠️ Let op: Dit kan even duren</span>
            )}
          </div>
          {maxResultsPerCall >= 100 && (
            <div className="text-sm text-purple-700 mt-2">
              🚀 <strong>High-volume discovery:</strong> {maxResultsPerCall} prospects per call × {selectedSegments.length * selectedCities.length} calls = 
              tot {(selectedSegments.length * selectedCities.length * maxResultsPerCall).toLocaleString()} prospects mogelijk!
            </div>
          )}
          {selectedSegments.length * selectedCities.length * maxResultsPerCall >= 1000 && (
            <div className="text-sm text-red-700 mt-2">
              ⚡ <strong>MASSIVE DISCOVERY:</strong> Deze operatie kan duizenden prospects vinden. 
              Overweeg kleinere batches voor betere controle.
            </div>
          )}
        </div>
      </div>

      {/* Workflow Arrow */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4 bg-gray-100 px-6 py-3 rounded-full">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-gray-700">Prospects verzameld</span>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <Clock className="h-5 w-5 text-orange-600" />
          <span className="text-sm font-medium text-gray-700">Wacht op je signaal</span>
          <ArrowRight className="h-5 w-5 text-gray-400" />
          <Mail className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Gecontroleerd mailen</span>
        </div>
      </div>

      {/* Email Campaign Toggle Control */}
      <EmailCampaignToggleControl 
        onToggleChange={handleEmailToggleChange}
        className="max-w-4xl mx-auto"
      />

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.open('/dashboard/commercial-acquisition', '_blank')}
            className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border"
          >
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Full Dashboard</div>
              <div className="text-sm text-gray-600">Gedetailleerde analytics</div>
            </div>
          </button>
          
          <button
            onClick={() => window.open('/api/commercial/prospects', '_blank')}
            className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border"
          >
            <Users className="h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium">View Prospects</div>
              <div className="text-sm text-gray-600">Bekijk verzamelde data</div>
            </div>
          </button>
          
          <button
            onClick={() => window.open('/dashboard/segment-templates', '_blank')}
            className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors border"
          >
            <Settings className="h-5 w-5 text-purple-600" />
            <div className="text-left">
              <div className="font-medium">Segment Templates</div>
              <div className="text-sm text-gray-600">Beheer landing pages & emails</div>
            </div>
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">System Status</h4>
            <div className="text-sm text-blue-700 mt-1">
              • <strong>Fase 1:</strong> {stats.phase1.qualified_prospects} qualified prospects klaar voor email campaigns<br/>
              • <strong>Fase 2:</strong> Email campaigns {stats.phase2.email_campaigns_enabled ? '🟢 actief' : '🔴 gepauzeerd'}<br/>
              • <strong>Filters:</strong> {selectedSegments.length} segmenten, {selectedCities.length} steden geselecteerd<br/>
              • <strong>Controle:</strong> Volledig in jouw hands - activeer wanneer je klaar bent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 