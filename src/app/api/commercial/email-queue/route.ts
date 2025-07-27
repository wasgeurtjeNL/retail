// =====================================================
// EMAIL QUEUE API - Get emails from queue
// Endpoint voor het ophalen van emails uit de wachtrij
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('[EmailQueue API] GET request received');
    
    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const prospectId = searchParams.get('prospectId');
    
    console.log('[EmailQueue API] Query params:', {
      limit,
      status,
      prospectId
    });

    const supabase = getServiceRoleClient();
    
    // Build query
    let query = supabase
      .from('commercial_email_queue')
      .select(`
        id,
        prospect_id,
        template_id,
        campaign_id,
        recipient_email,
        recipient_name,
        personalized_subject,
        personalized_html,
        personalized_text,
        scheduled_at,
        status,
        attempts,
        max_retries,
        error_message,
        sent_at,
        created_at,
        updated_at,
        commercial_prospects!prospect_id(
          business_name,
          city,
          business_segment
        )
      `)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (prospectId) {
      query = query.eq('prospect_id', prospectId);
    }

    const { data: emails, error } = await query;

    if (error) {
      console.error('[EmailQueue API] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch emails' },
        { status: 500 }
      );
    }

    // Transform data to flatten prospect information
    const transformedEmails = emails?.map((email: any) => ({
      ...email,
      business_name: email.commercial_prospects?.business_name,
      city: email.commercial_prospects?.city,
      business_segment: email.commercial_prospects?.business_segment,
      commercial_prospects: undefined // Remove the nested object
    })) || [];

    console.log(`[EmailQueue API] Returning ${transformedEmails.length} emails`);

    return NextResponse.json({
      success: true,
      emails: transformedEmails,
      total: transformedEmails.length
    });

  } catch (error) {
    console.error('[EmailQueue API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// ADD PROSPECTS TO EMAIL QUEUE
// Voeg prospects toe aan de email wachtrij (re-add functionaliteit)
// =====================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[EmailQueue API] POST request received - Adding prospects to queue');
    
    const body = await request.json();
    const { prospectIds, campaignId, scheduleDelay = 5 } = body;
    
    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prospect IDs array is required' },
        { status: 400 }
      );
    }

    console.log(`[EmailQueue API] Adding ${prospectIds.length} prospects to queue:`, prospectIds);

    const supabase = getServiceRoleClient();
    
    // First, get prospect details
    const { data: prospects, error: prospectError } = await supabase
      .from('commercial_prospects')
      .select('id, business_name, email, business_segment, city, contact_name, status')
      .in('id', prospectIds);

    if (prospectError) {
      console.error('[EmailQueue API] Error fetching prospects:', prospectError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch prospect details' },
        { status: 500 }
      );
    }

    if (!prospects || prospects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No prospects found with provided IDs' },
        { status: 404 }
      );
    }

    // Check for existing queued emails for these prospects
    const { data: existingEmails, error: existingError } = await supabase
      .from('commercial_email_queue')
      .select('prospect_id, status')
      .in('prospect_id', prospectIds)
      .in('status', ['pending', 'processing']);

    if (existingError) {
      console.error('[EmailQueue API] Error checking existing emails:', existingError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing emails' },
        { status: 500 }
      );
    }

    // Filter out prospects that already have pending/processing emails
    const existingProspectIds = new Set(existingEmails?.map(e => e.prospect_id) || []);
    const availableProspects = prospects.filter(p => !existingProspectIds.has(p.id));

    if (availableProspects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All selected prospects already have emails in queue' },
        { status: 400 }
      );
    }

    // Get or create default campaign if not specified
    let targetCampaignId = campaignId;
    if (!targetCampaignId) {
      const { data: defaultCampaign, error: campaignError } = await supabase
        .from('commercial_email_campaigns')
        .select('id, campaign_name')
        .eq('is_default', true)
        .eq('active', true)
        .limit(1)
        .single();

      if (campaignError || !defaultCampaign) {
        // Create a default campaign if none exists
        const { data: newCampaign, error: createError } = await supabase
          .from('commercial_email_campaigns')
          .insert({
            campaign_name: 'Re-added Prospects Campaign',
            business_segment: 'mixed',
            is_default: true,
            active: true,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createError) {
          console.error('[EmailQueue API] Error creating default campaign:', createError);
          return NextResponse.json(
            { success: false, error: 'Failed to create default campaign' },
            { status: 500 }
          );
        }

        targetCampaignId = newCampaign.id;
      } else {
        targetCampaignId = defaultCampaign.id;
      }
    }

    // Generate emails for each available prospect
    const emailsToQueue = [];
    const results = [];

    for (const prospect of availableProspects) {
      try {
        // Generate or get existing invitation code
        const invitationCode = await generateInvitationCode(supabase, prospect);
        
        // Generate personalized email content with unique code
        const emailContent = generatePersonalizedEmail(prospect, invitationCode);
        
        // Schedule email with delay
        const scheduledTime = new Date();
        scheduledTime.setMinutes(scheduledTime.getMinutes() + scheduleDelay + Math.floor(Math.random() * 30));

        const emailData = {
          prospect_id: prospect.id,
          campaign_id: targetCampaignId,
          campaign_step: 'initial',
          recipient_email: prospect.email,
          recipient_name: prospect.contact_name || prospect.business_name,
          personalized_subject: emailContent.subject,
          personalized_html: emailContent.html,
          personalized_text: emailContent.text,
          scheduled_at: scheduledTime.toISOString(),
          status: 'pending',
          priority: 5,
          attempts: 0,
          created_at: new Date().toISOString()
        };

        emailsToQueue.push(emailData);
        
        results.push({
          prospect_id: prospect.id,
          business_name: prospect.business_name,
          email: prospect.email,
          status: 'queued',
          scheduled_at: scheduledTime.toISOString()
        });

        console.log(`[EmailQueue API] Prepared email for ${prospect.business_name} (${prospect.email})`);

      } catch (error) {
        console.error(`[EmailQueue API] Error preparing email for ${prospect.id}:`, error);
        results.push({
          prospect_id: prospect.id,
          business_name: prospect.business_name,
          email: prospect.email,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Insert all emails to queue
    if (emailsToQueue.length > 0) {
      const { error: insertError } = await supabase
        .from('commercial_email_queue')
        .insert(emailsToQueue);

      if (insertError) {
        console.error('[EmailQueue API] Error inserting emails to queue:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to add emails to queue' },
          { status: 500 }
        );
      }

      // Update prospect statuses
      const successfulProspectIds = results
        .filter(r => r.status === 'queued')
        .map(r => r.prospect_id);

      if (successfulProspectIds.length > 0) {
        await supabase
          .from('commercial_prospects')
          .update({
            status: 'contacted',
            initial_outreach_date: new Date().toISOString(),
            last_contact_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', successfulProspectIds);
      }
    }

    const successCount = results.filter(r => r.status === 'queued').length;
    const skippedCount = existingProspectIds.size;

    console.log(`[EmailQueue API] Successfully added ${successCount} emails to queue`);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${successCount} prospect(s) to email queue`,
      queued_count: successCount,
      skipped_count: skippedCount,
      total_requested: prospectIds.length,
      campaign_id: targetCampaignId,
      results,
      skipped_prospects: prospects
        .filter(p => existingProspectIds.has(p.id))
        .map(p => ({
          prospect_id: p.id,
          business_name: p.business_name,
          reason: 'Already has email in queue'
        }))
    });

  } catch (error) {
    console.error('[EmailQueue API] Error adding prospects to queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER FUNCTION - Generate Invitation Code
// Genereert unieke uitnodigingscode per prospect
// =====================================================

async function generateInvitationCode(supabase: any, prospect: any): Promise<string> {
  try {
    // Check if prospect already has an active invitation code
    const { data: existingCode, error: checkError } = await supabase
      .from('prospect_invitation_codes')
      .select('invitation_code')
      .eq('prospect_id', prospect.id)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existingCode && !checkError) {
      console.log(`[Email] Using existing invitation code for ${prospect.business_name}: ${existingCode.invitation_code}`);
      return existingCode.invitation_code;
    }

    // Generate new invitation code
    const { data: newCodeResult, error: generateError } = await supabase
      .rpc('generate_invitation_code');

    if (generateError || !newCodeResult) {
      throw new Error(`Failed to generate invitation code: ${generateError?.message}`);
    }

    const invitationCode = newCodeResult;

    // Store the invitation code with prospect details
    const { error: insertError } = await supabase
      .from('prospect_invitation_codes')
      .insert({
        prospect_id: prospect.id,
        invitation_code: invitationCode,
        business_name: prospect.business_name,
        contact_name: prospect.contact_name,
        business_segment: prospect.business_segment,
        city: prospect.city,
        email: prospect.email,
        is_active: true
      });

    if (insertError) {
      throw new Error(`Failed to store invitation code: ${insertError.message}`);
    }

    console.log(`[Email] Generated new invitation code for ${prospect.business_name}: ${invitationCode}`);
    return invitationCode;

  } catch (error) {
    console.error(`[Email] Error generating invitation code for ${prospect.id}:`, error);
    // Fallback to prospect ID if code generation fails
    return `fallback_${prospect.id.substring(0, 8)}`;
  }
}

// =====================================================
// HELPER FUNCTION - Generate Personalized Email Content
// Genereert gepersonaliseerde email content per prospect segment
// =====================================================

function generatePersonalizedEmail(prospect: any, invitationCode: string) {
  // Segment-specific configurations
  const segmentConfigs: Record<string, any> = {
    beauty_salon: {
      subjectPrefix: "Exclusief gratis proefpakket",
      openingLine: "We hebben een exclusief gratis proefpakket voor",
      benefits: ["Premium wasproducten speciaal voor salon gebruik", "Verhoog uw service kwaliteit", "Tevreden klanten = meer omzet"],
      urgency: "Beperkte tijd beschikbaar - claim nu!",
      testimonial: "Salons rapporteren 40% meer klanttevredenheid"
    },
    nail_salon: {
      subjectPrefix: "Gratis proefpakket voor nagelstudio's",
      openingLine: "Speciaal voor professionele nagelstudio's hebben wij",
      benefits: ["Professionele wasoplossingen", "Perfect voor tussen behandelingen", "Hygienische en efficiënte service"],
      urgency: "Exclusief aanbod - slechts beperkt beschikbaar",
      testimonial: "Nagelstudio's zien 35% snellere service doorlooptijd"
    },
    restaurant: {
      subjectPrefix: "Gratis proefpakket voor restaurants",
      openingLine: "Voor restaurants die kwaliteit en service serieus nemen",
      benefits: ["Professionele handwas oplossingen", "Verhoog hygiëne standaarden", "Indruk maken op uw gasten"],
      urgency: "Beperkte tijd - claim uw gratis pakket nu",
      testimonial: "Restaurants rapporteren betere gastevaluaties"
    },
    hairdresser: {
      subjectPrefix: "Exclusief voor kappers - gratis proefpakket",
      openingLine: "Speciaal ontwikkeld voor professionele kapperszaken",
      benefits: ["Premium kwaliteit wasproducten", "Verbeter uw salon ervaring", "Klanten komen sneller terug"],
      urgency: "Laatste kans - claim nu uw gratis pakket",
      testimonial: "Kappers zien 45% meer repeat klanten"
    },
    retail_clothing: {
      subjectPrefix: "Gratis proefpakket voor kledingwinkels",
      openingLine: "Voor kledingwinkels die hun klanten de beste service willen bieden",
      benefits: ["Professionele handwas service", "Verbeter klantervaring in uw winkel", "Onderscheid uzelf van concurrentie"],
      urgency: "Exclusief voor retailers - beperkt beschikbaar",
      testimonial: "Kledingwinkels zien langere winkelbezoeken"
    },
    gym: {
      subjectPrefix: "Gratis proefpakket voor sportscholen",
      openingLine: "Voor sportscholen die hygiëne en service voorop stellen",
      benefits: ["Hygiënische oplossingen voor uw gym", "Betere member experience", "Professionele uitstraling"],
      urgency: "Beperkt aanbod - claim snel uw pakket",
      testimonial: "Sportscholen rapporteren hogere member satisfaction"
    }
  };

  // Get segment config or use default
  const segment = prospect.business_segment || 'default';
  const config = segmentConfigs[segment] || segmentConfigs['beauty_salon'];

  const businessName = prospect.business_name || 'uw zaak';
  const city = prospect.city || '';
  const locationText = city ? ` in ${city}` : '';

  const subject = `${config.subjectPrefix} voor ${businessName}${locationText}!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exclusief Proefpakket - Wasgeurtje</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🌟 Exclusief Proefpakket</h1>
                            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Speciaal voor ${businessName}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px;">Hallo,</h2>
                            
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                ${config.openingLine} <strong>${businessName}${locationText}</strong> een exclusief gratis proefpakket samengesteld!
                            </p>
                            
                            <div style="background-color: #f7fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
                                <h3 style="color: #1a202c; margin: 0 0 15px 0; font-size: 18px;">✨ Wat krijgt u:</h3>
                                <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                                    ${config.benefits.map((benefit: string) => `<li style="margin-bottom: 8px;">${benefit}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
                                <p style="color: #ffffff; font-size: 16px; margin: 0; text-align: center; font-weight: bold;">
                                    🎯 ${config.testimonial}
                                </p>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:3000/register?invite=${invitationCode}&ref=email" 
                                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                          color: #ffffff; 
                                          padding: 15px 30px; 
                                          text-decoration: none; 
                                          border-radius: 50px; 
                                          font-weight: bold; 
                                          font-size: 16px; 
                                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                                          display: inline-block;">
                                    🎁 Claim Gratis Proefpakket
                                </a>
                            </div>
                            
                            <div style="background-color: #fed7d7; border: 1px solid #fc8181; padding: 15px; border-radius: 8px; margin: 25px 0;">
                                <p style="color: #c53030; margin: 0; text-align: center; font-weight: bold;">
                                    ⏰ ${config.urgency}
                                </p>
                            </div>
                            
                            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                Met vriendelijke groet,<br>
                                <strong>Het Wasgeurtje Team</strong><br>
                                📧 info@wasgeurtje.nl<br>
                                📞 +31 (0)20 123 4567
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #718096; font-size: 12px; margin: 0;">
                                Wasgeurtje B.V. | Amsterdam, Nederland | 
                                <a href="#" style="color: #667eea;">Uitschrijven</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  const text = `
Hallo,

${config.openingLine} ${businessName}${locationText} een exclusief gratis proefpakket samengesteld!

Wat krijgt u:
${config.benefits.map((benefit: string) => `• ${benefit}`).join('\n')}

${config.testimonial}

${config.urgency}

Claim nu uw gratis proefpakket: http://localhost:3000/register?invite=${invitationCode}&ref=email

Met vriendelijke groet,
Het Wasgeurtje Team
info@wasgeurtje.nl
+31 (0)20 123 4567

Wasgeurtje B.V. | Amsterdam, Nederland
  `.trim();

  return {
    subject,
    html,
    text
  };
}

// =====================================================
// DELETE EMAIL(S) FROM QUEUE
// Verwijder een of meerdere emails uit de wachtrij
// Ondersteunt zowel single delete (query param) als bulk delete (request body)
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    console.log('[EmailQueue API] DELETE request received');
    
    const { searchParams } = request.nextUrl;
    const singleEmailId = searchParams.get('id');
    
    let emailIds: string[] = [];
    
    // Check if this is a single delete (query param) or bulk delete (request body)
    if (singleEmailId) {
      // Single delete via query parameter (backward compatibility)
      emailIds = [singleEmailId];
    } else {
      // Bulk delete via request body
      try {
        const body = await request.json();
        emailIds = body.emailIds || [];
      } catch (parseError) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body. Expected JSON with emailIds array.' },
          { status: 400 }
        );
      }
    }
    
    if (!emailIds || emailIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No email IDs provided' },
        { status: 400 }
      );
    }

    console.log(`[EmailQueue API] Deleting ${emailIds.length} emails:`, emailIds);

    const supabase = getServiceRoleClient();
    
    // First, check all emails exist and can be deleted
    const { data: emails, error: fetchError } = await supabase
      .from('commercial_email_queue')
      .select('id, status, recipient_email, personalized_subject, sent_at')
      .in('id', emailIds);

    if (fetchError) {
      console.error('[EmailQueue API] Error fetching emails:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch emails for validation' },
        { status: 500 }
      );
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No emails found with the provided IDs' },
        { status: 404 }
      );
    }

    // Check if any emails were not found
    const foundEmailIds = emails.map(email => email.id);
    const notFoundIds = emailIds.filter(id => !foundEmailIds.includes(id));
    
    if (notFoundIds.length > 0) {
      console.warn(`[EmailQueue API] Some emails not found:`, notFoundIds);
    }

    // Safety check: only allow deletion of emails that haven't been sent
    const deletableStatuses = ['pending', 'failed', 'cancelled'];
    const nonDeletableEmails = emails.filter(email => 
      !deletableStatuses.includes(email.status) || email.sent_at
    );

    if (nonDeletableEmails.length > 0) {
      console.warn(`[EmailQueue API] Cannot delete emails with non-deletable status:`, nonDeletableEmails);
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete ${nonDeletableEmails.length} email(s). Only pending, failed, or cancelled emails that haven't been sent can be deleted.`,
          non_deletable_emails: nonDeletableEmails.map(email => ({
            id: email.id,
            recipient_email: email.recipient_email,
            status: email.status,
            sent_at: email.sent_at
          }))
        },
        { status: 400 }
      );
    }

    // All emails can be deleted, proceed with deletion
    const deletableEmailIds = emails.map(email => email.id);
    
    const { error: deleteError } = await supabase
      .from('commercial_email_queue')
      .delete()
      .in('id', deletableEmailIds);

    if (deleteError) {
      console.error('[EmailQueue API] Delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete emails from queue' },
        { status: 500 }
      );
    }

    console.log(`[EmailQueue API] Successfully deleted ${deletableEmailIds.length} emails`);

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${deletableEmailIds.length} email(s) from queue`,
      deleted_count: deletableEmailIds.length,
      deleted_emails: emails.map(email => ({
        id: email.id,
        recipient_email: email.recipient_email,
        subject: email.personalized_subject,
        status: email.status
      })),
      not_found_count: notFoundIds.length,
      not_found_ids: notFoundIds
    });

  } catch (error) {
    console.error('[EmailQueue API] Delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 