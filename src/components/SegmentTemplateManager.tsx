import React, { useState, useEffect } from 'react';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mail, Edit3, Eye, Save, Plus, Copy, 
  ExternalLink, Palette, MessageSquare, Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SegmentConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetAudience: string;
  keyBenefits: string[];
  painPoints: string[];
}

interface EmailTemplate {
  id: string;
  segment: string;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  lastModified: string;
}

interface LandingPageTemplate {
  id: string;
  segment: string;
  title: string;
  hero_headline: string;
  hero_subheadline: string;
  benefits: string[];
  testimonials: any[];
  cta_text: string;
  styles: Record<string, any>;
  lastModified: string;
}

// Available business segments with their configurations
const BUSINESS_SEGMENTS: SegmentConfig[] = [
  {
    id: 'beauty_salon',
    name: 'Schoonheidssalons',
    icon: '💅',
    description: 'Premium schoonheidssalons en wellness centra',
    targetAudience: 'Salon eigenaren en managers',
    keyBenefits: ['Premium klantervaring', 'Verhoogde service kwaliteit', 'Meer omzet per behandeling'],
    painPoints: ['Klanten ervaren droge handen', 'Concurrentie van andere salons', 'Kwaliteitsverwachtingen']
  },
  {
    id: 'hair_salon',
    name: 'Kappers',
    icon: '✂️',
    description: 'Professionele kapperszaken en hair stylists',
    targetAudience: 'Kapper eigenaren en stylisten',
    keyBenefits: ['Professionele uitstraling', 'Klantcomfort verhogen', 'Onderscheidend vermogen'],
    painPoints: ['Hoge klantverwachtingen', 'Concurrentie', 'Operationele kosten']
  },
  {
    id: 'cleaning_service',
    name: 'Schoonmaakdiensten',
    icon: '🧽',
    description: 'Professionele schoonmaakbedrijven en cleaning services',
    targetAudience: 'Schoonmaakbedrijf eigenaren en managers',
    keyBenefits: ['Professionele werkervaring', 'Betere klantretentie', 'Verhoogde service waarde'],
    painPoints: ['Harde werkomstandigheden', 'Klantretentie uitdagingen', 'Kostendruk']
  },
  {
    id: 'restaurant',
    name: 'Restaurants',
    icon: '🍽️',
    description: 'Restaurants, cafés en horecagelegenheden',
    targetAudience: 'Restaurant eigenaren en managers',
    keyBenefits: ['Verhoogde gastevaluaties', 'Hygiëne standaarden', 'Professionele uitstraling'],
    painPoints: ['Gastevaluaties', 'Hygiëne eisen', 'Operationele druk']
  },
  {
    id: 'hotel_bnb',
    name: 'Hotels & B&B',
    icon: '🏨',
    description: 'Hotels, bed & breakfasts en accommodaties',
    targetAudience: 'Hotel eigenaren en hospitality managers',
    keyBenefits: ['5-star guestervaring', 'Online reviews verbeteren', 'Gast loyaliteit'],
    painPoints: ['Online reviews', 'Gast verwachtingen', 'Concurrentie van booking platforms']
  },
  {
    id: 'wellness_spa',
    name: 'Wellness & Spa',
    icon: '🧘',
    description: 'Spa centra, wellness faciliteiten en massage salons',
    targetAudience: 'Spa eigenaren en wellness professionals',
    keyBenefits: ['Ultieme ontspanning', 'Premium wellness ervaring', 'Klant satisfactie'],
    painPoints: ['Klant verwachtingen van luxe', 'Concurrentie', 'Operationele kosten']
  }
];

