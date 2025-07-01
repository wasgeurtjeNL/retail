import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { getLogoUrl } from '@/lib/settings-service';

export async function POST(req: NextRequest) {
  // Constante voor fallback afbeelding
  const FALLBACK_IMAGE = '/assets/images/product-placeholder.png';
  
  try {
    console.log('Starting file upload process...');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string || 'product'; // Default is product
    
    console.log('Upload request received:', { 
      filePresent: !!file,
      fileType: file?.type,
      fileSize: file?.size,
      uploadType 
    });
    
    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json({ 
        error: 'Geen bestand geüpload',
        url: FALLBACK_IMAGE,
        imageUrl: FALLBACK_IMAGE
      }, { status: 400 });
    }

    // Controleer bestandstype
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ 
        error: 'Ongeldig bestandstype. Toegestane types: JPG, PNG, WEBP, GIF, SVG',
        url: FALLBACK_IMAGE,
        imageUrl: FALLBACK_IMAGE
      }, { status: 400 });
    }

    // Maximale bestandsgrootte (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      return NextResponse.json({ 
        error: 'Bestand is te groot. Maximale grootte is 5MB',
        url: FALLBACK_IMAGE,
        imageUrl: FALLBACK_IMAGE
      }, { status: 400 });
    }

    // Bepaal het uploadpad op basis van het type
    let uploadDir;
    let imageSubPath;
    let fileName;
    
    if (uploadType === 'logo') {
      uploadDir = path.join(process.cwd(), 'public', 'assets', 'images', 'branding');
      imageSubPath = 'branding';
      fileName = 'company-logo.png'; // Consistent filename for logos
      
      // Delete existing logo if it exists
      try {
        // Get current logo URL
        const currentLogoUrl = await getLogoUrl();
        if (currentLogoUrl) {
          // Extract the filename from the URL
          const currentFileName = path.basename(currentLogoUrl);
          const currentFilePath = path.join(uploadDir, currentFileName);
          
          // Check if file exists and delete it
          if (fs.existsSync(currentFilePath)) {
            fs.unlinkSync(currentFilePath);
            console.log(`Deleted old logo file: ${currentFilePath}`);
          }
        }
      } catch (error) {
        console.error('Error deleting old logo file:', error);
        // Continue despite error in deleting old file
      }
    } else {
      uploadDir = path.join(process.cwd(), 'public', 'assets', 'images', 'products');
      imageSubPath = 'products';
      // Genereer unieke bestandsnaam voor producten
      const fileExtension = file.name.split('.').pop() || '';
      fileName = `${uuidv4()}.${fileExtension}`;
    }
    
    console.log('File will be saved to:', { 
      uploadDir, 
      fileName,
      fullPath: path.join(uploadDir, fileName),
      urlPath: `/assets/images/${imageSubPath}/${fileName}`
    });
    
    // Zorg ervoor dat de map bestaat
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    
    // Lees de inhoud van het bestand
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`Writing ${buffer.length} bytes to ${filePath}`);
    
    // Schrijf het bestand
    fs.writeFileSync(filePath, buffer);
    console.log('File successfully written to disk');
    
    // Genereer de URL voor de afbeelding (relatief t.o.v. de public map)
    const url = `/assets/images/${imageSubPath}/${fileName}`;
    
    // Als het een logo is, sla de instelling op in de database
    if (uploadType === 'logo') {
      try {
        // Sla het logo URL op in de settings tabel
        const { error } = await supabase
          .from('settings')
          .upsert({ 
            key: 'logo_url', 
            value: url,
            updated_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error saving logo URL to database:', error);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // We gaan door ondanks database fouten, omdat de upload wel is gelukt
      }
    }
    
    console.log('Upload complete, returning success response with URL:', url);
    
    // Voeg zowel imageUrl als url toe aan de response voor compatibiliteit
    return NextResponse.json({ 
      success: true, 
      url,
      imageUrl: url, // Dubbelzinnige respons voor compatibiliteit
      type: uploadType
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Er is een fout opgetreden bij het uploaden van het bestand',
      url: FALLBACK_IMAGE,
      imageUrl: FALLBACK_IMAGE
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Gebruik POST om bestanden te uploaden' });
} 