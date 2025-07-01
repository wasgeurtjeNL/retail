'use client';

import { useEffect } from 'react';

export default function DevLoginHelper() {
  useEffect(() => {
    console.log('DevLoginHelper: Configuring development mode login as retailer');
    
    // Set development mode variables for retailer login
    localStorage.setItem('dev-signed-in', 'true');
    localStorage.setItem('dev-is-admin', 'false'); // Set to false to log in as retailer
    localStorage.setItem('dev-retailer-name', 'Wasserij De Sprinter');
    
    // Add a test wasstrips application for the retailer
    const testApp = {
      id: 'WS-TEST-' + Date.now(),
      businessName: 'Wasserij De Sprinter',
      contactName: 'Jan Janssen',
      email: 'retailer@wasgeurtje.nl', // Match the development mode retailer email
      paymentOptionSent: true,
      selectedPaymentOption: null,
      isPaid: false,
      paymentLinkSentAt: new Date().toISOString()
    };
    
    // Get existing applications or create an empty array
    const existingApps = localStorage.getItem('wasstrips-applications')
      ? JSON.parse(localStorage.getItem('wasstrips-applications') || '[]')
      : [];
    
    // Add our test application
    existingApps.push(testApp);
    
    // Save back to localStorage
    localStorage.setItem('wasstrips-applications', JSON.stringify(existingApps));
    
    console.log('DevLoginHelper: Dev environment configured for retailer view with test notification');
    console.log('DevLoginHelper: Please refresh the page to see the changes');
    
    // Create an alert to notify the user to refresh
    alert('Retailer test modus geconfigureerd. Ververs de pagina om de wijzigingen te zien.');
  }, []);
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-green-100 text-green-800 p-2 text-center z-50">
      Retailer test modus geconfigureerd. 
      <button 
        onClick={() => window.location.reload()} 
        className="ml-2 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
      >
        Ververs pagina
      </button>
    </div>
  );
} 