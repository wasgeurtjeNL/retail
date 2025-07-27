// =====================================================
// TEMPLATE AUTO-OPTIMIZATION ENGINE
// Automatische template optimization op basis van performance data
// =====================================================

import { getServiceRoleClient } from '@/lib/supabase';

export interface OptimizationRule {
  id: string;
  segment: string;
  template_type: 'email' | 'landing_page';
  rule_type: 'benchmark_check' | 'ab_test_winner' | 'scheduled_rotation';
  enabled: boolean;
  
  // Thresholds
  min_sample_size: number;
  confidence_threshold: number;
  benchmark_rate: number;
  
  // Timing
  check_frequency_hours: number;
  last_check_at?: string;
  
  // Actions
  auto_switch_enabled: boolean;
  notify_on_switch: boolean;
  notification_email?: string;
  
  metadata?: Record<string, any>;
}

export interface OptimizationResult {
  segment: string;
  template_type: 'email' | 'landing_page';
  action_taken: 'no_action' | 'template_switched' | 'test_extended' | 'benchmark_alert';
  old_template_id?: string;
  new_template_id?: string;
  reason: string;
  confidence_score: number;
  performance_improvement?: number;
  timestamp: string;
}

export class TemplateAutoOptimizationEngine {
  private supabase = getServiceRoleClient();
  
  // =====================================================
  // MAIN OPTIMIZATION RUNNER
  // =====================================================

  /**
   * Run complete optimization check voor alle segments
   */
  async runGlobalOptimization(): Promise<OptimizationResult[]> {
    try {
      console.log('[Auto-Optimization] Starting global optimization run');
      
      const results: OptimizationResult[] = [];
      
      // Get all active segments with optimization settings
      const segments = await this.getActiveSegments();
      
      for (const segment of segments) {
        try {
          const segmentResults = await this.runSegmentOptimization(segment);
          results.push(...segmentResults);
        } catch (error) {
          console.error(`[Auto-Optimization] Error optimizing segment ${segment}:`, error);
        }
      }
      
      // Send summary report if any actions were taken
      if (results.some(r => r.action_taken !== 'no_action')) {
        await this.sendOptimizationReport(results);
      }
      
      console.log(`[Auto-Optimization] Global optimization completed. Actions taken: ${results.filter(r => r.action_taken !== 'no_action').length}`);
      
      return results;
      
    } catch (error) {
      console.error('[Auto-Optimization] Error in global optimization:', error);
      return [];
    }
  }

  /**
   * Run optimization voor een specifiek segment
   */
  async runSegmentOptimization(segment: string): Promise<OptimizationResult[]> {
    try {
      console.log(`[Auto-Optimization] Running optimization for segment: ${segment}`);
      
      const results: OptimizationResult[] = [];
      
      // Get optimization settings for this segment
      const settings = await this.getOptimizationSettings(segment);
      if (!settings || !settings.auto_switch_enabled) {
        console.log(`[Auto-Optimization] Auto-optimization disabled for segment: ${segment}`);
        return results;
      }
      
      // Check email templates
      const emailResult = await this.optimizeTemplateType(segment, 'email', settings);
      if (emailResult) {
        results.push(emailResult);
      }
      
      // Check landing page templates
      const landingResult = await this.optimizeTemplateType(segment, 'landing_page', settings);
      if (landingResult) {
        results.push(landingResult);
      }
      
      // Update last check timestamp
      await this.updateLastCheckTimestamp(segment);
      
      return results;
      
    } catch (error) {
      console.error(`[Auto-Optimization] Error optimizing segment ${segment}:`, error);
      return [];
    }
  }

