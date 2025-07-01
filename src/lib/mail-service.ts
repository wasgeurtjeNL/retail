import mailchimp from '@mailchimp/mailchimp_transactional';
import { getLogoUrl, getSetting } from './settings-service';
import { compileTemplate, getEmailTemplate } from './email-templates';

// E-mail service met Mandrill configuratie
let mandrillClient: any = null;
let mandrillApiKey: string | null = process.env.MANDRILL_API_KEY || null; // Gebruik omgevingsvariabele in plaats van hardcoded key

// E-mail instellingen
const DEFAULT_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'info@wasgeurtje.nl'; // Gebruik omgevingsvariabele
const DEFAULT_FROM_NAME = process.env.MAIL_FROM_NAME || 'Wasgeurtje.nl'; // Gebruik omgevingsvariabele

// Initialiseer Mandrill client direct bij het laden van de module
try {
  if (mandrillApiKey) {
    mandrillClient = mailchimp(mandrillApiKey);
    console.log('Mandrill client geïnitialiseerd met API key uit omgevingsvariabele');
  } else {
    console.warn('Geen Mandrill API-sleutel gevonden in omgevingsvariabelen. E-mail functionaliteit is beperkt.');
  }
} catch (error) {
  console.error('Fout bij initialiseren van Mandrill client:', error);
}

// Initialiseer Mandrill client (behouden voor backwards compatibility)
export const initializeMandrillClient = (apiKey: string) => {
  try {
    if (!apiKey) {
      console.error('Geen API key opgegeven bij initializeMandrillClient');
      return { success: false, error: 'Geen API key opgegeven' };
    }
    
    // Update de API key en initialiseer de client opnieuw
    mandrillApiKey = apiKey;
    mandrillClient = mailchimp(apiKey);
    console.log('Mandrill client opnieuw geïnitialiseerd met verstrekte API key');
    
    return { success: true };
  } catch (error) {
    console.error('Fout bij initialiseren van Mandrill client:', error);
    return { error: 'Kon Mandrill client niet initialiseren' };
  }
};

// Test de Mandrill verbinding
export const testMandrillConnection = async () => {
  if (!mandrillClient) {
    return { success: false, error: 'Mandrill API niet geconfigureerd' };
  }

  try {
    // Ping de Mandrill API om te testen of de verbinding werkt
    const result = await mandrillClient.users.ping();
    return { success: result === 'PONG!' };
  } catch (error) {
    console.error('Error testing Mandrill connection:', error);
    return { success: false, error: 'Verbinding met Mandrill API mislukt' };
  }
};

// Controleer of Mandrill is geconfigureerd
export const isMandrillConfigured = () => {
  return !!mandrillClient && !!mandrillApiKey;
};

// Haal de huidige Mandrill configuratie op
export const getMandrillConfig = () => {
  return {
    configured: isMandrillConfigured(),
    apiKey: mandrillApiKey ? '********' + mandrillApiKey.slice(-4) : null,
    fromEmail: DEFAULT_FROM_EMAIL,
    fromName: DEFAULT_FROM_NAME
  };
};

// Verzend een e-mail via Mandrill
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  from = DEFAULT_FROM_EMAIL,
  fromName = DEFAULT_FROM_NAME,
  replyTo,
  attachments = [],
}: {
  to: string | { email: string; name?: string }[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: { content: string; type: string; name: string }[];
}) => {
  // Debug logging
  console.log(`[EMAIL] Poging tot versturen email naar: ${typeof to === 'string' ? to : JSON.stringify(to)}`);
  console.log(`[EMAIL] Configuratie: API Key aanwezig: ${!!mandrillApiKey}, Client geïnitialiseerd: ${!!mandrillClient}`);
  
  if (!mandrillClient) {
    // Als Mandrill niet geconfigureerd is, log een bericht (in ontwikkeling)
    console.log('\n--- DEVELOPMENT EMAIL ---');
    console.log(`To: ${typeof to === 'string' ? to : to.map(r => r.email).join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${fromName} <${from}>`);
    if (replyTo) console.log(`Reply-To: ${replyTo}`);
    console.log('\nContent:');
    console.log(text || html);
    console.log('--- END EMAIL ---\n');
    
    // Return success voor ontwikkeling
    return { success: true, development: true };
  }

  try {
    // Converteer 'to' naar het juiste formaat voor Mandrill
    const recipients = Array.isArray(to)
      ? to.map(recipient => ({
          email: typeof recipient === 'string' ? recipient : recipient.email,
          name: typeof recipient === 'string' ? undefined : recipient.name,
          type: 'to',
        }))
      : [{ email: to, type: 'to' }];

    // Controleer of er geldige emailadressen zijn
    if (!recipients.length || recipients.some(r => !r.email)) {
      console.error(`[EMAIL] Ongeldige ontvangers: ${JSON.stringify(recipients)}`);
      return { 
        success: false, 
        error: new Error('Geen geldige email ontvangers opgegeven'), 
        recipients
      };
    }

    // Bereid het bericht voor
    const message = {
      html: html || '',
      text: text || '',
      subject,
      from_email: from,
      from_name: fromName,
      to: recipients,
      headers: {
        'Reply-To': replyTo || from,
      },
      attachments: attachments.length
        ? attachments.map(attachment => ({
            content: attachment.content,
            type: attachment.type,
            name: attachment.name,
          }))
        : undefined,
    };

    // Log het geformatteerde bericht (zonder gevoelige content)
    console.log(`[EMAIL] Verzenden van bericht:`, {
      subject: message.subject,
      from: `${message.from_name} <${message.from_email}>`,
      to: message.to.map((r: any) => r.email),
      hasHTML: !!message.html,
      hasText: !!message.text,
      hasAttachments: !!message.attachments
    });

    // Verzend het bericht via Mandrill
    const result = await mandrillClient.messages.send({ message });
    
    // Log het volledige resultaat
    console.log(`[EMAIL] Mandrill resultaat:`, result);
    
    // Controleer of het resultaat bestaat en een array is
    if (!result || !Array.isArray(result)) {
      console.error(`[EMAIL] Onverwacht resultaat format:`, result);
      return { 
        success: false, 
        error: new Error(`Onverwacht resultaat formaat van Mandrill API: ${JSON.stringify(result)}`) 
      };
    }
    
    // Leeg array betekent dat er geen ontvanger was of de email niet kon worden verzonden
    if (result.length === 0) {
      console.error(`[EMAIL] Leeg resultaat array van Mandrill API`);
      return { 
        success: false, 
        error: new Error('Geen resultaat van Mandrill API - mogelijk probleem met API-sleutel of ontvanger') 
      };
    }
    
    // Controleer het resultaat op success status
    const successStatuses = ['sent', 'queued', 'scheduled'];
    const isSuccess = result.some(
      (res: any) => res && successStatuses.includes(res.status)
    );
    
    if (!isSuccess) {
      // Als er wel resultaten zijn maar geen succesvolle, log de details
      const errorDetails = result.map((res: any) => ({
        email: res.email,
        status: res.status,
        reason: res.reject_reason
      }));
      
      console.error(`[EMAIL] Verzending mislukt:`, errorDetails);
      return { 
        success: false, 
        error: new Error(`Email kon niet worden verzonden: ${JSON.stringify(errorDetails)}`),
        details: errorDetails
      };
    }
    
    // Als we hier zijn, is ten minste één email succesvol verzonden
    console.log(`[EMAIL] Email succesvol verzonden naar ${typeof to === 'string' ? to : 'meerdere ontvangers'}`);
    return { success: true, result };
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    return { 
      success: false, 
      error,
      errorMessage: error instanceof Error ? error.message : 'Onbekende fout bij verzenden email' 
    };
  }
};

