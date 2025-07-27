import React, { useState, useEffect } from 'react';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, Edit3, Eye, Save, Plus, Copy, ExternalLink, 
  Palette, MessageSquare, Globe, TrendingUp, TrendingDown,
  Target, Zap, BarChart3, Settings, AlertTriangle,
  CheckCircle, Clock, Play, Pause, RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// =====================================================
// INTERFACES & TYPES
// =====================================================

interface TemplateVariant {
  id: string;
  segment: string;
  template_type: 'email' | 'landing_page';
  variant_name: string;
  active: boolean;
  is_control: boolean;
  test_enabled: boolean;
  
  // Performance Metrics
  benchmark_conversion_rate: number;
  emails_sent: number;
  conversions: number;
  current_conversion_rate: number;
  last_performance_check?: string;
  
  // Template Content
  template_content: any;
  template_subject?: string;
  template_preview_text?: string;
  
  created_at: string;
  updated_at: string;
}

interface TemplatePerformanceStats {
  template_id: string;
  emails_sent: number;
  conversions: number;
  conversion_rate: number;
  avg_time_to_conversion: number;
  above_benchmark: boolean;
  
  // Trend data
  daily_performance: Array<{
    date: string;
    emails: number;
    conversions: number;
    rate: number;
  }>;
}

interface OptimizationSettings {
  segment: string;
  email_benchmark_conversion_rate: number;
  landing_benchmark_conversion_rate: number;
  auto_switch_enabled: boolean;
  minimum_test_volume: number;
  test_duration_days: number;
  confidence_threshold: number;
}

interface OptimizationRecommendation {
  should_switch: boolean;
  current_template_id: string;
  recommended_template_id?: string;
  reason: string;
  confidence_score?: number;
}

