// =====================================================
// APPLICATION CONSTANTS
// Shared constants used across the application
// =====================================================

// System UUID for automated processes and health checks
// This UUID is used when no specific user is associated with an operation
export const SYSTEM_UUID = '00000000-0000-0000-0000-000000000001';

// Admin UUID for admin-only operations
export const ADMIN_UUID = '00000000-0000-0000-0000-000000000002';

// Default timeouts
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const LONG_TIMEOUT = 300000; // 5 minutes

// Queue configuration
export const QUEUE_DEFAULTS = {
  maxRetries: 3,
  retryDelayBase: 5000, // 5 seconds
  jobTimeout: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  maxProcessingTime: 120000 // 2 minutes
};

// Email configuration
export const EMAIL_DEFAULTS = {
  fromEmail: 'info@wasgeurtje.nl',
  fromName: 'Wasgeurtje.nl',
  replyToEmail: 'info@wasgeurtje.nl'
};

// API Rate limits
export const RATE_LIMITS = {
  perplexity: {
    requestsPerMinute: 10,
    requestsPerHour: 500
  },
  mandrill: {
    requestsPerMinute: 100,
    requestsPerHour: 1000
  },
  googlePlaces: {
    requestsPerMinute: 10,
    requestsPerHour: 100
  }
}; 