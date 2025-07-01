"use client";

import { useState } from 'react';
import { fetchAddress } from '@/services/postcodeApi';

export default function PostcodeTest() {
  const [postcode, setPostcode] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [addition, setAddition] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      console.log(`Testing with: ${postcode}, ${houseNumber}, ${addition}`);
      const adres = await fetchAddress(postcode, houseNumber, addition);
      
      console.log('API result:', adres);
      setResult(adres);
      
      if (adres.exceptionId) {
        setError(adres.message || 'Er is een fout opgetreden');
      }
    } catch (err) {
      console.error('Error during API test:', err);
      setError('Er is een onverwachte fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Postcode API Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Postcode
          </label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="1011AC"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Huisnummer
          </label>
          <input
            type="text"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            placeholder="1"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Toevoeging (optioneel)
          </label>
          <input
            type="text"
            value={addition}
            onChange={(e) => setAddition(e.target.value)}
            placeholder="A"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <button
          onClick={handleTest}
          disabled={loading || !postcode || !houseNumber}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading || !postcode || !houseNumber
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-pink-600 hover:bg-pink-700'
          }`}
        >
          {loading ? 'Bezig met ophalen...' : 'Test Postcode API'}
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          <p className="font-medium">Fout</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && !result.exceptionId && (
        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
          <p className="font-medium text-green-800 mb-2">Adres gevonden:</p>
          <div className="text-gray-700">
            <p>{result.street} {result.houseNumber}{result.houseNumberAddition ? ` ${result.houseNumberAddition}` : ''}</p>
            <p>{result.postcode} {result.city}</p>
            <p className="text-gray-500 text-sm mt-2">Gemeente: {result.municipality}</p>
            <p className="text-gray-500 text-sm">Provincie: {result.province}</p>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Voorbeeld-input: 1011AC, 1</p>
      </div>
    </div>
  );
} 