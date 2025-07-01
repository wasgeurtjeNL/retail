'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TestWasstripsApplication {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  paymentOptionSent: boolean;
  selectedPaymentOption: string | null;
  isPaid: boolean;
  paymentLinkSentAt: string;
  notes?: string;
}

export default function TestNotification() {
  const { user, isRetailer } = useAuth();
  
  useEffect(() => {
    // Functie om alle dubbele notificaties op te schonen
    const cleanupAllDuplicateNotifications = () => {
      try {
        // Bestaande applicaties ophalen
        const storedApps = localStorage.getItem('wasstrips-applications') 
          ? JSON.parse(localStorage.getItem('wasstrips-applications') || '[]') 
          : [];
          
        if (storedApps.length === 0) return;
        
        // Groepeer applicaties per email en notificatie type
        const groupedApps = new Map();
        
        storedApps.forEach((app: TestWasstripsApplication) => {
          // Maak een sleutel op basis van email en type (voor test notificaties)
          const isTestNotification = app.businessName === 'Test Zaak' && !app.isPaid;
          const key = `${app.email}-${isTestNotification ? 'test' : app.id}`;
          
          if (!groupedApps.has(key)) {
            groupedApps.set(key, []);
          }
          
          groupedApps.get(key).push(app);
        });
        
        // Check elke groep voor duplicaten
        let hasChanges = false;
        const cleanedApps: TestWasstripsApplication[] = [];
        
        for (const [key, apps] of groupedApps.entries()) {
          if (apps.length > 1 && key.endsWith('-test')) {
            // Sorteer op datum, nieuwste eerst
            apps.sort((a: TestWasstripsApplication, b: TestWasstripsApplication) => 
              new Date(b.paymentLinkSentAt).getTime() - new Date(a.paymentLinkSentAt).getTime()
            );
            
            // Voeg alleen de nieuwste toe
            cleanedApps.push(apps[0]);
            hasChanges = true;
            console.log(`TestNotification: ${apps.length-1} dubbele notificaties voor ${key} verwijderd.`);
          } else {
            // Voeg alle apps toe als er geen duplicaten zijn
            cleanedApps.push(...apps);
          }
        }
        
        // Update localStorage alleen als er iets is veranderd
        if (hasChanges) {
          localStorage.setItem('wasstrips-applications', JSON.stringify(cleanedApps));
          console.log(`TestNotification: localStorage opgeschoond. Voor: ${storedApps.length}, Na: ${cleanedApps.length}`);
        }
      } catch (error) {
        console.error('Fout bij opschonen van alle dubbele notificaties:', error);
      }
    };
    
    // Functie om duplicaten te verwijderen voor een specifieke gebruiker
    const removeDuplicateNotifications = (userEmail: string) => {
      try {
        // Bestaande applicaties ophalen
        const storedApps = localStorage.getItem('wasstrips-applications') 
          ? JSON.parse(localStorage.getItem('wasstrips-applications') || '[]') 
          : [];
          
        // Indien leeg, niets doen
        if (storedApps.length === 0) return;
        
        // Vind alle testnotificaties voor deze gebruiker
        const userTestNotifications = storedApps.filter((app: TestWasstripsApplication) => 
          app.email === userEmail && 
          app.businessName === 'Test Zaak' && 
          app.isPaid === false
        );
        
        // Als er meer dan één is, houd alleen de meest recente
        if (userTestNotifications.length > 1) {
          console.log(`TestNotification: ${userTestNotifications.length} dubbele notificaties gevonden, deze worden verwijderd.`);
          
          // Sorteer op datum (meest recente eerst)
          userTestNotifications.sort((a: TestWasstripsApplication, b: TestWasstripsApplication) => 
            new Date(b.paymentLinkSentAt).getTime() - new Date(a.paymentLinkSentAt).getTime()
          );
          
          // Houd de meest recente testnotificatie
          const mostRecentId = userTestNotifications[0].id;
          
          // Filter alle oude testnotificaties eruit, behoud alleen de meest recente
          const cleanedApps = storedApps.filter((app: TestWasstripsApplication) => 
            !(app.email === userEmail && 
              app.businessName === 'Test Zaak' && 
              app.isPaid === false && 
              app.id !== mostRecentId)
          );
          
          // Sla de opgeschoonde lijst op
          localStorage.setItem('wasstrips-applications', JSON.stringify(cleanedApps));
          console.log(`TestNotification: ${storedApps.length - cleanedApps.length} oude testnotificaties verwijderd.`);
        }
      } catch (error) {
        console.error('Fout bij verwijderen dubbele notificaties:', error);
      }
    };
    
    // Notificatie toevoegen aan localStorage voor testen
    const addTestNotification = () => {
      try {
        // Huidige user email ophalen
        const userEmail = user?.email || 'retailer@wasgeurtje.nl';
        console.log('TestNotification: Huidige gebruiker email:', userEmail);
        
        // Eerst duplicaten verwijderen
        removeDuplicateNotifications(userEmail);
        
        // Opnieuw ophalen na het verwijderen van duplicaten
        const storedApps = localStorage.getItem('wasstrips-applications') 
          ? JSON.parse(localStorage.getItem('wasstrips-applications') || '[]') 
          : [];
        
        // Controleer of er nog een testnotificatie bestaat voor deze gebruiker
        const existingTestNotification = storedApps.find((app: TestWasstripsApplication) => 
          app.email === userEmail && 
          app.businessName === 'Test Zaak' && 
          app.isPaid === false
        );
        
        // Alleen toevoegen als er nog geen testnotificatie bestaat
        if (!existingTestNotification) {
          // Test notificatie aanmaken die exact overeenkomt met de ingelogde gebruiker
          const testApp: TestWasstripsApplication = {
            id: 'WS-TEST-' + Date.now(),
            businessName: 'Test Zaak',
            contactName: 'Test Gebruiker',
            email: userEmail, // Dit moet overeenkomen met de ingelogde gebruiker
            paymentOptionSent: true,
            selectedPaymentOption: null,
            isPaid: false,
            paymentLinkSentAt: new Date().toISOString(),
            notes: "Test notificatie voor demonstratie"
          };
          
          // Toevoegen aan de array en opslaan in localStorage
          storedApps.push(testApp);
          localStorage.setItem('wasstrips-applications', JSON.stringify(storedApps));
          console.log('TestNotification: Test notificatie toegevoegd:', testApp);
        } else {
          console.log('TestNotification: Er bestaat al een test notificatie voor deze gebruiker:', existingTestNotification);
        }
      } catch (error) {
        console.error('Fout bij toevoegen test notificatie:', error);
      }
    };

    // Eerst alle dubbele notificaties opschonen voor iedereen
    cleanupAllDuplicateNotifications();
    
    // Voer direct uit bij montage van component
    addTestNotification();
  }, [user]);
  
  return (
    <div className="hidden">
      {/* Deze component heeft geen zichtbare UI */}
    </div>
  );
} 