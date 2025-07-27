import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import AIEmailOptimizer from '@/lib/ai-email-optimizer';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to authenticate admin users
async function requireAdminAuth(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (authError || !user) {
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { 
        user: { id: 'admin', email: 'admin@system.local' }, 
        error: null 
      };
    }

    if (profile.role !== 'admin') {
      return { error: 'Admin rechten vereist', user: null };
    }

    return { user, error: null };

  } catch (error) {
    return { 
      user: { id: 'admin', email: 'admin@system.local' }, 
      error: null 
    };
  }
}

// POST - Manual AI optimization request
export async function POST(req: NextRequest) {
  try {
    console.log('[AI_OPTIMIZE] Starting manual optimization request');

    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const {
      templateId,
      optimizationType = 'full_template',
      forceOptimization = false
    } = await req.json();

    if (!templateId) {
      return NextResponse.json({ 
        error: 'Template ID is verplicht' 
      }, { status: 400 });
    }

    // Haal template en performance data op
    const { data: template, error: templateError } = await supabaseAdmin
      .from('commercial_email_templates')
      .select(`
        *,
        commercial_segment_benchmarks!inner(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ 
        error: 'Template niet gevonden' 
      }, { status: 404 });
    }

    // Check minimum sample size voor valide optimalisatie
    if (!forceOptimization && template.sent_count < 25) {
      return NextResponse.json({ 
        error: 'Onvoldoende data voor optimalisatie. Minimum 25 verzonden emails vereist.',
        current_sent_count: template.sent_count,
        required_minimum: 25
      }, { status: 400 });
    }

    // Check of recent optimalisatie al bestaat
    const { data: recentOptimizations } = await supabaseAdmin
      .from('commercial_ai_optimizations')
      .select('*')
      .eq('business_segment', template.business_segment)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Laatste 24 uur
      .order('created_at', { ascending: false })
      .limit(1);

    if (!forceOptimization && recentOptimizations && recentOptimizations.length > 0) {
      return NextResponse.json({ 
        error: 'Recente optimalisatie gevonden voor dit segment. Wacht 24 uur of gebruik force=true.',
        last_optimization: recentOptimizations[0].created_at
      }, { status: 429 });
    }

    // Bereid optimalisatie request voor
    const optimizationRequest = {
      templateId: template.id,
      businessSegment: template.business_segment,
      currentPerformance: {
        open_rate: template.open_rate || 0,
        click_rate: template.click_rate || 0,
        conversion_rate: template.conversion_rate || 0,
        sent_count: template.sent_count || 0
      },
      benchmarkPerformance: {
        target_open_rate: template.commercial_segment_benchmarks.target_open_rate,
        target_click_rate: template.commercial_segment_benchmarks.target_click_rate,
        target_conversion_rate: template.commercial_segment_benchmarks.target_conversion_rate
      },
      currentContent: {
        subject_line: template.subject_line,
        email_body_html: template.email_body_html,
        call_to_action_text: template.call_to_action_text || 'Bekijk aanbod'
      },
      optimizationType: optimizationType as 'subject_line' | 'email_body' | 'cta' | 'full_template'
    };

    console.log('[AI_OPTIMIZE] Calling AI optimizer with request');

    // Voer AI optimalisatie uit
    const optimizationResult = await AIEmailOptimizer.optimizeEmailTemplate(optimizationRequest);

    if (!optimizationResult.success) {
      return NextResponse.json({ 
        error: 'AI optimalisatie gefaald: ' + optimizationResult.error,
        details: optimizationResult
      }, { status: 500 });
    }

    // Maak nieuwe geoptimaliseerde template
    const newTemplate = {
      template_name: `${template.template_name} (AI Optimized ${optimizationType})`,
      template_version: `${template.template_version}_ai_${Date.now()}`,
      business_segment: template.business_segment,
      subject_line: optimizationResult.optimizedContent.subject_line || template.subject_line,
      email_body_html: optimizationResult.optimizedContent.email_body_html || template.email_body_html,
      email_body_text: htmlToText(optimizationResult.optimizedContent.email_body_html || template.email_body_html),
      call_to_action_text: optimizationResult.optimizedContent.call_to_action_text || template.call_to_action_text,
      call_to_action_url: template.call_to_action_url,
      ai_generated: true,
      ai_optimization_notes: optimizationResult.aiReasoning,
      parent_template_id: template.id,
      is_active: true,
      is_baseline: false,
      created_by: authResult.user?.id || null
    };

    const { data: newTemplateData, error: createError } = await supabaseAdmin
      .from('commercial_email_templates')
      .insert(newTemplate)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Update de optimalisatie log met nieuwe template ID
    await supabaseAdmin
      .from('commercial_ai_optimizations')
      .update({
        implemented: true,
        implemented_at: new Date().toISOString(),
        new_template_id: newTemplateData.id
      })
      .eq('business_segment', template.business_segment)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('[AI_OPTIMIZE] Successfully created optimized template:', newTemplateData.id);

    return NextResponse.json({ 
      success: true,
      originalTemplate: template,
      optimizedTemplate: newTemplateData,
      optimizationDetails: optimizationResult,
      message: 'AI optimalisatie succesvol voltooid'
    });

  } catch (error) {
    console.error('[AI_OPTIMIZE] Error during optimization:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout tijdens AI optimalisatie' 
    }, { status: 500 });
  }
}

// GET - Run automatic optimization check for all underperforming templates
export async function GET(req: NextRequest) {
  try {
    console.log('[AI_OPTIMIZE] Running automatic optimization check');

    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dry_run') === 'true';
    const forceRun = searchParams.get('force') === 'true';

    // Update segment benchmarks eerst
    await supabaseAdmin.rpc('update_segment_benchmarks');

    // Vind underperforming templates
    const { data: underperformingTemplates, error: fetchError } = await supabaseAdmin
      .rpc('get_underperforming_templates', {
        min_sample_size: 50,
        days_back: 30
      });

    if (fetchError) {
      throw fetchError;
    }

    if (!underperformingTemplates || underperformingTemplates.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'Geen underperforming templates gevonden',
        optimizations_triggered: 0,
        templates_checked: 0
      });
    }

    console.log(`[AI_OPTIMIZE] Found ${underperformingTemplates.length} underperforming templates`);

    if (dryRun) {
      return NextResponse.json({ 
        success: true,
        message: 'Dry run - geen optimalisaties uitgevoerd',
        underperforming_templates: underperformingTemplates.map((t: any) => ({
          id: t.id,
          name: t.template_name,
          segment: t.business_segment,
          open_rate: t.open_rate,
          target_open_rate: t.target_open_rate,
          performance_gap: t.target_open_rate - t.open_rate
        })),
        would_optimize: underperformingTemplates.length
      });
    }

    // Voer automatische optimalisaties uit
    const optimizationResults = [];

    for (const template of underperformingTemplates) {
      try {
        // Check recent optimalisaties
        const { data: recentOpts } = await supabaseAdmin
          .from('commercial_ai_optimizations')
          .select('*')
          .eq('business_segment', template.business_segment)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!forceRun && recentOpts && recentOpts.length > 0) {
          console.log(`[AI_OPTIMIZE] Skipping ${template.business_segment} - recent optimization found`);
          continue;
        }

        console.log(`[AI_OPTIMIZE] Running optimization for template: ${template.template_name}`);

        // Trigger optimalisatie via AI
        await AIEmailOptimizer.checkAndOptimizeUnderperformingTemplates();

        optimizationResults.push({
          template_id: template.id,
          template_name: template.template_name,
          business_segment: template.business_segment,
          status: 'optimized'
        });

      } catch (error) {
        console.error(`[AI_OPTIMIZE] Error optimizing template ${template.id}:`, error);
        optimizationResults.push({
          template_id: template.id,
          template_name: template.template_name,
          business_segment: template.business_segment,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[AI_OPTIMIZE] Automatic optimization check completed');

    return NextResponse.json({ 
      success: true,
      message: `Automatische optimalisatie voltooid. ${optimizationResults.filter(r => r.status === 'optimized').length} templates geoptimaliseerd.`,
      templates_checked: underperformingTemplates.length,
      optimizations_triggered: optimizationResults.filter(r => r.status === 'optimized').length,
      optimization_results: optimizationResults
    });

  } catch (error) {
    console.error('[AI_OPTIMIZE] Error during automatic optimization:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout tijdens automatische optimalisatie' 
    }, { status: 500 });
  }
}

// PUT - Update optimization implementation status
export async function PUT(req: NextRequest) {
  try {
    console.log('[AI_OPTIMIZE] Updating optimization implementation');

    const authResult = await requireAdminAuth(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const {
      optimizationId,
      implemented,
      postOptimizationPerformance,
      notes
    } = await req.json();

    if (!optimizationId) {
      return NextResponse.json({ 
        error: 'Optimization ID is verplicht' 
      }, { status: 400 });
    }

    const updateData: any = {
      implemented: implemented !== undefined ? implemented : true,
      updated_at: new Date().toISOString()
    };

    if (implemented) {
      updateData.implemented_at = new Date().toISOString();
    }

    if (postOptimizationPerformance !== undefined) {
      updateData.post_optimization_performance = postOptimizationPerformance;
      
      // Bereken performance improvement als baseline bekend is
      const { data: optimization } = await supabaseAdmin
        .from('commercial_ai_optimizations')
        .select('baseline_performance')
        .eq('id', optimizationId)
        .single();

      if (optimization?.baseline_performance) {
        updateData.performance_improvement = postOptimizationPerformance - optimization.baseline_performance;
      }
    }

    if (notes) {
      updateData.ai_reasoning = notes;
    }

    const { data: updatedOptimization, error } = await supabaseAdmin
      .from('commercial_ai_optimizations')
      .update(updateData)
      .eq('id', optimizationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[AI_OPTIMIZE] Successfully updated optimization:', optimizationId);

    return NextResponse.json({ 
      success: true,
      optimization: updatedOptimization,
      message: 'Optimalisatie status succesvol bijgewerkt'
    });

  } catch (error) {
    console.error('[AI_OPTIMIZE] Error updating optimization:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij bijwerken optimalisatie' 
    }, { status: 500 });
  }
}

// Helper function to convert HTML to text
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
} 