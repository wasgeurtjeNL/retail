// =====================================================
// EMAIL QUEUE VIEWER - Email Details Display
// Gebruiksvriendelijke interface voor email queue management
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Eye, Clock, AlertCircle, CheckCircle, RefreshCw, User, Calendar, Hash, X, Send, Pause, Trash2, Check, Minus, Plus, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailQueueItem {
  id: string;
  prospect_id?: string;
  template_id?: string;
  campaign_id?: string;
  recipient_email: string;
  recipient_name?: string;
  personalized_subject: string;
  personalized_html: string;
  personalized_text?: string;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  max_retries?: number;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  business_name?: string;
  city?: string;
  business_segment?: string;
}

interface AvailableProspect {
  id: string;
  business_name: string;
  email: string;
  business_segment: string;
  city?: string;
  contact_name?: string;
  status: string;
  potential_score?: number;
  created_at: string;
}

interface EmailQueueViewerProps {
  prospectId?: string;
  limit?: number;
  className?: string;
}

export default function EmailQueueViewer({ prospectId, limit = 10, className = "" }: EmailQueueViewerProps) {
  const [emails, setEmails] = useState<EmailQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailQueueItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Add to Queue modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableProspects, setAvailableProspects] = useState<AvailableProspect[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [selectedProspectIds, setSelectedProspectIds] = useState<Set<string>>(new Set());
  const [prospectSearch, setProspectSearch] = useState('');
  const [prospectSegmentFilter, setProspectSegmentFilter] = useState('');
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [availableSegments, setAvailableSegments] = useState<Record<string, number>>({});

  // Fetch emails from queue
  const fetchEmails = async () => {
    try {
      setLoading(true);
      
      const url = prospectId 
        ? `/api/commercial/prospects/${prospectId}/emails`
        : '/api/commercial/email-queue';
      
      const response = await fetch(`${url}?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      
      const data = await response.json();
      setEmails(data.emails || []);
      
      // Clear selection when emails change
      setSelectedEmailIds(new Set());
      
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Kon emails niet laden');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available prospects for adding to queue
  const fetchAvailableProspects = async () => {
    try {
      setLoadingProspects(true);
      
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (prospectSegmentFilter) params.append('segment', prospectSegmentFilter);
      if (prospectSearch) params.append('search', prospectSearch);
      
      const response = await fetch(`/api/commercial/prospects/available?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch available prospects');
      }
      
      const data = await response.json();
      setAvailableProspects(data.prospects || []);
      setAvailableSegments(data.segments || {});
      
    } catch (error) {
      console.error('Error fetching available prospects:', error);
      toast.error('Kon beschikbare prospects niet laden');
    } finally {
      setLoadingProspects(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [prospectId, limit]);

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableProspects();
    }
  }, [showAddModal, prospectSegmentFilter, prospectSearch]);

  // Get status badge with better styling
  const getStatusBadge = (status: string, attempts: number = 0) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-medium">
            <Clock className="h-3 w-3 mr-1" />
            In wachtrij ({attempts} pogingen)
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
            <Send className="h-3 w-3 mr-1" />
            Wordt verstuurd
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="success" className="bg-green-50 text-green-700 border-green-200 font-medium">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verzonden
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="error" className="bg-red-50 text-red-700 border-red-200 font-medium">
            <AlertCircle className="h-3 w-3 mr-1" />
            Mislukt
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="default" className="bg-gray-50 text-gray-700 border-gray-200 font-medium">
            <Pause className="h-3 w-3 mr-1" />
            Geannuleerd
          </Badge>
        );
      default:
        return <Badge variant="default" className="font-medium">{status}</Badge>;
    }
  };

  // Get business segment badge
  const getSegmentBadge = (segment: string) => {
    const segmentConfig: Record<string, { label: string; color: string }> = {
      beauty_salon: { label: 'Beauty Salon', color: 'bg-pink-100 text-pink-700 border-pink-200' },
      nail_salon: { label: 'Nagelstudio', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      hairdresser: { label: 'Kapper', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      restaurant: { label: 'Restaurant', color: 'bg-orange-100 text-orange-700 border-orange-200' },
      retail_clothing: { label: 'Kleding', color: 'bg-green-100 text-green-700 border-green-200' },
      gym: { label: 'Sportschool', color: 'bg-red-100 text-red-700 border-red-200' },
    };

    const config = segmentConfig[segment] || { label: segment, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    
    return (
      <Badge className={`${config.color} font-medium text-xs`}>
        {config.label}
      </Badge>
    );
  };

  // Format date in a more readable way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 5) return 'Net nu';
    if (diffMinutes < 60) return `${diffMinutes} min geleden`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} uur geleden`;
    
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Preview email content
  const previewEmail = (email: EmailQueueItem) => {
    setSelectedEmail(email);
    setShowPreview(true);
  };

  // Check if email can be deleted (only pending, failed, cancelled)
  const canDeleteEmail = (email: EmailQueueItem) => {
    const deletableStatuses = ['pending', 'failed', 'cancelled'];
    return deletableStatuses.includes(email.status) && !email.sent_at;
  };

  // Get all deletable emails
  const getDeletableEmails = () => {
    return emails.filter(email => canDeleteEmail(email));
  };

  // Get selected deletable emails
  const getSelectedDeletableEmails = () => {
    return emails.filter(email => 
      selectedEmailIds.has(email.id) && canDeleteEmail(email)
    );
  };

  // Handle individual email selection
  const handleEmailSelect = (emailId: string, selected: boolean) => {
    const newSelection = new Set(selectedEmailIds);
    if (selected) {
      newSelection.add(emailId);
    } else {
      newSelection.delete(emailId);
    }
    setSelectedEmailIds(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    const deletableEmails = getDeletableEmails();
    const allDeletableSelected = deletableEmails.every(email => 
      selectedEmailIds.has(email.id)
    );

    if (allDeletableSelected) {
      // Deselect all deletable emails
      const newSelection = new Set(selectedEmailIds);
      deletableEmails.forEach(email => newSelection.delete(email.id));
      setSelectedEmailIds(newSelection);
    } else {
      // Select all deletable emails
      const newSelection = new Set(selectedEmailIds);
      deletableEmails.forEach(email => newSelection.add(email.id));
      setSelectedEmailIds(newSelection);
    }
  };

  // Handle prospect selection for adding to queue
  const handleProspectSelect = (prospectId: string, selected: boolean) => {
    const newSelection = new Set(selectedProspectIds);
    if (selected) {
      newSelection.add(prospectId);
    } else {
      newSelection.delete(prospectId);
    }
    setSelectedProspectIds(newSelection);
  };

  // Handle select all prospects
  const handleSelectAllProspects = () => {
    if (selectedProspectIds.size === availableProspects.length) {
      setSelectedProspectIds(new Set());
    } else {
      setSelectedProspectIds(new Set(availableProspects.map(p => p.id)));
    }
  };

  // Retry failed email
  const retryEmail = async (emailId: string) => {
    try {
      const response = await fetch(`/api/commercial/email-queue/${emailId}/retry`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Email opnieuw in wachtrij geplaatst');
        await fetchEmails(); // Refresh list
      } else {
        throw new Error('Retry failed');
      }
    } catch (error) {
      toast.error('Kon email niet opnieuw proberen');
    }
  };

  // Delete single email from queue
  const deleteEmail = async (emailId: string) => {
    try {
      setDeleting(emailId);
      
      const response = await fetch(`/api/commercial/email-queue?id=${emailId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Email succesvol verwijderd uit wachtrij');
        await fetchEmails(); // Refresh list
        setDeleteConfirm(null); // Close confirmation
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Kon email niet verwijderen');
    } finally {
      setDeleting(null);
    }
  };

  // Bulk delete emails
  const bulkDeleteEmails = async () => {
    try {
      setBulkDeleting(true);
      
      const selectedDeletableEmails = getSelectedDeletableEmails();
      const emailIds = selectedDeletableEmails.map(email => email.id);
      
      if (emailIds.length === 0) {
        toast.error('Geen verwijderbare emails geselecteerd');
        return;
      }

      const response = await fetch('/api/commercial/email-queue', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailIds })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(`${result.deleted_count} email(s) succesvol verwijderd uit wachtrij`);
        await fetchEmails(); // Refresh list
        setBulkDeleteConfirm(false); // Close confirmation
        setSelectedEmailIds(new Set()); // Clear selection
      } else {
        throw new Error(result.error || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Kon emails niet verwijderen');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Add prospects to queue
  const addProspectsToQueue = async () => {
    try {
      setAddingToQueue(true);
      
      if (selectedProspectIds.size === 0) {
        toast.error('Selecteer eerst prospects om toe te voegen');
        return;
      }

      const response = await fetch('/api/commercial/email-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prospectIds: Array.from(selectedProspectIds),
          scheduleDelay: 5 // 5 minutes delay
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(`${result.queued_count} prospect(s) succesvol toegevoegd aan wachtrij`);
        await fetchEmails(); // Refresh email list
        setShowAddModal(false); // Close modal
        setSelectedProspectIds(new Set()); // Clear selection
        setProspectSearch(''); // Clear search
        setProspectSegmentFilter(''); // Clear filter
      } else {
        throw new Error(result.error || 'Failed to add prospects');
      }
    } catch (error) {
      console.error('Add to queue error:', error);
      toast.error(error instanceof Error ? error.message : 'Kon prospects niet toevoegen');
    } finally {
      setAddingToQueue(false);
    }
  };

  // Get select all state
  const getSelectAllState = () => {
    const deletableEmails = getDeletableEmails();
    if (deletableEmails.length === 0) return 'none';
    
    const selectedDeletableCount = deletableEmails.filter(email => 
      selectedEmailIds.has(email.id)
    ).length;
    
    if (selectedDeletableCount === 0) return 'none';
    if (selectedDeletableCount === deletableEmails.length) return 'all';
    return 'some';
  };

  // Single email confirmation dialog
  const DeleteConfirmationDialog = ({ emailId }: { emailId: string }) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Email Verwijderen</h3>
              <p className="text-sm text-gray-600">Deze actie kan niet ongedaan worden gemaakt</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700 mb-1"><strong>Aan:</strong> {email.recipient_email}</p>
            <p className="text-sm text-gray-700 mb-1"><strong>Onderwerp:</strong> {email.personalized_subject}</p>
            <p className="text-sm text-gray-700"><strong>Status:</strong> {email.status}</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setDeleteConfirm(null)}
              variant="outline"
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              onClick={() => deleteEmail(emailId)}
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting === emailId}
            >
              {deleting === emailId ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verwijderen...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verwijderen
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Bulk delete confirmation dialog
  const BulkDeleteConfirmationDialog = () => {
    const selectedDeletableEmails = getSelectedDeletableEmails();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedDeletableEmails.length} Email(s) Verwijderen
              </h3>
              <p className="text-sm text-gray-600">Deze actie kan niet ongedaan worden gemaakt</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Te verwijderen emails:
            </div>
            <div className="space-y-1">
              {selectedDeletableEmails.map(email => (
                <div key={email.id} className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
                  <span className="truncate">{email.recipient_email}</span>
                  <span className="text-gray-400">({email.status})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setBulkDeleteConfirm(false)}
              variant="outline"
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              onClick={bulkDeleteEmails}
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verwijderen...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {selectedDeletableEmails.length} Email(s) Verwijderen
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Add to Queue Modal
  const AddToQueueModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Modal Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Prospects Toevoegen aan Email Queue</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Selecteer prospects om toe te voegen aan de email wachtrij
                </p>
              </div>
              <Button 
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProspectIds(new Set());
                  setProspectSearch('');
                  setProspectSegmentFilter('');
                }}
                variant="secondary"
                size="sm"
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek op bedrijfsnaam, email of stad..."
                  value={prospectSearch}
                  onChange={(e) => setProspectSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="relative">
                <Filter className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={prospectSegmentFilter}
                  onChange={(e) => setProspectSegmentFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Alle segmenten</option>
                  {Object.entries(availableSegments).map(([segment, count]) => (
                    <option key={segment} value={segment}>
                      {segment} ({count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleSelectAllProspects}
                className="flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
              >
                <div className={`
                  w-4 h-4 border-2 rounded flex items-center justify-center transition-colors
                  ${selectedProspectIds.size === availableProspects.length && availableProspects.length > 0
                    ? 'bg-green-600 border-green-600' 
                    : selectedProspectIds.size > 0
                    ? 'bg-green-600 border-green-600'
                    : 'border-green-300 hover:border-green-400'
                  }
                `}>
                  {selectedProspectIds.size === availableProspects.length && availableProspects.length > 0 && 
                    <Check className="h-2.5 w-2.5 text-white" />
                  }
                  {selectedProspectIds.size > 0 && selectedProspectIds.size < availableProspects.length && 
                    <Minus className="h-2.5 w-2.5 text-white" />
                  }
                </div>
                {selectedProspectIds.size === availableProspects.length && availableProspects.length > 0
                  ? 'Alles deselecteren' 
                  : selectedProspectIds.size > 0
                  ? 'Alles selecteren'
                  : `Alle ${availableProspects.length} prospects selecteren`
                }
              </button>
              {selectedProspectIds.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedProspectIds.size} van {availableProspects.length} geselecteerd
                </span>
              )}
            </div>
          </div>
          
          {/* Prospects List */}
          <div className="p-6 overflow-y-auto max-h-[50vh] bg-gray-50">
            {loadingProspects ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
                <span className="ml-3 text-gray-600 font-medium">Prospects laden...</span>
              </div>
            ) : availableProspects.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-lg font-medium text-gray-600">Geen beschikbare prospects</p>
                <p className="text-sm text-gray-500 mt-1">Alle prospects hebben al emails in de wachtrij</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {availableProspects.map((prospect) => (
                  <div 
                    key={prospect.id} 
                    className={`
                      p-4 bg-white rounded-lg border transition-all cursor-pointer hover:shadow-md
                      ${selectedProspectIds.has(prospect.id) 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                      }
                    `}
                    onClick={() => handleProspectSelect(prospect.id, !selectedProspectIds.has(prospect.id))}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedProspectIds.has(prospect.id)}
                        onChange={(e) => handleProspectSelect(prospect.id, e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{prospect.business_name}</h4>
                          {getSegmentBadge(prospect.business_segment)}
                          {prospect.potential_score && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              Score: {Math.round(prospect.potential_score * 100)}%
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{prospect.email}</span>
                          </div>
                          {prospect.city && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-400" />
                              <span>{prospect.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProspectIds(new Set());
                  setProspectSearch('');
                  setProspectSegmentFilter('');
                }}
                variant="outline"
              >
                Annuleren
              </Button>
              <Button
                onClick={addProspectsToQueue}
                variant="primary"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={selectedProspectIds.size === 0 || addingToQueue}
              >
                {addingToQueue ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Toevoegen...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {selectedProspectIds.size} Prospect(s) Toevoegen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            Email Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600 font-medium">Emails laden...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deletableEmailsCount = getDeletableEmails().length;
  const selectedDeletableCount = getSelectedDeletableEmails().length;
  const selectAllState = getSelectAllState();

  return (
    <div className={className}>
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">Email Queue</CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {emails.length} emails in de verzendwachtrij
                  {deletableEmailsCount > 0 && (
                    <span className="text-green-600 ml-2">
                      • {deletableEmailsCount} verwijderbaar
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAddModal(true)}
                size="sm" 
                variant="primary"
                className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Prospects Toevoegen
              </Button>
              {selectedDeletableCount > 0 && (
                <Button 
                  onClick={() => setBulkDeleteConfirm(true)}
                  size="sm" 
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {selectedDeletableCount} Verwijderen
                </Button>
              )}
              <Button 
                onClick={fetchEmails} 
                size="sm" 
                variant="primary"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Vernieuwen
              </Button>
            </div>
          </div>

          {/* Bulk Selection Controls */}
          {deletableEmailsCount > 0 && (
            <div className="mt-4 flex items-center gap-3 pt-3 border-t border-blue-100">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 font-medium"
              >
                <div className={`
                  w-4 h-4 border-2 rounded flex items-center justify-center transition-colors
                  ${selectAllState === 'all' 
                    ? 'bg-blue-600 border-blue-600' 
                    : selectAllState === 'some'
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-blue-300 hover:border-blue-400'
                  }
                `}>
                  {selectAllState === 'all' && <Check className="h-2.5 w-2.5 text-white" />}
                  {selectAllState === 'some' && <Minus className="h-2.5 w-2.5 text-white" />}
                </div>
                {selectAllState === 'all' 
                  ? 'Alles deselecteren' 
                  : selectAllState === 'some'
                  ? 'Alles selecteren'
                  : `Alle ${deletableEmailsCount} verwijderbare emails selecteren`
                }
              </button>
              {selectedDeletableCount > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedDeletableCount} van {deletableEmailsCount} geselecteerd
                </span>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          {emails.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-600">Geen emails in de wachtrij</p>
              <p className="text-sm text-gray-500 mt-1">Alle emails zijn verwerkt</p>
              
              <div className="mt-6">
                <Button 
                  onClick={() => setShowAddModal(true)}
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Prospects Toevoegen aan Queue
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {emails.map((email, index) => (
                <div key={email.id} className={`p-6 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-blue-50/30' : ''} ${selectedEmailIds.has(email.id) ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {canDeleteEmail(email) && (
                      <div className="flex items-center pt-1">
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.has(email.id)}
                          onChange={(e) => handleEmailSelect(email.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {email.business_name || email.recipient_name || 'Onbekende zaak'}
                        </h4>
                        {getStatusBadge(email.status, email.attempts)}
                        {email.business_segment && getSegmentBadge(email.business_segment)}
                      </div>
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{email.recipient_email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Gepland: {formatDate(email.scheduled_at)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {email.city && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{email.city}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <span className="font-mono text-xs">{email.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </div>

                      {/* Subject Line */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="text-sm text-gray-500 mb-1">Onderwerp:</div>
                        <div className="text-gray-900 font-medium">{email.personalized_subject}</div>
                      </div>

                      {/* Status Messages */}
                      {email.error_message && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-red-800">Foutmelding:</div>
                            <div className="text-sm text-red-700">{email.error_message}</div>
                          </div>
                        </div>
                      )}
                      
                      {email.sent_at && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="text-sm text-green-700">
                            <span className="font-medium">Verzonden op:</span> {formatDate(email.sent_at)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => previewEmail(email)}
                        size="sm"
                        variant="primary"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Bekijk
                      </Button>
                      
                      {email.status === 'failed' && (
                        <Button
                          onClick={() => retryEmail(email.id)}
                          size="sm"
                          variant="primary"
                          className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Opnieuw
                        </Button>
                      )}

                      {canDeleteEmail(email) && (
                        <Button
                          onClick={() => setDeleteConfirm(email.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Verwijder
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improved Email Preview Modal */}
      {showPreview && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEmail.business_name || selectedEmail.recipient_name}
                  </p>
                </div>
                <Button 
                  onClick={() => setShowPreview(false)} 
                  variant="secondary"
                  size="sm"
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Email Metadata */}
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Aan:</span>
                    <div className="text-gray-900 mt-1">{selectedEmail.recipient_email}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Status:</span>
                    <div className="mt-1">{getStatusBadge(selectedEmail.status, selectedEmail.attempts)}</div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-semibold text-gray-700">Onderwerp:</span>
                    <div className="text-gray-900 mt-1 font-medium">{selectedEmail.personalized_subject}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Email Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div 
                  className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.personalized_html }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Queue Modal */}
      {showAddModal && <AddToQueueModal />}

      {/* Delete Confirmation Dialogs */}
      {deleteConfirm && <DeleteConfirmationDialog emailId={deleteConfirm} />}
      {bulkDeleteConfirm && <BulkDeleteConfirmationDialog />}
    </div>
  );
} 