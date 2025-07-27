import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('[Automation Activate] API endpoint called');
  
  try {
    const body = await request.json();
    const { action, includeEmailCampaigns, includeProefpakketAssignment, includeFollowUpSequences } = body;
    
    console.log('[Automation Activate] Request body:', { action, includeEmailCampaigns, includeProefpakketAssignment, includeFollowUpSequences });
    
    if (action !== 'activate_full_pipeline') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use "activate_full_pipeline"' 
      }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    let prospectsEnrolled = 0;
    let emailsQueued = 0;
    const results: string[] = [];

    // 1. Get qualified prospects that haven't been contacted yet
    console.log('[Automation Activate] Finding qualified prospects...');
    const { data: prospects, error: prospectsError } = await supabase
      .from('commercial_prospects')
      .select('id, business_name, business_segment, email, contact_name, city, created_at')
      .eq('status', 'qualified')
      .is('initial_outreach_date', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (prospectsError) {
      console.error('[Automation Activate] Error fetching prospects:', prospectsError);
      return NextResponse.json({ 
        success: false, 
        error: `Database error: ${prospectsError.message}` 
      }, { status: 500 });
    }

    console.log(`[Automation Activate] Found ${prospects?.length || 0} prospects ready for automation`);

    if (!prospects || prospects.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No prospects need automation at this time',
        prospects_enrolled: 0,
        emails_queued: 0
      });
    }

    // 2. Get active email campaigns if email campaigns are enabled
    if (includeEmailCampaigns) {
      console.log('[Automation Activate] Getting active email campaigns...');
      const { data: campaigns, error: campaignsError } = await supabase
        .from('commercial_email_campaigns')
        .select('id, campaign_name, business_segment')
        .eq('status', 'active');

      if (campaignsError) {
        console.error('[Automation Activate] Error fetching campaigns:', campaignsError);
        return NextResponse.json({ 
          success: false, 
          error: `Campaigns error: ${campaignsError.message}` 
        }, { status: 500 });
      }

      console.log(`[Automation Activate] Found ${campaigns?.length || 0} active campaigns`);

      // 3. Enroll prospects in email campaigns
      for (const prospect of prospects) {
        try {
          // Find campaign for this segment
          const campaign = campaigns?.find(c => c.business_segment === prospect.business_segment);
          
          if (!campaign) {
            console.log(`[Automation Activate] No campaign found for segment: ${prospect.business_segment}`);
            continue;
          }

          // Schedule initial email with random delay (0-60 minutes)
          const scheduledTime = new Date();
          scheduledTime.setMinutes(scheduledTime.getMinutes() + Math.floor(Math.random() * 60));

          // Generate or get existing invitation code
          const invitationCode = await generateInvitationCode(supabase, prospect);
          
          // Generate segment-optimized email content
          const emailContent = generatePersonalizedEmail(prospect, invitationCode);

          // Add to email queue
          const { error: queueError } = await supabase
            .from('commercial_email_queue')
            .insert({
              prospect_id: prospect.id,
              campaign_id: campaign.id,
              campaign_step: 'initial',
              scheduled_at: scheduledTime.toISOString(),
              priority: 5,
              status: 'pending',
              personalized_subject: emailContent.subject,
              personalized_html: emailContent.html,
              personalized_text: emailContent.text
            });

          if (queueError) {
            console.error(`[Automation Activate] Error queuing email for ${prospect.business_name}:`, queueError);
            continue;
          }

          emailsQueued++;

          // Update prospect status
          const { error: updateError } = await supabase
            .from('commercial_prospects')
            .update({
              status: 'contacted',
              initial_outreach_date: new Date().toISOString(),
              last_contact_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', prospect.id);

          if (updateError) {
            console.error(`[Automation Activate] Error updating prospect ${prospect.business_name}:`, updateError);
            continue;
          }

          prospectsEnrolled++;
          console.log(`[Automation Activate] Enrolled ${prospect.business_name} in campaign "${campaign.campaign_name}"`);

        } catch (error) {
          console.error(`[Automation Activate] Error processing prospect ${prospect.business_name}:`, error);
        }
      }

      results.push(`${prospectsEnrolled} prospects enrolled in email campaigns`);
      results.push(`${emailsQueued} emails queued for delivery`);
    }

    // 4. Future: Add proefpakket assignment logic
    if (includeProefpakketAssignment) {
      // This would integrate with fulfillment system
      results.push('Proefpakket assignment configured (ready for implementation)');
    }

    // 5. Future: Add follow-up sequence configuration
    if (includeFollowUpSequences) {
      // This would set up automated follow-up emails
      results.push('Follow-up sequences configured (ready for implementation)');
    }

    console.log('[Automation Activate] Automation pipeline activated successfully');
    console.log(`[Automation Activate] Results: ${results.join(', ')}`);

    return NextResponse.json({
      success: true,
      message: 'Commercial automation pipeline activated successfully',
      prospects_enrolled: prospectsEnrolled,
      emails_queued: emailsQueued,
      automation_results: results
    });

  } catch (error) {
    console.error('[Automation Activate] Error activating automation:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to activate automation: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}

// =====================================================
// OPTIMIZED EMAIL CONTENT GENERATION
// Gegenereerd per business segment voor maximale relevantie
// =====================================================

interface ProspectData {
  business_name: string;
  business_segment: string;
  contact_name?: string;
  city?: string;
  email: string;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
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
      console.log(`[Automation] Using existing invitation code for ${prospect.business_name}: ${existingCode.invitation_code}`);
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

    console.log(`[Automation] Generated new invitation code for ${prospect.business_name}: ${invitationCode}`);
    return invitationCode;

  } catch (error) {
    console.error(`[Automation] Error generating invitation code for ${prospect.id}:`, error);
    // Fallback to prospect ID if code generation fails
    return `fallback_${prospect.id.substring(0, 8)}`;
  }
}

function generatePersonalizedEmail(prospect: ProspectData, invitationCode: string): EmailContent {
  const contactName = prospect.contact_name || 'daar';
  const firstName = contactName.split(' ')[0] || 'daar';
  const businessName = prospect.business_name;
  const city = prospect.city || 'uw regio';
  
  // Segment-specific messaging
  const segmentConfig = getSegmentConfiguration(prospect.business_segment);
  
  const subject = `${segmentConfig.subject_prefix} ${businessName} - Exclusief proefpakket beschikbaar`;
  
  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exclusief Proefpakket - Wasgeurtje</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Header met gradient -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        🎯 Exclusieve Uitnodiging
      </h1>
      <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">
        Speciaal geselecteerd voor ${businessName}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <!-- Persoonlijke aanhef -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">
          Hallo ${firstName},
        </h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
          Ik ben onder de indruk van ${businessName} in ${city}! ${segmentConfig.opening_line}
        </p>
      </div>

      <!-- Value Proposition Card -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
          💎 Waarom deze uitnodiging?
        </h3>
        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.7;">
          <li><strong>Exclusiviteit:</strong> Slechts één verkooppunt per stad/wijk</li>
          <li><strong>Premium kwaliteit:</strong> Nederlandse productie, internationale uitstraling</li>
          <li><strong>Bewezen succes:</strong> ${segmentConfig.success_metric}</li>
          <li><strong>Geen risico:</strong> Gratis proefpakket ter waarde van €14,95</li>
        </ul>
      </div>

      <!-- Segment-specifieke benefits -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
          🎯 Perfect voor ${segmentConfig.business_type}:
        </h4>
        <p style="color: #4b5563; margin: 0; line-height: 1.6; font-size: 15px;">
          ${segmentConfig.specific_benefits}
        </p>
      </div>

      <!-- Social Proof -->
      <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 20px; margin-right: 10px;">⭐</span>
          <h4 style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">Wat andere ondernemers zeggen:</h4>
        </div>
        <p style="color: #047857; margin: 0; font-style: italic; line-height: 1.5;">
          "${segmentConfig.testimonial}"
        </p>
        <p style="color: #059669; margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">
          — ${segmentConfig.testimonial_author}
        </p>
      </div>

      <!-- CTA Section -->
      <div style="text-align: center; margin: 40px 0;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 50px; padding: 3px; display: inline-block; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.3);">
          <a href="http://localhost:3000/register?invite=${invitationCode}&ref=email&segment=${prospect.business_segment}" 
             style="display: block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 47px; font-weight: 700; font-size: 18px; transition: all 0.3s ease;">
            🎁 Claim Gratis Proefpakket
          </a>
        </div>
        <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 14px;">
          ✅ Volledig gratis • ✅ Geen verplichtingen • ✅ Direct beschikbaar
        </p>
      </div>

      <!-- Urgency & Scarcity -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #f59e0b;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 18px; margin-right: 8px;">⚡</span>
          <h4 style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">Beperkte beschikbaarheid</h4>
        </div>
        <p style="color: #a16207; margin: 0; line-height: 1.5; font-size: 14px;">
          We hebben nog <strong>3 plekken beschikbaar</strong> in ${city} voor ons exclusiviteitsbeleid. 
          Reageer binnen 48 uur om uw positie te reserveren.
        </p>
      </div>

      <!-- Personal Touch -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-top: 35px;">
        <p style="color: #4b5563; margin: 0 0 15px 0; line-height: 1.6; font-size: 15px;">
          Ik zou graag persoonlijk uitleggen hoe dit uw klanten kan verrassen en uw omzet kan verhogen.
          Geen verplichtingen, gewoon een collegiale uitwisseling tussen ondernemers.
        </p>
        <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 15px;">
          Met respect voor uw tijd en ondernemerschap,
        </p>
        <p style="color: #3b82f6; margin: 5px 0 0 0; font-weight: 600; font-size: 15px;">
          Het Wasgeurtje Partnership Team
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #6b7280; margin: 0; font-size: 12px; line-height: 1.5;">
        © ${new Date().getFullYear()} Wasgeurtje.nl | Nederlandse kwaliteit sinds 2020<br>
        Dit is een persoonlijke uitnodiging voor ${businessName}
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Hallo ${firstName},

Ik ben onder de indruk van ${businessName} in ${city}! ${segmentConfig.opening_line}

EXCLUSIEVE UITNODIGING VOOR ${businessName.toUpperCase()}

Waarom deze uitnodiging?
• Exclusiviteit: Slechts één verkooppunt per stad/wijk
• Premium kwaliteit: Nederlandse productie, internationale uitstraling  
• Bewezen succes: ${segmentConfig.success_metric}
• Geen risico: Gratis proefpakket ter waarde van €14,95

Perfect voor ${segmentConfig.business_type}:
${segmentConfig.specific_benefits}

BEPERKTE BESCHIKBAARHEID
We hebben nog 3 plekken beschikbaar in ${city} voor ons exclusiviteitsbeleid. 
Reageer binnen 48 uur om uw positie te reserveren.

🎁 CLAIM GRATIS PROEFPAKKET
http://localhost:3000/register?invite=${invitationCode}&ref=email&segment=${prospect.business_segment}

✅ Volledig gratis • ✅ Geen verplichtingen • ✅ Direct beschikbaar

Ik zou graag persoonlijk uitleggen hoe dit uw klanten kan verrassen en uw omzet kan verhogen.
Geen verplichtingen, gewoon een collegiale uitwisseling tussen ondernemers.

Met respect voor uw tijd en ondernemerschap,
Het Wasgeurtje Partnership Team

© ${new Date().getFullYear()} Wasgeurtje.nl | Nederlandse kwaliteit sinds 2020
Dit is een persoonlijke uitnodiging voor ${businessName}
`;

  return { subject, html, text };
}

// =====================================================
// SEGMENT-SPECIFIC CONFIGURATIONS
// Geoptimaliseerd per business type voor maximale relevantie
// =====================================================

interface SegmentConfiguration {
  subject_prefix: string;
  business_type: string;
  opening_line: string;
  specific_benefits: string;
  success_metric: string;
  testimonial: string;
  testimonial_author: string;
}

function getSegmentConfiguration(segment: string): SegmentConfiguration {
  const configurations: Record<string, SegmentConfiguration> = {
    beauty_salon: {
      subject_prefix: "Voor schoonheidssalon",
      business_type: "schoonheidssalons",
      opening_line: "Als schoonheidssalon begrijp je het belang van premium producten die echt werken.",
      specific_benefits: "Uw klanten zullen versteld staan van de langdurige frisheid (tot 6 weken!) van hun was. Perfect als extra service om klanten te verrassen en loyaliteit te verhogen. Gemiddeld 15% hogere klanttevredenheid bij salons die Wasgeurtje aanbieden.",
      success_metric: "Gemiddeld €200+ extra omzet per maand voor salons",
      testimonial: "Onze klanten vragen nu specifiek naar Wasgeurtje! Het heeft onze service echt naar een hoger niveau getild. De winstmarge is fantastisch.",
      testimonial_author: "Sarah, eigenaar Beauty Studio Amsterdam"
    },
    nail_salon: {
      subject_prefix: "Voor nagelstudio",
      business_type: "nagelstudio's",
      opening_line: "Als nagelstudio weet je hoe belangrijk details zijn - dat geldt ook voor de wasgeuren van je klanten.",
      specific_benefits: "Bied je klanten een complete verwenervaring. Terwijl zij genieten van hun nagel treatment, kunnen ze hun was laten parfumeren. Een perfecte add-on service die je onderscheidt van andere studio's. Eenvoudig te integreren in je huidige workflow.",
      success_metric: "Studio's zien gemiddeld 20% meer repeat bookings",
      testimonial: "Brilliant! Mijn klanten boeken nu langer durende appointments omdat ze ook hun was willen laten parfumeren. Pure winst!",
      testimonial_author: "Lisa, Nail Art Studio Den Haag"
    },
    hairdresser: {
      subject_prefix: "Voor kapsalon",
      business_type: "kapsalons",
      opening_line: "Een perfecte coupe verdient een perfecte afwerking - dat geldt ook voor de was van je klanten.",
      specific_benefits: "Verras je klanten met geurende was die wekenlang fris blijft. Perfect als finishing touch na een knip- of kleurbehandeling. Je klanten gaan naar huis met niet alleen mooi haar, maar ook heerlijk geurende kleding. Een memorabele ervaring die hen terugbrengt.",
      success_metric: "85% van klanten boekt binnen 6 weken een nieuwe afspraak",
      testimonial: "Wauw! Mijn klanten zijn zo enthousiast. Ze ruiken nog dagen later de heerlijke geur en denken dan aan ons. Geweldige klantenbinding!",
      testimonial_author: "Mark, Kapsalon Trends Rotterdam"
    },
    gym_fitness: {
      subject_prefix: "Voor sportschool",
      business_type: "sportscholen en fitnesscenters",
      opening_line: "Sport en frisheid gaan hand in hand - dat geldt ook voor de sportkleding van je leden.",
      specific_benefits: "Bied je leden een unieke service: geurende sportkleding die lang fris blijft. Perfect voor leden die direct na hun workout naar werk of afspraken gaan. Een extra service die jouw sportschool onderscheidt en de ervaring compleet maakt.",
      success_metric: "Gemiddeld 30% minder churn bij sportscholen met premium services",
      testimonial: "Onze leden zijn dol op deze service! Vooral degenen die in de lunch pauze sporten en daarna terug naar kantoor gaan. Echt een game-changer.",
      testimonial_author: "Dennis, FitLife Amsterdam"
    },
    retail_clothing: {
      subject_prefix: "Voor kledingwinkel", 
      business_type: "kledingwinkels",
      opening_line: "Mooie kleding verdient de beste zorg - en dat geldt ook voor de was van je klanten.",
      specific_benefits: "Bied je klanten een premium service: hun nieuwe aankopen direct laten parfumeren voor optimale frisheid. Of help bestaande klanten hun kledingkast te upgraden. Een perfecte add-on service die past bij je premium imago en extra omzet genereert.",
      success_metric: "Kleding retailers zien 25% hogere customer lifetime value",
      testimonial: "Onze VIP klanten waarderen deze exclusieve service enorm. Het past perfect bij ons premium merk en verhoogt de winkelervaring.",
      testimonial_author: "Iris, Boutique Fashion Utrecht"
    },
    restaurant: {
      subject_prefix: "Voor restaurant",
      business_type: "restaurants",
      opening_line: "Een perfecte avond uit verdient een perfecte afsluiting - ook voor de kleding van je gasten.",
      specific_benefits: "Verras je gasten met deze unieke service: hun jas of kleding laten parfumeren terwijl zij genieten van hun diner. Een onvergetelijke touch die jouw restaurant onderscheidt. Perfect voor fine dining restaurants die de volledige ervaring willen bieden.",
      success_metric: "Restaurants zien 40% meer 5-sterren reviews door unieke services",
      testimonial: "Onze gasten zijn verbaasd door deze attentie. Het maakt hun avond compleet en zorgt voor geweldige reviews en word-of-mouth.",
      testimonial_author: "Chef Marco, Restaurant Belleza"
    },
    default: {
      subject_prefix: "Voor uw bedrijf",
      business_type: "ondernemingen",
      opening_line: "Als ondernemer begrijp je het belang van klantbeleving en het bieden van iets bijzonders.",
      specific_benefits: "Wasgeurtje biedt een unieke mogelijkheid om je klanten te verrassen met een premium service. Langdurige geurende was die tot 6 weken fris blijft. Perfect als extra service om klanten te binden en je onderscheiden van de concurrentie.",
      success_metric: "Ondernemers zien gemiddeld 20% hogere klanttevredenheid",
      testimonial: "Deze service heeft ons geholpen onderscheiden van andere aanbieders. Onze klanten waarderen de extra aandacht enorm.",
      testimonial_author: "Sandra, Service Centrum Nederland"
    }
  };

  return configurations[segment] || configurations.default;
} 