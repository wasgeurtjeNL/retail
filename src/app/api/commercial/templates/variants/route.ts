// =====================================================
// TEMPLATE VARIANTS API ROUTE
// CRUD operations voor segment template variants
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('[Template Variants API] GET request received');
    
    const { searchParams } = new URL(req.url);
    const segment = searchParams.get('segment');
    const templateType = searchParams.get('template_type');
    const activeOnly = searchParams.get('active_only') === 'true';
    
    if (!segment) {
      return NextResponse.json(
        { error: 'Segment parameter is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Build query
    let query = supabase
      .from('segment_template_variants')
      .select('*')
      .eq('segment', segment)
      .order('created_at', { ascending: false });
    
    if (templateType) {
      query = query.eq('template_type', templateType);
    }
    
    if (activeOnly) {
      query = query.eq('active', true);
    }
    
    const { data: variants, error } = await query;
    
    if (error) {
      console.error('[Template Variants API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template variants: ' + error.message },
        { status: 500 }
      );
    }
    
    // Group by template type
    const emailVariants = variants?.filter(v => v.template_type === 'email') || [];
    const landingVariants = variants?.filter(v => v.template_type === 'landing_page') || [];
    
    console.log(`[Template Variants API] Found ${emailVariants.length} email variants and ${landingVariants.length} landing variants for segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      email_variants: emailVariants,
      landing_variants: landingVariants,
      total_variants: variants?.length || 0
    });
    
  } catch (error) {
    console.error('[Template Variants API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Template Variants API] POST request received');
    
    const body = await req.json();
    const {
      segment,
      template_type,
      variant_name,
      template_content,
      template_subject,
      template_preview_text,
      benchmark_conversion_rate = 5.0,
      is_control = false,
      active = false
    } = body;
    
    // Validation
    if (!segment || !template_type || !variant_name || !template_content) {
      return NextResponse.json(
        { error: 'Missing required fields: segment, template_type, variant_name, template_content' },
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
    
    // Check if variant name already exists for this segment/type
    const { data: existingVariant, error: checkError } = await supabase
      .from('segment_template_variants')
      .select('id')
      .eq('segment', segment)
      .eq('template_type', template_type)
      .eq('variant_name', variant_name)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Template Variants API] Error checking existing variant:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing variant: ' + checkError.message },
        { status: 500 }
      );
    }
    
    if (existingVariant) {
      return NextResponse.json(
        { error: 'Variant with this name already exists for this segment and template type' },
        { status: 400 }
      );
    }
    
    // If this is set as active, deactivate other variants of the same type
    if (active) {
      const { error: deactivateError } = await supabase
        .from('segment_template_variants')
        .update({ active: false })
        .eq('segment', segment)
        .eq('template_type', template_type);
      
      if (deactivateError) {
        console.error('[Template Variants API] Error deactivating other variants:', deactivateError);
      }
    }
    
    // Create new variant
    const { data: newVariant, error: insertError } = await supabase
      .from('segment_template_variants')
      .insert([{
        segment,
        template_type,
        variant_name,
        template_content,
        template_subject,
        template_preview_text,
        benchmark_conversion_rate,
        is_control,
        active,
        created_by: 'admin', // TODO: Get from auth context
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('[Template Variants API] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create template variant: ' + insertError.message },
        { status: 500 }
      );
    }
    
    console.log(`[Template Variants API] Created new ${template_type} variant: ${variant_name} for segment: ${segment}`);
    
    return NextResponse.json({
      success: true,
      variant: newVariant,
      message: `Template variant "${variant_name}" created successfully`
    });
    
  } catch (error) {
    console.error('[Template Variants API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('[Template Variants API] PUT request received');
    
    const body = await req.json();
    const {
      id,
      variant_name,
      template_content,
      template_subject,
      template_preview_text,
      benchmark_conversion_rate,
      active,
      test_enabled
    } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template variant ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get current variant to check segment and type
    const { data: currentVariant, error: fetchError } = await supabase
      .from('segment_template_variants')
      .select('segment, template_type')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('[Template Variants API] Error fetching current variant:', fetchError);
      return NextResponse.json(
        { error: 'Template variant not found' },
        { status: 404 }
      );
    }
    
    // If setting as active, deactivate other variants of the same type
    if (active) {
      const { error: deactivateError } = await supabase
        .from('segment_template_variants')
        .update({ active: false })
        .eq('segment', currentVariant.segment)
        .eq('template_type', currentVariant.template_type)
        .neq('id', id);
      
      if (deactivateError) {
        console.error('[Template Variants API] Error deactivating other variants:', deactivateError);
      }
    }
    
    // Update variant
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (variant_name !== undefined) updateData.variant_name = variant_name;
    if (template_content !== undefined) updateData.template_content = template_content;
    if (template_subject !== undefined) updateData.template_subject = template_subject;
    if (template_preview_text !== undefined) updateData.template_preview_text = template_preview_text;
    if (benchmark_conversion_rate !== undefined) updateData.benchmark_conversion_rate = benchmark_conversion_rate;
    if (active !== undefined) updateData.active = active;
    if (test_enabled !== undefined) updateData.test_enabled = test_enabled;
    
    const { data: updatedVariant, error: updateError } = await supabase
      .from('segment_template_variants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Template Variants API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template variant: ' + updateError.message },
        { status: 500 }
      );
    }
    
    console.log(`[Template Variants API] Updated template variant: ${id}`);
    
    return NextResponse.json({
      success: true,
      variant: updatedVariant,
      message: 'Template variant updated successfully'
    });
    
  } catch (error) {
    console.error('[Template Variants API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('[Template Variants API] DELETE request received');
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template variant ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Check if variant exists and is not active
    const { data: variant, error: fetchError } = await supabase
      .from('segment_template_variants')
      .select('active, variant_name')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('[Template Variants API] Error fetching variant:', fetchError);
      return NextResponse.json(
        { error: 'Template variant not found' },
        { status: 404 }
      );
    }
    
    if (variant.active) {
      return NextResponse.json(
        { error: 'Cannot delete active template variant. Deactivate it first.' },
        { status: 400 }
      );
    }
    
    // Delete variant
    const { error: deleteError } = await supabase
      .from('segment_template_variants')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('[Template Variants API] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete template variant: ' + deleteError.message },
        { status: 500 }
      );
    }
    
    console.log(`[Template Variants API] Deleted template variant: ${variant.variant_name}`);
    
    return NextResponse.json({
      success: true,
      message: 'Template variant deleted successfully'
    });
    
  } catch (error) {
    console.error('[Template Variants API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
} 