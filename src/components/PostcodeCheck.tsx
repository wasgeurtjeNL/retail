"use client";

import { useState, useEffect } from 'react';
import { fetchAddress, checkAreaAvailability } from '@/services/postcodeApi';

interface Address {
  street?: string;
  city?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postcode?: string;
}

interface PostcodeCheckProps {
  onComplete: (validated: boolean, address: Address) => void;
}

export default function PostcodeCheck({ onComplete }: PostcodeCheckProps) {
  const [postcode, setPostcode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [addition, setAddition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState<Address | null>(null);
  const [step, setStep] = useState(0);
  // 0 = input form, 1 = validating address, 2 = confirming address, 3 = checking availability, 4 = success
  const [countdown, setCountdown] = useState(10);

  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState('');

  // Function to add a new status message with typewriter effect
  const addStatusMessage = (message: string, delay = 500) => {
    return new Promise<void>(resolve => {
      setCurrentStatus('');
      let i = 0;
      const typeMessage = () => {
        if (i <= message.length) {
          setCurrentStatus(message.substring(0, i));
          i++;
          if (i <= message.length) {
            setTimeout(typeMessage, 20);
          } else {
            setTimeout(() => {
              setStatusMessages(prev => [...prev, message]);
              setCurrentStatus('');
              resolve();
            }, delay);
          }
        }
      };
      typeMessage();
    });
  };

  // Validation for postcode and house number
  const isValidPostcode = (pc: string) => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(pc);
  const isValidHouseNumber = (hn: string) => /^\d+$/.test(hn);

  // Check if form can be submitted
  const canSubmit = isValidPostcode(postcode) && isValidHouseNumber(houseNumber);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    setStep(1);
    setStatusMessages([]);

    try {
      // Step 1: Validate address
      await addStatusMessage("Verbinding maken met adresvalidatie service...");
      await new Promise(r => setTimeout(r, 800));
      await addStatusMessage("Postcode en huisnummer controleren...");
      
      const addressData = await fetchAddress(postcode, houseNumber, addition);
      
      if (addressData.exceptionId) {
        throw new Error("Adres niet gevonden. Controleer uw postcode en huisnummer.");
      }
      
      await addStatusMessage("Adres gevonden! Controleren op geldigheid...");
      await new Promise(r => setTimeout(r, 600));
      
      setAddress({
        street: addressData.street,
        city: addressData.city,
        houseNumber: addressData.houseNumber,
        houseNumberAddition: addressData.houseNumberAddition,
        postcode: addressData.postcode
      });
      
      setStep(2);
    } catch (error) {
      console.error("Address validation error:", error);
      setError(error instanceof Error ? error.message : "Er is een fout opgetreden bij het valideren van uw adres.");
      setStep(0);
      setLoading(false);
    }
  };

  // Handle address confirmation
  const handleAddressConfirm = async () => {
    setStep(3);
    setStatusMessages([]);
    
    try {
      // Step 2: Check area availability
      await addStatusMessage("Bedankt voor het bevestigen van uw adres!");
      await new Promise(r => setTimeout(r, 500));
      await addStatusMessage("Nu controleren we beschikbaarheid in uw regio...");
      await new Promise(r => setTimeout(r, 1200));
      await addStatusMessage("Scannen van bestaande retailers in uw postcodegebied...");
      await new Promise(r => setTimeout(r, 1500));
      await addStatusMessage("Analyseren van marktpotentieel...");
      await new Promise(r => setTimeout(r, 1300));
      
      const availabilityCheck = await checkAreaAvailability(postcode);
      
      if (!availabilityCheck.available) {
        throw new Error("Helaas is er momenteel geen ruimte voor een nieuwe retailer in uw regio.");
      }
      
      await addStatusMessage("Analyse compleet!");
      await new Promise(r => setTimeout(r, 600));
      
      setStep(4);
      setCountdown(10);
    } catch (error) {
      console.error("Availability check error:", error);
      setError(error instanceof Error ? error.message : "Er is een fout opgetreden bij het controleren van beschikbaarheid.");
      setStep(0);
      setLoading(false);
    }
  };

  // Countdown timer for automatic completion
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // When success step is reached or countdown completes, call the onComplete callback
  useEffect(() => {
    if (step === 4 && address) {
      if (countdown === 0) {
        onComplete(true, address);
        setLoading(false);
      }
    }
  }, [step, address, onComplete, countdown]);

  // Handle continue button click
  const handleContinue = () => {
    if (address) {
      onComplete(true, address);
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setStep(0);
    setAddress(null);
    setError('');
    setLoading(false);
    setStatusMessages([]);
    setCurrentStatus('');
    setCountdown(10);
  };

  return (
    <div className="mb-8">
      {/* Step 0: Initial input form */}
      {step === 0 && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 rounded-xl shadow-xl border border-purple-200 transform transition-all duration-300">
          <h3 className="text-purple-800 text-2xl font-bold mb-6 flex items-center">
            <svg className="h-6 w-6 text-pink-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Adrescontrole
          </h3>
          <p className="text-gray-700 mb-6">
            Vul uw postcode en huisnummer in om te controleren of wij in uw regio kunnen leveren.
            Dit helpt ons om de exclusiviteit van onze producten te waarborgen.
          </p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md shadow-sm">
              <p className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="postcode">
                  Postcode <span className="text-pink-600">*</span>
                </label>
                <div className="relative">
                  <svg className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <input
                    className={`shadow-sm appearance-none block w-full pl-10 pr-4 py-3 border text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                      postcode && !isValidPostcode(postcode) ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    id="postcode"
                    type="text"
                    placeholder="1234 AB"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    required
                  />
                </div>
                {postcode && !isValidPostcode(postcode) && (
                  <p className="mt-1 text-sm text-red-600">Vul een geldige postcode in (bijv. 1234 AB)</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="houseNumber">
                  Huisnummer <span className="text-pink-600">*</span>
                </label>
                <div className="flex space-x-3">
                  <div className="relative w-2/3">
                    <svg className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <input
                      className={`shadow-sm appearance-none block w-full pl-10 pr-4 py-3 border text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all ${
                        houseNumber && !isValidHouseNumber(houseNumber) ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                      }`}
                      id="houseNumber"
                      type="text"
                      placeholder="123"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      required
                    />
                  </div>
                  <input
                    className="shadow-sm appearance-none block w-1/3 px-4 py-3 border border-gray-300 text-gray-800 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    id="addition"
                    type="text"
                    placeholder="A"
                    value={addition}
                    onChange={(e) => setAddition(e.target.value)}
                  />
                </div>
                {houseNumber && !isValidHouseNumber(houseNumber) && (
                  <p className="mt-1 text-sm text-red-600">Vul een geldig huisnummer in</p>
                )}
              </div>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className={`w-full flex justify-center items-center px-6 py-4 border border-transparent text-base font-medium rounded-lg shadow-lg text-white ${
                  canSubmit && !loading
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300'
                    : 'bg-gray-400 cursor-not-allowed'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Controleren...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Controleer Adres
                  </>
                )}
              </button>
            </div>
          </form>
          
          <p className="text-sm text-gray-500 mt-6 text-center">
            We controleren uw adres om te zorgen dat we voldoende retailers in uw regio kunnen ondersteunen
          </p>
        </div>
      )}

      {/* Step 1: Validating address */}
      {step === 1 && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 rounded-xl shadow-xl border border-purple-200">
          <div className="text-center">
            <div className="relative mx-auto h-20 w-20 mb-6">
              <div className="absolute inset-0 rounded-full bg-pink-200 animate-ping opacity-50"></div>
              <div className="relative flex items-center justify-center h-full w-full">
                <svg className="animate-spin h-12 w-12 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-purple-800 mb-4">Adres Valideren</h3>
            
            <div className="bg-white rounded-lg p-6 mb-6 text-left shadow-md border border-gray-100">
              <div className="space-y-3 font-mono text-sm text-gray-700">
                {statusMessages.map((msg, i) => (
                  <div key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{msg}</span>
                  </div>
                ))}
                {currentStatus && (
                  <div className="flex items-start">
                    <span className="animate-pulse text-purple-500 mr-2">▶</span>
                    <span>{currentStatus}<span className="animate-pulse">_</span></span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleReset}
              className="text-pink-600 hover:text-pink-800 text-sm font-medium px-6 py-2.5 border border-pink-200 rounded-lg hover:bg-pink-50 transition-all shadow-sm hover:shadow"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirming address */}
      {step === 2 && address && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 rounded-xl shadow-xl border border-purple-200">
          <h3 className="text-2xl font-bold text-purple-800 mb-6 flex items-center">
            <svg className="h-6 w-6 text-pink-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Bevestig uw adres
          </h3>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-md mb-8">
            <p className="text-gray-800 font-medium mb-3 flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Is dit uw juiste adres?
            </p>
            <div className="mt-2 text-gray-700 p-5 bg-gray-50 rounded-lg border border-gray-100 shadow-inner">
              <p className="text-lg font-medium">{address.street} {address.houseNumber}{address.houseNumberAddition}</p>
              <p className="text-lg">{address.postcode} {address.city}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleAddressConfirm}
              className="flex-1 flex justify-center items-center px-6 py-4 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Ja, dit klopt
            </button>
            
            <button
              onClick={handleReset}
              className="flex-1 flex justify-center items-center px-6 py-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-300"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Nee, aanpassen
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Checking availability */}
      {step === 3 && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 rounded-xl shadow-xl border border-purple-200">
          <div className="text-center">
            <div className="relative mx-auto h-24 w-24 mb-6">
              <div className="absolute animate-ping h-full w-full rounded-full bg-pink-400 opacity-30"></div>
              <div className="absolute animate-pulse h-full w-full flex items-center justify-center">
                <svg className="h-14 w-14 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-purple-800 mb-4">Beschikbaarheid Controleren</h3>
            
            <div className="bg-white rounded-lg p-6 mb-6 text-left shadow-md border border-gray-100">
              <div className="space-y-3 font-mono text-sm text-gray-700">
                {statusMessages.map((msg, i) => (
                  <div key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>{msg}</span>
                  </div>
                ))}
                {currentStatus && (
                  <div className="flex items-start">
                    <span className="animate-pulse text-purple-500 mr-2">▶</span>
                    <span>{currentStatus}<span className="animate-pulse">_</span></span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleReset}
              className="text-pink-600 hover:text-pink-800 text-sm font-medium px-6 py-2.5 border border-pink-200 rounded-lg hover:bg-pink-50 transition-all shadow-sm hover:shadow"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all animate-fadeIn">
            <div className="text-center relative">
              {/* Success icon with animation */}
              <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-40"></div>
                  <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-full p-5 border-4 border-white shadow-xl relative">
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mt-10 mb-2">Gefeliciteerd!</h3>
              
              <div className="w-20 h-1.5 bg-gradient-to-r from-green-500 to-green-400 mx-auto mb-6 rounded-full"></div>
              
              <p className="text-lg text-gray-700 mb-6">
                Er is nog ruimte voor <span className="font-bold text-green-600">exclusieve toegang</span> tot Wasgeurtje B2B in uw regio!
              </p>
              
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-lg border border-yellow-200 mb-8 shadow-inner">
                <div className="flex items-center justify-center mb-2">
                  <svg className="h-6 w-6 text-amber-500 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-amber-800 font-medium text-lg">Limited-time offer!</p>
                </div>
                <p className="text-amber-800">
                  Meld u snel aan voordat iemand anders u voor is! 
                  <br />Vul het registratieformulier verder in om uw aanmelding te voltooien.
                </p>
              </div>
              
              <button
                onClick={handleContinue}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center"
              >
                <span>Verder Gaan</span>
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <div className="mt-4 bg-gray-50 rounded-full p-2 border border-gray-200 flex items-center justify-center">
                <svg className="h-5 w-5 text-gray-400 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-gray-600">
                  U wordt automatisch doorgestuurd over <span className="font-medium text-pink-600">{countdown}</span> seconden
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 