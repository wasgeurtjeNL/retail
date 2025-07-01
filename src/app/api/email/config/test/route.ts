import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/mail-service';

// API route: POST /api/email/config/test
// Stuurt een testmail naar het opgegeven e-mailadres
export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();
    if (!to) {
      return NextResponse.json({ success: false, error: 'Ontbrekend e-mailadres' }, { status: 400 });
    }
    const result = await sendTestEmail(to);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Fout bij versturen testmail' }, { status: 500 });
  }
} 