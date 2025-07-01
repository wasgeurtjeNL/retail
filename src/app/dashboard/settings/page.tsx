"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import EmailTemplateList from "@/components/EmailTemplateList";
import EmailTemplateEditor from "@/components/EmailTemplateEditor";
import BrandingSettings from "@/components/BrandingSettings";
import EmailDiagnostics from '@/components/EmailDiagnostics';
import AccountSettings from '@/components/AccountSettings';
import NotificationSettings from '@/components/NotificationSettings';
import LogoutButton from "@/components/LogoutButton";
import BackButton from "@/components/BackButton";
import { checkStripeConfiguration } from "@/lib/stripe-server";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('payment');
  
  // Stripe configuratie
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [isStripeConfiguring, setIsStripeConfiguring] = useState(false);
  const [stripeConfigSuccess, setStripeConfigSuccess] = useState(false);
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);
  
  // Opgeslagen keys
  const [savedSecretKey, setSavedSecretKey] = useState<string | null>(null);
  const [savedPublishableKey, setSavedPublishableKey] = useState<string | null>(null);

  // Mandrill configuratie
  const [mandrillApiKey, setMandrillApiKey] = useState('');
  const [mandrillFromEmail, setMandrillFromEmail] = useState('');
  const [mandrillFromName, setMandrillFromName] = useState('');
  const [isMandrillConfiguring, setIsMandrillConfiguring] = useState(false);
  const [mandrillConfigSuccess, setMandrillConfigSuccess] = useState(false);
  const [mandrillConfigError, setMandrillConfigError] = useState<string | null>(null);
  
  // Email templates
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  
  // Toevoegen state voor testmail
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Lees de opgeslagen Stripe keys uit localStorage bij het laden van de pagina en na configuratie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Direct controleren bij laden van de pagina
      checkAndUpdateStripeStatus();
    }
  }, []); // Leeg afhankelijkheidsarray om alleen bij het laden van de pagina uit te voeren

  // Controleer opnieuw na een succesvolle configuratie
  useEffect(() => {
    if (stripeConfigSuccess && typeof window !== 'undefined') {
      // Even wachten om localStorage update tijd te geven
      setTimeout(() => {
        checkAndUpdateStripeStatus();
      }, 500);
    }
  }, [stripeConfigSuccess]);

  // Functie om stripe status te controleren en bij te werken
  const checkAndUpdateStripeStatus = () => {
    console.log('Checking Stripe configuration status...');
    
    try {
      // Direct uit localStorage lezen voor meest recente status
      const secretKey = localStorage.getItem('STRIPE_SECRET_KEY');
      const publishableKey = localStorage.getItem('STRIPE_PUBLISHABLE_KEY');
      
      console.log('Stripe keys status check:', {
        secretKeyPresent: !!secretKey,
        secretKeyLength: secretKey?.length || 0,
        publishableKeyPresent: !!publishableKey,
        publishableKeyLength: publishableKey?.length || 0
      });
      
      setSavedSecretKey(secretKey);
      setSavedPublishableKey(publishableKey);
      
      // Debug waar de warning vandaan komt
      const stripeSection = document.getElementById('stripe-configuration-section');
      if (stripeSection) {
        console.log('Stripe section content:', stripeSection.innerHTML);
      }
    } catch (e) {
      console.error('Error checking Stripe status:', e);
    }
  };

  const handleStripeConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success('Stripe is al geconfigureerd met hardcoded test keys');
  };

  // Effect om de status te controleren bij page load
  useEffect(() => {
    checkAndUpdateStripeStatus();
    
    // Controleer of localStorage wordt bijgewerkt door een test waarde op te slaan en te lezen
    try {
      localStorage.setItem('STRIPE_TEST_VALUE', 'test');
      const testValue = localStorage.getItem('STRIPE_TEST_VALUE');
      console.log('localStorage test:', testValue === 'test' ? 'working' : 'not working');
      localStorage.removeItem('STRIPE_TEST_VALUE');
    } catch (e) {
      console.error('localStorage test failed:', e);
    }
  }, []);

  // Mandrill configuratie handler
  const handleMandrillConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMandrillConfiguring(true);
    setMandrillConfigSuccess(false);
    setMandrillConfigError(null);
    
    try {
      const response = await fetch('/api/email/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: mandrillApiKey,
          fromEmail: mandrillFromEmail || undefined,
          fromName: mandrillFromName || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden bij het configureren van Mandrill.');
      }
      
      setMandrillConfigSuccess(true);
      // Clear inputs after successful configuration
      setMandrillApiKey('');
      setMandrillFromEmail('');
      setMandrillFromName('');
    } catch (error) {
      setMandrillConfigError(error instanceof Error ? error.message : 'Er is een onverwachte fout opgetreden.');
      console.error('Error configuring Mandrill:', error);
    } finally {
      setIsMandrillConfiguring(false);
    }
  };

  // Functie om de status van de Stripe configuratie weer te geven
  const renderStripeStatus = () => {
    // Hardcoded Stripe keys are being used
    return (
      <div className="my-4 p-4 rounded-md bg-green-50 border border-green-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Stripe configuratie gevonden</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Stripe API sleutels zijn hardcoded geconfigureerd en klaar voor gebruik.</p>
              <p className="mt-1">Secret Key: sk_test_51LmLUMJtFvAJ7sDP...5O</p>
              <p>Publishable Key: pk_test_51LmLUMJtFvAJ7sDP...2B</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handler voor testmail versturen
  const handleSendTestMail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/email/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({ success: true, message: 'Testmail verzonden naar ' + testEmail });
      } else {
        setTestResult({ success: false, message: data.error || 'Fout bij verzenden testmail' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Onbekende fout bij verzenden testmail' });
    } finally {
      setSendingTest(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
            <p className="text-gray-600 mb-6">
              U heeft geen toegang tot deze pagina. Log in als admin om toegang te krijgen.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
            >
              Inloggen
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="pb-5 mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold leading-6 text-gray-900">Instellingen</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Beheer alle instellingen voor uw Wasgeurtje retailer platform.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <BackButton route="/dashboard" label="Terug naar Dashboard" />
                <LogoutButton variant="secondary" />
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('payment')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                      activeTab === 'payment'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Betalingsinstellingen
                  </button>
                  <button
                    onClick={() => setActiveTab('email')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                      activeTab === 'email'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    E-mailinstellingen
                  </button>
                  <button
                    onClick={() => setActiveTab('branding')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                      activeTab === 'branding'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Huisstijl
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                      activeTab === 'templates'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    E-mail Templates
                  </button>
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                      activeTab === 'account'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Account
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                      activeTab === 'notifications'
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Notificaties
                  </button>
                </nav>
              </div>
              
              <div className="p-6">
                {activeTab === 'payment' && (
                  <div>
                    <div className="md:grid md:grid-cols-3 md:gap-6">
                      <div className="md:col-span-1">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Stripe Configuratie</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Configureer Stripe betalingen voor uw retailer platform. U heeft hiervoor de API sleutels van uw Stripe account nodig.
                        </p>
                        
                        {/* Toon de huidige status van Stripe configuratie */}
                        {renderStripeStatus()}
                        
                        <div className="mt-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-800">Tips voor Stripe configuratie:</h4>
                          <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Maak een account aan op stripe.com als u er nog geen heeft</li>
                            <li>Ga naar het Developers gedeelte in uw Stripe dashboard</li>
                            <li>Kopieer de API sleutels (Publishable key en Secret key)</li>
                            <li>Test uw configuratie voordat u live gaat</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-5 md:mt-0 md:col-span-2">
                        <form onSubmit={handleStripeConfig}>
                          <div className="shadow overflow-hidden sm:rounded-md">
                            <div className="px-4 py-5 bg-white sm:p-6">
                              {stripeConfigSuccess && (
                                <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200">
                                  <div className="flex">
                                    <div className="flex-shrink-0">
                                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="ml-3">
                                      <h3 className="text-sm font-medium text-green-800">Stripe configuratie succesvol!</h3>
                                      <div className="mt-2 text-sm text-green-700">
                                        <p>Uw Stripe API sleutels zijn succesvol geconfigureerd. U kunt nu betalingen ontvangen.</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {stripeConfigError && (
                                <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
                                  <div className="flex">
                                    <div className="flex-shrink-0">
                                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="ml-3">
                                      <h3 className="text-sm font-medium text-red-800">Er is een fout opgetreden</h3>
                                      <div className="mt-2 text-sm text-red-700">
                                        <p>{stripeConfigError}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6">
                                  <label htmlFor="stripe-secret-key" className="block text-sm font-medium text-gray-700">
                                    Stripe Secret Key
                                  </label>
                                  <input
                                    type="password"
                                    name="stripe-secret-key"
                                    id="stripe-secret-key"
                                    value={stripeSecretKey}
                                    onChange={(e) => setStripeSecretKey(e.target.value)}
                                    placeholder="sk_test_..."
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                                    required
                                  />
                                  <p className="mt-1 text-xs text-gray-500">Deze key is geheim en moet nooit aan anderen worden gedeeld.</p>
                                </div>
                                
                                <div className="col-span-6">
                                  <label htmlFor="stripe-publishable-key" className="block text-sm font-medium text-gray-700">
                                    Stripe Publishable Key
                                  </label>
                                  <input
                                    type="text"
                                    name="stripe-publishable-key"
                                    id="stripe-publishable-key"
                                    value={stripePublishableKey}
                                    onChange={(e) => setStripePublishableKey(e.target.value)}
                                    placeholder="pk_test_..."
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                              <button
                                type="submit"
                                disabled={isStripeConfiguring}
                                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
                                  isStripeConfiguring ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                              >
                                {isStripeConfiguring ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Configureren...
                                  </>
                                ) : (
                                  'Configureer Stripe'
                                )}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'email' && (
                  <div>
                    <div className="md:grid md:grid-cols-3 md:gap-6">
                      <div className="md:col-span-1">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Test E-mailservice</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Test of de e-mailservice correct werkt. De Mandrill API key wordt alleen uit de .env.local geladen en kan niet via deze interface worden aangepast.
                        </p>
                        <div className="mt-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-800">Let op:</h4>
                          <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>De Mandrill API key is hardcoded in de serveromgeving (.env.local).</li>
                            <li>Je kunt hier alleen een testmail versturen.</li>
                            <li>Wil je de afzender aanpassen? Pas <code>MAIL_FROM_EMAIL</code> en <code>MAIL_FROM_NAME</code> aan in de .env.local.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-5 md:mt-0 md:col-span-2">
                        <form onSubmit={handleSendTestMail} className="shadow overflow-hidden sm:rounded-md">
                          <div className="px-4 py-5 bg-white sm:p-6">
                            <div className="grid grid-cols-6 gap-6">
                              <div className="col-span-6">
                                <label htmlFor="test-email" className="block text-sm font-medium text-gray-700">
                                  Test e-mailadres
                                </label>
                                <input
                                  type="email"
                                  name="test-email"
                                  id="test-email"
                                  required
                                  value={testEmail}
                                  onChange={(e) => setTestEmail(e.target.value)}
                                  placeholder="jouw@email.nl"
                                  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                                />
                              </div>
                            </div>
                            {testResult && (
                              <div className={`mt-4 p-3 rounded ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {testResult.message}
                              </div>
                            )}
                          </div>
                          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                            <button
                              type="submit"
                              disabled={sendingTest}
                              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${sendingTest ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {sendingTest ? 'Versturen...' : 'Verstuur testmail'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'branding' && (
                  <div>
                    <div className="md:grid md:grid-cols-3 md:gap-6">
                      <div className="md:col-span-1">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Huisstijl Instellingen</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Pas uw logo, kleuren en bedrijfsnaam aan voor gebruik in e-mails en op het platform.
                        </p>
                        <div className="mt-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                          <h4 className="text-sm font-medium text-blue-800">Tips voor huisstijl:</h4>
                          <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Upload een logo in PNG of SVG formaat voor de beste kwaliteit</li>
                            <li>Kies een accentkleur die past bij uw huisstijl</li>
                            <li>De bedrijfsnaam wordt gebruikt in e-mails en facturen</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-5 md:mt-0 md:col-span-2">
                        <BrandingSettings />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'templates' && (
                  <div>
                    <div className="md:grid md:grid-cols-4 md:gap-6">
                      <div className="md:col-span-1">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">E-mail Templates</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Beheer en pas de e-mail templates aan die worden gebruikt voor communicatie met retailers en klanten.
                        </p>
                        <div className="mt-6">
                          <EmailTemplateList 
                            onSelect={(key) => setSelectedTemplateKey(key)}
                            selectedTemplateKey={selectedTemplateKey}
                          />
                        </div>
                        <div className="mt-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                          <h3 className="text-lg font-medium text-blue-800">Template Variabelen</h3>
                          <p className="mt-1 text-xs text-gray-700">
                            Gebruik <code className="bg-white text-pink-600 px-1 rounded">{'{{variabele}}'}</code> syntax om dynamische inhoud toe te voegen.
                          </p>
                          <p className="mt-2 text-xs text-gray-700">
                            <span className="font-semibold">Algemene variabelen:</span>
                          </p>
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            <code className="text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">{'{{contactName}}'}</code>
                            <code className="text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">{'{{businessName}}'}</code>
                            <code className="text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">{'{{email}}'}</code>
                            <code className="text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">{'{{phone}}'}</code>
                            <code className="text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">{'{{logoUrl}}'}</code>
                            <code className="text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">{'{{currentYear}}'}</code>
                          </div>
                          <p className="mt-2 text-xs text-gray-700">
                            <span className="font-semibold">Conditionele blokken:</span>
                          </p>
                          <code className="block mt-1 text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">
                            {'{{#if variabele}}'}<br />
                            {'  content'}<br />
                            {'{{/if}}'}
                          </code>
                          <p className="mt-2 text-xs text-gray-700">
                            <span className="font-semibold">Iteraties:</span>
                          </p>
                          <code className="block mt-1 text-xs bg-white text-pink-600 px-2 py-1 rounded font-mono">
                            {'{{#each items}}'}<br />
                            {'  {{name}} - {{price}}'}<br />
                            {'{{/each}}'}
                          </code>
                        </div>
                      </div>
                      
                      <div className="mt-5 md:mt-0 md:col-span-3">
                        {selectedTemplateKey ? (
                          <EmailTemplateEditor
                            templateKey={selectedTemplateKey}
                            onSave={() => {
                              // Eventueel template lijst vernieuwen
                            }}
                          />
                        ) : (
                          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Selecteer een template</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Kies een template uit de lijst om te bewerken of te testen.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'account' && (
                  <div>
                    <AccountSettings />
                  </div>
                )}
                
                {activeTab === 'notifications' && (
                  <div>
                    <NotificationSettings />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 