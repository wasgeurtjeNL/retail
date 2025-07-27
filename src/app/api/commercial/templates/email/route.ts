import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * Helper function to get default email template for segment
 */
function getDefaultEmailTemplateForSegment(segment: string) {
  const segmentConfigs: Record<string, any> = {
    cleaning_service: {
      subject: 'Exclusieve Partnership voor Professionele Schoonmaakdiensten - Gratis Proefpakket',
      body: `
        <h2>Beste professionele schoonmaakservice,</h2>
        
        <p>Wij bieden een exclusieve kans voor schoonmaakdiensten om hun service kwaliteit naar het next level te tillen.</p>
        
        <h3>🧽 Waarom kiezen voor onze partnership?</h3>
        <ul>
          <li>Professionele werkervaring voor uw team</li>
          <li>30% betere klantretentie gerapporteerd</li>
          <li>Onderscheid van concurrenten</li>
          <li>Volledige ondersteuning en training</li>
        </ul>
        
        <p><strong>Claim nu uw gratis proefpakket en ervaar het verschil!</strong></p>
        
        <a href="[LANDING_PAGE_URL]" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Claim Gratis Schoonmaak Proefpakket
        </a>
        
        <p>Met vriendelijke groet,<br>Het Wasgeurtje Team</p>
      `,
      style: 'professional'
    },
    beauty_salon: {
      subject: 'Exclusieve Salonpartnership - Transform uw klantervaring',
      body: `
        <h2>Beste salon eigenaar,</h2>
        
        <p>Maak indruk op uw klanten met premium wasproducten die echt het verschil maken.</p>
        
        <h3>💅 Voordelen voor uw salon:</h3>
        <ul>
          <li>40% meer klanttevredenheid</li>
          <li>Premium salon ervaring</li>
          <li>Onderscheidend vermogen</li>
          <li>Professionele branding</li>
        </ul>
        
        <p><strong>Verhoog uw service kwaliteit instant!</strong></p>
        
        <a href="[LANDING_PAGE_URL]" style="background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Claim Gratis Salon Proefpakket
        </a>
        
        <p>Met vriendelijke groet,<br>Het Wasgeurtje Team</p>
      `,
      style: 'elegant'
    },
    hair_salon: {
      subject: 'Professionele Kapper Partnership - Klantcomfort verhogen',
      body: `
        <h2>Beste kapper,</h2>
        
        <p>Geef uw klanten een salon ervaring die ze nergens anders krijgen.</p>
        
        <h3>✂️ Perfect voor kapperszaken:</h3>
        <ul>
          <li>Professionele haarverzorging</li>
          <li>35% meer repeat klanten</li>
          <li>Klantcomfort verhogen</li>
          <li>Onderscheidend vermogen</li>
        </ul>
        
        <a href="[LANDING_PAGE_URL]" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Claim Gratis Kapper Proefpakket
        </a>
        
        <p>Met vriendelijke groet,<br>Het Wasgeurtje Team</p>
      `,
      style: 'modern'
    },
    restaurant: {
      subject: 'Exclusief Restaurant Partnership - Verhoog gastevaluaties',
      body: `
        <h2>Beste restaurant eigenaar,</h2>
        
        <p>Indruk maken op uw gasten begint bij de details.</p>
        
        <h3>🍽️ Horeca voordelen:</h3>
        <ul>
          <li>Verhoogde gastevaluaties</li>
          <li>Professionele hygiëne</li>
          <li>Betere online reviews</li>
          <li>Kosteneffectieve upgrade</li>
        </ul>
        
        <a href="[LANDING_PAGE_URL]" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Claim Gratis Horeca Proefpakket
        </a>
        
        <p>Met vriendelijke groet,<br>Het Wasgeurtje Team</p>
      `,
      style: 'warm'
    },
    hotel_bnb: {
      subject: 'Premium Hospitality Partnership - 5-Star gast ervaring',
      body: `
        <h2>Beste accommodatie eigenaar,</h2>
        
        <p>Transform uw accommodatie naar een premium ervaring.</p>
        
        <h3>🏨 Hospitality excellentie:</h3>
        <ul>
          <li>Premium gast ervaring</li>
          <li>Verhoogde booking ratings</li>
          <li>Gast loyaliteit verhogen</li>
          <li>Onderscheid van concurrentie</li>
        </ul>
        
        <a href="[LANDING_PAGE_URL]" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Claim Gratis Hotel Proefpakket
        </a>
        
        <p>Met vriendelijke groet,<br>Het Wasgeurtje Team</p>
      `,
      style: 'luxury'
    },
    wellness_spa: {
      subject: 'Exclusieve Spa Partnership - Ultieme wellness ervaring',
      body: `
        <h2>Beste wellness professional,</h2>
        
        <p>Creëer de perfecte wellness ervaring met premium producten.</p>
        
        <h3>🧘 Wellness voordelen:</h3>
        <ul>
          <li>Ultieme ontspanning</li>
          <li>Premium spa kwaliteit</li>
          <li>Verhoogde klant satisfactie</li>
          <li>Onderscheidend wellness concept</li>
        </ul>
        
        <a href="[LANDING_PAGE_URL]" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Claim Gratis Spa Proefpakket
        </a>
        
        <p>Met vriendelijke groet,<br>Het Wasgeurtje Team</p>
      `,
      style: 'zen'
    }
  };

  const config = segmentConfigs[segment] || segmentConfigs.cleaning_service;
  
  return {
    id: `default-${segment}`,
    segment,
    subject: config.subject,
    body: config.body,
    style: config.style,
    variables: ['BUSINESS_NAME', 'CONTACT_NAME', 'LANDING_PAGE_URL'],
    lastModified: new Date().toISOString()
  };
}

