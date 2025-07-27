'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import WebsiteAnalysisSection, { WebsiteAnalysisData } from '@/components/WebsiteAnalysisSection';

interface RetailerProfile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  website: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  full_name: string;
  company_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  kvk_number: string;
  vat_number: string;
  website: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    company_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    kvk_number: '',
    vat_number: '',
    website: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [websiteAnalysis, setWebsiteAnalysis] = useState<WebsiteAnalysisData | null>(null);
  
  // Laad profielgegevens bij het laden van de pagina
  useEffect(() => {
    if (user) {
      loadProfile();
    } else if (!user && !authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.error('Gebruiker niet ingelogd');
        return;
      }
      
      // Haal profiel direct op uit Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Fout bij ophalen profiel:', profileError);
        return;
      }
      
      setProfile(profileData);
      
      // Vul formulierdata
      setFormData({
        full_name: profileData.full_name || '',
        company_name: profileData.company_name || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        city: profileData.city || '',
        postal_code: profileData.postal_code || '',
        kvk_number: profileData.kvk_number || '',
        vat_number: profileData.vat_number || '',
        website: profileData.website || ''
      });
      
    } catch (error) {
      console.error('Fout bij laden profiel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');

    try {
      if (!user) {
        throw new Error('Gebruiker niet ingelogd');
      }

      // Update profiel direct in Supabase
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          company_name: formData.company_name || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          kvk_number: formData.kvk_number || null,
          vat_number: formData.vat_number || null,
          website: formData.website || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message || 'Fout bij opslaan');
      }

      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccessMessage('Gegevens succesvol opgeslagen!');

      // Verberg succesbericht na 3 seconden
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Fout bij opslaan:', error);
      alert(error instanceof Error ? error.message : 'Onbekende fout bij opslaan');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0 flex justify-center">
        <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-red-500">Geen profielgegevens beschikbaar.</p>
          <button 
            onClick={loadProfile}
            className="mt-4 bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow-xl rounded-xl border border-gray-100">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Bedrijfsprofiel
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Beheer uw bedrijfsgegevens en profiel informatie
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEditing ? "M6 18L18 6M6 6l12 12" : "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"} />
              </svg>
              {isEditing ? 'Annuleren' : 'Bewerken'}
            </button>
          </div>
          
          {/* Success message */}
      {successMessage && (
            <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
                  <p className="text-sm text-green-700 font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Analyzer - Left column */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Profiel Volledigheid
                </h4>
                
                {/* Volledigheid analyser */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Bedrijfsnaam</span>
                    <span className={`text-sm font-bold ${profile.company_name ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.company_name ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Contactpersoon</span>
                    <span className={`text-sm font-bold ${profile.full_name ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.full_name ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Telefoon</span>
                    <span className={`text-sm font-bold ${profile.phone ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.phone ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Adres</span>
                    <span className={`text-sm font-bold ${profile.address ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.address ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Plaats</span>
                    <span className={`text-sm font-bold ${profile.city ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.city ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Postcode</span>
                    <span className={`text-sm font-bold ${profile.postal_code ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.postal_code ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">KvK nummer</span>
                    <span className={`text-sm font-bold ${profile.kvk_number ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.kvk_number ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">BTW nummer</span>
                    <span className={`text-sm font-bold ${profile.vat_number ? 'text-green-600' : 'text-red-500'}`}>
                      {profile.vat_number ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Website</span>
                    <span className={`text-sm font-bold ${profile.website ? 'text-green-600' : 'text-orange-500'}`}>
                      {profile.website ? '✓' : '○'}
                    </span>
                  </div>
      </div>
      
                {/* Percentage berekening */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Volledigheid</span>
                    <span className="text-lg font-bold text-gray-900">
                      {Math.round(([
                        profile.company_name,
                        profile.full_name,
                        profile.phone,
                        profile.address,
                        profile.city,
                        profile.postal_code,
                        profile.kvk_number,
                        profile.vat_number
                      ].filter(Boolean).length / 8) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                      style={{ 
                        width: `${Math.round(([
                          profile.company_name,
                          profile.full_name,
                          profile.phone,
                          profile.address,
                          profile.city,
                          profile.postal_code,
                          profile.kvk_number,
                          profile.vat_number
                        ].filter(Boolean).length / 8) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Profile Data - Right columns */}
            <div className="lg:col-span-2">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Bedrijfsgegevens */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Bedrijfsgegevens</h4>
                        <p className="text-sm text-gray-600">Algemene bedrijfsinformatie</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bedrijfsnaam <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                          name="company_name"
                          required
                          value={formData.company_name}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="Naam van uw bedrijf"
                      />
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contactpersoon <span className="text-red-500">*</span>
                      </label>
                      <input
                          type="text"
                          name="full_name"
                          required
                          value={formData.full_name}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="Volledige naam"
                      />
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {profile.email}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Telefoon <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                          required
                        value={formData.phone}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="Telefoonnummer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adresgegevens */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Adresgegevens</h4>
                        <p className="text-sm text-gray-600">Zakelijk adres en locatie</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adres <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                          required
                        value={formData.address}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="Straatnaam en huisnummer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plaats <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          required
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="Woonplaats"
                      />
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postcode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="postal_code"
                          required
                        value={formData.postal_code}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="1234AB"
                      />
                      </div>
                    </div>
                    </div>
                    
                  {/* Fiscale gegevens */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Fiscale gegevens</h4>
                        <p className="text-sm text-gray-600">KvK en BTW informatie</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          KvK nummer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                          name="kvk_number"
                          required
                          value={formData.kvk_number}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="12345678"
                      />
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          BTW nummer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="vat_number"
                          required
                        value={formData.vat_number}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="NL123456789B01"
                      />
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Website <span className="text-gray-500">(optioneel)</span>
                      </label>
                      <input
                          type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 transition-all duration-200"
                          placeholder="https://www.uwwebsite.nl"
                      />
                    </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium"
                    >
                      Annuleren
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                    >
                      {isSaving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Opslaan...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Opslaan
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8">
                  {/* Bedrijfsgegevens - View mode */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Bedrijfsgegevens</h4>
                        <p className="text-sm text-gray-600">Algemene bedrijfsinformatie</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bedrijfsnaam</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.company_name || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contactpersoon</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.full_name || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {profile.email}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefoon</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.phone || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adresgegevens - View mode */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Adresgegevens</h4>
                        <p className="text-sm text-gray-600">Zakelijk adres en locatie</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.address || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plaats</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.city || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.postal_code || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.country || 'Nederland'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fiscale gegevens - View mode */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Fiscale gegevens</h4>
                        <p className="text-sm text-gray-600">KvK en BTW informatie</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">KvK nummer</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.kvk_number || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">BTW nummer</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.vat_number || (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Website <span className="text-gray-500">(optioneel)</span></label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.website ? (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                              {profile.website}
                            </a>
                          ) : (
                            <span className="text-gray-500 italic">Niet ingevuld</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account informatie - View mode */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">Account informatie</h4>
                        <p className="text-sm text-gray-600">Status en account details</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[48px] flex items-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            (profile.status === 'approved' || profile.status === 'active') ? 'bg-green-100 text-green-800' :
                            profile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(profile.status === 'approved' || profile.status === 'active') ? 'Goedgekeurd' :
                             profile.status === 'pending' ? 'In behandeling' :
                             profile.status === 'rejected' ? 'Afgekeurd' :
                             'Onbekend'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {profile.role === 'retailer' ? 'Retailer' : profile.role}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Aangemaakt op</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {new Date(profile.created_at).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Laatst bijgewerkt</label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[48px] flex items-center">
                          {new Date(profile.updated_at).toLocaleDateString('nl-NL')}
                    </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Website Analyse Sectie */}
          <div className="mt-8">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Website Analyse
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                AI-analyse van uw bedrijfswebsite voor betere categorisatie en aanbevelingen.
              </p>
            </div>
            
            {profile && profile.website ? (
              <WebsiteAnalysisSection
                websiteUrl={profile.website}
                onAnalysisUpdate={setWebsiteAnalysis}
              />
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Geen website gevonden</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Voeg eerst een website toe aan uw profiel om website analyse uit te kunnen voeren.
                </p>
                {!isEditing && (
                  <div className="mt-4">
                <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700"
                >
                      Website toevoegen
                </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Waarschuwing voor ontbrekende gegevens */}
          {([
            profile.company_name,
            profile.full_name,
            profile.phone,
            profile.address,
            profile.city,
            profile.postal_code,
            profile.kvk_number,
            profile.vat_number
          ].filter(Boolean).length < 8) && (
            <div className="mt-6 bg-orange-50 border-l-4 border-orange-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                  <p className="text-sm text-orange-700">
                    <strong>Profiel incompleet:</strong> Voor het plaatsen van bestellingen zijn alle bedrijfsgegevens verplicht. 
                    Neem contact op met de admin om uw gegevens aan te vullen.
                  </p>
                      </div>
                    </div>
                  </div>
                )}
        </div>
      </div>
    </div>
  );
} 