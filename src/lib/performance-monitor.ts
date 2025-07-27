// =====================================================
// PERFORMANCE MONITOR - Real-time System Monitoring
// Tracks performance metrics, alerts, and system health
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';

export interface PerformanceMetric {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  timestamp: string;
  category: 'discovery' | 'email' | 'fulfillment' | 'system' | 'api';
  tags?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric_name: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown_minutes: number;
  last_triggered?: string;
}

export interface SystemAlert {
  id: string;
  rule_id: string;
  metric_name: string;
  current_value: number;
  threshold: number;
  severity: string;
  message: string;
  status: 'active' | 'resolved' | 'acknowledged';
  triggered_at: string;
  resolved_at?: string;
}

export interface PerformanceDashboard {
  real_time_metrics: PerformanceMetric[];
  active_alerts: SystemAlert[];
  system_health: {
    overall_score: number;
    component_scores: Record<string, number>;
    last_updated: string;
  };
  trends: {
    hourly: PerformanceMetric[];
    daily: PerformanceMetric[];
    weekly: PerformanceMetric[];
  };
}

export class PerformanceMonitor {
  private supabase = getServiceRoleClient();
  private metrics: PerformanceMetric[] = [];
  private alerts: SystemAlert[] = [];
  private alertRules: AlertRule[] = [];

  constructor() {
    this.initializeDefaultAlertRules();
    console.log('[PerformanceMonitor] Initialized with default alert rules');
  }

  // Collect performance metrics
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    try {
      const fullMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date().toISOString()
      };

      // Store in memory for real-time access
      this.metrics.push(fullMetric);
      
      // Keep only last 1000 metrics in memory
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Store in database for historical analysis
      await this.supabase
        .from('performance_metrics')
        .insert({
          metric_name: fullMetric.metric_name,
          metric_value: fullMetric.metric_value,
          metric_unit: fullMetric.metric_unit,
          category: fullMetric.category,
          tags: fullMetric.tags || {},
          recorded_at: fullMetric.timestamp
        });

      // Check alert rules
      await this.checkAlertRules(fullMetric);

