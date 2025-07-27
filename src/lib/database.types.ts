// Database types voor website analyse feature
// Auto-generated en handmatig aangevuld voor type safety

export interface ProfileWebsiteAnalysis {
  id: string;
  profile_id: string;
  website_url: string;
  business_type: string | null;
  main_activities: string[] | null;
  target_market: string | null;
  business_description: string | null;
  industry_category: string | null;
  key_services: string[] | null;
  location: string | null;
  confidence_score: number | null;
  analyzed_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  analysis_data?: any; // JSONB field containing all analysis data
  status?: string;
  error_message?: string | null;
}

export interface ProfileWebsiteAnalysisInsert {
  profile_id: string;
  website_url: string;
  business_type?: string | null;
  main_activities?: string[] | null;
  target_market?: string | null;
  business_description?: string | null;
  industry_category?: string | null;
  key_services?: string[] | null;
  location?: string | null;
  confidence_score?: number | null;
  analyzed_at?: string;
  is_active?: boolean;
}

export interface ProfileWebsiteAnalysisUpdate {
  website_url?: string;
  business_type?: string | null;
  main_activities?: string[] | null;
  target_market?: string | null;
  business_description?: string | null;
  industry_category?: string | null;
  key_services?: string[] | null;
  location?: string | null;
  confidence_score?: number | null;
  analyzed_at?: string;
  is_active?: boolean;
}

// Views types
export interface WebsiteAnalysisStats {
  total_analyses: number;
  unique_profiles_analyzed: number;
  avg_confidence_score: number;
  high_confidence_analyses: number;
  low_confidence_analyses: number;
  analyses_last_week: number;
  analyses_last_month: number;
  unique_industries: number;
  most_common_industry: string;
}

export interface IndustryDistribution {
  industry_category: string;
  count: number;
  percentage: number;
  avg_confidence: number;
}

// Business Invitations Types
export interface BusinessInvitation {
  id: string;
  email: string;
  business_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  invitation_token: string;
  status: 'pending' | 'used' | 'expired' | 'cancelled';
  invited_by?: string | null;
  invited_at: string;
  expires_at: string;
  used_at?: string | null;
  used_by?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
  // Email tracking fields
  email_sent_at?: string | null;
  email_opened_at?: string | null;
  email_clicked_at?: string | null;
  email_open_count?: number;
  email_click_count?: number;
  last_email_activity?: string | null;
  tracking_pixel_id?: string | null;
  click_tracking_id?: string | null;
  // Reminder tracking fields
  reminder_sent_at?: string | null;
  reminder_count?: number;
  last_reminder_at?: string | null;
  reminder_email_opened_at?: string | null;
  reminder_email_clicked_at?: string | null;
  reminder_open_count?: number;
  reminder_click_count?: number;
  reminder_tracking_pixel_id?: string | null;
  reminder_click_tracking_id?: string | null;
  // Funnel tracking fields
  registration_page_visited_at?: string | null;
  registration_started_at?: string | null;
  registration_form_submitted_at?: string | null;
  registration_completed_at?: string | null;
  account_activated_at?: string | null;
  admin_approved_at?: string | null;
  final_status?: string;
  conversion_journey?: any;
}

export interface BusinessInvitationInsert {
  email: string;
  business_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  invitation_token: string;
  status?: 'pending' | 'used' | 'expired' | 'cancelled';
  invited_by?: string | null;
  expires_at?: string;
  metadata?: any;
}

export interface BusinessInvitationUpdate {
  email?: string;
  business_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  status?: 'pending' | 'used' | 'expired' | 'cancelled';
  used_at?: string | null;
  used_by?: string | null;
  metadata?: any;
}

export interface InvitationStatistics {
  total_invitations: number;
  pending_invitations: number;
  used_invitations: number;
  expired_invitations: number;
  cancelled_invitations: number;
  invitations_last_week: number;
  invitations_last_month: number;
  // Email tracking statistics
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  email_open_rate: number;
  email_click_rate: number;
  // Reminder tracking statistics
  reminders_sent: number;
  reminders_opened: number;
  reminders_clicked: number;
  total_reminder_count: number;
  reminder_open_rate: number;
  reminder_click_rate: number;
}

// Funnel tracking interfaces
export interface FunnelStatistics {
  total_invitations: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  page_visited: number;
  registration_started: number;
  form_submitted: number;
  registration_completed: number;
  account_activated: number;
  admin_approved: number;
  // Conversion rates
  sent_rate: number;
  open_rate: number;
  click_through_rate: number;
  page_visit_rate: number;
  start_rate: number;
  submit_rate: number;
  completion_rate: number;
  activation_rate: number;
  approval_rate: number;
  overall_conversion_rate: number;
}

export interface DropOffAnalysis {
  drop_off_point: string;
  dropped_count: number;
  drop_off_percentage: number;
}

export interface FunnelEvent {
  id: string;
  invitation_id: string;
  event_type: string;
  event_timestamp: string;
  session_id?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  referrer?: string | null;
  page_url?: string | null;
  metadata?: any;
  created_at: string;
}

export interface FunnelEventDetailed extends FunnelEvent {
  event_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  phone?: string;
  invitation_status: string;
  invited_at: string;
  expires_at: string;
  final_status?: string;
  hours_since_invitation: number;
  timing_status: string;
}

export interface UserPageVisits {
  invitation_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  invited_at: string;
  invitation_status: string;
  total_page_visits: number;
  unique_pages_visited: number;
  first_page_visit?: string;
  last_activity?: string;
  visited_pages?: string;
  unique_sessions: number;
  session_ids?: string;
  referrers?: string;
}

