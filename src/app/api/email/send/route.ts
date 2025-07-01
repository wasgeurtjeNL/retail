import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail-service';

// API route voor het versturen van emails
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, from, fromName, replyTo, attachments } = body;
    
    // Valideer verplichte velden
    if (!to) {
      return NextResponse.json({ 
        success: false,
        error: 'Ontvanger (to) is verplicht' 
      }, { status: 400 });
    }
    
    if (!subject) {
      return NextResponse.json({ 
        success: false,
        error: 'Onderwerp (subject) is verplicht' 
      }, { status: 400 });
    }
    
    if (!text && !html) {
      return NextResponse.json({ 
        success: false,
        error: 'Tekstinhoud (text) of HTML-inhoud (html) is verplicht' 
      }, { status: 400 });
    }
    
    // Verzend de email
    const result = await sendEmail({
      to,
      subject,
      text,
      html,
      from,
      fromName,
      replyTo,
      attachments
    });
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false,
        error: 'Email kon niet worden verzonden'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Email is succesvol verzonden',
      development: result.development || false
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Er is een fout opgetreden bij het verzenden van de email'
    }, { status: 500 });
  }
} 