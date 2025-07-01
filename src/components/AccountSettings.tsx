'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileData {
  id: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  preferred_language?: 'nl' | 'en';
  profile_image_url?: string;
}

export default function AccountSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    id: '',
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    preferred_language: 'nl',
    profile_image_url: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch profile data from API
  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get profile data from the API
        const response = await fetch('/api/profile', {
          // Add cache: 'no-store' to prevent caching issues
          cache: 'no-store'
        });
        
        // Check for network errors first
        if (!response) {
          throw new Error('Network error - failed to connect to API');
        }
        
        // Try to parse the JSON even if the response is not OK
        // This helps debug by capturing any error messages from the API
        const data = await response.json().catch(e => {
          console.error('Error parsing JSON response:', e);
          throw new Error('Invalid response format from API');
        });
        
        // If the request failed but returned structured error data
        if (!response.ok) {
          if (data && data.error) {
            throw new Error(data.error);
          }
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        // Successfully got profile data
        setProfileData({
          id: data.id || '',
          full_name: data.full_name || '',
          company_name: data.company_name || '',
          phone: data.phone || '',
          email: data.email || '',
          preferred_language: data.preferred_language || 'nl',
          profile_image_url: data.profile_image_url || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        
        // Set default data in development mode instead of failing
        if (process.env.NODE_ENV === 'development') {
          console.log('Using default profile data in development mode');
          setProfileData({
            id: user?.id || 'dev-user-id',
            full_name: 'Development User',
            company_name: 'Development Company',
            phone: '1234567890',
            email: user?.email || 'dev@example.com',
            preferred_language: 'nl',
            profile_image_url: '',
          });
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfileData();
  }, [user]);

  // Handle profile form submission via API
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Send profile data to API
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error saving profile');
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveError(error.message || 'Er is een fout opgetreden bij het opslaan van uw profiel. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change via Supabase Auth API
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setPasswordUpdateSuccess(false);
    setPasswordUpdateError(null);
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordUpdateError('De nieuwe wachtwoorden komen niet overeen.');
      setSaving(false);
      return;
    }
    
    // Validate password strength
    if (passwordData.newPassword.length < 8) {
      setPasswordUpdateError('Het wachtwoord moet minimaal 8 tekens bevatten.');
      setSaving(false);
      return;
    }
    
    try {
      // Make API request to auth endpoint for password change
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden bij het wijzigen van uw wachtwoord.');
      }
      
      setPasswordUpdateSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPasswordUpdateSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordUpdateError(error.message || 'Er is een onverwachte fout opgetreden. Probeer het later opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-4 text-gray-500">Profiel laden...</div>;
  }

  return (
    <div>
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Profiel Instellingen</h3>
          <p className="mt-1 text-sm text-gray-500">
            Beheer uw persoonlijke gegevens en voorkeuren.
          </p>
          <div className="mt-6 bg-blue-50 p-4 rounded-md border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800">Tips voor uw profiel:</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Houd uw contactgegevens actueel</li>
              <li>Wijzig regelmatig uw wachtwoord voor meer veiligheid</li>
              <li>Kies uw voorkeurstaal voor een optimale ervaring</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 md:col-span-2">
          <div className="bg-white shadow sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Persoonlijke gegevens</h4>
              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                      Volledige naam
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      id="full_name"
                      value={profileData.full_name || ''}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                      Bedrijfsnaam
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      id="company_name"
                      value={profileData.company_name || ''}
                      onChange={(e) => setProfileData({...profileData, company_name: e.target.value})}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      E-mailadres
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={profileData.email || ''}
                      disabled
                      className="mt-1 bg-gray-50 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-500">E-mailadres kan niet worden gewijzigd.</p>
                  </div>
                  
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Telefoonnummer
                    </label>
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      value={profileData.phone || ''}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                  
                  <div className="col-span-6">
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                      Voorkeurstaal
                    </label>
                    <select
                      id="language"
                      name="language"
                      value={profileData.preferred_language || 'nl'}
                      onChange={(e) => setProfileData({...profileData, preferred_language: e.target.value as 'nl' | 'en'})}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                    >
                      <option value="nl">Nederlands</option>
                      <option value="en">Engels</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300"
                  >
                    {saving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
                
                {saveSuccess && (
                  <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-md">
                    Uw profiel is succesvol bijgewerkt.
                  </div>
                )}
                
                {saveError && (
                  <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md">
                    {saveError}
                  </div>
                )}
              </form>
            </div>
          </div>
          
          <div className="mt-5 bg-white shadow sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Wachtwoord wijzigen</h4>
              <form onSubmit={handlePasswordSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Huidig wachtwoord
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
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
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      required
                      minLength={8}
                    />
                    <p className="mt-1 text-xs text-gray-500">Wachtwoord moet minimaal 8 tekens bevatten.</p>
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
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-pink-300"
                  >
                    {saving ? 'Wachtwoord wijzigen...' : 'Wachtwoord wijzigen'}
                  </button>
                </div>
                
                {passwordUpdateSuccess && (
                  <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-md">
                    Uw wachtwoord is succesvol gewijzigd.
                  </div>
                )}
                
                {passwordUpdateError && (
                  <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md">
                    {passwordUpdateError}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 