"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import { BusinessInvitation, InvitationStatistics } from "@/lib/database.types";

export default function InvitationsPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [invitations, setInvitations] = useState<BusinessInvitation[]>([]);
  const [statistics, setStatistics] = useState<InvitationStatistics | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Individual invitation state
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [isSendingIndividual, setIsSendingIndividual] = useState(false);
  const [individualForm, setIndividualForm] = useState({
    email: '',
    business_name: '',
    contact_name: '',
    phone: ''
  });
  const [individualResult, setIndividualResult] = useState<any>(null);
  
  // Reminder state
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // Delete state
  const [deletingInvitation, setDeletingInvitation] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!authLoading && user && isAdmin) {
        setIsLoading(true);
        try {
          // Haal uitnodigingen op
          const status = activeTab === 'pending' ? 'pending' : undefined;
          const invitationsUrl = status ? `/api/invitations?status=${status}` : '/api/invitations';
          
          const invitationsRes = await fetch(invitationsUrl, {
            method: 'GET',
            credentials: 'include'
          });
          
          if (invitationsRes.ok) {
            const invitationsData = await invitationsRes.json();
            setInvitations(invitationsData);
          }

          // Haal statistieken op
          const statsRes = await fetch('/api/invitations/statistics', {
            method: 'GET',
            credentials: 'include'
          });
          
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStatistics(statsData);
          }

        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [user, authLoading, isAdmin, activeTab]);

  const handleImport = async () => {
    if (!csvData.trim()) {
      alert('Voer CSV data in');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/invitations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          csvData: csvData.trim(),
          sendEmails: true
        })
      });

      const result = await response.json();
      setImportResult(result);

      if (result.success) {
        // Refresh invitations
        const invitationsRes = await fetch('/api/invitations', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (invitationsRes.ok) {
          const invitationsData = await invitationsRes.json();
          setInvitations(invitationsData);
        }
      }

    } catch (error) {
      console.error('Import error:', error);
      alert('Fout bij importeren');
    } finally {
      setIsImporting(false);
    }
  };

  const handleIndividualInvitation = async () => {
    if (!individualForm.email.trim()) {
      alert('E-mailadres is verplicht');
      return;
    }

    setIsSendingIndividual(true);
    setIndividualResult(null);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          invitations: [individualForm],
          sendEmails: true
        })
      });

      const result = await response.json();
      setIndividualResult(result);

      if (result.success && result.created > 0) {
        // Reset form and refresh invitations
        setIndividualForm({
          email: '',
          business_name: '',
          contact_name: '',
          phone: ''
        });

        // Refresh invitations list
        const invitationsRes = await fetch('/api/invitations', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (invitationsRes.ok) {
          const invitationsData = await invitationsRes.json();
          setInvitations(invitationsData);
        }

        // Refresh statistics
        const statsRes = await fetch('/api/invitations/statistics', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStatistics(statsData);
        }
      }

    } catch (error) {
      console.error('Individual invitation error:', error);
      alert('Fout bij versturen uitnodiging');
    } finally {
      setIsSendingIndividual(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setCsvData('');
    setImportResult(null);
  };

  const closeIndividualModal = () => {
    setShowIndividualModal(false);
    setIndividualForm({
      email: '',
      business_name: '',
      contact_name: '',
      phone: ''
    });
    setIndividualResult(null);
  };

  const handleReminder = async (invitationId: string) => {
    if (sendingReminder) return; // Prevent multiple clicks
    
    setSendingReminder(invitationId);
    try {
      const response = await fetch('/api/invitations/remind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ invitationId })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        // Refresh invitations list
        const invitationsRes = await fetch('/api/invitations', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (invitationsRes.ok) {
          const invitationsData = await invitationsRes.json();
          setInvitations(invitationsData);
        }
      } else {
        alert(`❌ Fout: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('❌ Fout bij versturen herinnering');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleDelete = async (invitationId: string, email: string) => {
    if (deletingInvitation) return; // Prevent multiple clicks
    
    const confirmed = window.confirm(
      `Weet u zeker dat u de uitnodiging voor ${email} wilt verwijderen?\n\n` +
      'Deze actie kan niet ongedaan worden gemaakt.'
    );
    
    if (!confirmed) return;
    
    setDeletingInvitation(invitationId);
    try {
      const response = await fetch('/api/invitations/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ invitationId })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        // Refresh invitations list
        const invitationsRes = await fetch('/api/invitations', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (invitationsRes.ok) {
          const invitationsData = await invitationsRes.json();
          setInvitations(invitationsData);
        }
        
        // Refresh statistics
        const statsRes = await fetch('/api/invitations/statistics', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStatistics(statsData);
        }
      } else {
        alert(`❌ Fout: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('❌ Fout bij verwijderen uitnodiging');
    } finally {
      setDeletingInvitation(null);
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
                Bedrijfsuitnodigingen
              </h2>
              <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                <button
                  onClick={() => setShowIndividualModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Voeg uitnodiging toe
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Importeer CSV
                </button>
              </div>
            </div>

            {/* Statistieken */}
            {statistics && (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold text-sm">T</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Totaal uitnodigingen</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.total_invitations}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold text-sm">P</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">In behandeling</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.pending_invitations}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold text-sm">G</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Gebruikt</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.used_invitations}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold text-sm">W</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Deze week</dt>
                          <dd className="text-lg font-medium text-gray-900">{statistics.invitations_last_week}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                                  </div>
                </div>
              )}
              
              {/* Reminder Tracking Statistics */}
              {statistics && (statistics.reminders_sent > 0) && (
                <div className="mt-8">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">🔔 Reminder Tracking Statistieken</h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Reminders verzonden */}
                    <div className="bg-yellow-50 overflow-hidden shadow rounded-lg border border-yellow-200">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm">🔔</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-yellow-600 truncate">
                                Reminders verzonden
                              </dt>
                              <dd className="text-lg font-medium text-yellow-900">
                                {statistics.total_reminder_count || 0}
                              </dd>
                              <dt className="text-xs text-yellow-500 truncate">
                                Aan {statistics.reminders_sent || 0} contacten
                              </dt>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reminders geopend */}
                    <div className="bg-green-50 overflow-hidden shadow rounded-lg border border-green-200">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm">👁️</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-green-600 truncate">
                                Reminders geopend
                              </dt>
                              <dd className="text-lg font-medium text-green-900">
                                {statistics.reminders_opened || 0}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reminders geklikt */}
                    <div className="bg-purple-50 overflow-hidden shadow rounded-lg border border-purple-200">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm">🖱️</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-purple-600 truncate">
                                Reminder links geklikt
                              </dt>
                              <dd className="text-lg font-medium text-purple-900">
                                {statistics.reminders_clicked || 0}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reminder rates */}
                    <div className="bg-orange-50 overflow-hidden shadow rounded-lg border border-orange-200">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm">📊</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-orange-600 truncate">
                                Reminder Open Rate
                              </dt>
                              <dd className="text-lg font-medium text-orange-900">
                                {statistics.reminder_open_rate || 0}%
                              </dd>
                              <dt className="text-xs text-orange-500 truncate mt-1">
                                Click Rate: {statistics.reminder_click_rate || 0}%
                              </dt>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Tabs */}
            <div className="flex space-x-4 border-b mb-6 mt-8">
              <button
                className={`py-2 px-4 ${activeTab === 'pending' ? 'border-b-2 border-pink-600 font-bold text-pink-700' : 'text-gray-700'}`}
                onClick={() => setActiveTab('pending')}
              >
                In behandeling ({statistics?.pending_invitations || 0})
              </button>
              <button
                className={`py-2 px-4 ${activeTab === 'all' ? 'border-b-2 border-blue-600 font-bold text-blue-700' : 'text-gray-700'}`}
                onClick={() => setActiveTab('all')}
              >
                Alle uitnodigingen ({statistics?.total_invitations || 0})
              </button>
            </div>
            
            {/* Tabel */}
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
                    ) : invitations.length === 0 ? (
                      <div className="bg-white px-4 py-12 sm:px-6 text-center">
                        <p className="text-gray-500">
                          {activeTab === 'pending'
                            ? 'Er zijn geen openstaande uitnodigingen.'
                            : 'Er zijn geen uitnodigingen gevonden.'
                          }
                        </p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              E-mail
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bedrijf
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email Tracking
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reminders
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Verzonden
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Verloopt
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acties
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invitations.map((invitation) => (
                            <tr key={invitation.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {invitation.email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{invitation.business_name || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{invitation.contact_name || '-'}</div>
                                {invitation.phone && (
                                  <div className="text-sm text-gray-500">{invitation.phone}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  invitation.status === 'used'
                                    ? 'bg-green-100 text-green-800'
                                    : invitation.status === 'expired'
                                    ? 'bg-red-100 text-red-800'
                                    : invitation.status === 'cancelled'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {invitation.status === 'used'
                                    ? 'Gebruikt'
                                    : invitation.status === 'expired'
                                    ? 'Verlopen'
                                    : invitation.status === 'cancelled'
                                    ? 'Geannuleerd'
                                    : 'In behandeling'
                                  }
                                </span>
                              </td>
                              
                              {/* Email Tracking Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col space-y-1">
                                  {/* Email sent status */}
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      invitation.email_sent_at
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {invitation.email_sent_at ? '📧 Verzonden' : '📧 Niet verzonden'}
                                    </span>
                                  </div>
                                  
                                  {/* Email opened status */}
                                  {invitation.email_sent_at && (
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        invitation.email_opened_at
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {invitation.email_opened_at 
                                          ? `👁️ Geopend (${invitation.email_open_count || 1}x)`
                                          : '👁️ Niet geopend'
                                        }
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Email clicked status */}
                                  {invitation.email_sent_at && (
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        invitation.email_clicked_at
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {invitation.email_clicked_at 
                                          ? `🖱️ Geklikt (${invitation.email_click_count || 1}x)`
                                          : '🖱️ Niet geklikt'
                                        }
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              {/* Reminder Tracking Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col space-y-1">
                                  {/* Reminder count */}
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      (invitation.reminder_count || 0) > 0
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {(invitation.reminder_count || 0) > 0 
                                        ? `🔔 ${invitation.reminder_count} reminder${invitation.reminder_count > 1 ? 's' : ''}`
                                        : '🔔 Geen reminders'
                                      }
                                    </span>
                                  </div>
                                  
                                  {/* Last reminder date */}
                                  {invitation.last_reminder_at && (
                                    <div className="text-xs text-gray-500">
                                      Laatste: {new Date(invitation.last_reminder_at).toLocaleDateString('nl-NL')}
                                    </div>
                                  )}
                                  
                                  {/* Reminder opened status */}
                                  {invitation.reminder_sent_at && (
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        invitation.reminder_email_opened_at
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {invitation.reminder_email_opened_at 
                                          ? `👁️ Geopend (${invitation.reminder_open_count || 1}x)`
                                          : '👁️ Niet geopend'
                                        }
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(invitation.invited_at).toLocaleDateString('nl-NL')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(invitation.expires_at).toLocaleDateString('nl-NL')}
                              </td>
                              
                              {/* Actions Column */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex flex-col space-y-2">
                                  {/* Reminder Button */}
                                  {invitation.status === 'pending' && new Date(invitation.expires_at) > new Date() && (
                                    <button
                                      onClick={() => handleReminder(invitation.id)}
                                      disabled={sendingReminder === invitation.id}
                                      className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                                        sendingReminder === invitation.id
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                      }`}
                                    >
                                      {sendingReminder === invitation.id ? (
                                        <>
                                          <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                          </svg>
                                          Versturen...
                                        </>
                                      ) : (
                                        <>
                                          🔔 Reminder
                                        </>
                                      )}
                                    </button>
                                  )}
                                  
                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDelete(invitation.id, invitation.email)}
                                    disabled={deletingInvitation === invitation.id}
                                    className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                                      deletingInvitation === invitation.id
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                                  >
                                    {deletingInvitation === invitation.id ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Verwijderen...
                                      </>
                                    ) : (
                                      <>
                                        🗑️ Verwijderen
                                      </>
                                    )}
                                  </button>
                                </div>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeImportModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Importeer uitnodigingen via CSV
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Plak uw CSV data hieronder. Verwachte kolommen: email, business_name, contact_name, phone
                    </p>
                    
                    <div className="mt-4">
                      <textarea
                        className="w-full h-64 p-3 border border-gray-300 rounded-md text-sm font-mono"
                        placeholder="email,business_name,contact_name,phone&#10;test@example.com,Test BV,John Doe,0612345678&#10;..."
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        disabled={isImporting}
                      />
                    </div>

                    {importResult && (
                      <div className={`mt-4 p-4 rounded-md ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <h4 className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                          {importResult.success ? 'Import succesvol' : 'Import fout'}
                        </h4>
                        {importResult.summary && (
                          <div className="mt-2 text-sm text-gray-700">
                            <p>Totaal rijen: {importResult.summary.totalRows}</p>
                            <p>Aangemaakte uitnodigingen: {importResult.summary.created}</p>
                            {importResult.summary.errors > 0 && (
                              <p>Fouten: {importResult.summary.errors}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting || !csvData.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-pink-600 text-base font-medium text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:col-start-2 sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Importeren...' : 'Importeren'}
                </button>
                <button
                  type="button"
                  onClick={closeImportModal}
                  disabled={isImporting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Invitation Modal */}
      {showIndividualModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeIndividualModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Voeg individuele uitnodiging toe
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Vul de gegevens van het bedrijf in dat u wilt uitnodigen
                    </p>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left">
                        E-mailadres *
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                        placeholder="info@bedrijf.nl"
                        value={individualForm.email}
                        onChange={(e) => setIndividualForm({ ...individualForm, email: e.target.value })}
                        disabled={isSendingIndividual}
                      />
                    </div>

                    <div>
                      <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 text-left">
                        Bedrijfsnaam
                      </label>
                      <input
                        type="text"
                        id="business_name"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                        placeholder="Naam van het bedrijf"
                        value={individualForm.business_name}
                        onChange={(e) => setIndividualForm({ ...individualForm, business_name: e.target.value })}
                        disabled={isSendingIndividual}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 text-left">
                        Contactpersoon
                      </label>
                      <input
                        type="text"
                        id="contact_name"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                        placeholder="Voor- en achternaam"
                        value={individualForm.contact_name}
                        onChange={(e) => setIndividualForm({ ...individualForm, contact_name: e.target.value })}
                        disabled={isSendingIndividual}
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 text-left">
                        Telefoonnummer
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"
                        placeholder="06-12345678"
                        value={individualForm.phone}
                        onChange={(e) => setIndividualForm({ ...individualForm, phone: e.target.value })}
                        disabled={isSendingIndividual}
                      />
                    </div>
                  </div>

                  {individualResult && (
                    <div className={`mt-4 p-4 rounded-md ${individualResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <h4 className={`font-medium ${individualResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {individualResult.success ? 'Uitnodiging succesvol verstuurd!' : 'Fout bij versturen uitnodiging'}
                      </h4>
                      {individualResult.errors && individualResult.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-700">
                          {individualResult.errors.map((error: any, index: number) => (
                            <p key={index}>{error.error}</p>
                          ))}
                        </div>
                      )}
                      {individualResult.error && (
                        <p className="mt-1 text-sm text-red-700">
                          {individualResult.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleIndividualInvitation}
                  disabled={isSendingIndividual || !individualForm.email.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSendingIndividual ? 'Versturen...' : 'Verstuur uitnodiging'}
                </button>
                <button
                  type="button"
                  onClick={closeIndividualModal}
                  disabled={isSendingIndividual}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}