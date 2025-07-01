'use client';

/**
 * Utility functions for the application
 */
import React, { JSX } from 'react';

/**
 * Format a date to a readable string format
 * @param date - The date to format (Date object or ISO string)
 * @param includeTime - Whether to include the time in the formatted string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  // Format options
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return dateObj.toLocaleDateString('nl-NL', options);
}

/**
 * Format relative time (e.g., "5 minutes ago", "2 hours ago")
 * @param dateString - ISO date string or Date object to calculate relative time from
 * @returns Formatted relative time string in Dutch
 */
export function formatRelativeTime(dateString?: Date | string): string {
  if (!dateString) return 'recent';
  
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minuut' : 'minuten'} geleden`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'uur' : 'uur'} geleden`;
  } else {
    return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagen'} geleden`;
  }
}

/**
 * Calculate time remaining until a target date
 * @param targetDate - The target date to calculate time until
 * @returns Object containing days, hours, minutes remaining
 */
export function getTimeRemaining(targetDate: Date | string) {
  const dateObj = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const now = new Date();
  
  // Calculate total remaining time in milliseconds
  const totalTimeRemaining = dateObj.getTime() - now.getTime();
  
  // If date is in the past, return zeros
  if (totalTimeRemaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0
    };
  }
  
  // Calculate individual time components
  const days = Math.floor(totalTimeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalTimeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalTimeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalTimeRemaining % (1000 * 60)) / 1000);
  
  return {
    days,
    hours,
    minutes,
    seconds,
    total: totalTimeRemaining
  };
}

/**
 * Format a currency amount
 * @param amount - The amount to format
 * @param currency - The currency code (default: EUR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a number with thousand separators
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('nl-NL').format(num);
}

/**
 * Calculate days remaining until a payment due date
 * @param dueDate - The due date (string or Date object)
 * @returns Number of days remaining or null if no due date
 */
export function calculateDaysRemaining(dueDate?: string | Date | null): number | null {
  if (!dueDate) return null;
  
  const dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const today = new Date();
  
  // Reset time parts to compare just the dates
  dueDateObj.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = dueDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Generates a payment status badge component based on payment status
 * @param order Order object with payment information
 * @returns React node with appropriate styling based on payment status
 */
export const getPaymentStatusBadge = (order: any): React.ReactNode => {
  const status = order.paymentStatus || 'pending';
  const daysRemaining = order.paymentDueDate ? calculateDaysRemaining(order.paymentDueDate) : null;
  
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
          {daysRemaining !== null && (
            <div className="text-sm mt-1.5 text-yellow-600 font-medium">
              Nog {daysRemaining} {daysRemaining === 1 ? 'dag' : 'dagen'}
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
};