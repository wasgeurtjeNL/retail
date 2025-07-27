// =====================================================
// CONVERSION FEEDBACK API - Feedback Collection & Processing
// Handle feedback submission and journey retrieval
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { PostDeliveryService } from '@/lib/conversion/post-delivery-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const journeyId = searchParams.get('journey_id');

    if (!journeyId) {
      return NextResponse.json(
        { error: 'journey_id parameter is required' },
        { status: 400 }
      );
    }

    console.log(`[Conversion Feedback API] Getting journey details for ${journeyId}`);

    const supabase = getServiceRoleClient();

    // Get journey with prospect details
    const { data: journey, error } = await supabase
      .from('conversion_journeys')
      .select(`
        *,
        prospects (
          id,
          company_name,
          contact_name,
          email,
          phone
        ),
        fulfillment_orders (
          id,
          order_number,
          status,
          tracking_number,
          delivered_at
        )
      `)
      .eq('id', journeyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Journey not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to get journey: ${error.message}`);
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('proefpakket_feedback')
      .select('id')
      .eq('journey_id', journeyId)
      .single();

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this journey' },
        { status: 409 }
      );
    }

    // Validate journey status
    if (!['delivered', 'feedback_received'].includes(journey.status)) {
      return NextResponse.json(
        { error: 'Feedback not available for this journey status' },
        { status: 400 }
      );
    }

    console.log(`[Conversion Feedback API] Journey found: ${journey.id}`);

    return NextResponse.json({
      success: true,
      data: journey
    });

  } catch (error) {
    console.error('[Conversion Feedback API] Error in GET:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get journey details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { journey_id, ...feedbackData } = body;

    if (!journey_id) {
      return NextResponse.json(
        { error: 'journey_id is required' },
        { status: 400 }
      );
    }

    console.log(`[Conversion Feedback API] Processing feedback for journey ${journey_id}`);

    // Validate required fields
    if (!feedbackData.overall_rating || feedbackData.overall_rating < 1 || feedbackData.overall_rating > 5) {
      return NextResponse.json(
        { error: 'overall_rating is required and must be between 1 and 5' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Verify journey exists and is eligible for feedback
    const { data: journey, error: journeyError } = await supabase
      .from('conversion_journeys')
      .select('id, status, prospect_id')
      .eq('id', journey_id)
      .single();

    if (journeyError) {
      if (journeyError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Journey not found' },
          { status: 404 }
        );
      }
      throw new Error(`Failed to get journey: ${journeyError.message}`);
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('proefpakket_feedback')
      .select('id')
      .eq('journey_id', journey_id)
      .single();

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this journey' },
        { status: 409 }
      );
    }

    // Process feedback using PostDeliveryService
    const postDeliveryService = new PostDeliveryService();
    await postDeliveryService.processFeedbackSubmission(journey_id, feedbackData);

    console.log(`[Conversion Feedback API] Feedback processed successfully for journey ${journey_id}`);

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        journey_id: journey_id,
        feedback_received: true,
        next_steps: feedbackData.interested_in_partnership 
          ? 'We will contact you within 2 business days to discuss partnership opportunities.'
          : 'Thank you for your feedback. We will use it to improve our products and services.'
      }
    });

  } catch (error) {
    console.error('[Conversion Feedback API] Error in POST:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to submit feedback',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { journey_id, status_update, ...additionalData } = body;

    if (!journey_id || !status_update) {
      return NextResponse.json(
        { error: 'journey_id and status_update are required' },
        { status: 400 }
      );
    }

    console.log(`[Conversion Feedback API] Updating journey ${journey_id} status to ${status_update}`);

    const supabase = getServiceRoleClient();

    // Prepare update data
    const updates: any = {
      status: status_update,
      updated_at: new Date().toISOString()
    };

    // Set appropriate timestamp fields based on status
    switch (status_update) {
      case 'interested':
        updates.interest_shown_at = new Date().toISOString();
        break;
      case 'application_started':
        updates.application_started_at = new Date().toISOString();
        break;
      case 'application_submitted':
        updates.application_submitted_at = new Date().toISOString();
        break;
      case 'converted':
        updates.conversion_completed_at = new Date().toISOString();
        updates.days_to_conversion = additionalData.days_to_conversion;
        updates.actual_ltv = additionalData.actual_ltv;
        break;
      case 'churned':
      case 'rejected':
        updates.journey_ended_at = new Date().toISOString();
        break;
    }

    // Add any additional data
    if (additionalData.notes) {
      updates.notes = additionalData.notes;
    }

    if (additionalData.conversion_source) {
      updates.conversion_source = additionalData.conversion_source;
    }

    if (additionalData.attribution_confidence) {
      updates.attribution_confidence = additionalData.attribution_confidence;
    }

    // Update journey
    const { data: updatedJourney, error } = await supabase
      .from('conversion_journeys')
      .update(updates)
      .eq('id', journey_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update journey: ${error.message}`);
    }

    // Record touchpoint for status change
    if (additionalData.record_touchpoint !== false) {
      const touchpointData = {
        journey_id: journey_id,
        touchpoint_type: getTouchpointTypeForStatus(status_update),
        channel: additionalData.touchpoint_channel || 'website',
        subject: `Status updated to ${status_update}`,
        content: additionalData.touchpoint_content || `Journey status changed to ${status_update}`,
        automated: additionalData.automated || false,
        triggered_by: additionalData.triggered_by || 'manual_update',
        conversion_contribution: getConversionContribution(status_update)
      };

      await supabase
        .from('conversion_touchpoints')
        .insert([touchpointData]);
    }

    console.log(`[Conversion Feedback API] Journey ${journey_id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Journey updated successfully',
      data: updatedJourney
    });

  } catch (error) {
    console.error('[Conversion Feedback API] Error in PUT:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update journey',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function getTouchpointTypeForStatus(status: string): string {
  const mapping: Record<string, string> = {
    'interested': 'follow_up_required',
    'application_started': 'application_started',
    'application_submitted': 'application_submitted',
    'converted': 'meeting_completed',
    'churned': 'lost_contact',
    'rejected': 'follow_up_required'
  };

  return mapping[status] || 'follow_up_required';
}

function getConversionContribution(status: string): number {
  const contributions: Record<string, number> = {
    'interested': 0.6,
    'application_started': 0.8,
    'application_submitted': 0.9,
    'converted': 1.0,
    'churned': 0.0,
    'rejected': 0.0
  };

  return contributions[status] || 0.1;
} 