export default function SegmentTemplateManager() {
  const [selectedSegment, setSelectedSegment] = useState<string>('cleaning_service');
  const [activeTab, setActiveTab] = useState<string>('email_templates');
  
  // Templates state
  const [emailTemplates, setEmailTemplates] = useState<Record<string, EmailTemplate>>({});
  const [landingPageTemplates, setLandingPageTemplates] = useState<Record<string, LandingPageTemplate>>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  
  // Form state for editing
  const [emailFormData, setEmailFormData] = useState({
    subject: '',
    html: ''
  });
  const [landingFormData, setLandingFormData] = useState({
    hero_headline: '',
    hero_subheadline: '',
    benefits: '',
    cta_text: ''
  });

  useEffect(() => {
    loadSegmentTemplates();
  }, [selectedSegment]);

  const loadSegmentTemplates = async () => {
    setIsLoading(true);
    try {
      // Load email templates for segment
      const emailResponse = await fetch(`/api/commercial/templates/email?segment=${selectedSegment}`);
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        setEmailTemplates(prev => ({ ...prev, [selectedSegment]: emailData }));
      }

      // Load landing page templates for segment
      const landingResponse = await fetch(`/api/commercial/templates/landing?segment=${selectedSegment}`);
      if (landingResponse.ok) {
        const landingData = await landingResponse.json();
        setLandingPageTemplates(prev => ({ ...prev, [selectedSegment]: landingData }));
      }

    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Fout bij laden templates');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmailTemplate = async (template: Partial<EmailTemplate>) => {
    try {
      const response = await fetch('/api/commercial/templates/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          segment: selectedSegment
        })
      });

      if (response.ok) {
        toast.success('Email template opgeslagen!');
        await loadSegmentTemplates();
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving email template:', error);
      toast.error('Fout bij opslaan email template');
    }
  };

  const saveLandingPageTemplate = async (template: Partial<LandingPageTemplate>) => {
    try {
      const response = await fetch('/api/commercial/templates/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          segment: selectedSegment
        })
      });

      if (response.ok) {
        toast.success('Landing page template opgeslagen!');
        await loadSegmentTemplates();
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving landing page template:', error);
      toast.error('Fout bij opslaan landing page template');
    }
  };

  const generateProspectUrl = (segment: string, prospectId?: string) => {
    // In development, use the current window location to detect the correct port
    const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? `${window.location.protocol}//${window.location.host}`
      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    
    // Use the new route structure: /partner/{segment}
    return `${baseUrl}/partner/${segment}${prospectId ? `?prospect=${prospectId}&tracking=enabled` : ''}`;
  };

  const previewEmailTemplate = () => {
    const template = emailTemplates[selectedSegment];
    if (!template) return;

    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      const previewHtml = (template.html || getDefaultEmailTemplate(selectedSegment))
        .replace(/{{business_name}}/g, 'Test Bedrijf BV')
        .replace(/{{contact_name}}/g, 'Jan Jansen')
        .replace(/{{first_name}}/g, 'Jan')
        .replace(/{{city}}/g, 'Amsterdam')
        .replace(/{{invitation_url}}/g, generateProspectUrl(selectedSegment, 'TEST123'))
        .replace(/{{tracking_pixel}}/g, '');

      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Preview - ${template.subject || `Test voor ${selectedSegment}`}</title>
          <style>
            body { margin: 20px; font-family: Arial, sans-serif; }
            .preview-header { padding: 10px; background: #f5f5f5; margin-bottom: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="preview-header">
            <h3>Email Preview: ${currentSegment?.name}</h3>
            <p><strong>Subject:</strong> ${(template.subject || getDefaultSubjectForSegment(selectedSegment)).replace(/{{business_name}}/g, 'Test Bedrijf BV')}</p>
            <p><strong>Segment:</strong> ${selectedSegment}</p>
          </div>
          ${previewHtml}
        </body>
        </html>
      `);
    }
  };

  const sendTestEmail = async () => {
    try {
      setIsLoading(true);
      const template = emailTemplates[selectedSegment];
      const htmlContent = (template?.html || getDefaultEmailTemplate(selectedSegment))
        .replace(/{{business_name}}/g, 'Test Bedrijf BV')
        .replace(/{{contact_name}}/g, 'Jan Jansen')
        .replace(/{{first_name}}/g, 'Jan')
        .replace(/{{city}}/g, 'Amsterdam')
        .replace(/{{invitation_url}}/g, generateProspectUrl(selectedSegment, 'TEST123'))
        .replace(/{{tracking_pixel}}/g, '');

      const subjectLine = (template?.subject || getDefaultSubjectForSegment(selectedSegment))
        .replace(/{{business_name}}/g, 'Test Bedrijf BV');

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com', // You might want to make this configurable
          subject: `[TEST] ${subjectLine}`,
          html: htmlContent,
          fromName: 'Wasgeurtje Partnership Team'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Test email verzonden! ${result.development ? '(Development mode - check console)' : ''}`);
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Fout bij verzenden test email: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setIsLoading(false);
    }
  };

  const currentSegment = BUSINESS_SEGMENTS.find(s => s.id === selectedSegment);
  const currentEmailTemplate = emailTemplates[selectedSegment];
  const currentLandingTemplate = landingPageTemplates[selectedSegment];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Segment Template Manager</h1>
          <p className="text-gray-600 mt-2">
            Beheer landingspagina's, email templates en onderwerpen per business segment
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => window.open('/dashboard/commercial-acquisition', '_blank')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Commercial Dashboard</span>
          </Button>
        </div>
      </div>

      {/* Segment Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-purple-600" />
            <span>Business Segment Selectie</span>
          </CardTitle>
          <CardDescription>
            Kies het business segment om templates voor te beheren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUSINESS_SEGMENTS.map((segment) => (
              <button
                key={segment.id}
                onClick={() => setSelectedSegment(segment.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  selectedSegment === segment.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{segment.icon}</span>
                  <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                </div>
                <p className="text-sm text-gray-600">{segment.description}</p>
                <div className="mt-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {segment.targetAudience}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Segment Info */}
      {currentSegment && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-4xl">{currentSegment.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentSegment.name}</h2>
                <p className="text-gray-600">{currentSegment.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">🎯 Key Benefits:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {currentSegment.keyBenefits.map((benefit, index) => (
                    <li key={index}>• {benefit}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">⚡ Pain Points:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {currentSegment.painPoints.map((pain, index) => (
                    <li key={index}>• {pain}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Management Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        defaultValue="email_templates"
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="landing_page" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Landing Page</span>
          </TabsTrigger>
          <TabsTrigger value="email_template" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email Template</span>
          </TabsTrigger>
          <TabsTrigger value="preview_test" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Preview & Test</span>
          </TabsTrigger>
        </TabsList>

        {/* Landing Page Tab */}
        <TabsContent value="landing_page" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Landing Page Template - {currentSegment?.name}</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => window.open(generateProspectUrl(selectedSegment), '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Live
                  </Button>
                  <Button
                    onClick={() => saveLandingPageTemplate(currentLandingTemplate || {})}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Aanpassen van de landingspagina voor {currentSegment?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Landing Page Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hero Headline
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      placeholder={`Exclusieve partnerschap voor ${currentSegment?.name}`}
                      defaultValue={currentLandingTemplate?.hero_headline || ''}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hero Subheadline
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      rows={3}
                      placeholder="Word partner en verhoog uw service kwaliteit met premium wasproducten..."
                      defaultValue={currentLandingTemplate?.hero_subheadline || ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Call-to-Action Text
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      placeholder="Claim Gratis Proefpakket"
                      defaultValue={currentLandingTemplate?.cta_text || ''}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key Benefits (één per regel)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      rows={6}
                      placeholder={currentSegment?.keyBenefits.join('\n')}
                      defaultValue={currentLandingTemplate?.benefits?.join('\n') || ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Preview
                    </label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <code className="text-sm text-blue-600">
                        {generateProspectUrl(selectedSegment, 'PROSPECT_ID')}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Template Tab */}
        <TabsContent value="email_template" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Email Template - {currentSegment?.name}</span>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={previewEmailTemplate}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Email
                  </Button>
                  <Button
                    onClick={() => saveEmailTemplate(currentEmailTemplate || {})}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Email template voor uitnodigingen naar {currentSegment?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Onderwerp
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder={`Exclusieve kans voor {{business_name}} - Gratis proefpakket beschikbaar`}
                  defaultValue={currentEmailTemplate?.subject || ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Beschikbare variabelen: {`{{business_name}}, {{contact_name}}, {{city}}, {{first_name}}`}
                </p>
              </div>

              {/* Email HTML Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email HTML Content
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 font-mono"
                  rows={15}
                  placeholder="HTML email template met personalisatie..."
                  defaultValue={currentEmailTemplate?.html || getDefaultEmailTemplate(selectedSegment)}
                />
              </div>

              {/* Variables Helper */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📝 Beschikbare Variabelen:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {[
                    '{{business_name}}',
                    '{{contact_name}}',
                    '{{first_name}}',
                    '{{city}}',
                    '{{invitation_url}}',
                    '{{tracking_pixel}}'
                  ].map((variable) => (
                    <code key={variable} className="bg-white px-2 py-1 rounded text-blue-700">
                      {variable}
                    </code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview & Test Tab */}
        <TabsContent value="preview_test" className="space-y-6">
          {/* Landing Page Preview & Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Landing Page Preview & Access</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Preview Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Bekijk de live landing page voor <strong>{currentSegment?.name}</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      URL: {generateProspectUrl(selectedSegment)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        const previewWindow = window.open(
                          generateProspectUrl(selectedSegment), 
                          'landing_preview',
                          'width=1200,height=800,scrollbars=yes,resizable=yes'
                        );
                        if (previewWindow) {
                          previewWindow.focus();
                        }
                      }}
                      variant="secondary"
                      className="flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Preview Window</span>
                    </Button>
                    <Button
                      onClick={() => window.open(generateProspectUrl(selectedSegment), '_blank')}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Live</span>
                    </Button>
                  </div>
                </div>

                {/* Template Content Preview */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Template Content Preview:</h4>
                  <div className="space-y-3">
                    {landingPageTemplates[selectedSegment] && (
                      <>
                        <div>
                          <span className="text-xs font-medium text-gray-600">Hero Headline:</span>
                          <p className="text-sm text-gray-900 mt-1">
                            {landingPageTemplates[selectedSegment].hero_headline}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-600">Hero Subheadline:</span>
                          <p className="text-sm text-gray-700 mt-1">
                            {landingPageTemplates[selectedSegment].hero_subheadline}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-600">Benefits:</span>
                          <ul className="text-sm text-gray-700 mt-1 space-y-1">
                            {landingPageTemplates[selectedSegment].benefits?.slice(0, 3).map((benefit, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-600">CTA Text:</span>
                          <p className="text-sm font-medium text-blue-600 mt-1">
                            {landingPageTemplates[selectedSegment].cta_text}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Preview & Test</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Test Email:</span>
                    <Button
                      onClick={previewEmailTemplate}
                      size="sm"
                      variant="outline"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Preview
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Subject:</div>
                    <div className="text-sm text-gray-900 mb-4">
                      {currentEmailTemplate?.subject?.replace('{{business_name}}', 'Test Bedrijf BV') || 
                       `Exclusieve kans voor Test Bedrijf BV - Gratis proefpakket beschikbaar`}
                    </div>
                    
                    <div className="text-sm font-medium text-gray-700 mb-2">Preview:</div>
                    <div 
                      className="border bg-white p-3 rounded text-xs max-h-40 overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: (currentEmailTemplate?.html || getDefaultEmailTemplate(selectedSegment))
                          .replace(/{{business_name}}/g, 'Test Bedrijf BV')
                          .replace(/{{contact_name}}/g, 'Jan Jansen')
                          .replace(/{{first_name}}/g, 'Jan')
                          .replace(/{{city}}/g, 'Amsterdam')
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Test & Deploy</CardTitle>
              <CardDescription>
                Test je templates en deploy naar productie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={sendTestEmail}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                  disabled={isLoading}
                >
                  <Mail className="h-4 w-4" />
                  <span>{isLoading ? 'Verzenden...' : 'Verstuur Test Email'}</span>
                </Button>
                
                <Button
                  onClick={() => toast.success('Template opgeslagen als draft!')}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save as Draft</span>
                </Button>
                
                <Button
                  onClick={() => toast.success('Template geactiveerd voor ' + currentSegment?.name)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span>Deploy Live</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get default email subject for segment
function getDefaultSubjectForSegment(segment: string): string {
  const subjects: Record<string, string> = {
    cleaning_service: 'Exclusieve kans voor {{business_name}} - Verhoog uw service kwaliteit 🧽',
    beauty_salon: 'Exclusieve partnerkans voor {{business_name}} - Premium klantervaring 💅',
    hair_salon: 'Professionele upgrade voor {{business_name}} - Gratis proefpakket ✂️',
    restaurant: 'Verhoog uw gastevaluaties {{business_name}} - Gratis proefpakket 🍽️',
    hotel_bnb: 'Transform {{business_name}}s geurervaringen - Gratis proefpakket ✨',
    wellness_spa: 'Premium wellness upgrade voor {{business_name}} - Gratis proefpakket 🧘'
  };
  
  return subjects[segment] || subjects.cleaning_service;
}

// Helper function to get default email template for segment
function getDefaultEmailTemplate(segment: string): string {
  const segmentConfigs: Record<string, any> = {
    cleaning_service: {
      opening: "een exclusief aanbod voor professionele schoonmaakdiensten zoals",
      benefits: ["Professionele werkervaring voor uw team", "Betere klantretentie door kwaliteit", "Onderscheid van concurrenten"],
      testimonial: "Schoonmaakbedrijven rapporteren 30% betere klantretentie"
    },
    beauty_salon: {
      opening: "een exclusief gratis proefpakket voor",
      benefits: ["Premium wasproducten speciaal voor salon gebruik", "Verhoog uw service kwaliteit", "Tevreden klanten = meer omzet"],
      testimonial: "Salons rapporteren 40% meer klanttevredenheid"
    }
  };

  const config = segmentConfigs[segment] || segmentConfigs.cleaning_service;

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎯 Exclusieve Uitnodiging</h1>
        <p style="color: #e0f2fe; margin: 10px 0 0 0;">Speciaal geselecteerd voor {{business_name}}</p>
      </div>
      
      <div style="padding: 40px 30px;">
        <h2 style="color: #1f2937; margin: 0 0 15px 0;">Hallo {{first_name}},</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Ik ben onder de indruk van {{business_name}} in {{city}}! ${config.opening} uw bedrijf.
        </p>
        
        <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">Waarom dit perfect is voor {{business_name}}:</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
            ${config.benefits.map((benefit: string) => `<li style="margin-bottom: 8px;">${benefit}</li>`).join('')}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invitation_url}}" style="display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Claim Gratis Proefpakket →
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; font-style: italic; text-align: center;">
          "${config.testimonial}"
        </p>
      </div>
    </div>
  `;
} 