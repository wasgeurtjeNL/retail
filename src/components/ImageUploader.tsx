'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  existingImageUrl?: string;
  className?: string;
}

export default function ImageUploader({ 
  onImageUploaded, 
  existingImageUrl, 
  className = '' 
}: ImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(existingImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    
    console.log('Starting upload process for file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Reset states
    setError(null);
    setIsUploading(true);
    
    try {
      // Controleer bestandsgrootte (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('Bestand is te groot. Maximale grootte is 5MB');
      }
      
      // Controleer bestandstype
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Ongeldig bestandstype. Toegestane types: JPG, PNG, WEBP, GIF');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Sending upload request to /api/upload');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      
      const result = await response.json();
      console.log('Upload response data:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Fout bij uploaden');
      }
      
      // Handle verschillende response formaten
      // De API kan imageUrl OF url teruggeven
      const imageUrl = result.imageUrl || result.url;
      
      if (!imageUrl) {
        console.error('Upload response does not contain a valid URL:', result);
        throw new Error('Upload geslaagd maar geen URL ontvangen van de server');
      }
      
      console.log('Successfully uploaded image, URL:', imageUrl);
      
      setImageUrl(imageUrl);
      onImageUploaded(imageUrl);
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0] || null;
    handleFileChange(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div 
        className={`border-2 border-dashed rounded-md p-4 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${imageUrl ? 'border-green-500' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="py-6">
            <div className="w-12 h-12 mx-auto border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-gray-600">Afbeelding uploaden...</p>
          </div>
        ) : imageUrl ? (
          <div className="relative">
            <div className="relative h-48 w-full overflow-hidden rounded-md">
              <Image 
                src={imageUrl} 
                alt="Geüploade afbeelding" 
                fill 
                className="object-contain" 
              />
            </div>
            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={handleButtonClick}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Vervangen
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Verwijderen
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center">
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Sleep afbeelding hierheen of klik om te uploaden
            </p>
            <button
              type="button"
              onClick={handleButtonClick}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Kies bestand
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Toegestane formaten: JPG, PNG, WEBP, GIF (max. 5MB)
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />
    </div>
  );
} 