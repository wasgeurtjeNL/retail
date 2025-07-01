import React, { useState, useEffect } from 'react';
import TemplatePreview from './TemplatePreview';

type Template = {
  name: string;
  description: string;
  subject: string;
  html: string;
  text: string;
};

type EmailTemplateEditorProps = {
  templateKey: string;
  onSave?: () => void;
};

export default function EmailTemplateEditor({ templateKey, onSave }: EmailTemplateEditorProps) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    mandrillConfigured: boolean;
    development: boolean;
    details: string;
  } | null>(null);

  // Template laden bij initialisatie of wanneer templateKey verandert
  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/email/templates?key=${templateKey}`);
        const data = await response.json();
        
        if (response.ok && data.template) {
          setTemplate(data.template);
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'Kon template niet laden'
          });
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        setMessage({
          type: 'error',
          text: 'Er is een fout opgetreden bij het laden van de template'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateKey]);

  // Template bewerken
  const handleChange = (field: keyof Template, value: string) => {
    if (template) {
      setTemplate({
        ...template,
        [field]: value
      });
    }
  };

  // Template opslaan
  const handleSave = async () => {
    if (!template) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateKey,
          template
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Template succesvol opgeslagen'
        });
        if (onSave) onSave();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Er is een fout opgetreden bij het opslaan'
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({
        type: 'error',
        text: 'Er is een fout opgetreden bij het opslaan van de template'
      });
    } finally {
      setSaving(false);
    }
  };

  // Test e-mail versturen
  const handleSendTest = async () => {
    if (!template || !testEmailAddress) return;
    
    setSendingTest(true);
    setMessage(null);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/email/test-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateKey,
          email: testEmailAddress
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Test email is verzonden naar ${testEmailAddress}`
        });
        
        // Sla de testresultaten op voor weergave
        if (data.success) {
          setTestResult({
            success: true,
            mandrillConfigured: data.mandrillConfigured || false,
            development: data.development || false,
            details: data.details || ''
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Kon test email niet verzenden'
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({
        type: 'error',
        text: 'Er is een fout opgetreden bij het verzenden van de test email'
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Template resetten naar standaardwaarden
  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/email/templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateKey
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Haal de gereset template opnieuw op
        const templateResponse = await fetch(`/api/email/templates?key=${templateKey}`);
        const templateData = await templateResponse.json();
        
        if (templateResponse.ok && templateData.template) {
          setTemplate(templateData.template);
          setMessage({
            type: 'success',
            text: 'Template succesvol gereset naar standaardwaarden'
          });
          if (onSave) onSave();
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Kon template niet resetten'
        });
      }
    } catch (error) {
      console.error('Error resetting template:', error);
      setMessage({
        type: 'error',
        text: 'Er is een fout opgetreden bij het resetten van de template'
      });
    } finally {
      setLoading(false);
      setResetConfirm(false);
    }
  };

  // Cancel reset als gebruiker op annuleren klikt
  const handleCancelReset = () => {
    setResetConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Fout bij laden template</h3>
        <p className="text-red-700 mt-1">De template kon niet worden geladen. Probeer het later opnieuw.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-green-600'
                      : 'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-600'
                  }`}
                >
                  <span className="sr-only">Sluiten</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="template-name" className="block text-sm font-medium text-gray-700">
                Naam
              </label>
              <div className="mt-1">
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Template Naam</span>
                  </div>
                  <input
                    type="text"
                    name="template-name"
                    id="template-name"
                    value={template.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full shadow-sm text-base border-0 bg-gray-50 text-gray-900 p-3 focus:ring-pink-500 focus:border-0"
                  />
                </div>
              </div>
            </div>
            
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="template-subject" className="block text-sm font-medium text-gray-700">
                Onderwerp
              </label>
              <div className="mt-1">
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">E-mail Onderwerp</span>
                  </div>
                  <input
                    type="text"
                    name="template-subject"
                    id="template-subject"
                    value={template.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    className="w-full shadow-sm text-base border-0 bg-gray-50 text-gray-900 p-3 focus:ring-pink-500 focus:border-0"
                  />
                </div>
              </div>
            </div>
            
            <div className="col-span-6">
              <label htmlFor="template-description" className="block text-sm font-medium text-gray-700">
                Beschrijving
              </label>
              <div className="mt-1">
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Template Beschrijving</span>
                  </div>
                  <input
                    type="text"
                    name="template-description"
                    id="template-description"
                    value={template.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full shadow-sm text-base border-0 bg-gray-50 text-gray-900 p-3 focus:ring-pink-500 focus:border-0"
                  />
                </div>
              </div>
            </div>
            
            <div className="col-span-6">
              <label htmlFor="template-html" className="block text-sm font-medium text-gray-700">
                HTML Inhoud
              </label>
              <div className="mt-1">
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">HTML Editor</span>
                    <div className="flex space-x-2">
                      <button 
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-xs bg-white hover:bg-gray-50 text-gray-700 px-2 py-1 rounded border border-gray-300"
                      >
                        {showPreview ? 'Verberg Preview' : 'Toon Preview'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    name="template-html"
                    id="template-html"
                    rows={12}
                    value={template.html}
                    onChange={(e) => handleChange('html', e.target.value)}
                    className="w-full shadow-sm text-base border-0 font-mono bg-gray-50 text-gray-900 p-3 focus:ring-pink-500 focus:border-0"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Gebruik &#123;&#123;variabele&#125;&#125; syntax om dynamische inhoud in te voegen. Bekijk de documentatie voor alle beschikbare variabelen.
              </p>
            </div>
            
            {showPreview && (
              <div className="col-span-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <TemplatePreview html={template.html} className="max-h-96" />
                </div>
              </div>
            )}
            
            <div className="col-span-6">
              <label htmlFor="template-text" className="block text-sm font-medium text-gray-700">
                Tekst Versie
              </label>
              <div className="mt-1">
                <div className="border border-gray-300 rounded-md overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">Tekst Editor</span>
                  </div>
                  <textarea
                    name="template-text"
                    id="template-text"
                    rows={6}
                    value={template.text}
                    onChange={(e) => handleChange('text', e.target.value)}
                    className="w-full shadow-sm text-base border-0 font-mono bg-gray-50 text-gray-900 p-3 focus:ring-pink-500 focus:border-0"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Dit is de tekst versie van de email voor clients die geen HTML ondersteunen.
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 sm:px-6 flex flex-wrap items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
                saving ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Opslaan...
                </>
              ) : (
                'Opslaan'
              )}
            </button>
            
            {resetConfirm ? (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Bevestig Reset
                </button>
                <button
                  type="button"
                  onClick={handleCancelReset}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Annuleren
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Reset naar standaard
              </button>
            )}
          </div>
        </div>

        {/* Test email sectie */}
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Template testen</h3>
          <p className="text-xs text-gray-700 mb-3">
            Verstuur een test email om te controleren hoe deze eruit ziet. Dit gebruikt de Mandrill API als deze geconfigureerd is, anders wordt een simulatie gebruikt.
          </p>
          
          <div className="sm:flex sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="w-full sm:max-w-xs">
              <label htmlFor="test-email" className="block text-xs font-medium text-gray-700 mb-1">Email adres voor test</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="test-email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="email@voorbeeld.nl"
                  className="w-full shadow-sm text-sm border border-gray-300 text-gray-900 rounded-md p-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={!testEmailAddress || sendingTest}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  !testEmailAddress || sendingTest ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {sendingTest ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Versturen...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Verstuur test
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test resultaat */}
          {testResult && (
            <div className="mt-3 p-3 bg-white rounded-md border border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {testResult.success ? (
                    <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    Status: <span className="font-bold text-gray-900">Verzonden</span> naar <span className="font-bold">{testEmailAddress}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {testResult.details}
                  </p>
                  <div className="mt-2 text-xs">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${testResult.mandrillConfigured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {testResult.mandrillConfigured ? 'Mandrill API' : 'Ontwikkelingsmodus'}
                    </span>
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