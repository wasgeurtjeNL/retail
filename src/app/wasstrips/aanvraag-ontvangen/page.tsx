'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Bevestigingspagina voor het succesvol ontvangen van een Wasstrips aanvraag
export default function WasstripsApplicationReceived() {
  const [application, setApplication] = useState<any>(null);

  useEffect(() => {
    // Haal de aanvraaggegevens op uit localStorage
    const savedApplication = localStorage.getItem('wasstrips-customer-application');
    if (savedApplication) {
      setApplication(JSON.parse(savedApplication));
    }
    
    // Kopieer de aanvraag naar de wasstrips-applications array voor admin dashboard
    try {
      const savedApp = JSON.parse(savedApplication || '{}');
      
      // Check for stripe payment status in URL
      const urlParams = new URLSearchParams(window.location.search);
      const paymentSuccess = urlParams.get('payment') === 'success';
      const sessionId = urlParams.get('session_id');
      
      // Als betaling succesvol is, update de betaalstatus
      if (paymentSuccess && sessionId && savedApp.id) {
        // Update de betaalstatus van deze specifieke aanvraag
        savedApp.isPaid = true;
        savedApp.paymentSessionId = sessionId;
        
        // Update in localStorage voor deze klant
        localStorage.setItem('wasstrips-customer-application', JSON.stringify(savedApp));
        setApplication(savedApp);
        
        // Update in admin dashboard
        updateApplicationInAdminDashboard(savedApp);
        
        console.log("Betaling succesvol verwerkt voor aanvraag:", savedApp.id);
      }
      
      const existingApps = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
      
      // Controleer of deze aanvraag al bestaat (op basis van id of e-mail en tijdstip)
      const appExists = existingApps.some((app: any) => 
        (savedApp.id && app.id === savedApp.id) || 
        (app.email === savedApp.email && app.appliedAt === savedApp.appliedAt)
      );
      
      if (!appExists && savedApp.email) {
        // Voeg de nieuwe aanvraag toe aan de array
        const updatedApps = [...existingApps, savedApp];
        localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApps));
      }
    } catch (error) {
      console.error('Fout bij het bijwerken van de applicatielijst:', error);
    }
  }, []);
  
  // Functie om een applicatie bij te werken in het admin dashboard
  const updateApplicationInAdminDashboard = (updatedApp: any) => {
    try {
      const existingApps = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
      
      // Update de applicatie als deze bestaat, anders toevoegen
      const updatedApps = existingApps.map((app: any) => {
        if ((updatedApp.id && app.id === updatedApp.id) || 
            (app.email === updatedApp.email && app.appliedAt === updatedApp.appliedAt)) {
          return { ...app, ...updatedApp };
        }
        return app;
      });
      
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApps));
    } catch (error) {
      console.error('Fout bij het updaten van applicatie in admin dashboard:', error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-xl">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900">Bedankt voor uw aanvraag!</h1>
              <p className="mt-5 text-lg text-gray-700">
                We hebben uw aanvraag voor het Wasstrips starterspakket in goede orde ontvangen. Een van onze medewerkers zal zo spoedig mogelijk contact met u opnemen.
              </p>
            </div>

            {application && (
              <div className="mt-10 border-t border-gray-200 pt-10">
                <h2 className="text-lg font-medium text-gray-900">Uw aanvraaggegevens</h2>
                <div className="mt-4 bg-gray-50 rounded-lg p-6 shadow-sm">
                  <dl className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-800">Bedrijfsnaam:</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{application.businessName}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-800">Contactpersoon:</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{application.contactName}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-800">E-mailadres:</dt>
                      <dd className="text-sm text-gray-900 col-span-2">{application.email}</dd>
                    </div>
                    {application.phone && (
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-gray-800">Telefoonnummer:</dt>
                        <dd className="text-sm text-gray-900 col-span-2">{application.phone}</dd>
                      </div>
                    )}
                    {application.message && (
                      <div className="grid grid-cols-3 gap-4">
                        <dt className="text-sm font-medium text-gray-800">Bericht:</dt>
                        <dd className="text-sm text-gray-900 col-span-2">{application.message}</dd>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-sm font-medium text-gray-800">Aanvraagdatum:</dt>
                      <dd className="text-sm text-gray-900 col-span-2">
                        {new Date(application.appliedAt).toLocaleDateString('nl-NL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            <div className="mt-10">
              <div className="flex space-x-4">
                <Link 
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Terug naar home
                </Link>
                <Link 
                  href="/contact"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Contact opnemen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 