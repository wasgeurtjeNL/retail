'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Star, ArrowRight, Shield, Gift, Users } from 'lucide-react';

interface ProspectInfo {
  prospectId: string | null;
  businessName: string | null;
  trackingEnabled: boolean;
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
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
}

interface DynamicSegmentLandingPageProps {
  segment: string;
  urlSegment: string;
  prospectInfo: ProspectInfo;
}

export default function DynamicSegmentLandingPage({ 
  segment, 
  urlSegment, 
  prospectInfo 
}: DynamicSegmentLandingPageProps) {
  const [template, setTemplate] = useState<LandingPageTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    company_name: prospectInfo.businessName || '',
    contact_name: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });

  useEffect(() => {
    loadTemplate();
    
    // Track page view if tracking is enabled
    if (prospectInfo.trackingEnabled && prospectInfo.prospectId) {
      trackPageView();
    }
  }, [segment]);

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/commercial/templates/landing?segment=${segment}`);
      if (response.ok) {
        const templateData = await response.json();
        setTemplate(templateData);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackPageView = async () => {
    try {
      await fetch('/api/commercial/tracking/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectInfo.prospectId,
          page_type: 'landing_page',
          segment,
          utm_source: prospectInfo.utmSource,
          utm_campaign: prospectInfo.utmCampaign,
          utm_medium: prospectInfo.utmMedium
        })
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/commercial/landing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          segment,
          prospect_id: prospectInfo.prospectId,
          utm_source: prospectInfo.utmSource,
          utm_campaign: prospectInfo.utmCampaign,
          utm_medium: prospectInfo.utmMedium
        })
      });

      if (response.ok) {
        setSubmitted(true);
        
        // Track conversion if tracking is enabled
        if (prospectInfo.trackingEnabled && prospectInfo.prospectId) {
          await fetch('/api/commercial/tracking/conversion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prospect_id: prospectInfo.prospectId,
              conversion_type: 'landing_page_form',
              segment
            })
          });
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Template niet gevonden</h1>
          <p className="text-gray-600">De opgevraagde pagina kon niet worden geladen.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bedankt voor uw interesse!</h1>
          <p className="text-gray-600 mb-6">
            We hebben uw aanvraag ontvangen en nemen binnen 24 uur contact met u op.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Volgende stappen:</strong><br/>
              • Persoonlijk adviesgesprek<br/>
              • Gratis proefpakket verzending<br/>
              • Partnership mogelijkheden bespreken
            </p>
          </div>
        </div>
      </div>
    );
  }

  const segmentIcons: Record<string, string> = {
    cleaning_service: '🧽',
    beauty_salon: '💅',
    hair_salon: '✂️',
    restaurant: '🍽️',
    hotel_bnb: '🏨',
    wellness_spa: '🧘'
  };

  const primaryColor = template.styles.primaryColor || '#1e40af';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div 
        className="relative py-20 px-4 text-white"
        style={{ 
          background: template.styles.heroBackground || `linear-gradient(135deg, ${primaryColor} 0%, #1e40af 100%)`
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">{segmentIcons[segment] || '🎯'}</div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {prospectInfo.businessName ? (
              template.hero_headline.replace('{{business_name}}', prospectInfo.businessName)
            ) : (
              template.hero_headline
            )}
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed">
            {template.hero_subheadline}
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm opacity-80">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>100% Risicovrij</span>
            </div>
            <div className="flex items-center space-x-2">
              <Gift className="h-4 w-4" />
              <span>Gratis Verzending</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>500+ Tevreden Partners</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Waarom kiezen voor Wasgeurtje Partnership?
            </h2>
            <p className="text-xl text-gray-600">
              Ontdek de voordelen die uw {segment.replace('_', ' ')} naar het volgende niveau tillen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {template.benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <CheckCircle 
                    className="h-6 w-6" 
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit}
                </h3>
                <p className="text-gray-600 text-sm">
                  Bewezen resultaten die direct impact hebben op uw bedrijfsvoering en klanttevrednheid.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      {template.testimonials && template.testimonials.length > 0 && (
        <div className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Wat onze partners zeggen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {template.testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Form Section */}
      <div className="py-16 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {template.cta_text}
            </h2>
            <p className="text-xl opacity-90">
              Vul onderstaand formulier in en ontvang binnen 2 werkdagen uw gratis proefpakket
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-xl text-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrijfsnaam *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Uw bedrijfsnaam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contactpersoon *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Uw naam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mailadres *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="uw@email.nl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefoonnummer *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="06-12345678"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stad/Locatie *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Amsterdam"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aanvullende opmerkingen (optioneel)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Eventuele vragen of specifieke wensen..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-8 py-4 px-8 text-lg font-bold text-white rounded-lg transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
              style={{ backgroundColor: primaryColor }}
            >
              <Gift className="h-5 w-5" />
              <span>{template.cta_text}</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Door dit formulier in te vullen gaat u akkoord met onze{' '}
              <a href="/privacy" className="underline">privacyverklaring</a> en{' '}
              <a href="/terms" className="underline">algemene voorwaarden</a>.
            </p>
          </form>
        </div>
      </div>

      {/* Tracking pixel */}
      {prospectInfo.trackingEnabled && prospectInfo.prospectId && (
        <img 
          src={`/api/commercial/tracking/pixel?prospect=${prospectInfo.prospectId}&page=landing`}
          width="1" 
          height="1" 
          style={{ display: 'none' }} 
          alt=""
        />
      )}
    </div>
  );
} 