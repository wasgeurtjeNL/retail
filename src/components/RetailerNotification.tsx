'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';

// Interface voor Wasstrips applicaties voor retailers
interface WasstripsApplication {
  id: string;
  email: string;
  businessName: string;
  contactName: string;
  status: string;
  paymentOptionSent?: boolean;
  paymentLinkSentAt?: string;
  selectedPaymentOption?: 'direct' | 'invoice' | null;
  isPaid: boolean;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentDueDate?: string;
  total?: number;
  invoiceNumber?: string;
  // Nieuwe velden van Supabase
  deposit_status?: 'pending' | 'paid' | 'failed';
  remaining_payment_status?: 'pending' | 'paid' | 'failed';
  profile_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Database type voor wasstrips applicaties
interface DatabaseWasstripsApplication {
  id: string;
  profile_id: string;
  status: 'pending' | 'approved' | 'order_ready' | 'payment_selected' | 'rejected' | 'shipped';
  deposit_status: 'not_sent' | 'sent' | 'paid' | 'failed';
  remaining_payment_status: 'not_sent' | 'sent' | 'paid' | 'failed';
  total_amount: string;
  business_name?: string;
  contact_name?: string;
  created_at: string;
  updated_at: string;
}

interface RetailerNotificationProps {
  userEmail?: string;
}

// Haalt notificaties op uit de database in plaats van localStorage
export default function RetailerNotification({ userEmail }: RetailerNotificationProps) {
  const [notifications, setNotifications] = useState<WasstripsApplication[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load notifications from database
  useEffect(() => {
    const loadNotifications = async () => {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('[RetailerNotification] Loading notifications for:', userEmail);
        
        // Load dismissed notifications from localStorage
        const storedDismissed = localStorage.getItem('dismissedNotifications');
        if (storedDismissed) {
          setDismissed(JSON.parse(storedDismissed));
        }
        
        // Haal notificaties op uit Supabase database
        const supabase = getSupabase();
        
        // Haal eerst het retailer profiel op
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single();
          
        if (profileError || !profile) {
          console.log('[RetailerNotification] No profile found for email:', userEmail);
          setIsLoading(false);
          return;
        }
        
        // Haal wasstrips applicaties op voor deze retailer
        const { data: applications, error: appsError } = await supabase
          .from('wasstrips_applications')
          .select('*')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false });
          
        if (appsError) {
          console.error('[RetailerNotification] Error loading applications:', appsError);
          setIsLoading(false);
          return;
        }
        
        console.log('[RetailerNotification] Raw applications from database:', applications);
          
        // Filter applicaties die een betaling nodig hebben
        const relevantApplications = applications?.filter((app: DatabaseWasstripsApplication) => {
          // Toon notificatie als er een betaling actie vereist is
          const needsDepositPayment = app.deposit_status === 'sent' && (app.status === 'approved' || app.status === 'pending');
          const needsRemainingPayment = app.remaining_payment_status === 'sent' && app.deposit_status === 'paid';
          
          console.log(`[RetailerNotification] Checking app ${app.id}: deposit_status=${app.deposit_status}, remaining_payment_status=${app.remaining_payment_status}, status=${app.status}`);
          console.log(`[RetailerNotification] needsDepositPayment=${needsDepositPayment}, needsRemainingPayment=${needsRemainingPayment}`);
          
          return needsDepositPayment || needsRemainingPayment;
        }) || [];
        
        console.log('[RetailerNotification] Relevant applications (need payment):', relevantApplications);
        
        // Converteer naar het verwachte format
        const convertedNotifications: WasstripsApplication[] = relevantApplications.map((app: DatabaseWasstripsApplication) => ({
          id: app.id,
          email: userEmail,
          businessName: app.business_name || 'Onbekend bedrijf',
          contactName: app.contact_name || 'Onbekende contactpersoon',
          status: app.status,
          paymentOptionSent: true, // Als het in de database staat, is het verstuurd
          paymentLinkSentAt: app.created_at,
          selectedPaymentOption: app.deposit_status === 'sent' ? 'direct' : 'invoice',
          isPaid: app.deposit_status === 'paid' && app.remaining_payment_status === 'paid',
          paymentStatus: app.deposit_status === 'paid' ? 'paid' : 'pending',
          paymentMethod: 'stripe',
          paymentDueDate: app.created_at ? new Date(new Date(app.created_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          total: parseFloat(app.total_amount || '300.00'),
          // Bewaar originele velden voor debugging - converteer naar verwachte types
          deposit_status: app.deposit_status === 'not_sent' ? 'pending' : app.deposit_status === 'sent' ? 'pending' : app.deposit_status as 'paid' | 'failed',
          remaining_payment_status: app.remaining_payment_status === 'not_sent' ? 'pending' : app.remaining_payment_status === 'sent' ? 'pending' : app.remaining_payment_status as 'paid' | 'failed',
          profile_id: app.profile_id,
          created_at: app.created_at,
          updated_at: app.updated_at
        }));
        
        console.log('[RetailerNotification] Converted notifications:', convertedNotifications);
        
        if (convertedNotifications.length > 0) {
          setNotifications(convertedNotifications);
        } else {
          setNotifications([]);
          }
        
      } catch (error) {
        console.error('[RetailerNotification] Error loading notifications:', error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
    
    // Set up a timer to check for new notifications every 30 seconds
    const intervalId = setInterval(loadNotifications, 30000);
    
    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [userEmail]);
  
  // Dismiss a notification
  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify(newDismissed));
  };
  
  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(
    notification => !dismissed.includes(notification.id)
  );
  
  if (isLoading || visibleNotifications.length === 0) {
    return null;
  }
  
  // Calculate days remaining for invoice payments
  const calculateDaysRemaining = (paymentDueDate?: string): number | null => {
    if (!paymentDueDate) return null;
    
    const dueDate = new Date(paymentDueDate);
    const today = new Date();
    
    // Reset hours to compare just the dates
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'minder dan een uur geleden';
    if (diffInHours < 24) return `${diffInHours} uur geleden`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} dag${diffInDays > 1 ? 'en' : ''} geleden`;
    
    return date.toLocaleDateString('nl-NL');
  };
  
  return (
    <div className="mb-6 space-y-4">
      <AnimatePresence>
        {visibleNotifications.map((notification) => {
          const daysRemaining = notification.paymentDueDate 
            ? calculateDaysRemaining(notification.paymentDueDate)
            : null;
          
          const isUrgent = daysRemaining !== null && daysRemaining <= 4;
          const isVeryUrgent = daysRemaining !== null && daysRemaining <= 1;
          
          // Bepaal het type betaling op basis van status
          const needsDepositPayment = notification.deposit_status === 'pending';
          const needsRemainingPayment = notification.remaining_payment_status === 'pending' && notification.deposit_status === 'paid';
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
              className={`border-l-4 p-4 rounded shadow-sm ${
                isVeryUrgent 
                  ? "bg-red-50 border-red-500"
                  : isUrgent
                    ? "bg-orange-50 border-orange-500" 
                    : "bg-yellow-50 border-yellow-400"
              }`}
            >
              <div className="flex justify-between">
                <div className="flex">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg
                      className={`h-5 w-5 ${
                        isVeryUrgent 
                          ? "text-red-600"
                          : isUrgent
                            ? "text-orange-500" 
                            : "text-yellow-400"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm ${
                      isVeryUrgent 
                        ? "text-red-700"
                        : isUrgent
                          ? "text-orange-700" 
                          : "text-yellow-700"
                    }`}>
                      <span className="font-medium">
                        {isVeryUrgent 
                          ? "DRINGEND: "
                          : isUrgent
                            ? "Belangrijk: " 
                            : ""
                        }
                      </span>
                      Uw bestelling van Wasstrips kan bij u afgeleverd worden.
                      {needsDepositPayment && ` Betaal de aanbetaling van €30 om uw bestelling te bevestigen.`}
                      {needsRemainingPayment && ` Betaal het resterende bedrag van €270 om uw bestelling te voltooien.`}
                      <Link
                        href="/retailer-dashboard/wasstrips"
                        className={`font-medium underline ml-1 ${
                          isVeryUrgent 
                            ? "text-red-700 hover:text-red-600"
                            : isUrgent
                              ? "text-orange-700 hover:text-orange-600" 
                              : "text-yellow-700 hover:text-yellow-600"
                        }`}
                      >
                        Bekijk en betaal nu
                      </Link>
                    </p>
                    <p className={`mt-1 text-xs ${
                      isVeryUrgent 
                        ? "text-red-500"
                        : isUrgent
                          ? "text-orange-500" 
                          : "text-yellow-500"
                    }`}>
                      {notification.paymentLinkSentAt
                        ? formatRelativeTime(notification.paymentLinkSentAt)
                        : 'recent'
                      }
                      {notification.total 
                        ? ` • Bedrag: €${notification.total.toFixed(2).replace('.', ',')}`
                        : ''
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismiss(notification.id)}
                  className="inline-flex text-gray-400 focus:outline-none hover:text-gray-500"
                >
                  <span className="sr-only">Sluiten</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
} 