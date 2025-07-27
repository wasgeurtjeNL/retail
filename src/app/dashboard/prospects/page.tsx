'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Users, Mail, Phone, Globe, MapPin, Calendar, Brain, TrendingUp, RefreshCw, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import EmailQueueViewer from '@/components/EmailQueueViewer';

interface Prospect {
  id: string;
  business_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  business_segment: string;
  status: string;
  discovery_source: string;
  lead_quality_score?: number;
  business_quality_score?: number;
  enrichment_score?: number;
  initial_outreach_date?: string;
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
  raw_data?: any;
}

interface ProspectsData {
  prospects: Prospect[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistics: {
    total: number;
    added_today: number;
    by_status: Record<string, number>;
    by_source: Record<string, number>;
    by_segment: Record<string, number>;
    email_queue: Record<string, number>;
  };
}

export default function ProspectsOverview() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [data, setData] = useState<ProspectsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  
  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');

  useEffect(() => {
    loadProspects();
  }, [currentPage, statusFilter, sourceFilter, segmentFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadProspects, 30000);
    return () => clearInterval(interval);
  }, [currentPage, statusFilter, sourceFilter, segmentFilter]);

  const loadProspects = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      if (segmentFilter) params.append('segment', segmentFilter);

      const response = await fetch(`/api/commercial/prospects?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(`Fout bij laden prospects: ${result.error}`);
      }

    } catch (error) {
      console.error('Error loading prospects:', error);
      toast.error('Fout bij laden prospects');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadProspects();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatScore = (score?: number) => {
    if (!score) return 'N/A';
    return (score * 100).toFixed(0) + '%';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-blue-100 text-blue-800',
      'qualified': 'bg-green-100 text-green-800', 
      'contacted': 'bg-yellow-100 text-yellow-800',
      'interested': 'bg-purple-100 text-purple-800',
      'converted': 'bg-emerald-100 text-emerald-800',
      'not_interested': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSourceIcon = (source: string) => {
    if (source === 'perplexity_api') return <Brain className="h-4 w-4 text-green-600" />;
    if (source === 'google_places') return <Globe className="h-4 w-4 text-blue-600" />;
    if (source === 'manual') return <Users className="h-4 w-4 text-gray-600" />;
    return <Search className="h-4 w-4 text-gray-600" />;
  };

  const getSourceName = (source: string) => {
    const names: Record<string, string> = {
      'perplexity_api': 'Perplexity AI',
      'google_places': 'Google Places',
      'web_scraping': 'Web Scraping',
      'manual': 'Manual Input',
      'import': 'CSV Import'
    };
    return names[source] || source;
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedProspects.length === 0) {
      toast.error('Selecteer eerst prospects om bij te werken');
      return;
    }

    try {
      const response = await fetch('/api/commercial/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_update_status',
          prospect_ids: selectedProspects,
          new_status: newStatus
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setSelectedProspects([]);
        await loadProspects();
      } else {
        toast.error(`Update gefaald: ${result.error}`);
      }

    } catch (error) {
      console.error('Error updating prospects:', error);
      toast.error('Fout bij bijwerken prospects');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Laden...</p>
      </div>
    </div>;
  }

  if (!isAdmin) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <X className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Toegang Geweigerd</h1>
        <p className="text-gray-600 mb-4">Je hebt geen toegang tot deze pagina.</p>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          Terug naar dashboard →
        </Link>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            
            {/* Page Header */}
            <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold leading-6 text-gray-900">Commercial Prospects</h1>
                <p className="mt-2 text-lg text-gray-600">
                  Overzicht van alle gevonden prospects en hun status
                </p>
              </div>
              <div className="flex gap-3">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar dashboard
                </Link>
                <Button 
                  onClick={loadProspects} 
                  variant="outline"
                  disabled={loading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Vernieuwen
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            {data && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Prospects</p>
                        <p className="text-2xl font-bold text-gray-900">{data.statistics.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Added Today</p>
                        <p className="text-2xl font-bold text-gray-900">{data.statistics.added_today}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Mail className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Emails Queued</p>
                        <p className="text-2xl font-bold text-gray-900">{data.statistics.email_queue.pending || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Brain className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Perplexity Found</p>
                        <p className="text-2xl font-bold text-gray-900">{data.statistics.by_source.perplexity_api || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Zoek op naam, email, stad..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="text-gray-900"
                      />
                      <Button onClick={handleSearch} size="sm">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Status filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle statussen</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Bron filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle bronnen</SelectItem>
                      <SelectItem value="perplexity_api">Perplexity AI</SelectItem>
                      <SelectItem value="google_places">Google Places</SelectItem>
                      <SelectItem value="web_scraping">Web Scraping</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Segment filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle segmenten</SelectItem>
                      <SelectItem value="beauty_salon">Beauty Salon</SelectItem>
                      <SelectItem value="hair_salon">Hair Salon</SelectItem>
                      <SelectItem value="wellness_spa">Wellness & Spa</SelectItem>
                      <SelectItem value="hotel_bnb">Hotel & B&B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {selectedProspects.length > 0 && (
                  <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedProspects.length} prospect(s) geselecteerd
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        size="sm" 
                        onClick={() => bulkUpdateStatus('qualified')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark as Qualified
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => bulkUpdateStatus('contacted')}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Mark as Contacted
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedProspects([])}
                        variant="outline"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prospects Table */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Prospects Overview</span>
                  {data && (
                    <span className="text-sm font-normal text-gray-600">
                      Showing {data.prospects.length} of {data.pagination.total} prospects
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Loading prospects...</p>
                  </div>
                ) : data && data.prospects.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedProspects.length === data.prospects.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProspects(data.prospects.map(p => p.id));
                                } else {
                                  setSelectedProspects([]);
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Business
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quality
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date Added
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.prospects.map((prospect) => (
                          <tr key={prospect.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedProspects.includes(prospect.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProspects([...selectedProspects, prospect.id]);
                                  } else {
                                    setSelectedProspects(selectedProspects.filter(id => id !== prospect.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{prospect.business_name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  {prospect.city && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {prospect.city}
                                    </span>
                                  )}
                                  <Badge variant="default" className="text-xs">
                                    {prospect.business_segment.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                {prospect.email && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate max-w-40">{prospect.email}</span>
                                  </div>
                                )}
                                {prospect.phone && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    {prospect.phone}
                                  </div>
                                )}
                                {prospect.website && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Globe className="h-3 w-3" />
                                    <a href={prospect.website} target="_blank" rel="noopener noreferrer" 
                                       className="text-blue-600 hover:text-blue-800 truncate max-w-32">
                                      {prospect.website.replace(/^https?:\/\//, '')}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getStatusColor(prospect.status)}>
                                {prospect.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getSourceIcon(prospect.discovery_source)}
                                <span className="text-sm text-gray-900">
                                  {getSourceName(prospect.discovery_source)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                {prospect.lead_quality_score && (
                                  <div className="text-xs text-gray-600">
                                    Lead: {formatScore(prospect.lead_quality_score)}
                                  </div>
                                )}
                                {prospect.business_quality_score && (
                                  <div className="text-xs text-gray-600">
                                    Business: {formatScore(prospect.business_quality_score)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(prospect.created_at)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Geen prospects gevonden</p>
                    <p className="text-sm text-gray-500 mt-1">Probeer andere filters of voer discovery uit</p>
                  </div>
                )}

                {/* Pagination */}
                {data && data.pagination.pages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {data.pagination.page} of {data.pagination.pages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.pagination.hasPrev}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.pagination.hasNext}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Queue Viewer */}
            <EmailQueueViewer 
              className="mt-6"
              limit={10}
            />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 