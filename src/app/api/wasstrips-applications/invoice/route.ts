// =====================================================
// INVOICE ROUTE - Payment Processing for Wasstrips Applications
// Handles invoice payment method for wasstrips orders
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

interface InvoiceRequest {
  applicationId: string;
  paymentType: 'deposit' | 'remaining' | 'full';
  amount?: number;
  dueDate?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
}

interface InvoiceResponse {
  success: boolean;
  data?: {
    invoiceId: string;
    invoiceUrl: string;
    paymentIntentId?: string;
    amount: number;
    dueDate: string;
    status: string;
  };
  error?: string;
}

/**
 * POST /api/wasstrips-applications/invoice
 * Create an invoice for wasstrips application payment
 */
export async function POST(request: NextRequest): Promise<NextResponse<InvoiceResponse>> {
  try {
    console.log('[Invoice API] POST request received');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: InvoiceRequest = await request.json();
    const { 
      applicationId, 
      paymentType, 
      amount,
      dueDate,
      customerEmail,
      customerName,
      description 
    } = body;

    if (!applicationId || !paymentType) {
      return NextResponse.json(
        { success: false, error: 'Application ID and payment type are required' },
        { status: 400 }
      );
    }

    // Get application details
    const serviceSupabase = getServiceRoleClient();
    const { data: application, error: appError } = await serviceSupabase
      .from('wasstrips_applications')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[Invoice API] Error fetching application:', appError);
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Calculate invoice amount based on payment type
    let invoiceAmount: number;
    let invoiceDescription: string;

    switch (paymentType) {
      case 'deposit':
        invoiceAmount = amount || 2500; // €25.00 in cents
        invoiceDescription = description || `Aanbetaling Wasstrips Proefpakket - ${application.business_name}`;
        break;
      case 'remaining':
        const depositPaid = application.deposit_paid_amount || 0;
        const totalAmount = application.total_amount || 4750; // €47.50 default
        invoiceAmount = amount || (totalAmount - depositPaid);
        invoiceDescription = description || `Restbetaling Wasstrips Proefpakket - ${application.business_name}`;
        break;
      case 'full':
        invoiceAmount = amount || application.total_amount || 4750;
        invoiceDescription = description || `Volledige betaling Wasstrips Proefpakket - ${application.business_name}`;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid payment type' },
          { status: 400 }
        );
    }

    // Set due date (default: 14 days from now)
    const invoiceDueDate = dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Create or get Stripe customer
    const customerDetails = {
      email: customerEmail || application.profile?.email || application.email,
      name: customerName || application.profile?.full_name || application.business_name,
      metadata: {
        wasstrips_application_id: applicationId,
        business_name: application.business_name
      }
    };

    let stripeCustomer;
    
    // Try to find existing customer
    if (customerDetails.email) {
      const existingCustomers = await stripe.customers.list({
        email: customerDetails.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
      }
    }

    // Create new customer if not found
    if (!stripeCustomer) {
      stripeCustomer = await stripe.customers.create(customerDetails);
    }

    // Create Stripe invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomer.id,
      collection_method: 'send_invoice',
      days_until_due: Math.ceil((new Date(invoiceDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      description: invoiceDescription,
      metadata: {
        wasstrips_application_id: applicationId,
        payment_type: paymentType,
        business_name: application.business_name
      },
      custom_fields: [
        {
          name: 'Referentie',
          value: `WSAPP-${applicationId.slice(-8).toUpperCase()}`
        },
        {
          name: 'Bedrijfsnaam',
          value: application.business_name
        }
      ]
    });

    // Add invoice item
    await stripe.invoiceItems.create({
      customer: stripeCustomer.id,
      invoice: invoice.id,
      amount: invoiceAmount,
      currency: 'eur',
      description: invoiceDescription,
      metadata: {
        wasstrips_application_id: applicationId,
        payment_type: paymentType
      }
    });

    // Finalize the invoice to make it payable
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Send the invoice
    await stripe.invoices.sendInvoice(invoice.id);

    // Store invoice information in the application
    const invoiceData = {
      stripe_invoice_id: finalizedInvoice.id,
      invoice_url: finalizedInvoice.hosted_invoice_url,
      invoice_pdf_url: finalizedInvoice.invoice_pdf,
      invoice_amount: invoiceAmount,
      invoice_due_date: invoiceDueDate,
      invoice_status: finalizedInvoice.status,
      payment_type: paymentType
    };

    // Update application with invoice details
    const updateData: any = {
      payment_method: 'invoice',
      ...invoiceData,
      updated_at: new Date().toISOString()
    };

    // Update specific payment tracking based on type
    if (paymentType === 'deposit') {
      updateData.deposit_invoice_id = finalizedInvoice.id;
      updateData.deposit_invoice_sent_at = new Date().toISOString();
    } else if (paymentType === 'remaining') {
      updateData.remaining_invoice_id = finalizedInvoice.id;
      updateData.remaining_invoice_sent_at = new Date().toISOString();
    }

    const { error: updateError } = await serviceSupabase
      .from('wasstrips_applications')
      .update(updateData)
      .eq('id', applicationId);

    if (updateError) {
      console.error('[Invoice API] Error updating application:', updateError);
      // Continue anyway as invoice was created successfully
    }

    // Log activity
    await serviceSupabase
      .from('wasstrips_activity_log')
      .insert({
        application_id: applicationId,
        activity_type: 'invoice_sent',
        description: `${paymentType} invoice sent via email`,
        metadata: {
          invoice_id: finalizedInvoice.id,
          amount: invoiceAmount,
          payment_type: paymentType
        }
      });

    console.log(`[Invoice API] Invoice created successfully: ${finalizedInvoice.id}`);

    return NextResponse.json({
      success: true,
      data: {
        invoiceId: finalizedInvoice.id,
        invoiceUrl: finalizedInvoice.hosted_invoice_url || '',
        amount: invoiceAmount,
        dueDate: invoiceDueDate,
        status: finalizedInvoice.status
      }
    });

  } catch (error) {
    console.error('[Invoice API] Error creating invoice:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wasstrips-applications/invoice?applicationId=xxx
 * Get invoice status and details
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Invoice API] GET request received');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const applicationId = url.searchParams.get('applicationId');
    const invoiceId = url.searchParams.get('invoiceId');

    if (!applicationId && !invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Application ID or Invoice ID is required' },
        { status: 400 }
      );
    }

    const serviceSupabase = getServiceRoleClient();

    if (applicationId) {
      // Get application with invoice details
      const { data: application, error: appError } = await serviceSupabase
        .from('wasstrips_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError || !application) {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }

      const invoices = [];
      
      // Check for deposit invoice
      if (application.deposit_invoice_id) {
        try {
          const depositInvoice = await stripe.invoices.retrieve(application.deposit_invoice_id);
          invoices.push({
            type: 'deposit',
            invoice: depositInvoice,
            local_data: {
              sent_at: application.deposit_invoice_sent_at,
              amount: application.invoice_amount
            }
          });
        } catch (error) {
          console.error('[Invoice API] Error retrieving deposit invoice:', error);
        }
      }

      // Check for remaining invoice
      if (application.remaining_invoice_id) {
        try {
          const remainingInvoice = await stripe.invoices.retrieve(application.remaining_invoice_id);
          invoices.push({
            type: 'remaining',
            invoice: remainingInvoice,
            local_data: {
              sent_at: application.remaining_invoice_sent_at
            }
          });
        } catch (error) {
          console.error('[Invoice API] Error retrieving remaining invoice:', error);
        }
      }

      // Check for main invoice
      if (application.stripe_invoice_id) {
        try {
          const mainInvoice = await stripe.invoices.retrieve(application.stripe_invoice_id);
          invoices.push({
            type: application.payment_type || 'full',
            invoice: mainInvoice,
            local_data: {
              sent_at: application.created_at,
              amount: application.invoice_amount
            }
          });
        } catch (error) {
          console.error('[Invoice API] Error retrieving main invoice:', error);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          applicationId,
          invoices,
          summary: {
            totalInvoices: invoices.length,
            paidInvoices: invoices.filter(inv => inv.invoice.status === 'paid').length,
            pendingInvoices: invoices.filter(inv => inv.invoice.status === 'open').length
          }
        }
      });
    }

    if (invoiceId) {
      // Get specific invoice details
      const invoice = await stripe.invoices.retrieve(invoiceId);
      
      return NextResponse.json({
        success: true,
        data: { invoice }
      });
    }

  } catch (error) {
    console.error('[Invoice API] GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve invoice details'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wasstrips-applications/invoice
 * Update invoice (e.g., mark as paid, cancel, etc.)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Invoice API] PUT request received');
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { invoiceId, action, applicationId } = body;

    if (!invoiceId || !action) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID and action are required' },
        { status: 400 }
      );
    }

    let updatedInvoice;

    switch (action) {
      case 'mark_paid':
        // Mark invoice as paid manually (for admin use)
        updatedInvoice = await stripe.invoices.markUncollectible(invoiceId);
        break;
        
      case 'cancel':
        // Cancel/void the invoice
        updatedInvoice = await stripe.invoices.voidInvoice(invoiceId);
        break;
        
      case 'resend':
        // Resend the invoice
        await stripe.invoices.sendInvoice(invoiceId);
        updatedInvoice = await stripe.invoices.retrieve(invoiceId);
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    // Update local application status if provided
    if (applicationId) {
      const serviceSupabase = getServiceRoleClient();
      
      const updateData: any = {
        invoice_status: updatedInvoice.status,
        updated_at: new Date().toISOString()
      };

      if (action === 'mark_paid' || updatedInvoice.status === 'paid') {
        updateData.payment_status = 'paid';
        updateData.paid_at = new Date().toISOString();
      }

      await serviceSupabase
        .from('wasstrips_applications')
        .update(updateData)
        .eq('id', applicationId);

      // Log activity
      await serviceSupabase
        .from('wasstrips_activity_log')
        .insert({
          application_id: applicationId,
          activity_type: 'invoice_updated',
          description: `Invoice ${action} performed`,
          metadata: {
            invoice_id: invoiceId,
            action,
            new_status: updatedInvoice.status
          }
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice: updatedInvoice,
        action,
        message: `Invoice ${action} completed successfully`
      }
    });

  } catch (error) {
    console.error('[Invoice API] PUT error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update invoice'
      },
      { status: 500 }
    );
  }
} 