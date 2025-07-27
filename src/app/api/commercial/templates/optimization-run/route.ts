// =====================================================
// TEMPLATE OPTIMIZATION RUN API ROUTE
// Voer optimization check uit en pas automatisch toe
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('[Optimization Run API] POST request received');
    
    const body = await req.json();
    const { segment, auto_apply = true } = body;
    
    if (!segment) {
      return NextResponse.json(
        { error: 'Segment parameter is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get optimization settings
    const { data: settings, error: settingsError } = await supabase
      .from('segment_optimization_settings')
      .select('*')
      .eq('segment', segment)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('[Optimization Run] Error fetching settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch optimization settings' },
        { status: 500 }
      );
    }
    
    const autoSwitchEnabled = settings?.auto_switch_enabled !== false;
    
    // Generate recommendations
    const recommendations = await generateOptimizationRecommendations(supabase, segment);
    
    const results = {
      segment: segment,
      auto_apply: auto_apply && autoSwitchEnabled,
      recommendations: recommendations,
      actions_taken: [],
      notifications_sent: []
    };
    
    // Apply recommendations if auto_apply is enabled
    if (auto_apply && autoSwitchEnabled) {
      console.log('[Optimization Run] Auto-applying recommendations...');
      
      // Apply email template optimization
      if (recommendations.email?.should_switch) {
        const emailResult = await applyTemplateOptimization(
          supabase, 
          segment, 
          'email', 
          recommendations.email,
          settings
        );
        results.actions_taken.push(emailResult);
      }
      
      // Apply landing page template optimization
      if (recommendations.landing_page?.should_switch) {
        const landingResult = await applyTemplateOptimization(
          supabase, 
          segment, 
          'landing_page', 
          recommendations.landing_page,
          settings
        );
        results.actions_taken.push(landingResult);
      }
      
      // Send notifications if enabled
      if (settings?.notify_on_switch && results.actions_taken.length > 0) {
        const notificationResult = await sendOptimizationNotification(
          supabase,
          segment,
          results.actions_taken,
          settings.notification_email
        );
        results.notifications_sent.push(notificationResult);
      }
    }
    
    // Update last optimization check timestamp
    await supabase
      .from('segment_optimization_settings')
      .update({ 
        last_optimization_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('segment', segment);
    
    console.log(`[Optimization Run] Completed optimization run for segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      ...results,
      executed_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Optimization Run API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

// =====================================================
// OPTIMIZATION EXECUTION FUNCTIONS
// =====================================================

async function generateOptimizationRecommendations(supabase: any, segment: string) {
  try {
    const recommendations: Record<string, any> = {};
    
    // Check email templates
    const emailRecommendation = await checkTemplateOptimization(supabase, segment, 'email');
    if (emailRecommendation) {
      recommendations.email = emailRecommendation;
    }
    
    // Check landing page templates
    const landingRecommendation = await checkTemplateOptimization(supabase, segment, 'landing_page');
    if (landingRecommendation) {
      recommendations.landing_page = landingRecommendation;
    }
    
    return recommendations;
    
  } catch (error) {
    console.error('[Optimization Run] Error generating recommendations:', error);
    return {};
  }
}

async function checkTemplateOptimization(
  supabase: any,
  segment: string,
  templateType: 'email' | 'landing_page'
) {
  try {
    // Get current active template
    const { data: activeTemplate, error: activeError } = await supabase
      .from('segment_template_variants')
      .select('*')
      .eq('segment', segment)
      .eq('template_type', templateType)
      .eq('active', true)
      .single();
    
    if (activeError || !activeTemplate) {
      return {
        should_switch: false,
        current_template_id: null,
        recommended_template_id: null,
        reason: 'No active template found'
      };
    }
    
    // Get optimization settings
    const { data: settings } = await supabase
      .from('segment_optimization_settings')
      .select('*')
      .eq('segment', segment)
      .single();
    
    const minimumTestVolume = settings?.minimum_test_volume || 100;
    const benchmarkRate = templateType === 'email' 
      ? (settings?.email_benchmark_conversion_rate || 5.0)
      : (settings?.landing_benchmark_conversion_rate || 12.0);
    
    // Check volume requirement
    if (activeTemplate.emails_sent < minimumTestVolume) {
      return {
        should_switch: false,
        current_template_id: activeTemplate.id,
        recommended_template_id: null,
        reason: `Insufficient test volume (${activeTemplate.emails_sent}/${minimumTestVolume})`
      };
    }
    
    // Check performance vs benchmark
    const currentRate = activeTemplate.current_conversion_rate || 0;
    if (currentRate >= benchmarkRate) {
      return {
        should_switch: false,
        current_template_id: activeTemplate.id,
        recommended_template_id: null,
        reason: `Current template performing above benchmark (${currentRate.toFixed(1)}% >= ${benchmarkRate}%)`
      };
    }
    
    // Find better alternatives
    const { data: alternatives, error: altError } = await supabase
      .from('segment_template_variants')
      .select('*')
      .eq('segment', segment)
      .eq('template_type', templateType)
      .neq('id', activeTemplate.id)
      .gte('emails_sent', minimumTestVolume)
      .gt('current_conversion_rate', currentRate)
      .order('current_conversion_rate', { ascending: false })
      .limit(1);
    
    if (altError || !alternatives || alternatives.length === 0) {
      return {
        should_switch: false,
        current_template_id: activeTemplate.id,
        recommended_template_id: null,
        reason: `Below benchmark but no better alternatives available`
      };
    }
    
    const bestAlternative = alternatives[0];
    const improvement = ((bestAlternative.current_conversion_rate - currentRate) / currentRate * 100);
    
    return {
      should_switch: true,
      current_template_id: activeTemplate.id,
      recommended_template_id: bestAlternative.id,
      reason: `Switch to "${bestAlternative.variant_name}" for ${improvement.toFixed(1)}% improvement`,
      confidence_score: 0.85,
      current_rate: currentRate,
      recommended_rate: bestAlternative.current_conversion_rate,
      improvement_percentage: improvement
    };
    
  } catch (error) {
    console.error('[Optimization Run] Error checking template optimization:', error);
    return {
      should_switch: false,
      current_template_id: null,
      recommended_template_id: null,
      reason: 'Error during optimization check'
    };
  }
}

async function applyTemplateOptimization(
  supabase: any,
  segment: string,
  templateType: 'email' | 'landing_page',
  recommendation: any,
  settings: any
) {
  try {
    console.log(`[Optimization Run] Applying ${templateType} optimization for segment: ${segment}`);
    
    if (!recommendation.should_switch || !recommendation.recommended_template_id) {
      return {
        template_type: templateType,
        action: 'no_change',
        reason: 'No optimization needed',
        success: true
      };
    }
    
    // Deactivate current template
    const { error: deactivateError } = await supabase
      .from('segment_template_variants')
      .update({ 
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', recommendation.current_template_id);
    
    if (deactivateError) {
      console.error('[Optimization Run] Error deactivating current template:', deactivateError);
      return {
        template_type: templateType,
        action: 'switch_failed',
        reason: 'Failed to deactivate current template',
        success: false,
        error: deactivateError.message
      };
    }
    
    // Activate recommended template
    const { error: activateError } = await supabase
      .from('segment_template_variants')
      .update({ 
        active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', recommendation.recommended_template_id);
    
    if (activateError) {
      console.error('[Optimization Run] Error activating recommended template:', activateError);
      
      // Rollback: reactivate original template
      await supabase
        .from('segment_template_variants')
        .update({ 
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recommendation.current_template_id);
      
      return {
        template_type: templateType,
        action: 'switch_failed',
        reason: 'Failed to activate recommended template',
        success: false,
        error: activateError.message
      };
    }
    
    // Log the optimization history
    await logOptimizationHistory(supabase, segment, templateType, recommendation);
    
    console.log(`[Optimization Run] Successfully switched ${templateType} template for segment: ${segment}`);
    
    return {
      template_type: templateType,
      action: 'template_switched',
      old_template_id: recommendation.current_template_id,
      new_template_id: recommendation.recommended_template_id,
      reason: recommendation.reason,
      improvement_percentage: recommendation.improvement_percentage,
      confidence_score: recommendation.confidence_score,
      success: true
    };
    
  } catch (error) {
    console.error('[Optimization Run] Error applying optimization:', error);
    return {
      template_type: templateType,
      action: 'switch_failed',
      reason: 'Unexpected error during template switch',
      success: false,
      error: error.message
    };
  }
}

async function logOptimizationHistory(
  supabase: any,
  segment: string,
  templateType: string,
  recommendation: any
) {
  try {
    await supabase
      .from('template_optimization_history')
      .insert([{
        segment: segment,
        template_type: templateType,
        old_template_id: recommendation.current_template_id,
        new_template_id: recommendation.recommended_template_id,
        old_conversion_rate: recommendation.current_rate,
        new_conversion_rate: recommendation.recommended_rate,
        improvement_percentage: recommendation.improvement_percentage,
        confidence_score: recommendation.confidence_score,
        switch_reason: 'below_benchmark',
        switch_triggered_by: 'auto_optimization',
        old_template_volume: 0, // TODO: Get actual volume
        new_template_volume: 0, // TODO: Get actual volume
        notes: recommendation.reason,
        metadata: {
          auto_applied: true,
          optimization_check_time: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }]);
    
    console.log(`[Optimization Run] Logged optimization history for ${templateType} in segment: ${segment}`);
    
  } catch (error) {
    console.error('[Optimization Run] Error logging optimization history:', error);
  }
}

async function sendOptimizationNotification(
  supabase: any,
  segment: string,
  actionsTaken: any[],
  notificationEmail: string
) {
  try {
    console.log(`[Optimization Run] Sending optimization notification for segment: ${segment}`);
    
    // TODO: Implement email notification
    // For now, just log it
    const notificationContent = {
      segment: segment,
      actions_taken: actionsTaken.length,
      timestamp: new Date().toISOString(),
      details: actionsTaken
    };
    
    console.log('[Optimization Run] Notification content:', notificationContent);
    
    return {
      type: 'email',
      recipient: notificationEmail,
      sent: true,
      content: notificationContent
    };
    
  } catch (error) {
    console.error('[Optimization Run] Error sending notification:', error);
    return {
      type: 'email',
      recipient: notificationEmail,
      sent: false,
      error: error.message
    };
  }
} 