  /**
   * Optimize specific template type binnen een segment
   */
  async optimizeTemplateType(
    segment: string,
    templateType: 'email' | 'landing_page',
    settings: any
  ): Promise<OptimizationResult | null> {
    try {
      console.log(`[Auto-Optimization] Optimizing ${templateType} templates for segment: ${segment}`);
      
      // Get current active template
      const activeTemplate = await this.getActiveTemplate(segment, templateType);
      if (!activeTemplate) {
        console.log(`[Auto-Optimization] No active ${templateType} template found for segment: ${segment}`);
        return null;
      }
      
      // Check if active template has sufficient data
      const minimumVolume = settings.minimum_test_volume || 100;
      if (activeTemplate.emails_sent < minimumVolume) {
        console.log(`[Auto-Optimization] Insufficient volume for ${templateType} template: ${activeTemplate.emails_sent}/${minimumVolume}`);
        return {
          segment,
          template_type: templateType,
          action_taken: 'no_action',
          reason: `Insufficient data volume (${activeTemplate.emails_sent}/${minimumVolume})`,
          confidence_score: 0,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get benchmark rate
      const benchmarkRate = templateType === 'email' 
        ? settings.email_benchmark_conversion_rate 
        : settings.landing_benchmark_conversion_rate;
      
      const currentRate = activeTemplate.current_conversion_rate || 0;
      
      // Check if current template is underperforming
      if (currentRate >= benchmarkRate) {
        console.log(`[Auto-Optimization] ${templateType} template performing above benchmark: ${currentRate}% >= ${benchmarkRate}%`);
        return {
          segment,
          template_type: templateType,
          action_taken: 'no_action',
          reason: `Current template performing above benchmark (${currentRate.toFixed(1)}% >= ${benchmarkRate}%)`,
          confidence_score: this.calculateConfidenceScore(activeTemplate, benchmarkRate),
          timestamp: new Date().toISOString()
        };
      }
      
      // Find better performing alternative
      const betterAlternative = await this.findBetterAlternative(
        segment, 
        templateType, 
        activeTemplate, 
        minimumVolume
      );
      
      if (!betterAlternative) {
        console.log(`[Auto-Optimization] No better alternative found for ${templateType} template`);
        return {
          segment,
          template_type: templateType,
          action_taken: 'benchmark_alert',
          reason: `Current template below benchmark (${currentRate.toFixed(1)}% < ${benchmarkRate}%) but no better alternatives available`,
          confidence_score: this.calculateConfidenceScore(activeTemplate, benchmarkRate),
          timestamp: new Date().toISOString()
        };
      }
      
      // Calculate confidence in the switch
      const confidenceScore = this.calculateSwitchConfidence(activeTemplate, betterAlternative, settings);
      const confidenceThreshold = settings.confidence_threshold || 0.85;
      
      if (confidenceScore < confidenceThreshold) {
        console.log(`[Auto-Optimization] Switch confidence too low: ${confidenceScore} < ${confidenceThreshold}`);
        return {
          segment,
          template_type: templateType,
          action_taken: 'test_extended',
          reason: `Better alternative found but confidence too low (${(confidenceScore * 100).toFixed(1)}% < ${(confidenceThreshold * 100).toFixed(1)}%)`,
          confidence_score: confidenceScore,
          timestamp: new Date().toISOString()
        };
      }
      
      // Perform the template switch
      const switchResult = await this.performTemplateSwitch(
        segment,
        templateType,
        activeTemplate,
        betterAlternative,
        'Auto-optimization: Better performing alternative detected'
      );
      
      if (switchResult.success) {
        const improvementPercentage = ((betterAlternative.current_conversion_rate - currentRate) / currentRate) * 100;
        
        console.log(`[Auto-Optimization] Successfully switched ${templateType} template for segment ${segment}: ${improvementPercentage.toFixed(1)}% improvement`);
        
        return {
          segment,
          template_type: templateType,
          action_taken: 'template_switched',
          old_template_id: activeTemplate.id,
          new_template_id: betterAlternative.id,
          reason: `Switched to better performing template: ${improvementPercentage.toFixed(1)}% improvement (${currentRate.toFixed(1)}% → ${betterAlternative.current_conversion_rate.toFixed(1)}%)`,
          confidence_score: confidenceScore,
          performance_improvement: improvementPercentage,
          timestamp: new Date().toISOString()
        };
      } else {
        console.error(`[Auto-Optimization] Failed to switch ${templateType} template:`, switchResult.error);
        return {
          segment,
          template_type: templateType,
          action_taken: 'no_action',
          reason: `Switch attempt failed: ${switchResult.error}`,
          confidence_score: confidenceScore,
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error(`[Auto-Optimization] Error optimizing ${templateType} for segment ${segment}:`, error);
      return null;
    }
  }

  // =====================================================
  // TEMPLATE ANALYSIS METHODS
  // =====================================================

  private async getActiveTemplate(segment: string, templateType: 'email' | 'landing_page') {
    try {
      const { data: template, error } = await this.supabase
        .from('segment_template_variants')
        .select('*')
        .eq('segment', segment)
        .eq('template_type', templateType)
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Auto-Optimization] Error fetching active template:', error);
      }

      return template;
    } catch (error) {
      console.error('[Auto-Optimization] Error getting active template:', error);
      return null;
    }
  }

  private async findBetterAlternative(
    segment: string,
    templateType: 'email' | 'landing_page',
    currentTemplate: any,
    minimumVolume: number
  ) {
    try {
      const { data: alternatives, error } = await this.supabase
        .from('segment_template_variants')
        .select('*')
        .eq('segment', segment)
        .eq('template_type', templateType)
        .neq('id', currentTemplate.id)
        .gte('emails_sent', minimumVolume)
        .gt('current_conversion_rate', currentTemplate.current_conversion_rate)
        .order('current_conversion_rate', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[Auto-Optimization] Error finding alternatives:', error);
        return null;
      }

      return alternatives && alternatives.length > 0 ? alternatives[0] : null;
    } catch (error) {
      console.error('[Auto-Optimization] Error finding better alternative:', error);
      return null;
    }
  }

  private calculateConfidenceScore(template: any, benchmarkRate: number): number {
    try {
      const volume = template.emails_sent || 0;
      const rate = template.current_conversion_rate || 0;
      
      // Volume confidence (more data = higher confidence)
      const volumeConfidence = Math.min(volume / 500, 1.0); // 500 emails = max volume confidence
      
      // Performance confidence (further from benchmark = higher confidence in measurement)
      const performanceDiff = Math.abs(rate - benchmarkRate);
      const performanceConfidence = Math.min(performanceDiff / 10.0, 1.0); // 10% diff = max confidence
      
      // Statistical confidence (simplified chi-square approximation)
      const expectedConversions = volume * (benchmarkRate / 100);
      const actualConversions = volume * (rate / 100);
      const variance = expectedConversions * (1 - benchmarkRate / 100);
      const zScore = variance > 0 ? Math.abs(actualConversions - expectedConversions) / Math.sqrt(variance) : 0;
      const statisticalConfidence = Math.min(zScore / 2.0, 1.0); // Z-score of 2 = 95% confidence
      
      // Weighted average
      const confidence = (volumeConfidence * 0.4 + performanceConfidence * 0.3 + statisticalConfidence * 0.3);
      
      return Math.max(0.1, Math.min(0.99, confidence));
      
    } catch (error) {
      console.error('[Auto-Optimization] Error calculating confidence:', error);
      return 0.5; // Default moderate confidence
    }
  }

  private calculateSwitchConfidence(currentTemplate: any, newTemplate: any, settings: any): number {
    try {
      // Combined confidence based on both templates
      const currentConfidence = this.calculateConfidenceScore(currentTemplate, settings.email_benchmark_conversion_rate);
      const newConfidence = this.calculateConfidenceScore(newTemplate, settings.email_benchmark_conversion_rate);
      
      // Performance difference magnitude
      const performanceDiff = newTemplate.current_conversion_rate - currentTemplate.current_conversion_rate;
      const relativeDiff = performanceDiff / currentTemplate.current_conversion_rate;
      const diffConfidence = Math.min(relativeDiff / 0.2, 1.0); // 20% improvement = max confidence
      
      // Sample size consideration
      const combinedVolume = currentTemplate.emails_sent + newTemplate.emails_sent;
      const volumeConfidence = Math.min(combinedVolume / 1000, 1.0); // 1000 total emails = max confidence
      
      // Weighted final confidence
      const switchConfidence = (
        currentConfidence * 0.25 +
        newConfidence * 0.25 +
        diffConfidence * 0.3 +
        volumeConfidence * 0.2
      );
      
      return Math.max(0.1, Math.min(0.99, switchConfidence));
      
    } catch (error) {
      console.error('[Auto-Optimization] Error calculating switch confidence:', error);
      return 0.5;
    }
  }

  // =====================================================
  // TEMPLATE SWITCHING
  // =====================================================

  private async performTemplateSwitch(
    segment: string,
    templateType: 'email' | 'landing_page',
    oldTemplate: any,
    newTemplate: any,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[Auto-Optimization] Switching ${templateType} template for segment ${segment}: ${oldTemplate.variant_name} → ${newTemplate.variant_name}`);
      
      // Deactivate old template
      const { error: deactivateError } = await this.supabase
        .from('segment_template_variants')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', oldTemplate.id);
      
      if (deactivateError) {
        console.error('[Auto-Optimization] Error deactivating old template:', deactivateError);
        return { success: false, error: deactivateError.message };
      }
      
      // Activate new template
      const { error: activateError } = await this.supabase
        .from('segment_template_variants')
        .update({ 
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', newTemplate.id);
      
      if (activateError) {
        console.error('[Auto-Optimization] Error activating new template:', activateError);
        
        // Rollback: reactivate old template
        await this.supabase
          .from('segment_template_variants')
          .update({ 
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', oldTemplate.id);
        
        return { success: false, error: activateError.message };
      }
      
      // Log the switch in optimization history
      await this.logOptimizationHistory(segment, templateType, oldTemplate, newTemplate, reason);
      
      return { success: true };
      
    } catch (error) {
      console.error('[Auto-Optimization] Error performing template switch:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async logOptimizationHistory(
    segment: string,
    templateType: string,
    oldTemplate: any,
    newTemplate: any,
    reason: string
  ): Promise<void> {
    try {
      const improvementPercentage = ((newTemplate.current_conversion_rate - oldTemplate.current_conversion_rate) / oldTemplate.current_conversion_rate) * 100;
      
      await this.supabase
        .from('template_optimization_history')
        .insert([{
          segment: segment,
          template_type: templateType,
          old_template_id: oldTemplate.id,
          new_template_id: newTemplate.id,
          old_conversion_rate: oldTemplate.current_conversion_rate,
          new_conversion_rate: newTemplate.current_conversion_rate,
          improvement_percentage: improvementPercentage,
          confidence_score: this.calculateSwitchConfidence(oldTemplate, newTemplate, { email_benchmark_conversion_rate: 5.0 }),
          switch_reason: 'better_performer_available',
          switch_triggered_by: 'auto_optimization',
          old_template_volume: oldTemplate.emails_sent,
          new_template_volume: newTemplate.emails_sent,
          notes: reason,
          metadata: {
            auto_optimization: true,
            optimization_timestamp: new Date().toISOString(),
            old_template_name: oldTemplate.variant_name,
            new_template_name: newTemplate.variant_name
          },
          created_at: new Date().toISOString()
        }]);
      
      console.log(`[Auto-Optimization] Logged optimization history for ${templateType} switch in segment: ${segment}`);
      
    } catch (error) {
      console.error('[Auto-Optimization] Error logging optimization history:', error);
    }
  }

  // =====================================================
  // DATA MANAGEMENT
  // =====================================================

  private async getActiveSegments(): Promise<string[]> {
    try {
      const { data: segments, error } = await this.supabase
        .from('segment_optimization_settings')
        .select('segment')
        .eq('auto_switch_enabled', true);

      if (error) {
        console.error('[Auto-Optimization] Error fetching active segments:', error);
        return [];
      }

      return segments?.map(s => s.segment) || [];
    } catch (error) {
      console.error('[Auto-Optimization] Error getting active segments:', error);
      return [];
    }
  }

  private async getOptimizationSettings(segment: string): Promise<any> {
    try {
      const { data: settings, error } = await this.supabase
        .from('segment_optimization_settings')
        .select('*')
        .eq('segment', segment)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Auto-Optimization] Error fetching optimization settings:', error);
      }

      return settings;
    } catch (error) {
      console.error('[Auto-Optimization] Error getting optimization settings:', error);
      return null;
    }
  }

  private async updateLastCheckTimestamp(segment: string): Promise<void> {
    try {
      await this.supabase
        .from('segment_optimization_settings')
        .update({ 
          last_optimization_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('segment', segment);
    } catch (error) {
      console.error('[Auto-Optimization] Error updating last check timestamp:', error);
    }
  }

  // =====================================================
  // REPORTING & NOTIFICATIONS
  // =====================================================

  private async sendOptimizationReport(results: OptimizationResult[]): Promise<void> {
    try {
      console.log('[Auto-Optimization] Sending optimization report');
      
      const actionResults = results.filter(r => r.action_taken !== 'no_action');
      const switches = actionResults.filter(r => r.action_taken === 'template_switched');
      const alerts = actionResults.filter(r => r.action_taken === 'benchmark_alert');
      
      const reportData = {
        timestamp: new Date().toISOString(),
        total_checks: results.length,
        actions_taken: actionResults.length,
        template_switches: switches.length,
        benchmark_alerts: alerts.length,
        results: actionResults,
        summary: this.generateReportSummary(actionResults)
      };
      
      // TODO: Send actual email notification
      console.log('[Auto-Optimization] Optimization report:', reportData);
      
      // For now, just log the report
      // In the future, this could send emails to admin users
      
    } catch (error) {
      console.error('[Auto-Optimization] Error sending optimization report:', error);
    }
  }

  private generateReportSummary(results: OptimizationResult[]): string {
    const switches = results.filter(r => r.action_taken === 'template_switched');
    const totalImprovement = switches.reduce((sum, r) => sum + (r.performance_improvement || 0), 0);
    const avgImprovement = switches.length > 0 ? totalImprovement / switches.length : 0;
    
    let summary = `Template Auto-Optimization Report:\n\n`;
    
    if (switches.length > 0) {
      summary += `✅ ${switches.length} template(s) automatically switched\n`;
      summary += `📈 Average performance improvement: ${avgImprovement.toFixed(1)}%\n\n`;
      
      switches.forEach(switch_ => {
        summary += `• ${switch_.segment} ${switch_.template_type}: ${switch_.performance_improvement?.toFixed(1)}% improvement\n`;
      });
    } else {
      summary += `ℹ️ No template switches performed - all templates performing adequately\n`;
    }
    
    return summary;
  }

  // =====================================================
  // SCHEDULER INTEGRATION
  // =====================================================

  /**
   * Check if optimization should run based on last check time
   */
  async shouldRunOptimization(segment?: string): Promise<boolean> {
    try {
      if (segment) {
        const settings = await this.getOptimizationSettings(segment);
        if (!settings || !settings.auto_switch_enabled) {
          return false;
        }
        
        const checkFrequency = settings.check_frequency_hours || 24;
        const lastCheck = settings.last_optimization_check ? new Date(settings.last_optimization_check) : new Date(0);
        const hoursSinceLastCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
        
        return hoursSinceLastCheck >= checkFrequency;
      } else {
        // Global check - run if any segment is due
        const segments = await this.getActiveSegments();
        for (const seg of segments) {
          if (await this.shouldRunOptimization(seg)) {
            return true;
          }
        }
        return false;
      }
    } catch (error) {
      console.error('[Auto-Optimization] Error checking if optimization should run:', error);
      return false;
    }
  }

  /**
   * Get optimization schedule for cron job
   */
  getOptimizationSchedule(): string {
    // Run every 6 hours
    return '0 */6 * * *';
  }
}

// Export singleton instance
export const templateAutoOptimizationEngine = new TemplateAutoOptimizationEngine(); 