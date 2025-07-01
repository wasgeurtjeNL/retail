"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from 'next/navigation';

interface RegistrationData {
  businessName: string;
  email: string;
  registeredAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function RegistratieOntvangenPage() {
  const router = useRouter();
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [countdown, setCountdown] = useState(2 * 24 * 60 * 60); // 2 days in seconds
  
  useEffect(() => {
    // Get registration data from localStorage
    const storedData = localStorage.getItem('registrationData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setRegistrationData(parsedData);
      } catch (error) {
        console.error('Failed to parse registration data', error);
      }
    } else {
      // Redirect if no registration data (direct access to page)
      router.push('/register');
    }
    
    // Set up countdown timer
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);
  
  // Format countdown for display
  const formatCountdown = () => {
    if (!countdown) return { days: 0, hours: 0, minutes: 0 };
    
    const days = Math.floor(countdown / (24 * 60 * 60));
    const hours = Math.floor((countdown % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((countdown % (60 * 60)) / 60);
    
    return { days, hours, minutes };
  };
  
  const { days, hours, minutes } = formatCountdown();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-5xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -top-10 -left-10 w-36 h-36 bg-pink-100 rounded-full opacity-60 -z-10 animate-pulse"></div>
            <div className="absolute top-40 -right-10 w-24 h-24 bg-purple-100 rounded-full opacity-60 -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute -bottom-10 left-20 w-20 h-20 bg-yellow-100 rounded-full opacity-60 -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-10 relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
                <div className="absolute left-0 bottom-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
                
                <div className="relative z-10 flex justify-center">
                  <div className="bg-white rounded-full p-3 shadow-md">
                    <svg className="h-14 w-14 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                <h1 className="mt-6 text-3xl font-extrabold text-white text-center">
                  Registratie Ontvangen!
                </h1>
                
                <p className="mt-2 text-white text-opacity-90 text-center max-w-2xl mx-auto">
                  Bedankt voor uw interesse in het worden van een Wasgeurtje retailer. 
                  Uw aanvraag is in goede orde ontvangen en wordt nu beoordeeld door ons team.
                </p>
              </div>
              
              <div className="px-8 py-10">
                <div className="mb-10 border-b border-gray-200 pb-10">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Aanvraag Details
                  </h2>
                  
                  {registrationData && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Bedrijfsnaam</h3>
                        <p className="text-lg font-semibold text-gray-900">{registrationData.businessName}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">E-mailadres</h3>
                        <p className="text-lg font-semibold text-gray-900">{registrationData.email}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Datum aanvraag</h3>
                        <p className="text-lg font-semibold text-gray-900">
                          {registrationData.registeredAt 
                            ? new Date(registrationData.registeredAt).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                        <div className="flex items-center mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            <svg className="h-4 w-4 mr-1.5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            In behandeling
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Wat Gebeurt Er Nu?
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-pink-500 text-white">
                          <span>1</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Beoordeling van uw aanvraag</h3>
                        <p className="mt-2 text-base text-gray-600">
                          Ons team beoordeelt uw aanvraag om te bepalen of uw winkel geschikt is als 
                          Wasgeurtje-retailer. We kijken naar diverse factoren zoals locatie en winkelprofiel.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-pink-500 text-white">
                          <span>2</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Bevestiging per e-mail</h3>
                        <p className="mt-2 text-base text-gray-600">
                          Binnen 2 werkdagen ontvangt u van ons een e-mail met de uitslag van uw aanvraag. 
                          Bij goedkeuring krijgt u direct toegang tot uw retailer account.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-pink-500 text-white">
                          <span>3</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">Ontvangst van uw gratis proefpakket</h3>
                        <p className="mt-2 text-base text-gray-600">
                          Na goedkeuring ontvangt u binnen 5 werkdagen een gratis proefpakket met onze 
                          populairste wasgeuren, zodat u direct kunt starten met de verkoop.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-10">
                  <div className="flex flex-col sm:flex-row items-center">
                    <div className="flex-shrink-0 mb-4 sm:mb-0">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <svg className="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="sm:ml-6 text-center sm:text-left">
                      <h3 className="text-lg font-bold text-blue-800">Verwachte reactietijd</h3>
                      <p className="mt-1 text-blue-700">
                        U ontvangt binnen 2 werkdagen bericht over uw aanvraag.
                      </p>
                      
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{days}</div>
                          <div className="text-xs text-blue-500">Dagen</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{hours}</div>
                          <div className="text-xs text-blue-500">Uren</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{minutes}</div>
                          <div className="text-xs text-blue-500">Minuten</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <Link 
                    href="/"
                    className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300"
                  >
                    Terug naar Home
                  </Link>
                  
                  <Link 
                    href="/contact"
                    className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300"
                  >
                    Contact Opnemen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 