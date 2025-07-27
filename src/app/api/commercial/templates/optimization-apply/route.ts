// =====================================================
// TEMPLATE OPTIMIZATION APPLY API ROUTE
// Handmatig toepassen van optimization aanbevelingen
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('[Optimization Apply API] POST request received');
    
    const body = await req.json();
    const {
      segment,
      template_type,
      new_template_id,
      reason = 'Manual override'
    } = body;
    
    // Validation
    if (!segment || !template_type || !new_template_id) {
      return NextResponse.json(
        { error: 'Missing required fields: segment, template_type, new_template_id' },
        { status: 400 }
      );
    }
    
    if (!['email', 'landing_page'].includes(template_type)) {
      return NextResponse.json(
        { error: 'template_type must be either "email" or "landing_page"' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get current active template
    const { data: currentTemplate, error: currentError } = await supabase
      .from('segment_template_variants')
      .select('*')
      .eq('segment', segment)
      .eq('template_type', template_type)
      .eq('active', true)
      .single();
    
    if (currentError && currentError.code !== 'PGRST116') {
      console.error('[Optimization Apply] Error fetching current template:', currentError);
      return NextResponse.json(
        { error: 'Failed to fetch current template: ' + currentError.message },
        { status: 500 }
      );
    }
    
    // Get new template to verify it exists and is valid
    const { data: newTemplate, error: newError } = await supabase
      .from('segment_template_variants')
      .select('*')
      .eq('id', new_template_id)
      .eq('segment', segment)
      .eq('template_type', template_type)
      .single();
    
    if (newError) {
      console.error('[Optimization Apply] Error fetching new template:', newError);
      return NextResponse.json(
        { error: 'New template not found or invalid: ' + newError.message },
        { status: 404 }
      );
    }
    
    // Check if new template is already active
    if (newTemplate.active) {
      return NextResponse.json(
        { error: 'The specified template is already active' },
        { status: 400 }
      );
    }
    
    // Perform the template switch
    const switchResult = await performTemplateSwitch(
      supabase,
      segment,
      template_type,
      currentTemplate,
      newTemplate,
      reason
    );
    
    if (!switchResult.success) {
      return NextResponse.json(
        { error: switchResult.error },
        { status: 500 }
      );
    }
    
    console.log(`[Optimization Apply] Successfully applied template optimization for ${template_type} in segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      segment: segment,
      template_type: template_type,
      old_template: currentTemplate ? {
        id: currentTemplate.id,
        variant_name: currentTemplate.variant_name,
        conversion_rate: currentTemplate.current_conversion_rate
      } : null,
      new_template: {
        id: newTemplate.id,
        variant_name: newTemplate.variant_name,
        conversion_rate: newTemplate.current_conversion_rate
      },
      switch_reason: reason,
      improvement_percentage: currentTemplate 
        ? ((newTemplate.current_conversion_rate - currentTemplate.current_conversion_rate) / currentTemplate.current_conversion_rate * 100)
        : 0,
      applied_at: new Date().toISOString(),
      message: `Template switched from "${currentTemplate?.variant_name || 'none'}" to "${newTemplate.variant_name}"`
    });
    
  } catch (error) {
    console.error('[Optimization Apply API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

// =====================================================
// TEMPLATE SWITCH LOGIC
// =====================================================

async function performTemplateSwitch(
  supabase: any,
  segment: string,
  templateType: string,
  currentTemplate: any,
  newTemplate: any,
  reason: string
) {
  try {
    console.log(`[Optimization Apply] Performing template switch for ${templateType} in segment: ${segment}`);
    
    // Start transaction-like operations
    const operations = [];
    
    // 1. Deactivate current template (if exists)
    if (currentTemplate) {
      operations.push(
        supabase
          .from('segment_template_variants')
          .update({ 
            active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTemplate.id)
      );
    }
    
    // 2. Activate new template
    operations.push(
      supabase
        .from('segment_template_variants')
        .update({ 
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', newTemplate.id)
    );
    
    // Execute operations
    const results = await Promise.all(operations);
    
    // Check for errors
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) {
        console.error(`[Optimization Apply] Error in operation ${i}:`, results[i].error);
        
        // Attempt rollback if new template activation failed
        if (i === 1 && currentTemplate) {
          console.log('[Optimization Apply] Rolling back current template activation');
          await supabase
            .from('segment_template_variants')
            .update({ 
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentTemplate.id);
        }
        
        return {
          success: false,
          error: `Failed to switch templates: ${results[i].error.message}`
        };
      }
    }
    
    // 3. Log the optimization history
    await logTemplateSwitch(
      supabase,
      segment,
      templateType,
      currentTemplate,
      newTemplate,
      reason
    );
    
    // 4. Update any related tracking or analytics
    await updateTemplateAnalytics(supabase, segment, templateType, newTemplate.id);
    
    console.log(`[Optimization Apply] Template switch completed successfully`);
    
    return {
      success: true,
      old_template_id: currentTemplate?.id || null,
      new_template_id: newTemplate.id
    };
    
  } catch (error) {
    console.error('[Optimization Apply] Error performing template switch:', error);
    return {
      success: false,
      error: 'Unexpected error during template switch: ' + error.message
    };
  }
}

async function logTemplateSwitch(
  supabase: any,
  segment: string,
  templateType: string,
  oldTemplate: any,
  newTemplate: any,
  reason: string
) {
  try {
    const historyEntry = {
      segment: segment,
      template_type: templateType,
      old_template_id: oldTemplate?.id || null,
      new_template_id: newTemplate.id,
      old_conversion_rate: oldTemplate?.current_conversion_rate || 0,
      new_conversion_rate: newTemplate.current_conversion_rate || 0,
      improvement_percentage: oldTemplate 
        ? ((newTemplate.current_conversion_rate - oldTemplate.current_conversion_rate) / oldTemplate.current_conversion_rate * 100)
        : 0,
      confidence_score: 0.90, // Manual application gets high confidence
      switch_reason: 'manual_override',
      switch_triggered_by: 'admin_manual',
      old_template_volume: oldTemplate?.emails_sent || 0,
      new_template_volume: newTemplate.emails_sent || 0,
      notes: reason,
      metadata: {
        manual_application: true,
        applied_at: new Date().toISOString(),
        old_template_name: oldTemplate?.variant_name,
        new_template_name: newTemplate.variant_name
      },
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('template_optimization_history')
      .insert([historyEntry]);
    
    if (error) {
      console.error('[Optimization Apply] Error logging template switch:', error);
    } else {
      console.log('[Optimization Apply] Template switch logged successfully');
    }
    
  } catch (error) {
    console.error('[Optimization Apply] Error in logTemplateSwitch:', error);
  }
}

async function updateTemplateAnalytics(
  supabase: any,
  segment: string,
  templateType: string,
  newTemplateId: string
) {
  try {
    // Update any cached analytics or performance metrics
    // This could trigger recalculation of segment performance analytics
    
    console.log(`[Optimization Apply] Updating analytics for ${templateType} template switch in segment: ${segment}`);
    
    // Mark for analytics refresh (could be used by background jobs)
    const { error } = await supabase
      .from('segment_optimization_settings')
      .update({ 
        last_optimization_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('segment', segment);
    
    if (error) {
      console.error('[Optimization Apply] Error updating analytics timestamp:', error);
    }
    
    // TODO: Could trigger background job to recalculate segment_performance_analytics
    
  } catch (error) {
    console.error('[Optimization Apply] Error updating template analytics:', error);
  }
} 