/**
 * GET /api/commercial/templates/email?segment=cleaning_service
 * Returns email template for specific segment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segment = searchParams.get('segment');
    
    if (!segment) {
      return NextResponse.json({ error: 'Segment parameter required' }, { status: 400 });
    }

    console.log(`[EmailTemplates] Getting template for segment: ${segment}`);
    
    const supabase = getServiceRoleClient();
    
    try {
      // Try to get segment-specific email template from database
      const { data: template, error } = await supabase
        .from('commercial_email_templates')
        .select('*')
        .eq('business_segment', segment)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.error('[EmailTemplates] Database error:', error);
        
        // Return fallback on database error
        const fallbackTemplate = getDefaultEmailTemplateForSegment(segment);
        return NextResponse.json(fallbackTemplate);
      }

      // If no template exists, return default template
      if (!template) {
        const defaultTemplate = getDefaultEmailTemplateForSegment(segment);
        return NextResponse.json(defaultTemplate);
      }

      // Return existing template
      const templateData = {
        id: template.id,
        segment: template.business_segment,
        subject: template.subject,
        body: template.body,
        style: template.style || 'default',
        variables: template.variables || [],
        lastModified: template.updated_at
      };

      return NextResponse.json(templateData);
      
    } catch (dbError) {
      console.error('[EmailTemplates] Database connection error:', dbError);
      
      // Return fallback template on database connection error
      const fallbackTemplate = getDefaultEmailTemplateForSegment(segment);
      return NextResponse.json(fallbackTemplate);
    }

  } catch (error) {
    console.error('[EmailTemplates] GET error:', error);
    
    // Return fallback template on any error
    const segment = new URL(request.url).searchParams.get('segment') || 'cleaning_service';
    const fallbackTemplate = getDefaultEmailTemplateForSegment(segment);
    return NextResponse.json(fallbackTemplate);
  }
}

/**
 * POST /api/commercial/templates/email
 * Save email template for segment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segment, subject, html, text, variables } = body;
    
    if (!segment || !subject || !html) {
      return NextResponse.json(
        { error: 'Segment, subject and html are required' },
        { status: 400 }
      );
    }

    console.log(`[EmailTemplates] Saving template for segment: ${segment}`);
    
    const supabase = getServiceRoleClient();
    
    // Check if template already exists
    const { data: existing } = await supabase
      .from('commercial_email_templates')
      .select('id')
      .eq('business_segment', segment)
      .eq('template_type', 'invitation')
      .single();

    const templateData = {
      business_segment: segment,
      template_type: 'invitation',
      subject_template: subject,
      email_body_html: html,
      email_body_text: text || '',
      variables: variables || ['business_name', 'contact_name', 'first_name', 'city'],
      is_active: true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing template
      result = await supabase
        .from('commercial_email_templates')
        .update(templateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Create new template
      result = await supabase
        .from('commercial_email_templates')
        .insert({
          ...templateData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[EmailTemplates] Database error:', result.error);
      return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: {
        id: result.data.id,
        segment: result.data.business_segment,
        subject: result.data.subject_template,
        html: result.data.email_body_html,
        text: result.data.email_body_text,
        variables: result.data.variables,
        lastModified: result.data.updated_at
      }
    });

  } catch (error) {
    console.error('[EmailTemplates] Error saving template:', error);
    return NextResponse.json(
      { error: 'Failed to save email template' },
      { status: 500 }
    );
  }
}

// Helper functions for default templates
function getDefaultSubjectForSegment(segment: string): string {
  const subjects: Record<string, string> = {
    cleaning_service: 'Exclusieve kans voor {{business_name}} - Verhoog uw service kwaliteit 🧽',
    beauty_salon: 'Exclusieve partnerkans voor {{business_name}} - Premium klantervaring 💅',
    hair_salon: 'Professionele upgrade voor {{business_name}} - Gratis proefpakket ✂️',
    restaurant: 'Verhoog uw gastevaluaties {{business_name}} - Gratis proefpakket 🍽️',
    hotel_bnb: 'Transform {{business_name}}s geurervaringen - Gratis proefpakket ✨',
    wellness_spa: 'Premium wellness upgrade voor {{business_name}} - Gratis proefpakket 🧘'
  };
  
  return subjects[segment] || subjects.cleaning_service;
}

function getDefaultEmailHtmlForSegment(segment: string): string {
  const segmentConfigs: Record<string, any> = {
    cleaning_service: {
      opening: "een exclusief aanbod voor professionele schoonmaakdiensten zoals",
      benefits: [
        "Professionelle werkervaring voor uw team",
        "Betere klantretentie door verhoogde kwaliteit", 
        "Onderscheid van concurrenten",
        "Kosteneffectieve oplossing"
      ],
      testimonial: "Schoonmaakbedrijven rapporteren 30% betere klantretentie",
      color: "#059669" // green
    },
    beauty_salon: {
      opening: "een exclusief gratis proefpakket voor",
      benefits: [
        "Premium wasproducten speciaal voor salon gebruik",
        "Verhoog uw service kwaliteit", 
        "Tevreden klanten = meer omzet",
        "Professionele uitstraling"
      ],
      testimonial: "Salons rapporteren 40% meer klanttevredenheid",
      color: "#ec4899" // pink
    },
    hair_salon: {
      opening: "een exclusieve upgrade voor kapperszaken zoals",
      benefits: [
        "Professionele haarverzorging oplossingen",
        "Klantcomfort verhogen",
        "Onderscheidend vermogen in de markt",
        "Verhoogde klantloyaliteit"
      ],
      testimonial: "Kappers zien 35% meer repeat klanten",
      color: "#8b5cf6" // purple
    },
    restaurant: {
      opening: "een exclusief aanbod voor restaurants zoals",
      benefits: [
        "Verhoogde gastevaluaties",
        "Hygiëne standaarden verbeteren",
        "Professionele uitstraling",
        "Positieve reviews stimuleren"
      ],
      testimonial: "Restaurants zien gemiddeld 4.5+ sterren op reviews",
      color: "#f59e0b" // amber
    }
  };

  const config = segmentConfigs[segment] || segmentConfigs.cleaning_service;

  return `
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
    <div style="background: linear-gradient(135deg, ${config.color} 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        🎯 Exclusieve Uitnodiging
      </h1>
      <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">
        Speciaal geselecteerd voor {{business_name}}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <!-- Persoonlijke aanhef -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px; font-weight: 600;">
          Hallo {{first_name}},
        </h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0;">
          Ik ben onder de indruk van {{business_name}} in {{city}}! ${config.opening} uw bedrijf.
        </p>
      </div>

      <!-- Key Benefits -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%); padding: 25px; margin: 25px 0; border-radius: 12px; border-left: 4px solid ${config.color};">
        <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
          🌟 Waarom dit perfect is voor {{business_name}}:
        </h3>
        <ul style="color: #4b5563; margin: 0; padding-left: 0; list-style: none;">
          ${config.benefits.map((benefit: string) => `
          <li style="margin-bottom: 12px; padding-left: 25px; position: relative;">
            <span style="position: absolute; left: 0; color: ${config.color}; font-weight: bold;">✓</span>
            ${benefit}
          </li>
          `).join('')}
        </ul>
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="{{invitation_url}}" style="display: inline-block; background: linear-gradient(135deg, ${config.color} 0%, #1e40af 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.3s ease;">
          🎁 Claim Gratis Proefpakket →
        </a>
        <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
          Geen verplichtingen • Gratis verzending • Direct beschikbaar
        </p>
      </div>

      <!-- Social Proof -->
      <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 30px 0;">
        <p style="color: #92400e; font-size: 14px; font-style: italic; margin: 0; text-align: center;">
          💬 "${config.testimonial}"
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
          Met vriendelijke groet,<br>
          <strong>Het Wasgeurtje Partnership Team</strong><br>
          📧 partners@wasgeurtje.nl | 📞 085-1234567
        </p>
      </div>
    </div>

    <!-- Tracking pixel -->
    <img src="{{tracking_pixel}}" width="1" height="1" style="display: none;" alt="">
  </div>
</body>
</html>
  `.trim();
}

function getDefaultEmailTextForSegment(segment: string): string {
  const segmentNames: Record<string, string> = {
    cleaning_service: 'schoonmaakdiensten',
    beauty_salon: 'schoonheidssalons',
    hair_salon: 'kapperszaken',
    restaurant: 'restaurants',
    hotel_bnb: 'hotels',
    wellness_spa: 'wellness centra'
  };

  const segmentName = segmentNames[segment] || segmentNames.cleaning_service;

  return `
Exclusieve Uitnodiging voor {{business_name}}

Hallo {{first_name}},

Ik ben onder de indruk van {{business_name}} in {{city}}! We hebben een exclusief aanbod voor ${segmentName} zoals uw bedrijf.

Waarom dit perfect is voor {{business_name}}:
✓ Professionelle service kwaliteit verhogen
✓ Betere klantretentie door kwaliteit
✓ Onderscheid van concurrenten
✓ Kosteneffectieve oplossing

Claim uw gratis proefpakket: {{invitation_url}}

Geen verplichtingen • Gratis verzending • Direct beschikbaar

Met vriendelijke groet,
Het Wasgeurtje Partnership Team
partners@wasgeurtje.nl | 085-1234567
  `.trim();
} 