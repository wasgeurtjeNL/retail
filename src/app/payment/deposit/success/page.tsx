'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

// Success pagina voor Wasstrips aanbetaling
export default function DepositSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const paymentLink = searchParams.get('payment_link');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading voor payment verificatie
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Betaling verifiëren...</p>
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
            <h1 className="text-2xl font-bold text-white">Betaling Geslaagd!</h1>
            <p className="text-green-100 mt-1">Uw aanbetaling is succesvol verwerkt</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">€30,00 Betaald</h2>
              <p className="text-gray-600">Aanbetaling voor Wasstrips bestelling</p>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-3">
                <span className="text-green-500 text-xl">🎉</span>
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">Gefeliciteerd!</h3>
                  <p className="text-green-800 text-sm mb-3">
                    Uw aanbetaling van €30 is succesvol ontvangen. Wij gaan nu uw Wasstrips bestelling voorbereiden.
                  </p>
                  {sessionId && (
                    <p className="text-green-700 text-xs">
                      <strong>Transactie ID:</strong> {sessionId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">Wat gebeurt er nu?</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-500 font-bold">1.</span>
                  <p className="text-blue-800 text-sm">Wij bereiden uw Wasstrips bestelling voor</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-500 font-bold">2.</span>
                  <p className="text-blue-800 text-sm">U ontvangt uw producten binnen 2-3 werkdagen</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-500 font-bold">3.</span>
                  <p className="text-blue-800 text-sm">Na levering ontvangt u een email voor het restbedrag van €270</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-500 font-bold">4.</span>
                  <p className="text-blue-800 text-sm">Na volledige betaling kunt u beginnen met verkopen!</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Vragen over uw bestelling?</h3>
              <div className="space-y-2">
                <p className="text-gray-700 text-sm">
                  <strong>Email:</strong> <a href="mailto:orders@wasgeurtje.nl" className="text-blue-600 hover:underline">orders@wasgeurtje.nl</a>
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Telefoon:</strong> <a href="tel:+31123456789" className="text-blue-600 hover:underline">+31 (0)12 345 6789</a>
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Kantooruren:</strong> Maandag t/m vrijdag 9:00 - 17:00
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/retailer-dashboard"
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                Naar Dashboard
              </a>
              <BackButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 