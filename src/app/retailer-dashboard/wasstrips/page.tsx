"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import WasstripsExclusiveOffer from "@/components/WasstripsExclusiveOffer";
import Link from "next/link";

export default function WasstripsRegistrationPage() {
  const [hasApplied, setHasApplied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);
  const searchParams = useSearchParams();
  
  // Check betaalstatus en aanmeldstatus bij laden
  useEffect(() => {
    // Check betaalstatus uit URL parameters
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setPaymentStatus('success');
      setHasApplied(true);
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
      // Bij geannuleerde betaling blijft de aanmelding geldig, maar tonen we een melding
    }
    
    // Check of de gebruiker al heeft aangemeld (voor demo-doeleinden)
    const storedApplication = localStorage.getItem('wasstripsApplication');
    if (storedApplication) {
      try {
        const application = JSON.parse(storedApplication);
        if (application.applied) {
          setHasApplied(true);
        }
      } catch (error) {
        console.error("Error parsing wasstrips application:", error);
      }
    }
  }, [searchParams]);
  
  const handleApply = (applied: boolean) => {
    setHasApplied(applied);
  };
  
  // Toggle voor development
  const toggleAppliedStatus = () => {
    if (hasApplied) {
      localStorage.removeItem('wasstripsApplication');
    } else {
      localStorage.setItem('wasstripsApplication', JSON.stringify({
        applied: true,
        appliedAt: new Date().toISOString(),
        status: 'pending'
      }));
    }
    setHasApplied(!hasApplied);
    setPaymentStatus(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exclusieve Wasstrips Registratie</h1>
              <p className="mt-1 text-gray-600">
                Speciale aanmelding voor ons nieuwste en meest gewilde product
              </p>
            </div>
            <Link 
              href="/retailer-dashboard" 
              className="text-cyan-600 hover:text-cyan-800 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Terug naar dashboard
            </Link>
          </div>
        </div>
        
        {/* Payment Status Alert */}
        {paymentStatus === 'success' && (
          <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Betaling geslaagd!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Uw aanbetaling is succesvol verwerkt. Wij zullen uw aanmelding prioriteren.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {paymentStatus === 'cancelled' && (
          <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Betaling niet afgerond</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Uw betaling is niet afgerond. Uw aanmelding is wel geregistreerd, maar om prioriteit te krijgen raden we aan de aanbetaling alsnog te voldoen.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Development Toggle Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={toggleAppliedStatus}
            className="bg-gray-200 py-1 px-3 rounded text-xs text-gray-700 hover:bg-gray-300"
          >
            DEV: {hasApplied ? "Reset Aanmelding" : "Simuleer Aanmelding"}
          </button>
        </div>
        
        {hasApplied ? (
          <div className="bg-green-50 rounded-xl p-8 border border-green-200 shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Aanmelding ontvangen!</h2>
            <p className="text-gray-700 text-center mb-6">
              Uw aanmelding voor de exclusieve Wasstrips is succesvol ontvangen. Wij zullen uw aanmelding prioriteren.
            </p>
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Volgende stappen:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Na bevestiging van uw aanmelding wordt uw bestelling in de wachtrij geplaatst</li>
                <li>U ontvangt een bevestiging van de verwachte leverdatum</li>
              </ol>
            </div>
            <div className="text-center">
              <Link 
                href="/retailer-dashboard" 
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Terug naar dashboard
              </Link>
            </div>
          </div>
        ) : (
          <WasstripsExclusiveOffer onApply={handleApply} />
        )}
      </div>
    </div>
  );
} 