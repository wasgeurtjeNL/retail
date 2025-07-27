"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetApplicationData } from "@/lib/supabase";
import { useFunnelTracker } from "@/lib/funnel-tracker";

interface Address {
  street?: string;
  city?: string;
  houseNumber?: string;
  houseNumberAddition?: string;
  postcode?: string;
}

interface RegistrationFormProps {
  initialAddress?: Address | null;
}

function RegistrationFormContent({ initialAddress }: RegistrationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  const invitationToken = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Netherlands",
    kvkNumber: "",
    vatNumber: "",
    website: "",
    hearAboutUs: "",
    message: "",
    acceptTerms: false,
    wasstripsOptin: false,
    wasstripsDepositAgreed: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [hasStartedRegistration, setHasStartedRegistration] = useState(false);
  
  const funnelTracker = useFunnelTracker();

  // Debug mode key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger on Alt+Shift+R (Reset)
      if (e.altKey && e.shiftKey && e.key === 'R') {
        setDebugMode(prev => !prev);
        if (!debugMode) {
          console.log('Debug mode activated! You can now reset the application data.');
        }
      }
      
      // Reset data on Alt+Shift+D (Debug) when in debug mode
      if (debugMode && e.altKey && e.shiftKey && e.key === 'D') {
        const result = resetApplicationData();
        console.log('Application data reset attempted:', result);
        alert('Applicatie data is gereset. Ververs de pagina om de wijzigingen te zien.');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);

  // Validate invitation token
  useEffect(() => {
    const validateToken = async () => {
      if (!invitationToken) return;

      setIsValidatingToken(true);
      try {
        const response = await fetch('/api/invitations/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: invitationToken }),
        });

        const result = await response.json();

        if (result.valid && result.invitation) {
          setInvitationData(result.invitation);
          // Pre-fill form with invitation data
          setFormData(prev => ({
            ...prev,
            email: result.invitation.email || '',
            businessName: result.invitation.business_name || '',
            contactName: result.invitation.contact_name || '',
            phone: result.invitation.phone || '',
          }));
        } else {
          setSubmitError(result.error || 'Ongeldige uitnodigingstoken');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setSubmitError('Fout bij valideren van uitnodigingstoken');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [invitationToken]);

  // Update form data when initialAddress changes
  useEffect(() => {
    if (initialAddress) {
      const houseNumberAddition = initialAddress.houseNumberAddition || '';
      const addressString = `${initialAddress.street} ${initialAddress.houseNumber}${houseNumberAddition ? ` ${houseNumberAddition}` : ''}`;
      
      setFormData(prev => ({
        ...prev,
        address: addressString,
        city: initialAddress.city || prev.city,
        postalCode: initialAddress.postcode || prev.postalCode
      }));
    }
  }, [initialAddress]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    
    // Track registration started on first meaningful input
    if (!hasStartedRegistration && funnelTracker && value.length > 0 && !isCheckbox) {
      setHasStartedRegistration(true);
      funnelTracker.trackRegistrationStarted({
        firstField: name,
        timestamp: new Date().toISOString()
      });
    }
    
    // Track form field interactions
    if (funnelTracker) {
      funnelTracker.trackFormInteraction('change', name, isCheckbox ? (e.target as HTMLInputElement).checked : value);
    }
    
    setFormData({
      ...formData,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    // Track form submission attempt
    if (funnelTracker) {
      funnelTracker.trackFormSubmitted({
        formData: {
          businessName: formData.businessName,
          email: formData.email,
          hasInvitationToken: !!invitationToken,
          wasstripsOptin: formData.wasstripsOptin
        }
      });
    }

    try {
      // Call the registration API endpoint
      const response = await fetch('/api/retailers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: formData.businessName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          kvkNumber: formData.kvkNumber,
          vatNumber: formData.vatNumber,
          website: formData.website,
          hearAboutUs: formData.hearAboutUs,
          message: formData.message,
          wasstripsOptin: formData.wasstripsOptin,
          wasstripsDepositAgreed: formData.wasstripsDepositAgreed,
          invitationToken: invitationToken,
          referralCode: referralCode // Include referral code if present
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Er is een fout opgetreden bij de registratie');
      }
      
      // Save registration data in localStorage for the thank you page
      localStorage.setItem('registrationData', JSON.stringify({
        businessName: formData.businessName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        kvkNumber: formData.kvkNumber,
        vatNumber: formData.vatNumber,
        website: formData.website,
        hearAboutUs: formData.hearAboutUs,
        message: formData.message,
        wasstripsOptin: formData.wasstripsOptin,
        wasstripsDepositAgreed: formData.wasstripsDepositAgreed,
        registeredAt: new Date().toISOString(),
        status: 'pending'
      }));
      
      // Track successful registration completion
      if (funnelTracker) {
        funnelTracker.trackRegistrationCompleted({
          businessName: formData.businessName,
          email: formData.email,
          hasInvitationToken: !!invitationToken,
          wasstripsOptin: formData.wasstripsOptin,
          registrationTimestamp: new Date().toISOString()
        });
      }
      
      // Redirect to thank you page
      router.push('/registratie-ontvangen');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Er is een probleem opgetreden bij het versturen van uw formulier. Probeer het opnieuw.';
      setSubmitError(errorMessage);
      console.error("Form submission error:", error);
      
      // Track registration error
      if (funnelTracker) {
        funnelTracker.trackError('registration_submission_failed', errorMessage, {
          formData: {
            businessName: formData.businessName,
            email: formData.email
          }
        });
      }
      
      setIsSubmitting(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center py-12">
          <svg className="animate-spin h-10 w-10 text-pink-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Uitnodiging valideren...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-2xl font-bold mb-8 text-center text-gray-800">Retailer Registratie</h2>
        
        {invitationData && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Uitnodiging geaccepteerd
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>U registreert zich via een uitnodiging. Uw account wordt automatisch goedgekeurd na registratie.</p>
                  {invitationData.business_name && (
                    <p className="mt-1"><strong>Bedrijf:</strong> {invitationData.business_name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {submitError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-pink-50 p-4 rounded-lg mb-8">
          <h3 className="text-pink-800 text-lg font-medium mb-4">Bedrijfsgegevens</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="businessName">
                Bedrijfsnaam <span className="text-pink-600">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  placeholder="Uw bedrijfsnaam"
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="contactName">
                Contactpersoon <span className="text-pink-600">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="contactName"
                  name="contactName"
                  type="text"
                  required
                  placeholder="Naam contactpersoon"
                  value={formData.contactName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-8">
          <h3 className="text-blue-800 text-lg font-medium mb-4">Contactgegevens</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                E-mailadres <span className="text-pink-600">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  className={`pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900 ${invitationData ? 'bg-gray-50' : ''}`}
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="uw@email.nl"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!!invitationData}
                  readOnly={!!invitationData}
                />
              </div>
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="phone">
                Telefoonnummer <span className="text-pink-600">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="06-12345678"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg mb-8">
          <h3 className="text-purple-800 text-lg font-medium mb-4">Adresgegevens</h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="address">
              Adres <span className="text-pink-600">*</span>
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                id="address"
                name="address"
                type="text"
                required
                placeholder="Straatnaam en huisnummer"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="city">
                Plaats <span className="text-pink-600">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="city"
                  name="city"
                  type="text"
                  required
                  placeholder="Uw plaats"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="postalCode">
                Postcode <span className="text-pink-600">*</span>
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  required
                  placeholder="1234 AB"
                  value={formData.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="country">
              Land <span className="text-pink-600">*</span>
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <select
                className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                id="country"
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
              >
                <option value="Netherlands">Nederland</option>
                <option value="Belgium">België</option>
                <option value="Germany">Duitsland</option>
                <option value="Other">Anders</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-8">
          <h3 className="text-blue-800 text-lg font-medium mb-4">Bedrijfsgegevens <span className="text-blue-600 text-sm font-normal">(optioneel)</span></h3>
          <p className="text-blue-700 text-sm mb-4">Deze gegevens kunt u ook later invullen in uw profielpagina.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="kvkNumber">
                KvK nummer
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="kvkNumber"
                  name="kvkNumber"
                  type="text"
                  placeholder="12345678"
                  value={formData.kvkNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="vatNumber">
                BTW nummer
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="vatNumber"
                  name="vatNumber"
                  type="text"
                  placeholder="NL123456789B01"
                  value={formData.vatNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="website">
                Website
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                  </svg>
                </div>
                <input
                  className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://www.uwwebsite.nl"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-8">
          <h3 className="text-gray-800 text-lg font-medium mb-4">Aanvullende informatie</h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="hearAboutUs">
              Hoe heeft u over ons gehoord?
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                className="pl-10 shadow-sm appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                id="hearAboutUs"
                name="hearAboutUs"
                type="text"
                placeholder="Social media, via een vriend, etc."
                value={formData.hearAboutUs}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="message">
              Aanvullende Informatie
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <textarea
                className="shadow-sm block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                id="message"
                name="message"
                rows={4}
                placeholder="Extra informatie die u met ons wilt delen..."
                value={formData.message}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        
        {/* NEW: Wasstrips Exclusive Product Section */}
        <div className="bg-cyan-50 p-4 rounded-lg mb-8 border-2 border-cyan-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500 rounded-full transform translate-x-20 -translate-y-20 opacity-10"></div>
          
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 mr-4">
              <div className="w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-cyan-800 text-xl font-bold">Exclusieve Toegang tot Wasstrips</h3>
              <p className="text-cyan-700 mt-1">
                Wilt u toegang tot ons nieuwste en meest gewilde product? Al meer dan 25.000 klanten in de eerste maand!
              </p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg mb-4 border border-cyan-200 relative">
            <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              Beperkte beschikbaarheid
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-gray-800 text-sm">
                  <span className="font-bold">Wasstrips</span> is een revolutionair product met explosieve vraag. 
                  Door de zeer hoge vraag bieden we dit product alleen aan via special voorregistratie en aanbetaling.
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="wasstripsOptin"
                    checked={formData.wasstripsOptin as boolean}
                    onChange={handleChange}
                    className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="wasstripsOptin" className="font-semibold text-gray-700">
                    Ja, ik wil toegang tot de Wasstrips
                  </label>
                  <p className="text-gray-600 mt-1">
                    Door dit aan te vinken krijgt u exclusieve toegang om Wasstrips te verkopen - het product met de hoogste marge (60-70%).
                  </p>
                </div>
              </div>
              
              {formData.wasstripsOptin && (
                <div className="mt-4 pt-4 border-t border-dashed border-cyan-200">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        name="wasstripsDepositAgreed"
                        checked={formData.wasstripsDepositAgreed as boolean}
                        onChange={handleChange}
                        className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="wasstripsDepositAgreed" className="font-semibold text-gray-700">
                        Ik begrijp het aanbetaling proces voor Wasstrips
                      </label>
                      <p className="text-gray-600 mt-1">
                        <strong>Na goedkeuring van uw retailer aanvraag</strong> ontvangt u per e-mail instructies voor een aanbetaling van <strong>€30</strong> (10% van de minimum bestelling van €300). 
                        Deze aanbetaling wordt volledig verrekend met uw eerste Wasstrips bestelling. Het restbedrag betaalt u na ontvangst van de producten.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-cyan-100 p-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <svg className="h-5 w-5 text-cyan-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-cyan-800">Retailers rapporteren tot 35% omzetstijging na het introduceren van Wasstrips</p>
              </div>
              <div className="bg-amber-400 text-black px-2 py-0.5 rounded text-xs font-bold">
                60-70% marge
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg mb-8">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                name="acceptTerms"
                required
                checked={formData.acceptTerms as boolean}
                onChange={handleChange}
                className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptTerms" className="font-medium text-gray-700">
                Ik ga akkoord met de <a href="#" className="text-pink-600 hover:text-pink-800 underline">algemene voorwaarden</a> <span className="text-pink-600">*</span>
              </label>
              <p className="text-gray-500 mt-1">Door dit aan te vinken, gaat u akkoord met onze algemene voorwaarden en privacy beleid.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center pt-4">
          <button
            className="w-full md:w-1/2 flex justify-center items-center px-8 py-4 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-300 transform hover:scale-105"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Bezig met verzenden...
              </>
            ) : (
              <>
                Registratie Versturen
                <svg className="ml-2 -mr-1 w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
      <p className="text-center text-gray-500 text-xs mt-8">
        &copy; 2025 Wasgeurtje.nl. Alle rechten voorbehouden.
      </p>
    </div>
  );
}

export default function RegistrationForm({ initialAddress }: RegistrationFormProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Registratieformulier wordt geladen...</p>
        </div>
      </div>
    }>
      <RegistrationFormContent initialAddress={initialAddress} />
    </Suspense>
  );
} 