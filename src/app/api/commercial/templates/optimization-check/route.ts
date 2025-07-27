// =====================================================
// TEMPLATE OPTIMIZATION CHECK API ROUTE
// Check template performance en genereer aanbevelingen
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('[Optimization Check API] GET request received');
    
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get('segment');
    
    if (!segment) {
      return NextResponse.json(
        { error: 'Segment parameter is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get optimization recommendations for both email and landing page templates
    const recommendations = await generateOptimizationRecommendations(supabase, segment);
    
    console.log(`[Optimization Check API] Generated recommendations for segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      segment: segment,
      recommendations: recommendations,
      checked_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Optimization Check API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

// =====================================================
// OPTIMIZATION LOGIC
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
    console.error('[Optimization Check] Error generating recommendations:', error);
    return {};
  }
}

async function checkTemplateOptimization(
  supabase: any, 
  segment: string, 
  templateType: 'email' | 'landing_page'
) {
  try {
    console.log(`[Optimization Check] Checking ${templateType} templates for segment: ${segment}`);
    
    // Try to use the database function first
    const { data: optimizationResult, error } = await supabase
      .rpc('check_template_optimization', {
        p_segment: segment,
        p_template_type: templateType
      });
    
    if (error) {
      console.log(`[Optimization Check] Database function not available, using manual check:`, error.message);
      return await manualOptimizationCheck(supabase, segment, templateType);
    }
    
    if (optimizationResult && optimizationResult.length > 0) {
      const result = optimizationResult[0];
      return {
        should_switch: result.should_switch || false,
        current_template_id: result.current_template_id,
        recommended_template_id: result.recommended_template_id,
        reason: result.reason || 'No specific reason provided',
        confidence_score: 0.85 // Default confidence
      };
    }
    
    return await manualOptimizationCheck(supabase, segment, templateType);
    
  } catch (error) {
    console.error(`[Optimization Check] Error checking ${templateType} optimization:`, error);
    return await manualOptimizationCheck(supabase, segment, templateType);
  }
}

async function manualOptimizationCheck(
  supabase: any,
  segment: string,
  templateType: 'email' | 'landing_page'
) {
  try {
    console.log(`[Optimization Check] Manual check for ${templateType} in segment: ${segment}`);
    
    // Get optimization settings
    const { data: settings, error: settingsError } = await supabase
      .from('segment_optimization_settings')
      .select('*')
      .eq('segment', segment)
      .single();
    
    if (settingsError) {
      console.log('[Optimization Check] No optimization settings found, using defaults');
    }
    
    const autoSwitchEnabled = settings?.auto_switch_enabled !== false;
    const minimumTestVolume = settings?.minimum_test_volume || 100;
    const benchmarkRate = templateType === 'email' 
      ? (settings?.email_benchmark_conversion_rate || 5.0)
      : (settings?.landing_benchmark_conversion_rate || 12.0);
    
    if (!autoSwitchEnabled) {
      return {
        should_switch: false,
        current_template_id: null,
        recommended_template_id: null,
        reason: 'Auto-optimization is disabled for this segment'
      };
    }
    
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
        reason: 'No active template found for this segment and type'
      };
    }
    
    // Check if current template has enough volume
    if (activeTemplate.emails_sent < minimumTestVolume) {
      return {
        should_switch: false,
        current_template_id: activeTemplate.id,
        recommended_template_id: null,
        reason: `Insufficient test volume (${activeTemplate.emails_sent}/${minimumTestVolume})`
      };
    }
    
    // Check if current template is below benchmark
    const currentRate = activeTemplate.current_conversion_rate || 0;
    if (currentRate < benchmarkRate) {
      // Find best performing alternative
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
      
      if (altError) {
        console.error('[Optimization Check] Error finding alternatives:', altError);
        return {
          should_switch: false,
          current_template_id: activeTemplate.id,
          recommended_template_id: null,
          reason: 'Error finding alternative templates'
        };
      }
      
      if (alternatives && alternatives.length > 0) {
        const bestAlternative = alternatives[0];
        const improvement = ((bestAlternative.current_conversion_rate - currentRate) / currentRate * 100);
        
        return {
          should_switch: true,
          current_template_id: activeTemplate.id,
          recommended_template_id: bestAlternative.id,
          reason: `Current template (${currentRate.toFixed(1)}%) is below benchmark (${benchmarkRate}%). Switch to "${bestAlternative.variant_name}" for ${improvement.toFixed(1)}% improvement.`,
          confidence_score: calculateConfidenceScore(activeTemplate, bestAlternative, minimumTestVolume)
        };
      } else {
        return {
          should_switch: false,
          current_template_id: activeTemplate.id,
          recommended_template_id: null,
          reason: `Current template is below benchmark (${currentRate.toFixed(1)}% < ${benchmarkRate}%) but no better alternatives available with sufficient test volume`
        };
      }
    }
    
    // Current template is performing adequately
    return {
      should_switch: false,
      current_template_id: activeTemplate.id,
      recommended_template_id: null,
      reason: `Current template is performing above benchmark (${currentRate.toFixed(1)}% >= ${benchmarkRate}%)`
    };
    
  } catch (error) {
    console.error('[Optimization Check] Manual check error:', error);
    return {
      should_switch: false,
      current_template_id: null,
      recommended_template_id: null,
      reason: 'Error during optimization check: ' + error.message
    };
  }
}

function calculateConfidenceScore(
  currentTemplate: any, 
  recommendedTemplate: any, 
  minimumVolume: number
): number {
  try {
    // Base confidence on volume and performance difference
    const currentVolume = currentTemplate.emails_sent || 0;
    const recommendedVolume = recommendedTemplate.emails_sent || 0;
    
    const currentRate = currentTemplate.current_conversion_rate || 0;
    const recommendedRate = recommendedTemplate.current_conversion_rate || 0;
    
    // Volume confidence (higher volume = higher confidence)
    const volumeConfidence = Math.min((currentVolume + recommendedVolume) / (minimumVolume * 4), 1.0);
    
    // Performance difference confidence (larger difference = higher confidence)
    const performanceDiff = recommendedRate - currentRate;
    const performanceConfidence = Math.min(performanceDiff / 5.0, 1.0); // 5% difference = max confidence
    
    // Statistical significance proxy (simplified)
    const statisticalConfidence = Math.min(Math.sqrt(currentVolume / minimumVolume), 1.0);
    
    // Weighted average
    const confidence = (volumeConfidence * 0.3 + performanceConfidence * 0.4 + statisticalConfidence * 0.3);
    
    return Math.max(0.5, Math.min(0.99, confidence)); // Keep between 50% and 99%
    
  } catch (error) {
    console.error('[Optimization Check] Error calculating confidence:', error);
    return 0.75; // Default confidence
  }
} 