// Client-side funnel tracking utility
export class FunnelTracker {
  private sessionId: string;
  private invitationToken: string | null;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
    
    // Get invitation token from URL params
    this.invitationToken = this.getInvitationTokenFromURL();
    
    // Track initial page visit if we have a token
    if (this.invitationToken) {
      this.trackEvent('registration_page_visited');
    }
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('funnel_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('funnel_session_id', sessionId);
    }
    return sessionId;
  }

  private getInvitationTokenFromURL(): string | null {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Also check localStorage for token (in case user navigates away and comes back)
    if (!token) {
      return localStorage.getItem('invitation_token');
    }
    
    // Store token in localStorage for persistence
    if (token) {
      localStorage.setItem('invitation_token', token);
    }
    
    return token;
  }

  public async trackEvent(eventType: string, metadata: any = {}): Promise<boolean> {
    try {
      console.log('[FUNNEL_TRACKER] Tracking event:', eventType);

      const response = await fetch('/api/funnel/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType,
          invitationToken: this.invitationToken,
          sessionId: this.sessionId,
          metadata: {
            ...metadata,
            pageUrl: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('[FUNNEL_TRACKER] Event tracked successfully:', eventType);
        return true;
      } else {
        console.warn('[FUNNEL_TRACKER] Event tracking failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[FUNNEL_TRACKER] Error tracking event:', error);
      return false;
    }
  }

  // Convenience methods for specific events
  public trackRegistrationStarted(formData: any = {}) {
    return this.trackEvent('registration_started', { formData });
  }

  public trackFormFieldCompleted(fieldName: string, value: any) {
    return this.trackEvent('form_field_completed', { fieldName, value });
  }

  public trackFormSubmitted(formData: any) {
    return this.trackEvent('registration_form_submitted', { formData });
  }

  public trackRegistrationCompleted(userData: any) {
    return this.trackEvent('registration_completed', { userData });
  }

  public trackAccountActivated(activationData: any = {}) {
    return this.trackEvent('account_activated', { activationData });
  }

  public trackAdminApproved(approvalData: any = {}) {
    return this.trackEvent('admin_approved', { approvalData });
  }

  // Track form interaction events
  public trackFormInteraction(interactionType: 'focus' | 'blur' | 'change', fieldName: string, value?: any) {
    return this.trackEvent('form_interaction', {
      interactionType,
      fieldName,
      value,
      timestamp: new Date().toISOString()
    });
  }

  // Track error events
  public trackError(errorType: string, errorMessage: string, context: any = {}) {
    return this.trackEvent('error_occurred', {
      errorType,
      errorMessage,
      context
    });
  }

  // Track time spent on page
  private pageStartTime = Date.now();
  
  public trackPageExit() {
    const timeSpent = Date.now() - this.pageStartTime;
    return this.trackEvent('page_exit', {
      timeSpentMs: timeSpent,
      timeSpentSeconds: Math.round(timeSpent / 1000)
    });
  }

  // Get session info
  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      invitationToken: this.invitationToken,
      hasInvitation: !!this.invitationToken
    };
  }
}

// Singleton instance
let funnelTrackerInstance: FunnelTracker | null = null;

export function getFunnelTracker(): FunnelTracker {
  if (!funnelTrackerInstance) {
    funnelTrackerInstance = new FunnelTracker();
  }
  return funnelTrackerInstance;
}

// React hook for easy usage in components
import { useEffect, useRef } from 'react';

export function useFunnelTracker() {
  const trackerRef = useRef<FunnelTracker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !trackerRef.current) {
      trackerRef.current = getFunnelTracker();
    }
  }, []);

  return trackerRef.current;
}

// Auto-track page exit on beforeunload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const tracker = getFunnelTracker();
    tracker.trackPageExit();
  });
} 