// Verzend een e-mail aan de beheerder
export const sendAdminNotificationEmail = async ({
  subject,
  text,
  html,
  replyTo,
}: {
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}) => {
  // In een echte applicatie zou je de admin e-mail uit de database halen
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@wasgeurtje.nl';
  
  return sendEmail({
    to: adminEmail,
    subject: `[Admin] ${subject}`,
    text,
    html,
    replyTo,
  });
};

// Get branding context for email templates
export const getEmailBrandingContext = async (): Promise<Record<string, any>> => {
  try {
    const [logoUrl, businessName] = await Promise.all([
      getLogoUrl(),
      getSetting('business_name')
    ]);
    
    return {
      logoUrl: logoUrl || '/assets/images/branding/default-logo.png',
      businessName: businessName || 'Wasgeurtje.nl',
      currentYear: new Date().getFullYear()
    };
  } catch (error) {
    console.error('Error getting email branding context:', error);
    return {
      logoUrl: '/assets/images/branding/default-logo.png',
      businessName: 'Wasgeurtje.nl',
      currentYear: new Date().getFullYear()
    };
  }
};

// Verzend een template e-mail (voor algemeen gebruik)
export const sendTemplateEmail = async ({
  to,
  template,
  subject,
  context,
  replyTo,
}: {
  to: string | { email: string; name?: string }[];
  template: string;
  subject: string;
  context: Record<string, any>;
  replyTo?: string;
}) => {
  try {
    // Get the email template
    const emailTemplate = await getEmailTemplate(template);
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }
    
    // Get branding context and merge with provided context
    const brandingContext = await getEmailBrandingContext();
    const fullContext = { ...brandingContext, ...context };
    
    // Compile the template with the merged context
    const compiledSubject = compileTemplate(subject || emailTemplate.subject, fullContext);
    const compiledHtml = compileTemplate(emailTemplate.html, fullContext);
    const compiledText = compileTemplate(emailTemplate.text, fullContext);
    
    // Send the email
    return sendEmail({
      to,
      subject: compiledSubject,
      html: compiledHtml,
      text: compiledText,
      replyTo,
    });
  } catch (error) {
    console.error('Error sending template email:', error);
    
    // Fallback to simple email if template fails
    let html = `<html><body><h1>${subject}</h1>`;
    let text = `${subject}\n\n`;
    
    // Add context variables
    Object.entries(context).forEach(([key, value]) => {
      html += `<p><strong>${key}:</strong> ${value}</p>`;
      text += `${key}: ${value}\n`;
    });
    
    html += '</body></html>';
    
    return sendEmail({
      to,
      subject,
      html,
      text,
      replyTo,
    });
  }
};

// Stuur een testmail via Mandrill
export const sendTestEmail = async (to: string) => {
  return sendEmail({
    to,
    subject: 'Testmail Wasgeurtje',
    text: 'Dit is een testmail vanaf het Wasgeurtje platform. Je Mandrill configuratie werkt!',
    html: '<p>Dit is een <b>testmail</b> vanaf het Wasgeurtje platform.<br>Je Mandrill configuratie werkt!</p>',
  });
}; 