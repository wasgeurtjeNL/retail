'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Types from the main application page
type WasstripsApplicationStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'delivered' | 'canceled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';
type PaymentMethod = 'stripe' | 'invoice' | 'bank_transfer';

interface WasstripsApplicationFormProps {
  onSubmitSuccess?: () => void;
  redirectOnSubmit?: boolean;
}

export default function WasstripsApplicationForm({ 
  onSubmitSuccess, 
  redirectOnSubmit = true 
}: WasstripsApplicationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    message: '',
    acceptTerms: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Bedrijfsnaam is verplicht';
    }
    
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contactpersoon is verplicht';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mailadres is verplicht';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Voer een geldig e-mailadres in';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefoonnummer is verplicht';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Adres is verplicht';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'U moet akkoord gaan met de voorwaarden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Genereer een uniek ID voor deze aanvraag
      const applicationId = `WS-${Date.now()}`;
      
      // Sla de aanvraag op in localStorage
      const application = {
        id: applicationId,
        businessName: formData.businessName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        appliedAt: new Date().toISOString(),
        status: "pending" as WasstripsApplicationStatus,
        notes: formData.message ? `Bericht van klant: ${formData.message}` : "",
        isPaid: false,
        paymentStatus: "pending" as PaymentStatus,
        paymentMethod: "stripe" as PaymentMethod,
        total: 499, // Standaard prijs voor Wasstrips aanvraag
        fulfillmentStatus: 'pending',
        shippingProvider: 'postnl',
        trackingCode: "",
        paymentDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 dagen
      };
      
      // Sla de registratiedata op voor gebruik in de admin pagina
      localStorage.setItem('registrationData', JSON.stringify({
        businessName: formData.businessName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      }));
      
      // Sla de customer application op
      localStorage.setItem('wasstrips-customer-application', JSON.stringify(application));
      
      // Synchroniseer met admin dashboard
      const existingApps = JSON.parse(localStorage.getItem('wasstrips-applications') || '[]');
      
      // Voeg toe aan admin lijst
      const updatedApps = [...existingApps, application];
      localStorage.setItem('wasstrips-applications', JSON.stringify(updatedApps));
      
      // Stuur een window storage event om de admin dashboard te notificeren
      localStorage.setItem('wasstripsApplication', JSON.stringify({
        ...application,
        applied: true
      }));
      
      // Toon succes toast
      toast.success('Uw aanvraag is succesvol ontvangen!');
      
      // Reset form
      setFormData({
        businessName: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        message: '',
        acceptTerms: false
      });
      
      // Callback of redirect
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      if (redirectOnSubmit) {
        // Redirect naar bevestigingspagina
        router.push('/wasstrips/aanvraag-ontvangen');
      }
      
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Er is een fout opgetreden bij het versturen van uw aanvraag. Probeer het later opnieuw.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Wasstrips Aanvraagformulier</h2>
      <p className="mb-6 text-gray-600">
        Vul dit formulier in om uw aanvraag voor Wasstrips te starten. Na ontvangst nemen wij binnen 
        2 werkdagen contact met u op om de verdere details te bespreken.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-800 mb-1">
            Bedrijfsnaam *
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors.businessName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-gray-800 mb-1">
            Contactpersoon *
          </label>
          <input
            type="text"
            id="contactName"
            name="contactName"
            value={formData.contactName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${errors.contactName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.contactName && (
            <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">
              E-mailadres *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-800 mb-1">
              Telefoonnummer *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-800 mb-1">
            Bedrijfsadres *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Straat, huisnummer, postcode, plaats"
            className={`w-full px-4 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500`}
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-800 mb-1">
            Aanvullende informatie (optioneel)
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className={`w-4 h-4 text-blue-600 border ${errors.acceptTerms ? 'border-red-500' : 'border-gray-300'} rounded focus:ring-blue-500`}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptTerms" className="font-medium text-gray-700">
                Ik ga akkoord met de voorwaarden voor Wasstrips. Dit houdt in een minimumbestelling van €300 en 10% aanbetaling.
              </label>
              {errors.acceptTerms && (
                <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              submitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Aanvraag verzenden...
              </>
            ) : (
              'Aanvraag verzenden'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 