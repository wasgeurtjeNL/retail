'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

// Remaining payment pagina voor Wasstrips restbedrag
export default function RemainingPaymentPage() {
  const params = useParams();
  const paymentLinkId = params.paymentLinkId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true); // Default to test mode

  useEffect(() => {
    if (paymentLinkId) {
      // Check test mode from localStorage
      const savedTestMode = localStorage.getItem('STRIPE_TEST_MODE');
      if (savedTestMode !== null) {
        setIsTestMode(savedTestMode === 'true');
      }
      
      // Voor nu tonen we de payment link ID
      // Later kan hier API call komen om payment details op te halen
      setPaymentInfo({
        amount: 270.00,
        depositAmount: 30.00,
        totalAmount: 300.00,
        description: 'Wasstrips Restbedrag',
        paymentLinkId
      });
      setLoading(false);
    }
  }, [paymentLinkId]);

  // Functie om Stripe betaling te starten
  const handlePayment = async (paymentMethod: string) => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setError(null);

    try {
      console.log('Starting payment process for:', paymentLinkId, 'Method:', paymentMethod);
      
      const response = await fetch('/api/stripe/wasstrips-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentLinkId,
          paymentType: 'remaining',
          isTestMode: isTestMode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      if (data.success && data.url) {
        // Redirect naar Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL received');
      }

    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Er is een fout opgetreden bij het verwerken van de betaling');
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Betaalgegevens laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Fout</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <BackButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Wasstrips Restbedrag</h1>
                <p className="text-green-100 mt-1">Afronding van uw Wasstrips bestelling</p>
              </div>
              {isTestMode && (
                <div className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-semibold">
                  TEST MODUS
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">€{paymentInfo.amount.toFixed(2)}</h2>
              <p className="text-gray-600">Restbedrag voor uw Wasstrips bestelling</p>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Betalingsoverzicht</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Totaal bestelling:</span>
                  <span className="text-gray-900">€{paymentInfo.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Aanbetaling betaald:</span>
                  <span className="text-green-600">-€{paymentInfo.depositAmount.toFixed(2)}</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Restbedrag:</span>
                  <span className="font-semibold text-gray-900">€{paymentInfo.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Referentie:</span>
                  <span className="text-gray-900 font-mono text-sm">{paymentLinkId}</span>
                </div>
                {isTestMode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modus:</span>
                    <span className="text-yellow-600 font-semibold">Test betaling</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test Mode Warning */}
            {isTestMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-500 text-xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Test Modus Actief</h4>
                    <p className="text-yellow-800 text-sm mb-2">
                      U bevindt zich in test modus. Gebruik de volgende test creditcard gegevens:
                    </p>
                    <div className="bg-yellow-100 rounded p-3 text-sm text-yellow-800">
                      <p><strong>Nummer:</strong> 4242 4242 4242 4242</p>
                      <p><strong>Vervaldatum:</strong> 12/34</p>
                      <p><strong>CVC:</strong> 123</p>
                      <p><strong>Naam:</strong> Test Gebruiker</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <div className="flex items-start space-x-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Uw Wasstrips zijn geleverd!</h4>
                  <p className="text-green-800 text-sm">Uw bestelling is succesvol geleverd. U kunt nu het restbedrag betalen om de transactie af te ronden.</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-gray-900">Betaalmethoden</h3>
              
              {/* iDEAL */}
              <button 
                onClick={() => handlePayment('ideal')}
                disabled={processingPayment}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3"
              >
                {processingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Verwerken...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🏦</span>
                    <span>Betaal met iDEAL</span>
                  </>
                )}
              </button>

              {/* Credit Card */}
              <button 
                onClick={() => handlePayment('card')}
                disabled={processingPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3"
              >
                {processingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Verwerken...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">💳</span>
                    <span>Betaal met Creditcard</span>
                  </>
                )}
              </button>

              {/* Bancontact */}
              <button 
                onClick={() => handlePayment('bancontact')}
                disabled={processingPayment}
                className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3"
              >
                {processingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Verwerken...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">💰</span>
                    <span>Betaal met Bancontact</span>
                  </>
                )}
              </button>
            </div>

            {/* Bank Transfer Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 text-xl">🏛️</span>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Bankoverschrijving</h4>
                  <div className="text-blue-800 text-sm space-y-1">
                    <p><strong>Rekeningnummer:</strong> NL91 ABNA 0417 1643 00</p>
                    <p><strong>Ten name van:</strong> Wasgeurtje.nl</p>
                    <p><strong>Bedrag:</strong> €{paymentInfo.amount.toFixed(2)}</p>
                    <p><strong>Omschrijving:</strong> {paymentLinkId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-500 text-xl">💡</span>
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Tips voor succesvol verkopen</h4>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Plaats de Wasstrips prominent in uw winkel</li>
                    <li>• Gebruik de meegeleverde display materialen</li>
                    <li>• Deel uw ervaringen op social media</li>
                    <li>• Volgende bestelling? Minimum €75 voor nabestellingen</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="text-center">
              <BackButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 