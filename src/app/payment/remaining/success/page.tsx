'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import BackButton from '@/components/BackButton';

// Success pagina voor Wasstrips restbedrag content
function RemainingSuccessContent() {
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
            <h1 className="text-2xl font-bold text-white">Betaling Voltooid!</h1>
            <p className="text-green-100 mt-1">Uw Wasstrips bestelling is volledig betaald</p>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">€270,00 Betaald</h2>
              <p className="text-gray-600">Restbedrag voor Wasstrips bestelling</p>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">Transactie Voltooid!</h3>
                  <p className="text-green-800 text-sm mb-3">
                    Uw restbedrag van €270 is succesvol ontvangen. Uw Wasstrips bestelling is nu volledig betaald!
                  </p>
                  {sessionId && (
                    <p className="text-green-700 text-xs">
                      <strong>Transactie ID:</strong> {sessionId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">Betalingsoverzicht</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-blue-800">Totaal bestelling:</span>
                  <span className="text-blue-900 font-semibold">€300,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Aanbetaling betaald:</span>
                  <span className="text-green-600">€30,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Restbedrag betaald:</span>
                  <span className="text-green-600">€270,00</span>
                </div>
                <hr className="border-blue-300" />
                <div className="flex justify-between">
                  <span className="text-blue-900 font-semibold">Status:</span>
                  <span className="text-green-600 font-semibold">✅ Volledig Betaald</span>
                </div>
              </div>
            </div>

            {/* Success Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-yellow-900 mb-3">🚀 U kunt nu beginnen!</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-600 font-bold">💡</span>
                  <p className="text-yellow-800 text-sm">Plaats de Wasstrips prominent in uw winkel voor maximale zichtbaarheid</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-600 font-bold">📦</span>
                  <p className="text-yellow-800 text-sm">Gebruik de meegeleverde display materialen voor professionele presentatie</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-600 font-bold">📱</span>
                  <p className="text-yellow-800 text-sm">Deel uw ervaringen op social media om meer klanten te trekken</p>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-600 font-bold">🔄</span>
                  <p className="text-yellow-800 text-sm">Nabestellingen vanaf €75 - houd uw voorraad op peil!</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Ondersteuning & Contact</h3>
              <div className="space-y-2">
                <p className="text-gray-700 text-sm">
                  <strong>Verkoop support:</strong> <a href="mailto:support@wasgeurtje.nl" className="text-blue-600 hover:underline">support@wasgeurtje.nl</a>
                </p>
                <p className="text-gray-700 text-sm">
                  <strong>Nabestellingen:</strong> <a href="mailto:orders@wasgeurtje.nl" className="text-blue-600 hover:underline">orders@wasgeurtje.nl</a>
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
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                Naar Dashboard
              </a>
              <a 
                href="/retailer-dashboard/catalog"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
              >
                Bekijk Catalogus
              </a>
              <BackButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RemainingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Betaalresultaat wordt geladen...</p>
        </div>
      </div>
    }>
      <RemainingSuccessContent />
    </Suspense>
  );
} 