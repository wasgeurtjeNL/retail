"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createCheckoutSession, StripeLineItem } from "@/lib/stripe";

interface WasstripsExclusiveOfferProps {
  onApply?: (apply: boolean) => void;
}

export default function WasstripsExclusiveOffer({ onApply }: WasstripsExclusiveOfferProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  // Countdown tot einde van aanmeldperiode
  useEffect(() => {
    // Stel einddatum in op 2 weken vanaf nu
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const handleApply = async () => {
    if (!acceptedTerms) return;
    
    setIsApplying(true);
    
    try {
      // Genereer een uniek ID voor deze aanvraag
      const applicationId = `WS-${Date.now()}`;
      
      // Haal retailer gegevens op (als die er zijn)
      let retailerInfo: {
        businessName?: string;
        contactName?: string;
        email?: string;
        phone?: string;
      } = {};
      try {
        const storedInfo = localStorage.getItem('registrationData');
        if (storedInfo) {
          retailerInfo = JSON.parse(storedInfo);
        }
      } catch (err) {
        console.error("Error getting retailer info:", err);
      }
      
      // Sla aanmelding op in localStorage voor demo-doeleinden
      const applicationData = {
        id: applicationId,
        applied: true,
        appliedAt: new Date().toISOString(),
        status: 'pending',
        isPaid: false,
        ...retailerInfo
      };
      
      // Update voor klant
      localStorage.setItem('wasstripsApplication', JSON.stringify(applicationData));
      
      // Update voor admin dashboard (direct)
      const existingApps = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
      const newApplication = {
        id: applicationId,
        businessName: retailerInfo.businessName || 'Onbekend bedrijf',
        contactName: retailerInfo.contactName || 'Onbekende contactpersoon',
        email: retailerInfo.email || 'geen@email.com',
        phone: retailerInfo.phone || 'Geen telefoonnummer',
        appliedAt: new Date().toISOString(),
        isPaid: false,
        status: "pending",
        notes: ""
      };
      
      // Controleer of deze aanvraag al bestaat
      const exists = existingApps.some((app: any) => app.id === applicationId);
      if (!exists) {
        // Voeg de nieuwe aanvraag toe aan de array
        const updatedApps = [...existingApps, newApplication];
        localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApps));
      }
      
      // Maak Stripe checkout sessie aan voor 10% aanbetaling
      // Minimum bestelling is €300, dus 10% is €30
      const items: StripeLineItem[] = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Wasstrips Aanbetaling (10%)',
              description: `Aanbetaling voor exclusieve toegang tot Wasstrips - Referentie: ${applicationId}`,
              images: ['/assets/images/wasstrips-product.jpg']
            },
            unit_amount: 3000 // €30 in centen
          },
          quantity: 1
        }
      ];
      
      const result = await createCheckoutSession(items, applicationId);
      
      if ('url' in result) {
        // Redirect naar Stripe
        window.location.href = result.url;
      } else {
        // Fout bij aanmaken sessie, toon toch het succes scherm
        if (onApply) onApply(true);
        alert('Fout bij het openen van de betaalpagina. Aanmelding is wel geregistreerd.');
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      // Bij fout alsnog bevestigen dat aanmelding is ontvangen
      if (onApply) onApply(true);
      alert('Er is een fout opgetreden bij het openen van de betaalpagina. Uw aanmelding is wel geregistreerd.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-cyan-50 to-white rounded-xl shadow-xl border-2 border-cyan-400 overflow-hidden">
      <div className="absolute top-4 right-4 bg-red-600 text-white font-bold py-1.5 px-4 rounded-full shadow-lg animate-pulse">
        <span className="text-sm">INSCHRIJVING SLUIT OVER</span>
        <span className="ml-2 bg-white text-red-600 px-1.5 rounded">
          {timeLeft.days}d {timeLeft.hours}u {timeLeft.minutes}m
        </span>
      </div>
      
      <div className="p-6">
        <div className="flex items-start mb-6">
          <div className="flex-shrink-0 mr-4">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Exclusieve Wasstrips Pre-order</h2>
            <p className="text-gray-700 mt-1">
              Ons nieuwste product met ongekende vraag - speciaal beschikbaar voor geselecteerde retailers
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <svg className="h-6 w-6 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Minimumbestelling</h3>
            </div>
            <p className="text-gray-700">Minimale orderwaarde van <span className="font-bold">€300</span> voor Wasstrips</p>
            <p className="text-gray-500 text-sm mt-2">Hiermee verzekert u uw voorraad voor de komende vraag</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <svg className="h-6 w-6 text-cyan-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Aanbetaling</h3>
            </div>
            <p className="text-gray-700"><span className="font-bold">10% aanbetaling</span> vereist bij aanmelding</p>
            <p className="text-gray-500 text-sm mt-2">De aanbetaling wordt volledig verrekend met uw bestelling</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">Levertijd</h3>
            </div>
            <p className="text-gray-700"><span className="font-bold">Eerder bestellen = eerder leveren</span></p>
            <p className="text-gray-500 text-sm mt-2">Bestellingen worden verwerkt op volgorde van aanmelding</p>
          </div>
        </div>
        
        <div className="bg-cyan-50 p-5 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Waarom Wasstrips?</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-cyan-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Hoogste marge in ons assortiment: <span className="font-semibold">60-70% winstmarge</span></span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-cyan-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Al <span className="font-semibold">25.000+ klanten</span> in de eerste maand</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-cyan-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Retailers rapporteren <span className="font-semibold">gemiddeld 35% omzetstijging</span></span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-cyan-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">Uniek, innovatief product - <span className="font-semibold">exclusief verkrijgbaar via geselecteerde retailers</span></span>
            </li>
          </ul>
        </div>
        
        <div className="bg-amber-50 p-5 rounded-lg border-l-4 border-amber-500 mb-6">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-800">Belangrijk om te weten</h4>
              <p className="mt-1 text-amber-700">
                De aanmeldperiode duurt slechts <span className="font-bold">2 weken</span>. Alle aanmeldingen worden verwerkt op volgorde 
                van binnenkomst. Hoe eerder u bestelt, hoe eerder u kunt profiteren van dit exclusieve product.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
              />
            </div>
            <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
              Ik ga akkoord met de <span className="font-semibold">minimumbestelling van €300</span> en 
              <span className="font-semibold"> 10% aanbetaling</span> voor toegang tot Wasstrips
            </label>
          </div>
          
          <button
            onClick={handleApply}
            disabled={!acceptedTerms || isApplying}
            className={`w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
              acceptedTerms 
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800' 
                : 'bg-gray-300 cursor-not-allowed'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors`}
          >
            {isApplying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Aanmelding verwerken...
              </>
            ) : (
              'Aanmelden voor exclusieve toegang tot Wasstrips'
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Beveiligde betaalmethode</span>
          </div>
          <div className="flex items-center">
            <svg className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Persoonlijke ondersteuning beschikbaar</span>
          </div>
        </div>
      </div>
    </div>
  );
}