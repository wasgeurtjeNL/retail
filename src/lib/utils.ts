/**
 * Utility functions for the application
 */
import React from 'react';

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