'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getRetailerByToken } from '@/lib/supabase';

// Client component die token als prop ontvangt
export default function RetailerActivateClient({ token }: { token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retailerName, setRetailerName] = useState('');

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (!token || token.length < 10) {
          setError('Ongeldige activatielink. Neem contact op met Wasgeurtje support.');
          setIsLoading(false);
          return;
        }
        
        console.log(`Verifying activation token: ${token}`);
        const { retailer, error } = await getRetailerByToken(token);
        
        if (error || !retailer) {
          console.error('Error finding retailer by token:', error);
          setError('Deze activatielink is ongeldig of verlopen. Neem contact op met Wasgeurtje support.');
          setIsLoading(false);
          return;
        }
        
        console.log('Retailer found:', retailer.business_name);
        setEmail(retailer.email || '');
        setRetailerName(retailer.business_name || '');
        setIsLoading(false);
      } catch (error) {
        console.error('Error verifying token:', error);
        setError('Er is een fout opgetreden bij het verifiëren van uw activatielink. Probeer het later opnieuw.');
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]); // Token is nu een prop, geen state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validatie
    if (password !== password2) {
      setError('Wachtwoorden komen niet overeen');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens lang zijn');
      setIsSubmitting(false);
      return;
    }

    try {
      // In een echte applicatie zou je hier een gebruiker aanmaken en koppelen aan de retailer
      // Voor deze demo simuleren we het proces
      
      // Simuleer een API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Toon succes en redirect na een korte pauze
      setSuccess(true);
      
      // Redirect na 3 seconden
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Error activating account:', error);
      setError('Er is een fout opgetreden bij het activeren van uw account. Probeer het later opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {isLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : error && !success ? (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          ) : success ? (
            <div className="rounded-md bg-green-50 p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0">
                  <svg className="h-10 w-10 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-green-800">Account succesvol geactiveerd!</h3>
                  <p className="mt-2 text-base text-green-600">
                    U wordt automatisch doorgestuurd naar de inlogpagina...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  Activeer uw retailer account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Welkom bij het Wasgeurtje retailer portaal! Stel hieronder een wachtwoord in voor uw account.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4 p-4 bg-blue-50 rounded-md">
                  <h3 className="text-blue-800 font-semibold">Bedrijfsgegevens</h3>
                  <p className="text-blue-600 mt-1">{retailerName}</p>
                  <p className="text-blue-600">{email}</p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">{error}</h3>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Wachtwoord
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      placeholder="Minimaal 8 tekens"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password2" className="block text-sm font-medium text-gray-700">
                      Bevestig wachtwoord
                    </label>
                    <input
                      id="password2"
                      name="password2"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                      placeholder="Herhaal wachtwoord"
                    />
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
                        isSubmitting ? 'opacity-70 cursor-wait' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <svg className="animate-spin h-5 w-5 text-pink-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </span>
                          Activeren...
                        </>
                      ) : 'Account activeren'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 