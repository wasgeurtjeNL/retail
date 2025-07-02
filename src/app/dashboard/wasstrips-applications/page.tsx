"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from "react-hot-toast";
import { FaEye, FaEdit, FaTimes } from 'react-icons/fa';

// Type definities voor statuswaarden en betalingsmethoden
export type ApplicationStatus = 'pending' | 'approved' | 'order_ready' | 'payment_selected' | 'rejected' | 'fulfilled' | 'delivered' | 'processing' | 'shipped' | 'canceled';
export type PaymentStatus = 'not_started' | 'awaiting_payment' | 'pending' | 'paid' | 'failed' | 'expired';
export type PaymentOption = 'online' | 'invoice' | 'direct';
export type ShippingProvider = 'postnl' | 'dhl';
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
export type PaymentMethod = 'stripe' | 'invoice' | 'bank_transfer';

export interface WasstripsApplication {
  id: string;
  name?: string;
  companyName?: string;
  businessName?: string;
  email: string;
  phone: string;
  contactName?: string;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  status: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
  paymentStatus: PaymentStatus;
  isPaid: boolean;
  notes: string;
  appliedAt: string;
  trackingCode?: string;
  shippingProvider?: ShippingProvider;
  fulfillmentStatus?: FulfillmentStatus;
  paymentMethod?: PaymentMethod;
  total?: number;
  // Nieuwe aanbetaling velden
  deposit_status?: 'not_sent' | 'sent' | 'paid' | 'failed';
  deposit_amount?: number;
  deposit_paid_at?: string;
  deposit_payment_link?: string;
  remaining_amount?: number;
  remaining_payment_status?: 'not_sent' | 'sent' | 'paid' | 'failed';
  remaining_payment_link?: string;
  product_delivered_at?: string;
  total_amount?: number;
  // Order ready fields
  payment_options_sent?: boolean;
  payment_options_sent_at?: string;
  payment_method_selected?: 'direct' | 'invoice';
  payment_method_selected_at?: string;
  // Retailer status fields
  retailerStatus?: string;
  retailerApproved?: boolean;
  retailerPending?: boolean;
  retailerRejected?: boolean;
  canEdit?: boolean;
  statusIndicator?: 'retailer_pending' | 'retailer_rejected' | 'retailer_approved' | 'unknown';
  profile?: {
    company_name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  _profileMissing?: boolean;
}

export default function WasstripsApplicationsPage() {
  const [applications, setApplications] = useState<WasstripsApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retailerFilter, setRetailerFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<WasstripsApplication | null>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    notes: '',
    businessName: '',
    contactName: '',
    email: '',
    phone: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Nieuwe state voor aanbetaling management
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const router = useRouter();

  // Function to load applications from API
  const loadApplications = async () => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      console.log('[Frontend] Loading Wasstrips applications...');
      
      const response = await fetch('/api/wasstrips-applications');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] API Error Response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[Frontend] API Response:', data);
      
      // Controleer of de response de verwachte structuur heeft
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
      
      const applicationsData = data.applications || [];
      
      console.log('[Frontend] Applications loaded:', applicationsData.length);
      
      if (applicationsData.length > 0) {
        console.log('[Frontend] Retailer status breakdown:', {
          approved: applicationsData.filter((a: WasstripsApplication) => a.retailerApproved).length,
          pending: applicationsData.filter((a: WasstripsApplication) => a.retailerPending).length,
          rejected: applicationsData.filter((a: WasstripsApplication) => a.retailerRejected).length,
          canEdit: applicationsData.filter((a: WasstripsApplication) => a.canEdit).length
        });
      }
      