export interface UserSessionAnalysis {
  session_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  session_start: string;
  session_end: string;
  session_duration_minutes: number;
  events_in_session: number;
  unique_pages_in_session: number;
  event_types: string;
  pages_visited?: string;
  first_event: string;
  last_event: string;
  user_agent?: string;
  ip_address?: string;
}

export interface PagePopularityAnalysis {
  page_url: string;
  total_visits: number;
  unique_visitors: number;
  unique_sessions: number;
  first_visit: string;
  last_visit: string;
  avg_hours_after_invitation: number;
  referrers?: string;
  visits_with_referrer: number;
  event_types_on_page: string;
}

export interface UserFunnelTimeline {
  invitation_id: string;
  email: string;
  business_name?: string;
  contact_name?: string;
  invited_at: string;
  invitation_status: string;
  event_timeline?: Array<{
    event_type: string;
    timestamp: string;
    page_url?: string;
    referrer?: string;
    session_id?: string;
    hours_since_invitation: number;
    metadata?: any;
  }>;
  total_events: number;
  first_event?: string;
  last_event?: string;
  unique_sessions: number;
}

// Bestaande types (voor compatibiliteit)
export interface Profile {
  id: string;
  business_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  chamber_of_commerce?: string | null;
  vat_number?: string | null;
  website?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  notes?: string | null;
  manual_business_summary?: string | null;
  invitation_token?: string | null;
  created_at: string;
  updated_at: string;
}


export interface OnboardingProgress {
  id: string;
  profile_id: string;
  current_step: number;
  total_steps: number;
  steps_completed: Record<string, boolean>;
  onboarding_data: Record<string, any>;
  started_at: string;
  completed_at?: string;
  skipped_at?: string;
  is_active: boolean;
}

export interface OnboardingStep {
  id: string;
  step_number: number;
  step_key: string;
  title: string;
  description?: string;
  component_name?: string;
  is_required: boolean;
  estimated_time_minutes?: number;
  reward_points?: number;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

// Sales Advice Types
export interface RetailerSalesAdvice {
  id: string;
  profile_id: string;
  source: 'ai_analysis' | 'manual_input';
  advice_text: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string | null;
  analysis_version?: string | null;
  confidence_score?: number | null;
  advice_data?: any; // JSONB field
}

export interface RetailerSalesAdviceInsert {
  profile_id: string;
  source: 'ai_analysis' | 'manual_input';
  advice_text: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string | null;
  analysis_version?: string | null;
  confidence_score?: number | null;
  advice_data?: any;
}

export interface RetailerSalesAdviceUpdate {
  source?: 'ai_analysis' | 'manual_input';
  advice_text?: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string | null;
  analysis_version?: string | null;
  confidence_score?: number | null;
  advice_data?: any;
}

export interface SalesAdviceJob {
  id: string;
  profile_id: string;
  job_type: 'generate_advice' | 'regenerate_advice';
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  source_data?: any; // JSONB field
  result_advice_id?: string | null;
  processing_time_ms?: number | null;
  tokens_used?: number | null;
}

// Stats and Views Types
export interface SalesAdviceStats {
  total_advice_generated: number;
  unique_profiles_with_advice: number;
  ai_generated_advice: number;
  manual_generated_advice: number;
  completed_advice: number;
  failed_advice: number;
  advice_last_week: number;
  advice_last_month: number;
  avg_confidence_score: number;
}

export interface ProfileNeedingAdvice {
  id: string;
  business_name?: string | null;
  email?: string | null;
  website_url?: string | null;
  manual_business_summary?: string | null;
  ai_business_description?: string | null;
  analysis_status?: string | null;
  analyzed_at?: string | null;
  advice_source_available?: 'ai_analysis' | 'manual_input' | null;
}

// Database configuration
export interface Database {
  public: {
    Tables: {
      profile_website_analysis: {
        Row: ProfileWebsiteAnalysis;
        Insert: ProfileWebsiteAnalysisInsert;
        Update: ProfileWebsiteAnalysisUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      retailer_sales_advice: {
        Row: RetailerSalesAdvice;
        Insert: RetailerSalesAdviceInsert;
        Update: RetailerSalesAdviceUpdate;
      };
      sales_advice_jobs: {
        Row: SalesAdviceJob;
        Insert: Omit<SalesAdviceJob, 'id' | 'created_at' | 'started_at' | 'completed_at'>;
        Update: Partial<Omit<SalesAdviceJob, 'id' | 'profile_id' | 'job_type' | 'created_at'>>;
      };
      business_invitations: {
        Row: BusinessInvitation;
        Insert: BusinessInvitationInsert;
        Update: BusinessInvitationUpdate;
      };
    };
    Views: {
      website_analysis_stats: {
        Row: WebsiteAnalysisStats;
      };
      industry_distribution: {
        Row: IndustryDistribution;
      };
      sales_advice_stats: {
        Row: SalesAdviceStats;
      };
      profiles_needing_advice: {
        Row: ProfileNeedingAdvice;
      };
      invitation_statistics: {
        Row: InvitationStatistics;
      };
    };
    Functions: {
      get_latest_website_analysis: {
        Args: { user_profile_id: string };
        Returns: ProfileWebsiteAnalysis[];
      };
      get_latest_sales_advice: {
        Args: { user_profile_id: string };
        Returns: RetailerSalesAdvice[];
      };
      needs_sales_advice_generation: {
        Args: { user_profile_id: string };
        Returns: boolean;
      };
      validate_invitation_token: {
        Args: { token_input: string };
        Returns: BusinessInvitation[];
      };
      mark_invitation_used: {
        Args: { token_input: string; user_id: string };
        Returns: boolean;
      };
    };
  };
}