      console.log(`[PerformanceMonitor] Recorded metric: ${metric.metric_name} = ${metric.metric_value} ${metric.metric_unit}`);

    } catch (error) {
      console.error('[PerformanceMonitor] Error recording metric:', error);
    }
  }

  // Get real-time dashboard data
  async getDashboardData(): Promise<PerformanceDashboard> {
    try {
      // Get recent metrics from database
      const { data: recentMetrics } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);

      // Get active alerts
      const { data: activeAlerts } = await this.supabase
        .from('system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false });

      // Calculate system health score
      const healthScore = await this.calculateSystemHealth();

      // Get trend data
      const trends = await this.getTrendData();

      return {
        real_time_metrics: recentMetrics?.map(m => ({
          metric_name: m.metric_name,
          metric_value: m.metric_value,
          metric_unit: m.metric_unit,
          timestamp: m.recorded_at,
          category: m.category,
          tags: m.tags
        })) || [],
        active_alerts: activeAlerts?.map(a => ({
          id: a.id,
          rule_id: a.rule_id,
          metric_name: a.metric_name,
          current_value: a.current_value,
          threshold: a.threshold,
          severity: a.severity,
          message: a.message,
          status: a.status,
          triggered_at: a.triggered_at,
          resolved_at: a.resolved_at
        })) || [],
        system_health: healthScore,
        trends
      };

    } catch (error) {
      console.error('[PerformanceMonitor] Error getting dashboard data:', error);
      throw error;
    }
  }

  // Calculate overall system health score
  private async calculateSystemHealth(): Promise<{
    overall_score: number;
    component_scores: Record<string, number>;
    last_updated: string;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent metrics for each component
      const { data: metrics } = await this.supabase
        .from('performance_metrics')
        .select('metric_name, metric_value, category')
        .gte('recorded_at', oneHourAgo.toISOString());

      const componentScores: Record<string, number> = {};

      // Discovery component health
      const discoveryMetrics = metrics?.filter(m => m.category === 'discovery') || [];
      const avgDiscoveryRate = discoveryMetrics
        .filter(m => m.metric_name === 'prospects_discovered_per_hour')
        .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(discoveryMetrics.length, 1);
      componentScores.discovery = Math.min(avgDiscoveryRate / 10, 1) * 100; // Target: 10 prospects/hour

      // Email component health
      const emailMetrics = metrics?.filter(m => m.category === 'email') || [];
      const avgOpenRate = emailMetrics
        .filter(m => m.metric_name === 'email_open_rate')
        .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(emailMetrics.length, 1);
      componentScores.email = Math.min(avgOpenRate / 35, 1) * 100; // Target: 35% open rate

      // System component health  
      const systemMetrics = metrics?.filter(m => m.category === 'system') || [];
      const avgResponseTime = systemMetrics
        .filter(m => m.metric_name === 'api_response_time_ms')
        .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(systemMetrics.length, 1);
      componentScores.system = Math.max(1 - (avgResponseTime / 2000), 0) * 100; // Target: <2000ms

      // API component health
      const apiMetrics = metrics?.filter(m => m.category === 'api') || [];
      const successRate = apiMetrics
        .filter(m => m.metric_name === 'api_success_rate')
        .reduce((sum, m) => sum + m.metric_value, 0) / Math.max(apiMetrics.length, 1);
      componentScores.api = successRate; // Already in percentage

      // Calculate overall score
      const scores = Object.values(componentScores).filter(score => !isNaN(score));
      const overallScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 50; // Default moderate health

      return {
        overall_score: Math.round(overallScore),
        component_scores: componentScores,
        last_updated: now.toISOString()
      };

    } catch (error) {
      console.error('[PerformanceMonitor] Error calculating system health:', error);
      return {
        overall_score: 50,
        component_scores: {},
        last_updated: new Date().toISOString()
      };
    }
  }

  // Get trend data for charts
  private async getTrendData(): Promise<{
    hourly: PerformanceMetric[];
    daily: PerformanceMetric[];
    weekly: PerformanceMetric[];
  }> {
    const now = new Date();
    
    try {
      // Hourly trends (last 24 hours)
      const { data: hourlyData } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true });

      // Daily trends (last 30 days)  
      const { data: dailyData } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true });

      // Weekly trends (last 12 weeks)
      const { data: weeklyData } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true });

      return {
        hourly: hourlyData?.map(this.mapMetricFromDB) || [],
        daily: dailyData?.map(this.mapMetricFromDB) || [],
        weekly: weeklyData?.map(this.mapMetricFromDB) || []
      };

    } catch (error) {
      console.error('[PerformanceMonitor] Error getting trend data:', error);
      return { hourly: [], daily: [], weekly: [] };
    }
  }

  private mapMetricFromDB(dbMetric: any): PerformanceMetric {
    return {
      metric_name: dbMetric.metric_name,
      metric_value: dbMetric.metric_value,
      metric_unit: dbMetric.metric_unit,
      timestamp: dbMetric.recorded_at,
      category: dbMetric.category,
      tags: dbMetric.tags
    };
  }

  // Check alert rules against new metric
  private async checkAlertRules(metric: PerformanceMetric): Promise<void> {
    try {
      const relevantRules = this.alertRules.filter(
        rule => rule.metric_name === metric.metric_name && rule.enabled
      );

      for (const rule of relevantRules) {
        // Check cooldown
        if (rule.last_triggered) {
          const lastTriggered = new Date(rule.last_triggered);
          const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldown_minutes * 60 * 1000);
          if (new Date() < cooldownEnd) {
            continue; // Still in cooldown
          }
        }

        // Check condition
        let shouldTrigger = false;
        switch (rule.condition) {
          case 'greater_than':
            shouldTrigger = metric.metric_value > rule.threshold;
            break;
          case 'less_than':
            shouldTrigger = metric.metric_value < rule.threshold;
            break;
          case 'equals':
            shouldTrigger = metric.metric_value === rule.threshold;
            break;
          case 'not_equals':
            shouldTrigger = metric.metric_value !== rule.threshold;
            break;
        }

        if (shouldTrigger) {
          await this.triggerAlert(rule, metric);
        }
      }

    } catch (error) {
      console.error('[PerformanceMonitor] Error checking alert rules:', error);
    }
  }

  // Trigger an alert
  private async triggerAlert(rule: AlertRule, metric: PerformanceMetric): Promise<void> {
    try {
      const alert: Omit<SystemAlert, 'id'> = {
        rule_id: rule.id,
        metric_name: metric.metric_name,
        current_value: metric.metric_value,
        threshold: rule.threshold,
        severity: rule.severity,
        message: `${rule.name}: ${metric.metric_name} is ${metric.metric_value} ${metric.metric_unit} (threshold: ${rule.threshold})`,
        status: 'active',
        triggered_at: new Date().toISOString()
      };

      // Store alert in database
      await this.supabase
        .from('system_alerts')
        .insert(alert);

      // Update rule last triggered time
      rule.last_triggered = new Date().toISOString();

      // Send notification (implement based on requirements)
      await this.sendAlertNotification(alert);

      console.log(`[PerformanceMonitor] Alert triggered: ${alert.message}`);

    } catch (error) {
      console.error('[PerformanceMonitor] Error triggering alert:', error);
    }
  }

  // Send alert notification
  private async sendAlertNotification(alert: Omit<SystemAlert, 'id'>): Promise<void> {
    try {
      // For now, just log critical alerts
      if (alert.severity === 'critical') {
        console.error(`🚨 CRITICAL ALERT: ${alert.message}`);
        
        // In production, this would send emails, SMS, Slack notifications, etc.
        // await emailService.sendAlert(alert);
        // await slackService.sendAlert(alert);
      }

    } catch (error) {
      console.error('[PerformanceMonitor] Error sending alert notification:', error);
    }
  }

  // Initialize default alert rules
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'discovery_rate_low',
        name: 'Low Prospect Discovery Rate',
        metric_name: 'prospects_discovered_per_hour',
        condition: 'less_than',
        threshold: 5,
        severity: 'medium',
        enabled: true,
        cooldown_minutes: 60
      },
      {
        id: 'email_open_rate_low',
        name: 'Low Email Open Rate',
        metric_name: 'email_open_rate',
        condition: 'less_than',
        threshold: 25,
        severity: 'medium',
        enabled: true,
        cooldown_minutes: 120
      },
      {
        id: 'api_response_time_high',
        name: 'High API Response Time',
        metric_name: 'api_response_time_ms',
        condition: 'greater_than',
        threshold: 3000,
        severity: 'high',
        enabled: true,
        cooldown_minutes: 30
      },
      {
        id: 'system_error_rate_high',
        name: 'High System Error Rate',
        metric_name: 'error_rate_percentage',
        condition: 'greater_than',
        threshold: 5,
        severity: 'critical',
        enabled: true,
        cooldown_minutes: 15
      },
      {
        id: 'queue_backlog_high',
        name: 'High Queue Backlog',
        metric_name: 'queue_pending_jobs',
        condition: 'greater_than',
        threshold: 100,
        severity: 'high',
        enabled: true,
        cooldown_minutes: 45
      }
    ];
  }

  // Public methods for external use
  async recordDiscoveryMetric(prospectsFound: number): Promise<void> {
    await this.recordMetric({
      metric_name: 'prospects_discovered_per_hour',
      metric_value: prospectsFound,
      metric_unit: 'count',
      category: 'discovery'
    });
  }

  async recordEmailMetric(openRate: number, clickRate: number): Promise<void> {
    await Promise.all([
      this.recordMetric({
        metric_name: 'email_open_rate',
        metric_value: openRate,
        metric_unit: 'percentage',
        category: 'email'
      }),
      this.recordMetric({
        metric_name: 'email_click_rate',
        metric_value: clickRate,
        metric_unit: 'percentage',
        category: 'email'
      })
    ]);
  }

  async recordAPIMetric(responseTime: number, success: boolean): Promise<void> {
    await Promise.all([
      this.recordMetric({
        metric_name: 'api_response_time_ms',
        metric_value: responseTime,
        metric_unit: 'milliseconds',
        category: 'api'
      }),
      this.recordMetric({
        metric_name: 'api_success_rate',
        metric_value: success ? 100 : 0,
        metric_unit: 'percentage',
        category: 'api'
      })
    ]);
  }

  async recordSystemMetric(errorRate: number, queueBacklog: number): Promise<void> {
    await Promise.all([
      this.recordMetric({
        metric_name: 'error_rate_percentage',
        metric_value: errorRate,
        metric_unit: 'percentage',
        category: 'system'
      }),
      this.recordMetric({
        metric_name: 'queue_pending_jobs',
        metric_value: queueBacklog,
        metric_unit: 'count',
        category: 'system'
      })
    ]);
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
} 