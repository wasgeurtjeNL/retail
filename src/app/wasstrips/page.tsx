'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WasstripsApplicationForm from '@/components/WasstripsApplicationForm';

// Wasstrips aanvraagformulier pagina waar klanten informatie kunnen invullen
export default function WasstripsRequestPage() {
  const [success, setSuccess] = useState(false);

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Wasstrips Aanvragen</h1>
          <p className="mb-8 text-gray-700">
            Vraag nu uw Wasstrips starterspakket aan en begin direct met het aanbieden van deze
            innovatieve wasoplossing aan uw klanten. Vul het onderstaande formulier in en wij
            nemen zo spoedig mogelijk contact met u op.
          </p>

          {success ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p>Uw aanvraag is succesvol ontvangen! U wordt doorgestuurd naar de bevestigingspagina...</p>
            </div>
          ) : (
            <WasstripsApplicationForm 
              onSubmitSuccess={() => setSuccess(true)}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
} 