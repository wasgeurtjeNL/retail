'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAddress } from '@/services/postcodeApi';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Address {
  street?: string;
  city?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postcode?: string;
}

interface OrderDetails {
  id: string;
  totalAmount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  date: string;
}

interface RetailerProfile {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  chamber_of_commerce: string;
  vat_number: string;
  website: string;
  notes: string;
  logo_url: string;
}

export default function AddressConfirmationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRegisteredAddress, setHasRegisteredAddress] = useState(false);
  const [registeredAddress, setRegisteredAddress] = useState<Address | null>(null);
  const [useAltAddress, setUseAltAddress] = useState(false);
  const [altAddress, setAltAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  // Nieuwe staten voor het adresformulier
  const [postcode, setPostcode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [addition, setAddition] = useState('');
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // UI Animation states
  const [animateHero, setAnimateHero] = useState(false);
  
  const [shippingMethod, setShippingMethod] = useState<'dhl' | 'postnl'>('dhl');
  const [extraShippingCost, setExtraShippingCost] = useState(0);
  
  useEffect(() => {
    // Start animations after a short delay
    setTimeout(() => setAnimateHero(true), 200);
    
    // Haal bestellingsgegevens op uit localStorage
    const lastOrder = localStorage.getItem('lastOrder');
    if (!lastOrder) {
      // Als er geen bestellingsgegevens zijn, stuur gebruiker terug naar catalogus
      router.push('/retailer-dashboard/catalog');
      return;
    }
    
    try {
      const parsedOrder = JSON.parse(lastOrder);
      setOrderDetails(parsedOrder);
      
      // Haal geregistreerd adres op uit profielgegevens in localStorage
      const retailerProfileData = localStorage.getItem('dev-retailer-profile');
      
      if (retailerProfileData) {
        const profile: RetailerProfile = JSON.parse(retailerProfileData);
        // Map profielgegevens naar de adresstructuur die deze pagina verwacht
        const profileAddress: Address = {
          street: profile.address, // Aanname: 'address' bevat straat + huisnummer
          houseNumber: '', // Huisnummer is onderdeel van 'address'
          houseNumberAddition: '', // Toevoeging is niet apart beschikbaar in profiel
          postcode: profile.postal_code,
          city: profile.city,
        };
        setRegisteredAddress(profileAddress);
        setHasRegisteredAddress(true);
      } else {
        // Fallback naar mock data als er geen profiel in localStorage is
        console.warn('[DEV] Geen retailer profiel gevonden in localStorage, gebruik mock data.');
        setRegisteredAddress({
          street: 'Voorbeeldstraat 123A',
          postcode: '1234 AB',
          city: 'Amsterdam'
        });
        setHasRegisteredAddress(true);
      }
    } catch (error) {
      console.error('Fout bij het laden van adresgegevens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  useEffect(() => {
    // Update verzendkosten op basis van de gekozen verzendmethode
    if (shippingMethod === 'postnl') {
      setExtraShippingCost(5.00);
    } else {
      setExtraShippingCost(0);
    }
  }, [shippingMethod]);
  
  // Directe validatie functie voor de bestelflow
  const validateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setValidatingAddress(true);
    
    try {
      const addressData = await fetchAddress(postcode, houseNumber, addition);
      
      if (addressData.exceptionId) {
        throw new Error("Adres niet gevonden. Controleer uw postcode en huisnummer.");
      }
      
      // Adres is gevonden en gevalideerd, sla het op
      const validatedAddress: Address = {
        street: addressData.street,
        houseNumber: addressData.houseNumber,
        houseNumberAddition: addressData.houseNumberAddition || addition,
        postcode: addressData.postcode,
        city: addressData.city
      };
      
      setAltAddress(validatedAddress);
      setShowAddressForm(false);
    } catch (error) {
      console.error("Adresvalidatie fout:", error);
      setErrorMessage(error instanceof Error ? error.message : "Er is een fout opgetreden bij het valideren van uw adres.");
    } finally {
      setValidatingAddress(false);
    }
  };
  
  const handleAddressConfirmation = () => {
    if (!orderDetails) return;
    
    // Update bestelling met adresgegevens en verzendmethode
    const addressToUse = useAltAddress && altAddress ? altAddress : registeredAddress;
    const updatedOrder = {
      ...orderDetails,
      shippingAddress: addressToUse,
      shippingMethod: shippingMethod,
      extraShippingCost: extraShippingCost,
      totalAmount: orderDetails.totalAmount + extraShippingCost
    };
    
    // Sla bijgewerkte bestelgegevens op
    localStorage.setItem('lastOrder', JSON.stringify(updatedOrder));
    
    // Ga naar de betaalpagina
    router.push('/retailer-dashboard/orders/payment');
  };
  
  // Validatiehelpers
  const isValidPostcode = (pc: string) => /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(pc);
  const isValidHouseNumber = (hn: string) => /^\d+$/.test(hn);
  const canSubmitAddress = isValidPostcode(postcode) && isValidHouseNumber(houseNumber);
  
  if (isLoading) {
    return (
      <div className="h-screen bg-white flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="mt-4 text-slate-600 font-medium">Adresgegevens laden...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header - Simplified for checkout */}
      <header className="bg-white shadow-sm py-4 mb-6">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo */}
            <div className="h-14 flex items-center">
              <img 
                src="/assets/images/branding/default-logo.png" 
                alt="Logo" 
                className="h-full object-contain"
              />
            </div>
            {/* Tagline */}
            <p className="ml-4 text-slate-600 hidden md:block">Uw betrouwbare partner voor kwaliteitsproducten</p>
          </div>
          <div className="text-sm text-slate-500 flex items-center">
            <svg className="w-5 h-5 mr-1 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Beveiligde checkout</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Voortgangsindicator - Interactive */}
        <motion.div 
          className="mb-8 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-2">
            <Link href="/retailer-dashboard/catalog" className="w-1/3 relative group">
              <div className="mx-auto w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center border-2 border-white shadow-md group-hover:bg-slate-300 transition-all cursor-pointer">
                <span className="text-lg font-bold">1</span>
              </div>
              <span className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-all">Winkelwagen</span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-slate-800 text-white text-xs py-1 px-2 rounded absolute -top-8 whitespace-nowrap">
                  Terug naar winkelwagen
                </span>
              </div>
            </Link>
            <div className="w-1/3 relative">
              <div className="mx-auto w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-blue-100">
                <span className="text-lg font-bold">2</span>
              </div>
              <span className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-xs font-bold text-blue-800">Adres</span>
            </div>
            <div className="w-1/3 relative opacity-50 pointer-events-none">
              <div className="mx-auto w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                <span className="text-lg font-bold">3</span>
            </div>
              <span className="absolute left-1/2 transform -translate-x-1/2 mt-2 text-xs font-medium text-slate-600">Betaling</span>
            </div>
          </div>
          <div className="relative h-1 bg-slate-200 rounded-full mt-8">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '66%' }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Content */}
          <div className="md:w-2/3">
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="border-b border-slate-100 py-5 px-6 bg-slate-50">
                <h1 className="text-xl font-bold text-slate-800 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Aflevergegevens
                </h1>
                <p className="text-slate-500 text-sm ml-8">Controleer je afleveradres of voeg een alternatief adres toe</p>
          </div>
          
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-base font-medium text-slate-800 mb-4">Besteloverzicht</h2>
              
              {orderDetails && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                    <div className="flex justify-between">
                  <div>
                        <p className="text-sm text-slate-600">Bestelnummer: <span className="font-medium text-slate-800">{orderDetails.id}</span></p>
                        <p className="text-sm text-slate-600 mt-1">{orderDetails.items.length} items</p>
                  </div>
                  <div className="text-right">
                        <p className="font-bold text-lg text-blue-600">€{orderDetails.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500 mt-1">Inclusief BTW</p>
                      </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Adresbevestiging */}
            {hasRegisteredAddress && registeredAddress && (
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-base font-medium text-slate-800 mb-4">Afleveradres</h2>
                  
                  <div className={`bg-slate-50 border rounded-lg p-4 mb-4 transition-all ${
                    !useAltAddress 
                      ? 'border-blue-300 ring-2 ring-blue-300 ring-opacity-30' 
                      : 'border-slate-200'
                  }`}>
                    <div className="text-slate-800">
                    <p className="font-medium">{user?.email || 'Retailer'}</p>
                      <p className="mt-1">{registeredAddress.street}</p>
                    <p>{registeredAddress.postcode} {registeredAddress.city}</p>
                  </div>
                </div>
                
                  <div className="space-y-3">
                    <div className="flex items-center">
                  <input
                    id="use-registered-address"
                    type="radio"
                    name="address-choice"
                    checked={!useAltAddress}
                    onChange={() => setUseAltAddress(false)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                      <label htmlFor="use-registered-address" className="ml-3 block text-sm text-slate-700">
                    Gebruik bovenstaand adres voor deze bestelling
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="use-alt-address"
                    type="radio"
                    name="address-choice"
                    checked={useAltAddress}
                    onChange={() => setUseAltAddress(true)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                      <label htmlFor="use-alt-address" className="ml-3 block text-sm text-slate-700">
                    Gebruik een alternatief afleveradres
                  </label>
                    </div>
                </div>
              </div>
            )}
            
            {/* Alternatief adres */}
            {useAltAddress && (
                <motion.div 
                  className="p-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-base font-medium text-slate-800 mb-4">Alternatief afleveradres</h2>
                
                {altAddress ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between">
                        <div className="text-slate-800">
                        <p className="font-medium">Alternatief adres</p>
                          <p className="mt-1">{altAddress.street} {altAddress.houseNumber}{altAddress.houseNumberAddition}</p>
                        <p>{altAddress.postcode} {altAddress.city}</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (altAddress) {
                            setPostcode(altAddress.postcode || '');
                            setHouseNumber(altAddress.houseNumber || '');
                            setAddition(altAddress.houseNumberAddition || '');
                          }
                          setShowAddressForm(true);
                          setAltAddress(null);
                        }}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center h-6"
                      >
                        <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Wijzigen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {!showAddressForm ? (
                      <button
                        onClick={() => setShowAddressForm(true)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                      >
                          <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        Voeg een alternatief adres toe
                      </button>
                    ) : (
                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                          <h3 className="text-slate-800 font-medium mb-4">Voer je alternatieve adres in</h3>
                        
                        <form onSubmit={validateAddress} className="space-y-4">
                          <div>
                              <label htmlFor="postcode" className="block text-sm font-medium text-slate-700 mb-1">
                              Postcode *
                            </label>
                            <input
                              type="text"
                              id="postcode"
                              value={postcode}
                              onChange={(e) => setPostcode(e.target.value)}
                              placeholder="1234 AB"
                                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                              required
                            />
                          </div>
                          
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="houseNumber" className="block text-sm font-medium text-slate-700 mb-1">
                                Huisnummer *
                              </label>
                              <input
                                type="text"
                                id="houseNumber"
                                value={houseNumber}
                                onChange={(e) => setHouseNumber(e.target.value)}
                                placeholder="42"
                                  className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                                required
                              />
                            </div>
                            
                            <div>
                                <label htmlFor="addition" className="block text-sm font-medium text-slate-700 mb-1">
                                Toevoeging
                              </label>
                              <input
                                type="text"
                                id="addition"
                                value={addition}
                                onChange={(e) => setAddition(e.target.value)}
                                placeholder="A"
                                  className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                              />
                            </div>
                          </div>
                          
                          {errorMessage && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{errorMessage}</p>
                            </div>
                          )}
                          
                          <div className="flex space-x-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowAddressForm(false)}
                                className="inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Annuleren
                            </button>
                            <button
                              type="submit"
                              disabled={!canSubmitAddress || validatingAddress}
                                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${canSubmitAddress && !validatingAddress ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                            >
                              {validatingAddress ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Valideren...
                                </>
                              ) : 'Valideer adres'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
                </motion.div>
              )}
            </motion.div>

            {/* Verzendmethode - Nieuwe sectie */}
            <div className="p-6 border-t border-slate-100">
              <h2 className="text-base font-medium text-slate-800 flex items-center mb-4">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                </svg>
                Verzendmethode
              </h2>
              
              <div className="space-y-4">
                {/* DHL optie */}
                <div 
                  className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                    shippingMethod === 'dhl' 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-30' 
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                  onClick={() => setShippingMethod('dhl')}
                >
                  <div className="p-4 flex items-center">
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full border ${
                      shippingMethod === 'dhl' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    } mr-3 flex items-center justify-center`}>
                      {shippingMethod === 'dhl' && (
                        <motion.svg 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                          className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-base font-medium text-slate-800">DHL</h3>
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">Standaard</span>
                        </div>
                        <p className="text-slate-600 text-sm mt-1">
                          Levering binnen 1-2 werkdagen
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="h-10 w-16 mr-4 bg-[#FFCC00] flex items-center justify-center rounded">
                          <span className="font-bold text-[#D40511]">DHL</span>
                        </div>
                        <span className="font-medium text-slate-800">€0,00</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* PostNL optie */}
                <div 
                  className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                    shippingMethod === 'postnl' 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-30' 
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                  onClick={() => setShippingMethod('postnl')}
                >
                  <div className="p-4 flex items-center">
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full border ${
                      shippingMethod === 'postnl' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    } mr-3 flex items-center justify-center`}>
                      {shippingMethod === 'postnl' && (
                        <motion.svg 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500 }}
                          className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <h3 className="text-base font-medium text-slate-800">PostNL</h3>
                        <p className="text-slate-600 text-sm mt-1">
                          Levering binnen 1-3 werkdagen
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="h-10 w-16 mr-4 bg-[#EC7405] flex items-center justify-center rounded">
                          <span className="font-bold text-white">PostNL</span>
                        </div>
                        <span className="font-medium text-slate-800">€5,00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee box with different text */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500 mb-6 flex"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mr-4 text-blue-500">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Veilige levering gegarandeerd</h3>
                <p className="text-sm text-slate-600">Alle bestellingen worden zorgvuldig verpakt en met een betrouwbare verzendpartner geleverd.</p>
              </div>
            </motion.div>
            
            {/* Actieknoppen */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-end"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link 
                href="/retailer-dashboard/catalog" 
                className="py-3 px-5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-center font-medium text-sm transition-colors"
              >
                <span className="flex items-center justify-center">
                  <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Terug naar winkelwagen
                </span>
              </Link>
              <motion.button 
                onClick={handleAddressConfirmation}
                disabled={useAltAddress && !altAddress}
                className={`py-3 px-5 rounded-lg font-medium text-sm transition-colors ${
                  useAltAddress && !altAddress
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
                whileHover={!(useAltAddress && !altAddress) ? { scale: 1.02 } : {}}
                whileTap={!(useAltAddress && !altAddress) ? { scale: 0.98 } : {}}
              >
                <span className="flex items-center justify-center">
                Ga naar betalen
                  <svg className="h-4 w-4 ml-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </motion.button>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="md:w-1/3">
            {/* Order stack */}
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-slate-800 text-white py-4 px-5">
                <h2 className="font-bold">Uw bestelling</h2>
              </div>
              <div className="p-5">
                <div className="mb-5">
                  <h3 className="font-medium text-slate-800 mb-2">Inbegrepen in uw pakket:</h3>
                  <ul className="space-y-3">
                    {orderDetails && orderDetails.items.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span className="text-sm text-slate-600">{item.name} <span className="text-slate-500">({item.quantity}x)</span></span>
                      </li>
                    ))}
                  </ul>
                </div>

                {orderDetails && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Subtotaal</span>
                      <span className="text-sm text-slate-800 font-medium">€{orderDetails.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Verzendkosten ({shippingMethod === 'dhl' ? 'DHL' : 'PostNL'})</span>
                      <span className="text-sm text-slate-800 font-medium">€{extraShippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">BTW (21%)</span>
                      <span className="text-sm text-slate-800 font-medium">Inbegrepen</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 mt-2">
                      <span className="font-medium text-slate-800">Totaal</span>
                      <span className="font-bold text-blue-600">€{(orderDetails.totalAmount + extraShippingCost).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Testimonials */}
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-slate-50 border-b border-slate-200 py-3 px-5">
                <h2 className="font-medium text-slate-800">Wat klanten zeggen</h2>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-center mb-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-medium text-slate-600">Thomas B.</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"Zeer tevreden met mijn bestelling. De kwaliteit is uitstekend en de levering was snel."</p>
                  </div>

                  <div>
                    <div className="flex items-center mb-1">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm font-medium text-slate-600">Laura V.</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"Uitstekende producten en geweldige klantenservice. Zeker een aanrader voor elke retailer."</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Trust badges with improved design */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-sm font-medium text-slate-700 mb-4 text-center">Beveiligd en vertrouwd</h3>
              <div className="flex justify-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-700">SSL Beveiliging</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-700">KVK Verificatie</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-700">BTW Gecontroleerd</span>
                </div>
              </div>
            </motion.div>

            {/* Add new info box */}
            <motion.div 
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="bg-blue-50 border-b border-blue-100 py-3 px-5 flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h2 className="font-medium text-slate-800">Hulp nodig?</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 mb-4">Voor vragen over uw bestelling of verzending kunt u contact opnemen met onze klantenservice.</p>
                <div className="flex items-center text-blue-600 font-medium text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                  <span>0800-1234567</span>
                </div>
            </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 