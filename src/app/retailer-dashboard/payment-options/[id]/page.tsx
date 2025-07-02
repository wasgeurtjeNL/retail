"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Interface for the application data
interface WasstripsApplication {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  total?: number;
  isPaid: boolean;
  paymentMethod?: 'stripe' | 'invoice' | 'bank_transfer';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'expired';
  selectedPaymentOption?: 'direct' | 'invoice' | null;
}

export default function PaymentOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [application, setApplication] = useState<WasstripsApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'invoice' | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true); // Default to test mode
  
  // Load application data on mount
  useEffect(() => {
    if (!id) return;
    
    const loadApplication = () => {
      try {
        // In a real implementation, this would be an API call
        const storedApplications = localStorage.getItem('wasstrips-applications');
        if (storedApplications) {
          const applications = JSON.parse(storedApplications);
          const app = applications.find((app: WasstripsApplication) => app.id === id);
          
          if (app) {
            setApplication(app);
            
            // If payment is already made, show success message
            if (app.isPaid) {
              setShowSuccessMessage(true);
            }
            
            // If payment option is already selected, pre-select it
            if (app.selectedPaymentOption) {
              setPaymentMethod(app.selectedPaymentOption);
            }
          } else {
            setError('De aanvraag kon niet worden gevonden.');
          }
        } else {
          setError('Geen aanvragen gevonden.');
        }
      } catch (error) {
        console.error('Error loading application:', error);
        setError('Er is een fout opgetreden bij het laden van de aanvraag.');
      } finally {
        setLoading(false);
      }
    };
    
    // Check test mode from localStorage
    const savedTestMode = localStorage.getItem('STRIPE_TEST_MODE');
    if (savedTestMode !== null) {
      setIsTestMode(savedTestMode === 'true');
    }
    
    loadApplication();
  }, [id]);
  
  // Handle payment method selection
  const handlePaymentMethodSelect = (method: 'direct' | 'invoice') => {
    setPaymentMethod(method);
  };
  
  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!paymentMethod || !application) return;
    
    setProcessingPayment(true);
    
    try {
      // Eerst de keuze opslaan in de database via API
      const response = await fetch('/api/wasstrips-applications/select-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId: application.id, 
          paymentMethod 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save payment method selection');
      }

      console.log('Payment method saved successfully');

      // Ook opslaan in localStorage voor lokale state
      const storedApplications = localStorage.getItem('wasstrips-applications');
      if (storedApplications) {
        const applications = JSON.parse(storedApplications);
        const updatedApplications = applications.map((app: WasstripsApplication) => {
          if (app.id === application.id) {
            return {
              ...app,
              selectedPaymentOption: paymentMethod,
              paymentMethod: paymentMethod === 'direct' ? 'stripe' : 'invoice',
              lastUpdated: new Date().toISOString()
            };
          }
          return app;
        });
        localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApplications));
      }

      // Toon direct de 'u wordt doorgestuurd' boodschap
      setShowSuccessMessage(true);
      
      if (paymentMethod === 'direct') {
        // Bereid de data voor voor de Stripe API call
        const items = [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Wasstrips Pakket',
              description: `Aanvraag ID: ${application.id}`,
            },
            // Gebruik de totaalprijs uit de aanvraag, of een standaardprijs. Bedrag in centen.
            unit_amount: Math.round((application.total || 450) * 100),
          },
          quantity: 1
        }];

        // Wacht 1 seconde zodat de gebruiker de boodschap kan zien
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            items,
            isTestMode: isTestMode 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Het aanmaken van de betaalsessie is mislukt.');
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('Geen redirect URL ontvangen van de server.');
        }

      } else { // 'invoice'
        // Wacht 2 seconden en stuur dan door naar de factuurpagina
        await new Promise(resolve => setTimeout(resolve, 2000));
        window.location.href = `/retailer-dashboard/payment-options/${application.id}/invoice`;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      console.error('Error processing payment choice:', errorMessage);
      setError(`Fout: ${errorMessage}`);
      // Verberg de succes boodschap bij een fout
      setShowSuccessMessage(false);
    } finally {
      setProcessingPayment(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center text-gray-800 mb-4">Fout bij laden</h1>
          <p className="text-gray-600 text-center">{error}</p>
          <div className="mt-6 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              Terug naar home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-xl font-bold text-center text-gray-800 mb-4">Aanvraag niet gevonden</h1>
          <p className="text-gray-600 text-center">De opgevraagde aanvraag kon niet worden gevonden.</p>
          <div className="mt-6 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
              Terug naar home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (showSuccessMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Bedankt voor uw keuze!</h1>
          {paymentMethod === 'direct' ? (
            <p className="text-gray-600 text-center">U wordt nu doorgestuurd naar de betaalpagina...</p>
          ) : (
            <p className="text-gray-600 text-center">U ontvangt de factuur binnenkort per e-mail.</p>
          )}
          <div className="mt-6 flex justify-center">
            <div className="animate-pulse rounded-full h-2 w-24 bg-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header met logo */}
        <div className="text-center mb-8">
          <img 
            src="/assets/images/branding/default-logo.png" 
            alt="Logo" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">Betaalopties</h1>
          <p className="mt-2 text-gray-600">
            Kies uw voorkeursmethode voor de betaling van uw bestelling
          </p>
        </div>
        
        {/* Aanvraagdetails */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-5 bg-blue-50 border-b border-blue-100">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
              Aanvraaggegevens
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Aanvraagnummer</p>
                <p className="font-medium text-gray-900">{application.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bedrijfsnaam</p>
                <p className="font-medium text-gray-900">{application.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contactpersoon</p>
                <p className="font-medium text-gray-900">{application.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">E-mail</p>
                <p className="font-medium text-gray-900">{application.email}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-base font-semibold text-gray-900">Totaalbedrag</p>
                <p className="text-2xl font-bold text-blue-600">€{(application.total || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Betaalopties */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-5 bg-green-50 border-b border-green-100">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
              Kies uw betaalmethode
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              U kunt kiezen uit de volgende betaalopties. Selecteer de methode die uw voorkeur heeft.
            </p>
            
            <div className="space-y-4">
              {/* Direct betalen optie */}
              <motion.div 
                className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                  paymentMethod === 'direct' 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
                onClick={() => handlePaymentMethodSelect('direct')}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="p-4 flex items-center space-x-4">
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'direct'
                      ? 'border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'direct' && (
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Direct betalen</h3>
                    <p className="text-sm text-gray-500">
                      Betaal nu direct via iDeal, creditcard of PayPal
                    </p>
                    <div className="mt-2 flex space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">iDeal</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Creditcard</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">PayPal</span>
                    </div>
                  </div>
                  
                  <div className="text-blue-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </motion.div>
              
              {/* Betalen op rekening optie */}
              <motion.div 
                className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                  paymentMethod === 'invoice' 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
                onClick={() => handlePaymentMethodSelect('invoice')}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="p-4 flex items-center space-x-4">
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'invoice'
                      ? 'border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'invoice' && (
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Betalen op rekening</h3>
                    <p className="text-sm text-gray-500">
                      Ontvang een factuur met betalingstermijn van 14 dagen
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Factuur per e-mail</span>
                    </div>
                  </div>
                  
                  <div className="text-blue-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* Belangrijk bericht */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Belangrijk om te weten</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  Producten worden pas verzonden nadat de betaling is ontvangen en verwerkt. Bij betaling op rekening geldt een betalingstermijn van 14 dagen.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actie knoppen */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.close()}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuleren
          </button>
          
          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={!paymentMethod || processingPayment}
            className={`py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              !paymentMethod || processingPayment
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {processingPayment ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verwerken...
              </span>
            ) : (
              <span>Bevestigen</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 