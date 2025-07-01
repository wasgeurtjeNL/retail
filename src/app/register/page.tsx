"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RegistrationForm from "@/components/RegistrationForm";
import PostcodeCheck from "@/components/PostcodeCheck";

interface Address {
  street?: string;
  city?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postcode?: string;
}

export default function RegisterPage() {
  const [addressValidated, setAddressValidated] = useState(false);
  const [validatedAddress, setValidatedAddress] = useState<Address | null>(null);

  const handleAddressValidation = (validated: boolean, address: Address) => {
    setAddressValidated(validated);
    setValidatedAddress(address);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative">
          {/* Decorative elements */}
          <div className="absolute top-10 left-0 w-20 h-20 bg-pink-100 rounded-full opacity-50 -z-10"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-100 rounded-full opacity-50 -z-10"></div>
          <div className="absolute top-1/2 right-0 w-16 h-16 bg-pink-200 rounded-full opacity-30 -z-10"></div>
          
          <div className="text-center mb-12">
            <div className="inline-block p-2 px-5 bg-pink-100 rounded-full text-pink-800 font-semibold text-sm mb-3">
              Word partner
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
              Word een Wasgeurtje Retailer
            </h1>
            <div className="w-20 h-1 bg-pink-500 mx-auto mb-6"></div>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Sluit je aan bij meer dan 150 retailers die sterke verkoopcijfers behalen met onze premium wasgeuren.
              {!addressValidated && " Controleer eerst uw adres voordat u zich aanmeldt."}
            </p>
            
            {/* Proefpakket Information Box */}
            <div className="max-w-2xl mx-auto mt-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-green-800">Gratis Proefpakket</h3>
                  <div className="mt-2 text-green-700 text-sm">
                    <p>
                      Na goedkeuring van je aanmelding sturen wij een <strong>gratis proefpakket</strong> met onze 
                      bestsellers naar je bedrijf. Hiermee kun je direct aan de slag en je klanten laten kennismaken 
                      met onze producten.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 max-w-3xl mx-auto">
            {!addressValidated ? (
              <PostcodeCheck onComplete={handleAddressValidation} />
            ) : (
              <RegistrationForm initialAddress={validatedAddress} />
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 