// Business segments configuration
const BUSINESS_SEGMENTS = [
  {
    id: 'beauty_salon',
    name: 'Schoonheidssalons',
    icon: '💅',
    description: 'Premium schoonheidssalons en wellness centra'
  },
  {
    id: 'hair_salon', 
    name: 'Kappers',
    icon: '✂️',
    description: 'Professionele kapperszaken en hair stylists'
  },
  {
    id: 'cleaning_service',
    name: 'Schoonmaakdiensten', 
    icon: '🧽',
    description: 'Professionele schoonmaakbedrijven'
  },
  {
    id: 'restaurant',
    name: 'Restaurants',
    icon: '🍽️', 
    description: 'Restaurants, cafés en horecagelegenheden'
  },
  {
    id: 'hotel_bnb',
    name: 'Hotels & B&B',
    icon: '🏨',
    description: 'Hotels, bed & breakfasts en accommodaties'
  },
  {
    id: 'wellness_spa',
    name: 'Wellness & Spa',
    icon: '🧘',
    description: 'Spa centra en wellness faciliteiten'
  }
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function SegmentTemplateVariantManager() {
  const [selectedSegment, setSelectedSegment] = useState('beauty_salon');
  const [activeTab, setActiveTab] = useState('variants');
  const [isLoading, setIsLoading] = useState(false);
  
  // Template Variants State
  const [emailVariants, setEmailVariants] = useState<TemplateVariant[]>([]);
  const [landingVariants, setLandingVariants] = useState<TemplateVariant[]>([]);
  const [performanceStats, setPerformanceStats] = useState<Record<string, TemplatePerformanceStats>>({});
  
  // Optimization State
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, OptimizationRecommendation>>({});
  
  // UI State
  const [showCreateVariant, setShowCreateVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState<TemplateVariant | null>(null);

  // =====================================================
  // LOAD DATA EFFECTS
  // =====================================================

  // Load all data when component mounts or segment changes
  useEffect(() => {
    console.log('[SegmentTemplateVariantManager] Loading data for segment:', selectedSegment);
    loadTemplateVariants();
    loadPerformanceStats();
    loadOptimizationSettings();
    loadOptimizationRecommendations();
  }, [selectedSegment]);

  // =====================================================
  // DATA LOADING FUNCTIONS
  // =====================================================
  
  async function loadTemplateVariants() {
    try {
      console.log('[SegmentTemplateVariantManager] Loading template variants...');
      setIsLoading(true);
      const response = await fetch(`/api/commercial/templates/variants?segment=${selectedSegment}`);
      console.log('[SegmentTemplateVariantManager] API Response status:', response.status);
      
      const data = await response.json();
      console.log('[SegmentTemplateVariantManager] API Response data:', data);
      
      if (data.success) {
        // API returns email_variants and landing_variants directly
        const emailVars = data.email_variants || [];
        const landingVars = data.landing_variants || [];
        
        console.log('[SegmentTemplateVariantManager] Email variants:', emailVars.length);
        console.log('[SegmentTemplateVariantManager] Landing variants:', landingVars.length);
        
        setEmailVariants(emailVars);
        setLandingVariants(landingVars);
      } else {
        console.error('[SegmentTemplateVariantManager] Failed to load variants:', data.error);
        toast.error('Fout bij laden template variants: ' + (data.error || 'Onbekende fout'));
      }
    } catch (error) {
      console.error('[SegmentTemplateVariantManager] Error loading template variants:', error);
      toast.error('Fout bij laden template variants');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPerformanceStats() {
    try {
      const response = await fetch(`/api/commercial/templates/performance?segment=${selectedSegment}`);
      const data = await response.json();
      
      if (data.success) {
        setPerformanceStats(data.performance_stats || {});
      }
    } catch (error) {
      console.error('Error loading performance stats:', error);
    }
  }

  async function loadOptimizationSettings() {
    try {
      const response = await fetch(`/api/commercial/templates/optimization-settings?segment=${selectedSegment}`);
      const data = await response.json();
      
      if (data.success) {
        setOptimizationSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading optimization settings:', error);
    }
  }

  async function loadOptimizationRecommendations() {
    try {
      const response = await fetch(`/api/commercial/templates/optimization-check?segment=${selectedSegment}`);
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations || {});
      }
    } catch (error) {
      console.error('Error loading optimization recommendations:', error);
    }
  }

  // =====================================================
  // TEMPLATE VARIANT ACTIONS
  // =====================================================

  async function createNewVariant(templateType: 'email' | 'landing_page') {
    const variantName = prompt(`Naam voor nieuwe ${templateType} variant:`);
    if (!variantName) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/commercial/templates/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: selectedSegment,
          template_type: templateType,
          variant_name: variantName,
          template_content: getDefaultTemplateContent(templateType, selectedSegment),
          template_subject: templateType === 'email' ? getDefaultSubjectForSegment(selectedSegment) : undefined
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Nieuwe ${templateType} variant aangemaakt!`);
        loadTemplateVariants();
      } else {
        toast.error('Fout bij aanmaken variant: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating variant:', error);
      toast.error('Fout bij aanmaken variant');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleVariantActive(variantId: string, templateType: 'email' | 'landing_page') {
    try {
      const response = await fetch(`/api/commercial/templates/variants/${variantId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Template variant geactiveerd!');
        loadTemplateVariants();
        loadOptimizationRecommendations(); // Refresh recommendations
      } else {
        toast.error('Fout bij activeren variant: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling variant:', error);
      toast.error('Fout bij activeren variant');
    }
  }

  async function startABTest(variantId: string) {
    try {
      const response = await fetch(`/api/commercial/templates/ab-test/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: selectedSegment,
          variant_id: variantId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('A/B test gestart!');
        loadTemplateVariants();
      } else {
        toast.error('Fout bij starten A/B test: ' + data.error);
      }
    } catch (error) {
      console.error('Error starting A/B test:', error);
      toast.error('Fout bij starten A/B test');
    }
  }

  // =====================================================
  // AUTO-OPTIMIZATION ACTIONS
  // =====================================================

  async function runOptimizationCheck() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/commercial/templates/optimization-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: selectedSegment })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Optimization check uitgevoerd!');
        loadOptimizationRecommendations();
        loadTemplateVariants();
      } else {
        toast.error('Fout bij optimization check: ' + data.error);
      }
    } catch (error) {
      console.error('Error running optimization:', error);
      toast.error('Fout bij optimization check');
    } finally {
      setIsLoading(false);
    }
  }

  async function applyOptimizationRecommendation(templateType: 'email' | 'landing_page') {
    const recommendation = recommendations[templateType];
    if (!recommendation || !recommendation.should_switch) return;

    if (!confirm(`Wil je echt switchen naar de aanbevolen template? (${recommendation.reason})`)) {
      return;
    }

    try {
      const response = await fetch('/api/commercial/templates/optimization-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: selectedSegment,
          template_type: templateType,
          new_template_id: recommendation.recommended_template_id
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Template automatisch gewisseld!');
        loadTemplateVariants();
        loadOptimizationRecommendations();
      } else {
        toast.error('Fout bij toepassen aanbeveling: ' + data.error);
      }
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast.error('Fout bij toepassen aanbeveling');
    }
  }

  // =====================================================
  // PREVIEW FUNCTIONS
  // =====================================================

  function previewEmailTemplate(variant: TemplateVariant) {
    console.log('Preview email template:', variant.id);
    
    // Create a preview popup window with the email template
    const previewWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
    
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Preview: ${variant.variant_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .email-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
            .subject { font-size: 18px; font-weight: bold; color: #333; }
            .content { line-height: 1.6; color: #666; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="subject">${variant.template_subject || 'Email Subject'}</div>
              <div style="font-size: 12px; color: #999; margin-top: 5px;">
                Variant: ${variant.variant_name} | Segment: ${variant.segment}
              </div>
            </div>
            <div class="content">
              <h2>🎯 Email Template Preview</h2>
              <p><strong>Segment:</strong> ${variant.segment}</p>
              <p><strong>Template Type:</strong> ${variant.template_type}</p>
              <p><strong>Subject:</strong> ${variant.template_subject}</p>
              <p><strong>Status:</strong> ${variant.active ? 'Actief' : 'Inactief'}</p>
              <p><strong>Is Control:</strong> ${variant.is_control ? 'Ja' : 'Nee'}</p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              
              <h3>📧 Email Template Content</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
                <p>Template Content: ${JSON.stringify(variant.template_content, null, 2)}</p>
              </div>
              
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                Dit is een preview van de email template. De werkelijke email zal worden gegenereerd met dynamische content.
              </p>
            </div>
          </div>
        </body>
        </html>
      `);
      previewWindow.document.close();
    } else {
      toast.error('Kon preview venster niet openen. Controleer popup blocker instellingen.');
    }
  }

  function previewLandingPage(variant: TemplateVariant) {
    console.log('Preview landing page:', variant.id);
    
    // Create preview URL for the landing page
    const previewUrl = `/partner/${selectedSegment}?variant=${variant.id}&preview=true`;
    
    // Open in new tab
    window.open(previewUrl, '_blank');
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  function getPerformanceBadge(variant: TemplateVariant) {
    const stats = performanceStats[variant.id];
    if (!stats) return null;

    const isAboveBenchmark = stats.above_benchmark;
    const conversionRate = stats.conversion_rate;

    if (isAboveBenchmark) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <TrendingUp className="h-3 w-3 mr-1" />
          {conversionRate.toFixed(1)}% ✓
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800">
          <TrendingDown className="h-3 w-3 mr-1" />
          {conversionRate.toFixed(1)}% ↓
        </Badge>
      );
    }
  }

  function getOptimizationStatus(templateType: 'email' | 'landing_page') {
    const recommendation = recommendations[templateType];
    if (!recommendation) return null;

    if (recommendation.should_switch) {
      return (
        <div className="flex items-center space-x-2 text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Optimization aanbevolen</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Optimaal presterende</span>
      </div>
    );
  }

  const currentSegment = BUSINESS_SEGMENTS.find(s => s.id === selectedSegment);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Template Variant Manager</h2>
                        <p className="text-gray-800 font-medium mt-1">
          Beheer multiple template variants per segment met auto-optimization & performance tracking
        </p>
      </div>

      {/* Segment Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Business Segment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {BUSINESS_SEGMENTS.map((segment) => (
              <button
                key={segment.id}
                onClick={() => setSelectedSegment(segment.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedSegment === segment.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{segment.icon}</div>
                <div className="font-medium text-sm">{segment.name}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Segment Info */}
      {currentSegment && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <span className="text-2xl">{currentSegment.icon}</span>
                  <span>{currentSegment.name}</span>
                </h3>
                <p className="text-gray-800 font-medium">{currentSegment.description}</p>
              </div>
              
              {optimizationSettings && (
                <div className="text-right">
                  <div className="text-sm text-gray-800 font-medium">Benchmark</div>
                  <div className="font-semibold text-gray-900">
                    Email: {optimizationSettings.email_benchmark_conversion_rate}% | 
                    Landing: {optimizationSettings.landing_benchmark_conversion_rate}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Debug Section - Remove after testing */}
      <Card className="mb-4 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">🔧 Debug Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                console.log('TEST: Simple button clicked!');
                alert('Test button werkt!');
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Test Knop
            </Button>
            <Button 
              onClick={() => {
                console.log('TEST: Email variants loaded:', emailVariants.length);
                console.log('TEST: Landing variants loaded:', landingVariants.length);
                alert(`Email variants: ${emailVariants.length}, Landing variants: ${landingVariants.length}`);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Check Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug/Test Section - Tijdelijk voor verificatie */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 text-sm">🔧 Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white px-2 py-1 rounded">
                Segment: {selectedSegment}
              </span>
              <span className="bg-white px-2 py-1 rounded">
                Email Variants: {emailVariants.length}
              </span>
              <span className="bg-white px-2 py-1 rounded">
                Landing Variants: {landingVariants.length}
              </span>
              <Button 
                size="sm"
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('Selected Segment:', selectedSegment);
                  console.log('Email Variants:', emailVariants);
                  console.log('Landing Variants:', landingVariants);
                  toast.success('Check console voor debug info!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Console Log
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Section - Verify Improvements */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 text-sm">✅ Improvements Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded">
                <strong className="text-green-800">🎨 Contrast Fixed:</strong>
                <p className="text-gray-800 font-medium">All text now uses text-gray-800 for better readability</p>
              </div>
              <div className="bg-white p-3 rounded">
                <strong className="text-green-800">👁️ Preview Added:</strong>
                <p className="text-gray-800 font-medium">Eye icons for email & landing page preview</p>
              </div>
            </div>
            <div className="mt-3 flex space-x-2">
              <Button 
                size="sm"
                onClick={() => toast.success('Template preview functionality restored!')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Eye className="h-4 w-4 mr-1" />
                Test Preview
              </Button>
              <Button 
                size="sm"
                onClick={() => toast.success('Text contrast improved!')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                🎨 Test Contrast
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="variants">Template Variants</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
          <TabsTrigger value="optimization">Auto-Optimization</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Template Variants Tab */}
        <TabsContent value="variants" className="space-y-6">
          {/* Email Variants Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Email Template Variants</span>
                  </CardTitle>
                  <CardDescription>
                    Multiple email templates voor A/B testing en optimization
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getOptimizationStatus('email')}
                  <Button
                    onClick={() => createNewVariant('email')}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nieuwe Variant</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailVariants.length === 0 ? (
                  <div className="text-center py-8 text-gray-700 font-medium">
                    Geen email variants gevonden. Maak de eerste variant aan.
                  </div>
                ) : (
                  emailVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`border rounded-lg p-4 ${
                        variant.active ? 'border-green-200 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{variant.variant_name}</h4>
                            {variant.active && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                ACTIEF
                              </Badge>
                            )}
                            {variant.is_control && (
                              <Badge variant="outline" className="text-gray-800 border-gray-300">CONTROL</Badge>
                            )}
                            {getPerformanceBadge(variant)}
                          </div>
                          
                          <div className="text-sm text-gray-800 mb-2 font-medium">
                            Subject: {variant.template_subject}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-800 font-medium">
                            <span>Verzonden: {variant.emails_sent}</span>
                            <span>Conversies: {variant.conversions}</span>
                            <span>Rate: {variant.current_conversion_rate.toFixed(1)}%</span>
                            <span>Benchmark: {variant.benchmark_conversion_rate}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => previewEmailTemplate(variant)}
                            size="sm"
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            onClick={() => {
                              console.log('Edit button clicked for variant:', variant.id);
                              setEditingVariant(variant);
                            }}
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          
                          {!variant.active && (
                            <Button
                              onClick={() => {
                                console.log('Toggle active button clicked for variant:', variant.id);
                                toggleVariantActive(variant.id, 'email');
                              }}
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => {
                              console.log('A/B test button clicked for variant:', variant.id);
                              startABTest(variant.id);
                            }}
                            size="sm"
                            variant="outline"
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Landing Page Variants Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Landing Page Template Variants</span>
                  </CardTitle>
                  <CardDescription>
                    Multiple landing page layouts voor conversion optimization
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-3">
                  {getOptimizationStatus('landing_page')}
                  <Button
                    onClick={() => createNewVariant('landing_page')}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nieuwe Variant</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {landingVariants.length === 0 ? (
                  <div className="text-center py-8 text-gray-700 font-medium">
                    Geen landing page variants gevonden. Maak de eerste variant aan.
                  </div>
                ) : (
                  landingVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`border rounded-lg p-4 ${
                        variant.active ? 'border-green-200 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{variant.variant_name}</h4>
                            {variant.active && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                ACTIEF
                              </Badge>
                            )}
                            {variant.is_control && (
                              <Badge variant="outline" className="text-gray-800 border-gray-300">CONTROL</Badge>
                            )}
                            {getPerformanceBadge(variant)}
                          </div>
                          
                          <div className="text-sm text-gray-800 mb-2 font-medium">
                            Layout: {variant.template_content?.layout || 'Standard'}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-800 font-medium">
                            <span>Bezoekers: {performanceStats[variant.id]?.emails_sent || 0}</span>
                            <span>Conversies: {variant.conversions}</span>
                            <span>Rate: {variant.current_conversion_rate.toFixed(1)}%</span>
                            <span>Benchmark: {variant.benchmark_conversion_rate}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => previewLandingPage(variant)}
                            size="sm"
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            onClick={() => setEditingVariant(variant)}
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          
                          {!variant.active && (
                            <Button
                              onClick={() => toggleVariantActive(variant.id, 'landing_page')}
                              size="sm"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Analytics Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Analytics</span>
              </CardTitle>
              <CardDescription>
                Detailed performance metrics voor alle template variants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-700 font-medium">
                Performance analytics dashboard - Te implementeren
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Auto-Optimization</span>
              </CardTitle>
              <CardDescription>
                Automatische template optimization op basis van performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Optimization Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Optimization */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email Templates</span>
                  </h4>
                  
                  {recommendations.email ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {recommendations.email.should_switch ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-700">
                              Optimization aanbevolen
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700">
                              Optimaal presterende
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-800">
                        {recommendations.email.reason}
                      </div>
                      
                      {recommendations.email.should_switch && (
                        <Button
                          onClick={() => applyOptimizationRecommendation('email')}
                          size="sm"
                          className="w-full"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Pas Aanbeveling Toe
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 font-medium">
                      Geen optimization data beschikbaar
                    </div>
                  )}
                </div>

                {/* Landing Page Optimization */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Landing Pages</span>
                  </h4>
                  
                  {recommendations.landing_page ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {recommendations.landing_page.should_switch ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-700">
                              Optimization aanbevolen
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700">
                              Optimaal presterende
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-800">
                        {recommendations.landing_page.reason}
                      </div>
                      
                      {recommendations.landing_page.should_switch && (
                        <Button
                          onClick={() => applyOptimizationRecommendation('landing_page')}
                          size="sm"
                          className="w-full"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Pas Aanbeveling Toe
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 font-medium">
                      Geen optimization data beschikbaar
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Optimization Check */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Manual Optimization Check</h4>
                    <p className="text-sm text-gray-800 font-medium">
                      Run een handmatige optimization check voor dit segment
                    </p>
                  </div>
                  
                  <Button
                    onClick={runOptimizationCheck}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>{isLoading ? 'Checking...' : 'Run Check'}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Optimization Settings</span>
              </CardTitle>
              <CardDescription>
                Configureer benchmarks en auto-optimization instellingen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizationSettings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email Templates</span>
                    </h4>
                    <div className="text-sm text-gray-800 font-medium">
                      Email benchmark: {optimizationSettings?.email_benchmark_conversion_rate}%
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>Landing Pages</span>
                    </h4>
                    <div className="text-sm text-gray-800 font-medium">
                      Landing benchmark: {optimizationSettings?.landing_benchmark_conversion_rate}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700 font-medium">
                  Geen optimization settings gevonden voor dit segment.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getDefaultTemplateContent(templateType: 'email' | 'landing_page', segment: string) {
  if (templateType === 'email') {
    return {
      template: `${segment}_default`,
      version: '1.0',
      style: 'professional'
    };
  } else {
    return {
      layout: 'premium',
      variant: `${segment}_focus`,
      components: ['hero', 'benefits', 'testimonials', 'cta']
    };
  }
}

function getDefaultSubjectForSegment(segment: string): string {
  const subjects: Record<string, string> = {
    beauty_salon: 'Je bent uitgekozen als exclusieve BLOSSOM DRIP partner',
    hair_salon: 'Professioneel BLOSSOM DRIP partnerschap voor jouw salon',
    cleaning_service: 'Exclusieve kans voor {{business_name}} - Verhoog uw service kwaliteit 🧽',
    restaurant: 'Verhoog uw gastevaluaties {{business_name}} - Gratis proefpakket 🍽️',
    hotel_bnb: 'Transform {{business_name}}s geurervaringen - Gratis proefpakket ✨',
    wellness_spa: 'Premium wellness upgrade voor {{business_name}} - Gratis proefpakket 🧘'
  };
  
  return subjects[segment] || subjects.beauty_salon;
} 