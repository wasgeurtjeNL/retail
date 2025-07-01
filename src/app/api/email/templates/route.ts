import { NextRequest, NextResponse } from 'next/server';
import { saveEmailTemplate, getEmailTemplate, getEmailTemplates, resetEmailTemplate } from '@/lib/email-templates';
import { sendEmail } from '@/lib/mail-service';

// Deze route haalt alle email templates op of een specifieke template
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateKey = searchParams.get('key');
    
    if (templateKey) {
      // Haal één specifieke template op
      const template = await getEmailTemplate(templateKey);
      
      if (!template) {
        return NextResponse.json({ error: 'Template niet gevonden' }, { status: 404 });
      }
      
      return NextResponse.json({ template });
    } else {
      // Haal alle templates op
      const templates = await getEmailTemplates();
      return NextResponse.json({ templates });
    }
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het ophalen van de email templates' 
    }, { status: 500 });
  }
}

// Deze route slaat een email template op
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateKey, template } = body;
    
    if (!templateKey || !template) {
      return NextResponse.json({ error: 'Template key en template data zijn verplicht' }, { status: 400 });
    }
    
    const requiredFields = ['name', 'description', 'subject', 'html', 'text'];
    for (const field of requiredFields) {
      if (!template[field]) {
        return NextResponse.json({ 
          error: `Veld '${field}' is verplicht voor de template` 
        }, { status: 400 });
      }
    }
    
    const result = await saveEmailTemplate(templateKey, template);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Er is een fout opgetreden bij het opslaan van de template' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Email template succesvol opgeslagen' 
    });
  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het opslaan van de email template' 
    }, { status: 500 });
  }
}

// Deze route reset een template naar de standaardwaarde
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateKey } = body;
    
    if (!templateKey) {
      return NextResponse.json({ error: 'Template key is verplicht' }, { status: 400 });
    }
    
    const result = await resetEmailTemplate(templateKey);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Er is een fout opgetreden bij het resetten van de template' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Email template succesvol gereset' 
    });
  } catch (error) {
    console.error('Error resetting email template:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het resetten van de email template' 
    }, { status: 500 });
  }
} 