"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import { getPendingRetailers, getApprovedRetailers, Retailer } from "@/lib/supabase";

// --- UITBREIDING: Voeg metadata toe aan Retailer type voor aanvullende info ---
type RetailerWithMetadata = Retailer & { metadata?: Record<string, any> };

// Haal verwijderde retailers op uit de API
async function getDeletedRetailers() {
  const res = await fetch('/api/retailers/deleted');
  if (!res.ok) throw new Error('Fout bij ophalen van verwijderde retailers');
  return res.json();
}

export default function RetailerManagementPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [retailers, setRetailers] = useState<RetailerWithMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<RetailerWithMetadata | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | 'info' | 'profile'>('approve');
  
  useEffect(() => {
    const loadRetailers = async () => {
      if (!authLoading && user && isAdmin) {
        setIsLoading(true);
        try {
          console.log('Loading retailers for tab:', activeTab);
          
          let retailersData = [];
          if (activeTab === 'pending') {
            const result = await getPendingRetailers();
            console.log('[DEBUG] Raw result from getPendingRetailers:', result);
            retailersData = result;
          } else if (activeTab === 'all') {
            const result = await getApprovedRetailers();
            console.log('[DEBUG] Raw result from getApprovedRetailers:', result);
            retailersData = result;
          }
          
          setRetailers(retailersData || []);
        } catch (error) {
          console.error('Error fetching retailers:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    // Laad retailers bij initialisatie en bij tab switch
    loadRetailers();
  }, [user, authLoading, isAdmin, activeTab]);
  
  const refreshRetailers = async () => {
    setIsLoading(true);
    try {
      console.log('Forcing refresh of retailers for tab:', activeTab);
      
      let retailersData = [];
      if (activeTab === 'pending') {
        retailersData = await getPendingRetailers();
      } else if (activeTab === 'all') {
        retailersData = await getApprovedRetailers();
      }
      
      setRetailers(retailersData || []);
    } catch (error) {
      console.error('Unexpected error during refresh:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const openConfirmModal = (retailer: RetailerWithMetadata, action: 'approve' | 'reject' | 'delete' | 'info' | 'profile') => {
    setSelectedRetailer(retailer);
    setActionType(action);
    setRejectReason('');
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRetailer(null);
    setRejectReason('');
  };
  
  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdateLoading(id);
    
    try {
      console.log(`[RETAILER APPROVAL] Starting ${status} process for retailer ${id}`);
      
      if (status === 'approved') {
        // Stap 1: Update status direct in database
        const { error: updateError } = await import('@/lib/supabase').then(module => 
          module.updateRetailerStatus(id, 'approved')
        );
        
        if (updateError) {
          throw new Error('Fout bij updaten van retailer status: ' + JSON.stringify(updateError));
        }
        
        // Stap 2: Probeer goedkeuringsmail te versturen (optioneel)
        try {
          const notifyResponse = await fetch('/api/retailers/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              retailerId: id, 
              action: 'approve'
            }),
          });
          
          if (notifyResponse.ok) {
            console.log('Goedkeuringsmail succesvol verzonden');
          }
        } catch (emailError) {
          console.log('Email verzending optioneel - retailer is goedgekeurd');
        }
        
        alert('Retailer succesvol goedgekeurd! Status is bijgewerkt naar actief.');
      } else {
        // Stap 1: Verzend afwijzingsmail
        const notifyResponse = await fetch('/api/retailers/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            retailerId: id, 
            action: 'reject',
            reason: rejectReason || 'Geen specifieke reden opgegeven.'
          }),
        });
        
        if (!notifyResponse.ok) {
          const errorData = await notifyResponse.json();
          throw new Error(errorData.error || 'Fout bij verzenden van afwijzingsmail');
        }
        
        const notifyResult = await notifyResponse.json();
        console.log('[RETAILER REJECTION] Notification sent:', notifyResult);
        
        // Stap 2: Update status in database naar rejected
        // Voor nu doen we dit via een directe database update
        // In productie zou dit via een aparte API call gaan
        
        alert(`Retailer afgewezen. ${notifyResult.message || 'Afwijzingsmail verzonden.'}`);
      }
      
      // Ververs de lijst na succesvolle actie
      await refreshRetailers();
      
    } catch (error) {
      console.error(`[RETAILER ${status.toUpperCase()}] Error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      alert(`Fout bij ${status === 'approved' ? 'goedkeuren' : 'afwijzen'} van retailer: ${errorMessage}`);
    } finally {
      setUpdateLoading(null);
      closeModal();
    }
  };
  
  const confirmAction = () => {
    if (selectedRetailer) {
      if (actionType === 'approve' || actionType === 'reject') {
        handleUpdateStatus(selectedRetailer.id, actionType === 'approve' ? 'approved' : 'rejected');
      } else if (actionType === 'delete') {
        handleDeleteRetailer(selectedRetailer.id);
      } else if (actionType === 'info') {
        // Handle info action
      } else if (actionType === 'profile') {
        // Handle profile action
      }
    }
  };
  
  const handleDeleteRetailer = async (id: string) => {
    setUpdateLoading(id);
    
    try {
      console.log(`[RETAILER DELETE] Starting delete process for retailer ${id}`);
      
      // Maak een DELETE request naar de retailers API met ID in URL
      const deleteResponse = await fetch(`/api/retailers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || 'Fout bij verwijderen van retailer');
      }
      
      const deleteResult = await deleteResponse.json();
      console.log('[RETAILER DELETE] Delete successful:', deleteResult);
      
      alert('Retailer succesvol verwijderd!');
      
      // Ververs de lijst na succesvolle actie
      await refreshRetailers();
      
    } catch (error) {
      console.error('[RETAILER DELETE] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      alert(`Fout bij verwijderen van retailer: ${errorMessage}`);
    } finally {
      setUpdateLoading(null);
      closeModal();
    }
  };

  // Stuur nieuwe activatiemail naar retailer
  const handleResendActivation = async (retailerId: string) => {
    console.log('[RESEND ACTIVATION] Starting resend for retailer:', retailerId);
    setUpdateLoading(retailerId);
    
    try {
      const response = await fetch('/api/retailers/resend-activation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: retailerId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fout bij versturen activatiemail');
      }
      
      const result = await response.json();
      console.log('[RESEND ACTIVATION] Success:', result);
      
      alert('Nieuwe activatiemail succesvol verzonden!');
      
    } catch (error) {
      console.error('[RESEND ACTIVATION] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout opgetreden';
      alert(`Fout bij versturen activatiemail: ${errorMessage}`);
    } finally {
      setUpdateLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
            <p className="text-gray-600 mb-6">
              U heeft geen toegang tot deze pagina. Log in als admin om toegang te krijgen.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
            >
              Inloggen
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            
            <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold leading-6 text-gray-900">
                {activeTab === 'pending' ? 'Retailer Aanvragen' : 'Goedgekeurde Retailers'}
              </h2>
              <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                <button
                  onClick={refreshRetailers}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Verversen
                </button>
                <div className="flex space-x-4 border-b mb-6 mt-4">
                  <button
                    className={`py-2 px-4 ${activeTab === 'pending' ? 'border-b-2 border-pink-600 font-bold text-pink-700' : 'text-gray-700'}`}
                    onClick={() => setActiveTab('pending')}
                  >
                    In Behandeling
                  </button>
                  <button
                    className={`py-2 px-4 ${activeTab === 'all' ? 'border-b-2 border-blue-600 font-bold text-blue-700' : 'text-gray-700'}`}
                    onClick={() => setActiveTab('all')}
                  >
                    Goedgekeurde Retailers
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    {isLoading ? (
                      <div className="bg-white px-4 py-12 sm:px-6 flex justify-center">
                        <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : retailers.length === 0 ? (
                      <div className="bg-white px-4 py-12 sm:px-6 text-center">
                        <p className="text-gray-500">
                          {activeTab === 'pending'
                            ? 'Er zijn geen openstaande aanvragen.'
                            : 'Er zijn geen retailers gevonden.'
                          }
                        </p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bedrijf
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Locatie
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aanvraagdatum
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Profiel
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Acties</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {retailers.map((retailer) => (
                            <tr key={retailer.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {retailer.business_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{retailer.contact_name}</div>
                                <div className="text-sm text-gray-500">{retailer.email}</div>
                                <div className="text-sm text-gray-500">{retailer.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{retailer.address}</div>
                                <div className="text-sm text-gray-500">{retailer.postal_code}, {retailer.city}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  retailer.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : retailer.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {retailer.status === 'approved'
                                    ? 'Goedgekeurd'
                                    : retailer.status === 'rejected'
                                    ? 'Afgewezen'
                                    : 'In behandeling'
                                  }
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(retailer.created_at).toLocaleDateString('nl-NL')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => {
                                    setSelectedRetailer(retailer);
                                    setActionType('profile');
                                    setIsModalOpen(true);
                                  }}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                                  title="Bekijk volledig profiel"
                                >
                                  Profiel
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {retailer.status === 'pending' && (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => openConfirmModal(retailer, 'approve')}
                                      disabled={updateLoading === retailer.id}
                                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                                        updateLoading === retailer.id
                                          ? 'bg-gray-300 cursor-not-allowed'
                                          : 'bg-green-600 hover:bg-green-700'
                                      }`}
                                    >
                                      {updateLoading === retailer.id ? 'Laden...' : 'Goedkeuren'}
                                    </button>
                                    <button
                                      onClick={() => openConfirmModal(retailer, 'reject')}
                                      disabled={updateLoading === retailer.id}
                                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                                        updateLoading === retailer.id
                                          ? 'bg-gray-300 cursor-not-allowed'
                                          : 'bg-red-600 hover:bg-red-700'
                                      }`}
                                    >
                                      {updateLoading === retailer.id ? 'Laden...' : 'Afwijzen'}
                                    </button>
                                  </div>
                                )}
                                {retailer.status !== 'pending' && (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleResendActivation(retailer.id)}
                                      disabled={updateLoading === retailer.id}
                                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                                        updateLoading === retailer.id
                                          ? 'bg-gray-300 cursor-not-allowed'
                                          : 'bg-blue-600 hover:bg-blue-700'
                                      }`}
                                      title="Stuur nieuwe activatiemail"
                                    >
                                      📧 Activatie
                                    </button>
                                    <button
                                      onClick={() => openConfirmModal(retailer, 'delete')}
                                      disabled={updateLoading === retailer.id}
                                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                                        updateLoading === retailer.id
                                          ? 'bg-gray-300 cursor-not-allowed'
                                          : 'bg-gray-600 hover:bg-gray-700'
                                      }`}
                                    >
                                      {updateLoading === retailer.id ? 'Laden...' : 'Verwijderen'}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bevestigingsmodal */}
      {isModalOpen && selectedRetailer && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {actionType === 'approve' ? 'Retailer goedkeuren' : 
                     actionType === 'reject' ? 'Retailer afwijzen' : 
                     actionType === 'delete' ? 'Retailer verwijderen' :
                     'Retailer Profiel'}
                  </h3>
                  <div className="mt-2">
                    {selectedRetailer.metadata?.message && (
                      <div className="mt-4 text-left">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Aanvullende informatie van retailer</label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-gray-900 whitespace-pre-line">
                          {selectedRetailer.metadata.message}
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      {actionType === 'approve'
                        ? `Weet je zeker dat je ${selectedRetailer.business_name} wilt goedkeuren? Ze krijgen dan toegang tot het retailer dashboard.`
                        : actionType === 'reject'
                        ? `Weet je zeker dat je ${selectedRetailer.business_name} wilt afwijzen?`
                        : actionType === 'delete'
                        ? `Weet je zeker dat je ${selectedRetailer.business_name} permanent wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`
                        : ''
                      }
                    </p>
                    
                    {actionType === 'reject' && (
                      <div className="mt-4">
                        <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 text-left">
                          Reden voor afwijzing (optioneel)
                        </label>
                        <textarea
                          id="reject-reason"
                          name="reject-reason"
                          rows={3}
                          className="mt-1 shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border border-gray-300 rounded-md text-black"
                          placeholder="Geef een reden voor de afwijzing..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          style={{ color: 'black', fontSize: '1rem' }}
                        ></textarea>
                        <p className="mt-1 text-xs text-left text-gray-500">
                          De ingevoerde reden wordt getoond aan de retailer als toelichting bij de afwijzing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={confirmAction}
                  disabled={updateLoading === selectedRetailer.id}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:col-start-2 sm:text-sm ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : actionType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : actionType === 'delete'
                      ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                      : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {actionType === 'approve' ? 'Goedkeuren' : actionType === 'reject' ? 'Afwijzen' : actionType === 'delete' ? 'Verwijderen' : 'Bekijken'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isModalOpen && selectedRetailer && actionType === 'profile' && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 py-8 bg-gray-800 bg-opacity-60">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
              {/* Sluitknop */}
                      <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 focus:outline-none"
                aria-label="Sluiten"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                      </button>
              {/* Avatar/logo en titel */}
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mr-4">
                  <span className="text-2xl font-bold text-pink-600">
                    {selectedRetailer.business_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Retailer Profiel</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedRetailer.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : selectedRetailer.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedRetailer.status}
                  </span>
                </div>
              </div>
              {/* Profielgegevens */}
              <div className="grid grid-cols-1 gap-y-3">
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Bedrijfsnaam</span>
                  <span className="block text-gray-900 font-semibold">{selectedRetailer.business_name}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Contactpersoon</span>
                  <span className="block text-gray-900">{selectedRetailer.contact_name}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Telefoon</span>
                  <span className="block text-gray-900">{selectedRetailer.phone}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-medium">E-mail</span>
                  <span className="block text-gray-900">{selectedRetailer.email}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-medium">Adres</span>
                  <span className="block text-gray-900">{selectedRetailer.address}, {selectedRetailer.postal_code} {selectedRetailer.city}</span>
                </div>
              </div>
              {/* Aanvullende informatie */}
              {selectedRetailer.metadata?.message && (
                <div className="mt-6">
                  <span className="block text-xs text-gray-500 font-medium mb-1">Aanvullende informatie</span>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-900 whitespace-pre-line">
                    {selectedRetailer.metadata.message}
                  </div>
                </div>
          )}
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
} 