import { getEmailTemplates, getEmailTemplate } from './email-templates';
import { initializeMandrillClient, testMandrillConnection, isMandrillConfigured, getMandrillConfig } from './mail-service';

// Define a proper type for the email status
interface EmailServiceStatus {
  isConfigured: boolean;
  apiKeyPresent: boolean;
  apiKeyValue: string | null;
  fromEmail: string;
  fromName: string;
  hardcoded?: boolean;
  templatesLoaded?: boolean;
  templateCount?: number;
  testTemplateLoaded?: boolean;
  templateError?: string;
}

// Function to check email service status
export const checkEmailServiceStatus = async (): Promise<EmailServiceStatus> => {
  // Check if Mandrill is configured
  const isConfigured = isMandrillConfigured();
  
  // Get the config information
  const config = getMandrillConfig();
  
  // Status object
  const status: EmailServiceStatus = {
    isConfigured,
    apiKeyPresent: isConfigured,
    apiKeyValue: config.apiKey,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    hardcoded: true
  };
  
  // Check email templates
  try {
    // Attempt to get all email templates
    const templates = await getEmailTemplates();
    status.templatesLoaded = !!templates;
    status.templateCount = Object.keys(templates).length;
    
    // Try to get a specific template as test
    const testTemplate = await getEmailTemplate('retailer-registration-confirmation');
    status.testTemplateLoaded = !!testTemplate;
  } catch (error: any) {
    status.templateError = error?.message || 'Unknown error loading templates';
  }
  
  return status;
};

// Function to get email environment info (simplified since we're using hardcoded values)
export const getEmailEnvironmentInfo = () => {
  return {
    mandrill: {
      apiKey: process.env.MANDRILL_API_KEY ? 'Set (hardcoded)' : 'Not set',
      fromEmail: 'info@wasgeurtje.nl (hardcoded)',
      fromName: 'Wasgeurtje.nl (hardcoded)',
    },
    mode: process.env.NODE_ENV || 'development',
    note: 'Email configuratie is hardcoded in de applicatie'
  };
}; 