'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Type definitions for Wasstrips applications
type WasstripsApplicationStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'delivered' | 'canceled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

interface WasstripsApplication {
  id: string;
  businessName: string;
  status: WasstripsApplicationStatus;
  isPaid: boolean;
  paymentStatus?: PaymentStatus;
  appliedAt: string;
  lastUpdated?: string;
  total?: number;
}

export default function WasstripsApplicationsOverview() {
  const [applications, setApplications] = useState<WasstripsApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentApplications, setRecentApplications] = useState<WasstripsApplication[]>([]);

  // Load applications from localStorage
  useEffect(() => {
    const loadApplications = () => {
      try {
        const storedApplications = localStorage.getItem('wasstrips-applications');
        if (storedApplications) {
          const apps = JSON.parse(storedApplications);
          setApplications(apps);
          
          // Get 5 most recent applications
          const sortedApps = [...apps].sort((a, b) => {
            const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(a.appliedAt);
            const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(b.appliedAt);
            return dateB.getTime() - dateA.getTime();
          });
          
          setRecentApplications(sortedApps.slice(0, 5));
        } else {
          setApplications([]);
          setRecentApplications([]);
        }
      } catch (error) {
        console.error("Error loading applications:", error);
        setApplications([]);
        setRecentApplications([]);
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
    
    // Set up interval to refresh data every 30 seconds
    const intervalId = setInterval(loadApplications, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    processing: applications.filter(app => app.status === 'processing').length,
    delivered: applications.filter(app => app.status === 'delivered').length,
    paid: applications.filter(app => app.isPaid || app.paymentStatus === 'paid').length,
    unpaid: applications.filter(app => !app.isPaid && app.paymentStatus !== 'paid').length,
    totalValue: applications.reduce((sum, app) => sum + (app.total || 0), 0),
    paidValue: applications
      .filter(app => app.isPaid || app.paymentStatus === 'paid')
      .reduce((sum, app) => sum + (app.total || 0), 0)
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status badge
  const getStatusBadge = (status: WasstripsApplicationStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In afwachting</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Goedgekeurd</span>;
      case 'processing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">In behandeling</span>;
      case 'delivered':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Geleverd</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Afgewezen</span>;
      case 'canceled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Geannuleerd</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Onbekend</span>;
    }
  };

  // Payment status
  const getPaymentBadge = (application: WasstripsApplication) => {
    if (application.isPaid || application.paymentStatus === 'paid') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Betaald</span>;
    } else if (application.paymentStatus === 'failed') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Mislukt</span>;
    } else if (application.paymentStatus === 'expired') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Verlopen</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In afwachting</span>;
    }
  };
  
  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
        <div className="h-20 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Wasstrips Aanvragen</h3>
          <Link
            href="/dashboard/wasstrips-applications"
            className="text-sm text-cyan-600 hover:text-cyan-800 font-medium flex items-center"
          >
            Beheer aanvragen
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Totaal aantal</p>
            <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-600 font-medium">In afwachting</p>
            <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-sm text-green-600 font-medium">Betaald</p>
            <p className="text-2xl font-bold text-green-800">{stats.paid}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <p className="text-sm text-purple-600 font-medium">Omzet</p>
            <p className="text-2xl font-bold text-purple-800">{formatAmount(stats.totalValue)}</p>
          </div>
        </div>
        
        {recentApplications.length > 0 ? (
          <>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recente aanvragen</h4>
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between">
                    <div>
                      <Link href={`/dashboard/wasstrips-applications?id=${app.id}`} className="font-medium text-gray-900 hover:text-cyan-600">
                        {app.businessName}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(app.status)}
                        {getPaymentBadge(app)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-700 font-medium">
                        {app.total ? formatAmount(app.total) : 'n/a'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(app.lastUpdated || app.appliedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {recentApplications.length < stats.total && (
              <div className="text-center mt-4">
                <Link 
                  href="/dashboard/wasstrips-applications" 
                  className="text-sm text-cyan-600 hover:text-cyan-800 font-medium"
                >
                  Bekijk alle {stats.total} aanvragen
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Geen aanvragen gevonden</p>
            <Link 
              href="/dashboard/wasstrips-applications" 
              className="inline-block mt-3 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
            >
              Beheer aanvragen
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 