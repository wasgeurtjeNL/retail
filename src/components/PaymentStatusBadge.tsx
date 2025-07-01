'use client';

import React from 'react';

/**
 * Generate a payment status badge UI component based on payment status
 * @param status - The payment status ('paid', 'pending', 'expired', 'failed', etc.)
 * @param daysRemaining - Optional, number of days remaining until payment is due
 */
interface PaymentStatusBadgeProps {
  status: string;
  daysRemaining?: number | null;
}

export default function PaymentStatusBadge({ status, daysRemaining = null }: PaymentStatusBadgeProps) {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Betaald
        </span>
      );
    case 'pending':
      return (
        <div>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Betaling open
          </span>
          {daysRemaining !== null && daysRemaining > 0 && (
            <div className="text-sm mt-1.5 text-yellow-600 font-medium">
              Nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'}
            </div>
          )}
          {daysRemaining !== null && daysRemaining < 0 && (
            <div className="text-sm mt-1.5 text-red-600 font-medium">
              {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dag' : 'dagen'} over tijd
            </div>
          )}
        </div>
      );
    case 'expired':
      return (
        <div>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Betaling te laat
          </span>
          {daysRemaining !== null && daysRemaining < 0 && (
            <div className="text-sm mt-1.5 text-red-600 font-medium">
              {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dag' : 'dagen'} over tijd
            </div>
          )}
        </div>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Betaling mislukt
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          Onbekend
        </span>
      );
  }
} 