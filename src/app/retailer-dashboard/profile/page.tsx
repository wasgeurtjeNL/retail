'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

// Mock data voor development
const mockProfile: RetailerProfile = {
  id: 'r123',
  business_name: 'Wasserij De Sprinter',
  contact_name: 'Jan Janssen',
  email: 'info@wasserijdesprinter.nl',
  phone: '0201234567',
  address: 'Hoofdstraat 123',
  postal_code: '1234 AB',
  city: 'Amsterdam',
  chamber_of_commerce: '12345678',
  vat_number: 'NL123456789B01',
  website: 'www.wasserijdesprinter.nl',
  notes: 'Gespecialiseerd in snelle service en premium wasgeurtjes.',
  logo_url: '/images/retailers/logo-placeholder.png'
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [formData, setFormData] = useState<RetailerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    // In een echte implementatie zou dit data van een API ophalen.
    // Voor development, probeer eerst data uit localStorage te halen.
    setIsLoading(true);
    setTimeout(() => {
      let profileData: RetailerProfile | null = null;
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        const savedProfile = localStorage.getItem('dev-retailer-profile');
        if (savedProfile) {
          try {
            profileData = JSON.parse(savedProfile);
            console.log('[DEV] Loaded profile data from localStorage');
          } catch (e) {
            console.error('[DEV] Error parsing profile data from localStorage', e);
            // Als parsen mislukt, gebruik mock data als fallback
            profileData = mockProfile;
            localStorage.setItem('dev-retailer-profile', JSON.stringify(mockProfile));
          }
        } else {
          // Geen data in localStorage, initialiseer met mock data
          profileData = mockProfile;
        localStorage.setItem('dev-retailer-profile', JSON.stringify(mockProfile));
        localStorage.setItem('dev-retailer-name', mockProfile.business_name);
        console.log('[DEV] Initialized localStorage with mock profile data');
      }
      } else {
        // Fallback voor niet-development omgevingen of SSR
        profileData = mockProfile;
      }
      
      setProfile(profileData);
      setFormData(profileData);
      
      setIsLoading(false);
    }, 500); // Kortere delay voor snellere laadtijd
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
    
    // Reset error/success messages on input change
    setPasswordError('');
    setSuccessMessage('');
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // In een echte implementatie zou dit naar een API sturen
      // Voor demo simuleren we een update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update het profiel in state
      setProfile(formData);
      setIsEditing(false);
      setSuccessMessage('Profielgegevens succesvol bijgewerkt!');
      
      // Save to localStorage for development mode to help with features that need profile data
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        localStorage.setItem('dev-retailer-profile', JSON.stringify(formData));
        localStorage.setItem('dev-retailer-name', formData?.business_name || '');
        console.log('[DEV] Saved profile data to localStorage for development use');
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('De nieuwe wachtwoorden komen niet overeen.');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Het wachtwoord moet minimaal 8 tekens bevatten.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // In een echte implementatie zou dit een API-aanroep naar auth zijn
      // Voor demo simuleren we een update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setSuccessMessage('Wachtwoord succesvol bijgewerkt!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError('Er is een fout opgetreden bij het bijwerken van het wachtwoord.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0 flex justify-center">
        <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (!profile || !formData) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-gray-500">Geen profielgegevens beschikbaar. Neem contact op met de beheerder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Success message notification */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="border-b border-gray-200 pb-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mijn Profiel</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bekijk en beheer uw account- en bedrijfsgegevens
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linker kolom - Bedrijfsinfo */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Bedrijfsgegevens</h2>
                <p className="mt-1 text-sm text-gray-500">Details over uw bedrijf</p>
              </div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
                >
                  Bewerken
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(profile);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuleren
                </button>
              )}
            </div>
            
            <div className="border-t border-gray-200">
              {isEditing ? (
                <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                        Bedrijfsnaam
                      </label>
                      <input
                        type="text"
                        name="business_name"
                        id="business_name"
                        value={formData.business_name}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                        required
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
                        Contactpersoon
                      </label>
                      <input
                        type="text"
                        name="contact_name"
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                        required
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        E-mailadres
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                        required
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Telefoonnummer
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Adres
                      </label>
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                        Postcode
                      </label>
                      <input
                        type="text"
                        name="postal_code"
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-4">
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        Plaats
                      </label>
                      <input
                        type="text"
                        name="city"
                        id="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="chamber_of_commerce" className="block text-sm font-medium text-gray-700">
                        KVK nummer
                      </label>
                      <input
                        type="text"
                        name="chamber_of_commerce"
                        id="chamber_of_commerce"
                        value={formData.chamber_of_commerce}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="vat_number" className="block text-sm font-medium text-gray-700">
                        BTW nummer
                      </label>
                      <input
                        type="text"
                        name="vat_number"
                        id="vat_number"
                        value={formData.vat_number}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                        Website
                      </label>
                      <input
                        type="text"
                        name="website"
                        id="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    
                    <div className="sm:col-span-6">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Aantekeningen
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={handleChange}
                        className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md text-gray-900"
                      ></textarea>
                      <p className="mt-2 text-sm text-gray-500">Korte omschrijving van uw specialisaties of extra informatie.</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(profile);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Opslaan...
                        </>
                      ) : (
                        'Opslaan'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="px-4 py-5 sm:p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Bedrijfsnaam</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.business_name}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Contactpersoon</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.contact_name}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">E-mailadres</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Telefoonnummer</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.phone}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Adres</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile.address}<br />
                        {profile.postal_code} {profile.city}
                      </dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">KVK nummer</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.chamber_of_commerce}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">BTW nummer</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.vat_number}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Website</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-500">
                          {profile.website}
                        </a>
                      </dd>
                    </div>
                    {profile.notes && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Aantekeningen</dt>
                        <dd className="mt-1 text-sm text-gray-900">{profile.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Rechter kolom - Account info en logo */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profielfoto / Logo */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Bedrijfslogo</h2>
              <p className="mt-1 text-sm text-gray-500">Uw logo wordt getoond in onze retailer directory</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6 text-center">
              <div className="space-y-2">
                <div className="mx-auto h-32 w-32 rounded-full overflow-hidden bg-gray-100">
                  <img
                    src={profile.logo_url || '/images/placeholder.png'}
                    alt={`${profile.business_name} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Nieuw logo uploaden
                </button>
              </div>
            </div>
          </div>
          
          {/* Wachtwoord wijzigen */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Wachtwoord wijzigen</h2>
              <p className="mt-1 text-sm text-gray-500">Update uw inloggegevens</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <form onSubmit={handlePasswordSave} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{passwordError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Huidig wachtwoord
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    Nieuw wachtwoord
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Bevestig nieuw wachtwoord
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wachtwoord bijwerken...
                      </>
                    ) : (
                      'Wachtwoord bijwerken'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 