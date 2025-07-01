'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRelativeTime } from '@/lib/utils';

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
}

interface RetailerNotificationProps {
  userEmail?: string;
}

export default function RetailerNotification({ userEmail }: RetailerNotificationProps) {
  const [notifications, setNotifications] = useState<WasstripsApplication[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load notifications from localStorage
  useEffect(() => {
    const loadNotifications = () => {
      if (!userEmail) return;
      
      try {
        // Load dismissed notifications first
        const storedDismissed = localStorage.getItem('dismissedNotifications');
        if (storedDismissed) {
          setDismissed(JSON.parse(storedDismissed));
        }
        
        // Load applications from localStorage (admin dashboard storage)
        const storedApplications = localStorage.getItem('wasstrips-applications');
        if (storedApplications) {
          const applications: WasstripsApplication[] = JSON.parse(storedApplications);
          
          // Filter applications for this retailer that have payment requested but not paid
          const relevantApplications = applications.filter(app => 
            app.email === userEmail && 
            app.paymentOptionSent && 
            !app.isPaid
          );
          
          // Verwijder dubbele notificaties door te filteren op unieke ID's
          const uniqueIds = new Set();
          const uniqueApplications = relevantApplications.filter(app => {
            // Als het ID al is gezien, sla deze over
            if (uniqueIds.has(app.id)) return false;
            // Anders voeg het toe aan de set en behoud deze
            uniqueIds.add(app.id);
            return true;
          });
          
          if (uniqueApplications.length > 0) {
            console.log('Gevonden betaalverzoeken voor retailer:', uniqueApplications);
            setNotifications(uniqueApplications);
          }
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
    
    // Set up a timer to check for new notifications every minute
    const intervalId = setInterval(loadNotifications, 60000);
    
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
  
  return (
    <div className="mb-6 space-y-4">
      <AnimatePresence>
        {visibleNotifications.map((notification) => {
          const daysRemaining = notification.paymentDueDate 
            ? calculateDaysRemaining(notification.paymentDueDate)
            : null;
          
          const isUrgent = daysRemaining !== null && daysRemaining <= 4;
          const isVeryUrgent = daysRemaining !== null && daysRemaining <= 1;
          
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
                      {notification.selectedPaymentOption 
                        ? notification.selectedPaymentOption === 'invoice' && daysRemaining !== null
                          ? daysRemaining <= 0
                            ? ` Uw factuur is verlopen!`
                            : ` U heeft nog ${daysRemaining} ${daysRemaining === 1 ? 'dag' : 'dagen'} om te betalen.`
                          : ` Betaal nu direct via ${notification.selectedPaymentOption === 'direct' ? 'iDEAL of creditcard' : 'factuur'}.`
                        : ` Kies uw gewenste betaalmethode: direct betalen of op factuur (binnen 14 dagen).`
                      }
                      <Link
                        href="/retailer-dashboard/orders"
                        className={`font-medium underline ml-1 ${
                          isVeryUrgent 
                            ? "text-red-700 hover:text-red-600"
                            : isUrgent
                              ? "text-orange-700 hover:text-orange-600" 
                              : "text-yellow-700 hover:text-yellow-600"
                        }`}
                      >
                        {notification.selectedPaymentOption
                          ? "Bekijk en betaal nu"
                          : "Kies betaalmethode"
                        }
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
                        ? ` • Bedrag: €${(notification.total).toFixed(2).replace('.', ',')}`
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