// =====================================================
// TEMPLATE VARIANT TOGGLE API ROUTE
// Toggle active status van template variants
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Template Variant Toggle API] POST request received for ID:', params.id);
    
    const body = await req.json();
    const { active } = body;
    
    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Active parameter must be a boolean' },
        { status: 400 }
      );
    }
    
    const supabase = getServiceRoleClient();
    
    // Get current variant info
    const { data: currentVariant, error: fetchError } = await supabase
      .from('segment_template_variants')
      .select('segment, template_type, variant_name, active')
      .eq('id', params.id)
      .single();
    
    if (fetchError) {
      console.error('[Template Variant Toggle API] Error fetching variant:', fetchError);
      return NextResponse.json(
        { error: 'Template variant not found' },
        { status: 404 }
      );
    }
    
    // If activating this variant, deactivate all others of the same type in the same segment
    if (active && !currentVariant.active) {
      console.log(`[Template Variant Toggle API] Deactivating other ${currentVariant.template_type} variants for segment: ${currentVariant.segment}`);
      
      const { error: deactivateError } = await supabase
        .from('segment_template_variants')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('segment', currentVariant.segment)
        .eq('template_type', currentVariant.template_type)
        .neq('id', params.id);
      
      if (deactivateError) {
        console.error('[Template Variant Toggle API] Error deactivating other variants:', deactivateError);
        return NextResponse.json(
          { error: 'Failed to deactivate other variants: ' + deactivateError.message },
          { status: 500 }
        );
      }
    }
    
    // Update the target variant
    const { data: updatedVariant, error: updateError } = await supabase
      .from('segment_template_variants')
      .update({ 
        active: active,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[Template Variant Toggle API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template variant: ' + updateError.message },
        { status: 500 }
      );
    }
    
    console.log(`[Template Variant Toggle API] Successfully ${active ? 'activated' : 'deactivated'} variant: ${currentVariant.variant_name}`);
    
    return NextResponse.json({
      success: true,
      variant: updatedVariant,
      message: `Template variant "${currentVariant.variant_name}" ${active ? 'activated' : 'deactivated'} successfully`,
      previous_active: currentVariant.active,
      new_active: active
    });
    
  } catch (error) {
    console.error('[Template Variant Toggle API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected error occurred' },
      { status: 500 }
    );
  }
} 