      setApplications(applicationsData);
      
    } catch (error) {
      console.error('[Frontend] Error loading applications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      setFetchError(`Fout bij laden van aanvragen: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load applications on component mount
  useEffect(() => {
    loadApplications();
  }, []);

  // Filtering op basis van retailer filter en betaalstatus
  const filteredApplications = applications.filter(application => {
    // Retailer filter
    const retailerMatch = retailerFilter === "all" ||
      (retailerFilter === "retailer_approved" && application.retailerApproved) ||
      (retailerFilter === "retailer_pending" && application.retailerPending) ||
      (retailerFilter === "retailer_rejected" && application.retailerRejected);
    
    // Betaalstatus filter
    const paymentMatch = paymentFilter === "all" ||
      (paymentFilter === "deposit_paid" && application.deposit_status === 'paid') ||
      (paymentFilter === "deposit_pending" && application.deposit_status === 'sent') ||
      (paymentFilter === "deposit_not_sent" && application.deposit_status === 'not_sent') ||
      (paymentFilter === "remaining_paid" && application.remaining_payment_status === 'paid');
    
    return retailerMatch && paymentMatch;
  });

  const handleDeleteApplication = (id: string) => {
    if (confirm('Weet je zeker dat je deze aanvraag wilt verwijderen?')) {
      const updatedApplications = applications.filter(app => app.id !== id);
            setApplications(updatedApplications);
      toast.success('Aanvraag verwijderd');
    }
  };

  const openApplicationDetail = (id: string) => {
    const application = applications.find(app => app.id === id);
    if (application) {
      console.log('Opening application details:', application);
      toast('Details functionaliteit wordt binnenkort toegevoegd');
    } else {
      toast.error('Aanvraag niet gevonden');
    }
  };

  const handleEditApplication = (id: string) => {
    const application = applications.find(app => app.id === id);
    if (application) {
      console.log('Editing application:', application);
      
      // Controleer of de retailer goedgekeurd is
      if (!application.canEdit) {
        if (application.retailerPending) {
          toast.error('Deze aanvraag kan niet bewerkt worden omdat de retailer nog niet goedgekeurd is. Keur eerst de retailer goed in het Retailer Management dashboard.');
        } else if (application.retailerRejected) {
          toast.error('Deze aanvraag kan niet bewerkt worden omdat de retailer is afgewezen.');
    } else {
          toast.error('Deze aanvraag kan momenteel niet bewerkt worden.');
        }
        return;
      }
      
      setEditingApplication(application);
      setEditForm({
        status: application.status,
        notes: application.notes || '',
        businessName: application.businessName || '',
        contactName: application.contactName || '',
        email: application.email,
        phone: application.phone
      });
      setIsEditModalOpen(true);
      } else {
      toast.error('Aanvraag niet gevonden');
    }
  };

  // Functie om wijzigingen op te slaan
  const handleSaveEdit = async () => {
    if (!editingApplication) return;
    
    setIsSaving(true);
    try {
      console.log('[Frontend] Saving application changes:', editingApplication.id, editForm);

      // API call om wijzigingen op te slaan in Supabase
      const response = await fetch(`/api/wasstrips-applications?id=${editingApplication.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update application');
      }

      const result = await response.json();
      console.log('[Frontend] Application updated successfully:', result.data);

      // Update de application in de lokale state
    const updatedApplication = {
        ...editingApplication,
        status: editForm.status as ApplicationStatus,
        notes: editForm.notes,
        businessName: editForm.businessName,
        contactName: editForm.contactName,
        email: editForm.email,
        phone: editForm.phone,
        updatedAt: new Date().toISOString()
      };

      // Update in lokale state
      const updatedApplications = applications.map(app => 
        app.id === editingApplication.id ? updatedApplication : app
      );
      setApplications(updatedApplications);

      toast.success('Aanvraag succesvol bijgewerkt');
      setIsEditModalOpen(false);
      setEditingApplication(null);
    } catch (error) {
      console.error('[Frontend] Error saving application:', error);
      toast.error('Fout bij opslaan van wijzigingen: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Functie om edit modal te sluiten
  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingApplication(null);
    setEditForm({
      status: '',
      notes: '',
      businessName: '',
      contactName: '',
      email: '',
      phone: ''
    });
  };

  // Functie om aanbetaling link te versturen
  const handleSendDepositPayment = async (applicationId: string) => {
    setIsProcessingPayment(true);
    try {
      console.log('[Frontend] Sending deposit payment link for:', applicationId);
      
      const response = await fetch('/api/wasstrips-applications/send-deposit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send deposit payment link');
      }

      const result = await response.json();
      console.log('[Frontend] Deposit payment link sent:', result);
      
      toast.success('Aanbetaling link verstuurd naar retailer!');
      
      // Herlaad applicaties om status updates te zien
      await loadApplications();
      
    } catch (error) {
      console.error('[Frontend] Error sending deposit payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      toast.error(`Fout bij versturen aanbetaling: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Functie om product als verzonden te markeren
  const handleMarkAsShipped = async (applicationId: string) => {
    // Vraag om tracking code
    const trackingCode = prompt('Voer de tracking code in (optioneel):');
    
    if (!confirm('Weet je zeker dat het product is verzonden?')) {
      return;
    }
    
    setIsProcessingPayment(true);
    try {
      console.log('[Frontend] Marking product as shipped for:', applicationId);
      
      const response = await fetch('/api/wasstrips-applications/mark-shipped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId,
          trackingCode: trackingCode || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as shipped');
      }

      const result = await response.json();
      console.log('[Frontend] Product marked as shipped:', result);
      
      toast.success('Product gemarkeerd als verzonden!');
      
      // Herlaad applicaties om status updates te zien
      await loadApplications();
      
    } catch (error) {
      console.error('[Frontend] Error marking as shipped:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      toast.error(`Fout bij markeren als verzonden: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Functie om product als geleverd te markeren
  const handleMarkAsDelivered = async (applicationId: string) => {
    if (!confirm('Weet je zeker dat het product is geleverd? Dit kan niet ongedaan worden gemaakt.')) {
      return;
    }

    setIsProcessingPayment(true);
    try {
      console.log('[Frontend] Marking product as delivered for:', applicationId);
      
      const response = await fetch('/api/wasstrips-applications/mark-delivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as delivered');
      }

      const result = await response.json();
      console.log('[Frontend] Product marked as delivered:', result);
      
      toast.success('Product gemarkeerd als geleverd!');
      
      // Herlaad applicaties om status updates te zien
      await loadApplications();
      
    } catch (error) {
      console.error('[Frontend] Error marking as delivered:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      toast.error(`Fout bij markeren als geleverd: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Functie om "bestelling binnen" melding te versturen
  const handleSendOrderReady = async (applicationId: string) => {
    if (!confirm('Weet je zeker dat de bestelling binnen is en klaar voor betaalopties?')) {
      return;
    }

    setIsProcessingPayment(true);
    try {
      console.log('[Frontend] Sending order ready notification for:', applicationId);
      
      const response = await fetch('/api/wasstrips-applications/send-order-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send order ready notification');
      }

      const result = await response.json();
      console.log('[Frontend] Order ready notification sent:', result);
      
      toast.success('Bestelling binnen melding verstuurd naar retailer!');
      
      // Herlaad applicaties om status updates te zien
      await loadApplications();
      
    } catch (error) {
      console.error('[Frontend] Error sending order ready notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      toast.error(`Fout bij versturen melding: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Functie om restbedrag link te versturen
  const handleSendRemainingPayment = async (applicationId: string) => {
    setIsProcessingPayment(true);
    try {
      console.log('[Frontend] Sending remaining payment link for:', applicationId);
      
      const response = await fetch('/api/wasstrips-applications/send-remaining-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send remaining payment link');
      }

      const result = await response.json();
      console.log('[Frontend] Remaining payment link sent:', result);
      
      toast.success('Restbedrag link verstuurd naar retailer!');
      
      // Herlaad applicaties om status updates te zien
      await loadApplications();
      
    } catch (error) {
      console.error('[Frontend] Error sending remaining payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      toast.error(`Fout bij versturen restbedrag: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-700"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-red-50 border-l-4 border-red-500 p-6 rounded">
        <h2 className="text-lg font-bold text-red-800 mb-2">Fout bij laden van aanvragen</h2>
        <p className="text-red-700">{fetchError}</p>
            <button
          onClick={loadApplications}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
          Opnieuw proberen
            </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        {/* Header */}
        <div className="bg-white shadow rounded-lg px-6 py-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-900">Wasstrips Aanvragen</h1>
              <p className="mt-1 text-sm text-gray-500">
                Beheer en verwerk aanvragen voor het exclusieve Wasstrips product
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={loadApplications}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Vernieuwen
              </button>
              <Link
                href="/dashboard"
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Terug naar Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Workflow Information */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                🔄 Wasstrips Goedkeuringsworkflow
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-500">⏳</span>
                    <span className="font-medium text-gray-900">Stap 1: Retailer Goedkeuring</span>
                  </div>
                  <p className="text-gray-600">
                    Retailer moet eerst goedgekeurd worden in het <strong>Retailer Management</strong> dashboard voordat Wasstrips aanvragen bewerkt kunnen worden.
                  </p>
                  <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    {applications.filter(a => a.retailerPending).length} wachten op retailer goedkeuring
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-500">✅</span>
                    <span className="font-medium text-gray-900">Stap 2: Wasstrips Verwerking</span>
                  </div>
                  <p className="text-gray-600">
                    Na retailer goedkeuring kunnen Wasstrips aanvragen bewerkt worden: status wijzigen, notities toevoegen, contactgegevens updaten.
                  </p>
                  <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    {applications.filter(a => a.canEdit).length} klaar voor bewerking
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-500">📦</span>
                    <span className="font-medium text-gray-900">Stap 3: Fulfillment</span>
                  </div>
                  <p className="text-gray-600">
                    Goedgekeurde Wasstrips aanvragen kunnen verwerkt worden voor verzending en tracking.
                  </p>
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {applications.filter(a => a.status === 'approved').length} goedgekeurd voor verzending
                  </div>
                </div>
              </div>
              {applications.filter(a => a.retailerRejected).length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-500">❌</span>
                    <span className="text-sm font-medium text-red-800">
                      {applications.filter(a => a.retailerRejected).length} aanvragen van afgewezen retailers
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Deze aanvragen kunnen niet bewerkt worden omdat de retailers zijn afgewezen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow overflow-hidden">
          {/* Retailer Status Filters */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Retailer Goedkeuring</h3>
            </div>
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setRetailerFilter("all")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  retailerFilter === "all"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Alle Retailers ({applications.length})
              </button>
              <button
                onClick={() => setRetailerFilter("retailer_approved")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  retailerFilter === "retailer_approved"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ✅ Goedgekeurde Retailers ({applications.filter(a => a.retailerApproved).length})
              </button>
              <button
                onClick={() => setRetailerFilter("retailer_pending")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  retailerFilter === "retailer_pending"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ⏳ Retailers in Behandeling ({applications.filter(a => a.retailerPending).length})
              </button>
              <button
                onClick={() => setRetailerFilter("retailer_rejected")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  retailerFilter === "retailer_rejected"
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ❌ Afgewezen Retailers ({applications.filter(a => a.retailerRejected).length})
              </button>
            </nav>
          </div>

          {/* Payment Status Filters */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Betaalstatus Filter</h3>
            </div>
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setPaymentFilter("all")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  paymentFilter === "all"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Alle Betalingen ({applications.length})
              </button>
              <button
                onClick={() => setPaymentFilter("deposit_paid")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  paymentFilter === "deposit_paid"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ✅ Aanbetaling Betaald ({applications.filter(a => a.deposit_status === 'paid').length})
              </button>
              <button
                onClick={() => setPaymentFilter("deposit_pending")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  paymentFilter === "deposit_pending"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📧 Link Verstuurd ({applications.filter(a => a.deposit_status === 'sent').length})
              </button>
              <button
                onClick={() => setPaymentFilter("deposit_not_sent")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  paymentFilter === "deposit_not_sent"
                    ? "border-gray-500 text-gray-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                ⏳ Nog Niet Verstuurd ({applications.filter(a => a.deposit_status === 'not_sent').length})
              </button>
              <button
                onClick={() => setPaymentFilter("remaining_paid")}
                className={`whitespace-nowrap px-6 py-3 border-b-2 text-sm font-medium ${
                  paymentFilter === "remaining_paid"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                💰 Restbedrag Betaald ({applications.filter(a => a.remaining_payment_status === 'paid').length})
              </button>
            </nav>
          </div>

          {/* Applications Table */}
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 px-6 bg-white">
              <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Geen aanvragen gevonden</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
                Er zijn nog geen Wasstrips aanvragen voor deze categorie. Aanvragen verschijnen hier automatisch wanneer retailers het aanvraagformulier invullen.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bedrijf
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retailer Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wasstrips Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aanbetaling
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aangevraagd op
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                          {application.businessName}
                            {application._profileMissing && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Profiel ontbreekt
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{application.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{application.contactName}</div>
                        <div className="text-sm text-gray-500">{application.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            application.retailerApproved ? 'bg-green-100 text-green-800' :
                            application.retailerPending ? 'bg-yellow-100 text-yellow-800' :
                            application.retailerRejected ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {application.retailerApproved ? '✅ Goedgekeurd' :
                             application.retailerPending ? '⏳ In behandeling' :
                             application.retailerRejected ? '❌ Afgewezen' :
                             '❓ Onbekend'}
                              </span>
                          {!application.canEdit && (
                            <span className="text-xs text-gray-500 italic">
                              {application.retailerPending ? 'Wacht op retailer goedkeuring' :
                               application.retailerRejected ? 'Retailer afgewezen' :
                               'Kan niet bewerken'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          application.status === 'approved' ? 'bg-green-100 text-green-800' :
                          application.status === 'order_ready' ? 'bg-purple-100 text-purple-800' :
                          application.status === 'payment_selected' ? 'bg-blue-100 text-blue-800' :
                          application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          application.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {application.status === 'pending' ? 'In afwachting' :
                           application.status === 'approved' ? 'Goedgekeurd' :
                           application.status === 'order_ready' ? 'Bestelling binnen' :
                           application.status === 'payment_selected' ? 'Betaalmethode gekozen' :
                           application.status === 'rejected' ? 'Afgewezen' :
                           application.status === 'delivered' ? 'Geleverd' :
                           application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {/* Aanbetaling Status */}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            application.deposit_status === 'paid' ? 'bg-green-100 text-green-800' :
                            application.deposit_status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                            application.deposit_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {application.deposit_status === 'paid' ? '✅ €30 betaald' :
                             application.deposit_status === 'sent' ? '📧 Link verstuurd' :
                             application.deposit_status === 'failed' ? '❌ Mislukt' :
                             '⏳ Nog niet verstuurd'}
                              </span>
                          
                          {/* Bestelling Status - Professionele styling met synchronisatie */}
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 hover:scale-105 shadow-sm ${
                            application.status === 'shipped' ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300' :
                            application.status === 'payment_selected' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 animate-pulse' :
                            application.status === 'order_ready' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300' :
                            application.status === 'approved' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300' :
                            application.status === 'pending' ? 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-300 ring-2 ring-amber-200' :
                            'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300'
                          }`}>
                            <span className="mr-1.5 text-sm">
                              {application.status === 'shipped' ? '🚚' :
                               application.status === 'payment_selected' ? '💳' :
                               application.status === 'order_ready' ? '📧' :
                               application.status === 'approved' ? '⏳' :
                               application.status === 'pending' ? '⏳' :
                               '❌'}
                            </span>
                            {application.status === 'shipped' ? 'Onderweg' :
                             application.status === 'payment_selected' ? 'Klaar voor verzending' :
                             application.status === 'order_ready' ? 'Wacht op betaalmethode' :
                             application.status === 'approved' ? 'Wacht op bestelling binnen' :
                             application.status === 'pending' ? 'Wachtend op aanbetaling' :
                             'Afgewezen'}
                          </span>
                          
                          {/* Payment Options Status */}
                          {application.payment_options_sent && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              application.payment_method_selected ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {application.payment_method_selected ? 
                                `✅ ${application.payment_method_selected === 'direct' ? 'Direct betalen' : 'Factuur'} gekozen` :
                                '📧 Betaalopties verstuurd'}
                            </span>
                          )}
                          
                          {/* Betaaldatum voor aanbetaling */}
                          {application.deposit_status === 'paid' && application.deposit_paid_at && (
                            <div className="text-xs text-green-600 font-medium">
                              Betaald: {new Date(application.deposit_paid_at).toLocaleDateString('nl-NL', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                          
                          {/* Verzenddatum - Verbeterde tracking sectie */}
                          {application.status === 'shipped' && (
                            <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm">🚚</span>
                                    <p className="text-xs font-semibold text-emerald-800">Pakket Onderweg</p>
                                    <div className="flex space-x-1">
                                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></div>
                                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                  </div>
                                  {application.trackingCode ? (
                                    <div className="space-y-1">
                                      <p className="text-xs text-emerald-700 font-mono bg-white/60 px-2 py-1 rounded">
                                        {application.trackingCode}
                                      </p>
                                      <a
                                        href={application.trackingCode?.startsWith('3S') 
                                          ? `https://postnl.nl/tracktrace/?B=${application.trackingCode}&P=1015CW&D=NL&T=C`
                                          : `https://www.dhl.com/nl-nl/home/tracking.html?tracking-id=${application.trackingCode}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-2 py-1 rounded-md hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md inline-flex items-center gap-1"
                                      >
                                        <span>{application.trackingCode?.startsWith('3S') ? '📮' : '📦'}</span>
                                        <span className="font-medium">Live Tracking</span>
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-emerald-600">Tracking code wordt binnenkort toegevoegd</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Restbedrag Status */}
                          {application.product_delivered_at && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              application.remaining_payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              application.remaining_payment_status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                              application.remaining_payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {application.remaining_payment_status === 'paid' ? '✅ €270 betaald' :
                               application.remaining_payment_status === 'sent' ? '📧 Restbedrag verstuurd' :
                               application.remaining_payment_status === 'failed' ? '❌ Restbedrag mislukt' :
                               '⏳ Restbedrag niet verstuurd'}
                        </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(application.appliedAt).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-1 flex-wrap">
                          {/* Details Button */}
                            <button
                              onClick={() => openApplicationDetail(application.id)}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none mb-1"
                            >
                              <FaEye className="w-3 h-3 mr-1" />
                              Details
                            </button>

                          {/* Edit Button - alleen voor goedgekeurde retailers */}
                          {application.canEdit ? (
                            <button
                              onClick={() => handleEditApplication(application.id)}
                              className="inline-flex items-center px-2 py-1 border border-indigo-500 text-xs font-medium rounded text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none mb-1"
                            >
                              <FaEdit className="w-3 h-3 mr-1" />
                              Bewerken
                            </button>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-400 bg-gray-100 cursor-not-allowed mb-1"
                              title={
                                application.retailerPending ? 'Retailer moet eerst goedgekeurd worden' :
                                application.retailerRejected ? 'Retailer is afgewezen' :
                                'Bewerken niet mogelijk'
                              }
                            >
                              <FaEdit className="w-3 h-3 mr-1" />
                              Bewerken
                            </button>
                          )}
                          
                          {/* Aanbetaling Button - alleen voor goedgekeurde retailers die nog geen aanbetaling hebben verstuurd */}
                          {application.retailerApproved && application.deposit_status === 'not_sent' && (
                            <button
                              onClick={() => handleSendDepositPayment(application.id)}
                              disabled={isProcessingPayment}
                              className="inline-flex items-center px-2 py-1 border border-green-500 text-xs font-medium rounded text-white bg-green-500 hover:bg-green-600 focus:outline-none disabled:opacity-50 mb-1"
                            >
                              💳 Aanbetaling
                            </button>
                          )}
                          
                          {/* Order Ready Button - alleen als aanbetaling betaald is en nog geen order ready melding verstuurd */}
                          {application.deposit_status === 'paid' && !application.payment_options_sent && application.status === 'approved' && (
                            <button
                              onClick={() => handleSendOrderReady(application.id)}
                              disabled={isProcessingPayment}
                              className="inline-flex items-center px-2 py-1 border border-purple-500 text-xs font-medium rounded text-white bg-purple-500 hover:bg-purple-600 focus:outline-none disabled:opacity-50 mb-1"
                            >
                              📧 Bestelling Binnen
                            </button>
                          )}
                          
                          {/* Verzenden Button - alleen als betaalmethode gekozen is */}
                          {(application.status === 'payment_selected' || (application.payment_method_selected && application.status !== 'shipped')) && (
                            <button
                              onClick={() => handleMarkAsShipped(application.id)}
                              disabled={isProcessingPayment}
                              className="inline-flex items-center px-2 py-1 border border-blue-500 text-xs font-medium rounded text-white bg-blue-500 hover:bg-blue-600 focus:outline-none disabled:opacity-50 mb-1"
                            >
                              📦 Verzenden
                            </button>
                          )}
                          
                          {/* Geleverd Button - alleen als verzonden en nog niet geleverd */}
                          {application.status === 'shipped' && !application.product_delivered_at && (
                            <button
                              onClick={() => handleMarkAsDelivered(application.id)}
                              disabled={isProcessingPayment}
                              className="inline-flex items-center px-2 py-1 border border-green-500 text-xs font-medium rounded text-white bg-green-500 hover:bg-green-600 focus:outline-none disabled:opacity-50 mb-1"
                            >
                              ✅ Geleverd
                            </button>
                          )}
                          
                          {/* Restbedrag Button - alleen als product geleverd en restbedrag nog niet verstuurd */}
                          {application.product_delivered_at && application.remaining_payment_status === 'not_sent' && (
                            <button
                              onClick={() => handleSendRemainingPayment(application.id)}
                              disabled={isProcessingPayment}
                              className="inline-flex items-center px-2 py-1 border border-orange-500 text-xs font-medium rounded text-white bg-orange-500 hover:bg-orange-600 focus:outline-none disabled:opacity-50 mb-1"
                            >
                              💰 Restbedrag
                            </button>
                          )}
                          
                          {/* Delete Button */}
                          <button
                              onClick={() => handleDeleteApplication(application.id)}
                            className="inline-flex items-center px-2 py-1 border border-red-500 text-xs font-medium rounded text-white bg-red-500 hover:bg-red-600 focus:outline-none mb-1"
                            >
                              <FaTimes className="w-3 h-3 mr-1" />
                              Verwijderen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
                  </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Aanvraag bewerken - {editingApplication.businessName}
                </h3>
                    <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                    </button>
                </div>
        
              {/* Modal Content */}
              <div className="mt-6 space-y-6">
                {/* Status */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                    <select 
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  >
                    <option value="pending">In afwachting</option>
                    <option value="approved">Goedgekeurd</option>
                    <option value="order_ready">Bestelling binnen</option>
                    <option value="payment_selected">Betaalmethode gekozen</option>
                    <option value="rejected">Afgewezen</option>
                    <option value="processing">In behandeling</option>
                    <option value="fulfilled">Afgehandeld</option>
                    <option value="delivered">Geleverd</option>
                    <option value="shipped">Verzonden</option>
                    <option value="canceled">Geannuleerd</option>
                    </select>
                </div>

                {/* Business Name */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrijfsnaam
                  </label>
                    <input
                      type="text"
                    value={editForm.businessName}
                    onChange={(e) => setEditForm({...editForm, businessName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>

                {/* Contact Name */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contactpersoon
                  </label>
                  <input
                    type="text"
                    value={editForm.contactName}
                    onChange={(e) => setEditForm({...editForm, contactName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                  </div>
                  
                {/* Email */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                  </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefoon
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notities
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Voeg notities toe..."
                  />
              </div>
                  </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-6 border-t mt-6 space-x-3">
                    <button
                  onClick={handleCancelEdit}
                disabled={isSaving}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                  Annuleren
                    </button>
                    <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                    </button>
                  </div>
                </div>
              </div>
      </div>
      )}
    </div>
  );
}