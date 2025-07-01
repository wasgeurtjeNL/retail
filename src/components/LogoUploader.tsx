import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

type LogoUploaderProps = {
  currentLogo?: string;
  onLogoChange?: (logoUrl: string) => void;
};

export default function LogoUploader({ currentLogo, onLogoChange }: LogoUploaderProps) {
  const [logo, setLogo] = useState<string | null>(currentLogo || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentLogo) {
      setLogo(currentLogo);
    }
  }, [currentLogo]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0]; // Neem alleen het eerste bestand

    // Controleer of het bestand een afbeelding is
    if (!file.type.startsWith('image/')) {
      setError('Het bestand moet een afbeelding zijn (PNG, JPG, JPEG, GIF).');
      return;
    }

    // Controleer bestandsgrootte (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('De afbeelding mag niet groter zijn dan 2MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo'); // Specificeert dat dit een logo upload is

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Er is een fout opgetreden bij het uploaden van het logo.');
      }

      setLogo(data.url);
      if (onLogoChange) {
        onLogoChange(data.url);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden bij het uploaden.');
    } finally {
      setUploading(false);
    }
  }, [onLogoChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg']
    },
    maxFiles: 1,
  });

  const handleRemoveLogo = () => {
    setLogo(null);
    if (onLogoChange) {
      onLogoChange('');
    }
  };

  return (
    <div className="space-y-2">
      {!logo ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed p-8 rounded-lg text-center cursor-pointer transition flex flex-col items-center justify-center h-64 ${
            isDragActive ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-500 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center justify-center">
              <svg className="animate-spin h-12 w-12 text-pink-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Logo uploaden...</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center justify-center">
              <svg className="h-16 w-16 text-pink-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-pink-600">Laat het logo hier vallen</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-32 h-32 mb-4 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                <svg className="h-16 w-16 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="sr-only">Logo placeholder</span>
              </div>
              <p className="text-base font-medium text-gray-700">Sleep uw logo hiernaartoe of klik om te bladeren</p>
              <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF of SVG (max. 2MB)</p>
              <p className="text-sm text-gray-500 mt-1">Aanbevolen afmeting: 240×80 pixels</p>
              <p className="text-sm text-gray-500 mt-1">Zal worden opgeslagen als "company-logo.png"</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="h-40 w-40 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden p-2 border border-gray-200">
                <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="ml-6">
                <p className="text-lg font-medium text-gray-900">Huidige logo</p>
                <p className="text-sm text-gray-500 mt-1">Dit logo wordt gebruikt in emails en op het platform</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => getRootProps().onClick?.({} as unknown as React.MouseEvent<HTMLElement>)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Wijzig
              </button>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Verwijder
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 mt-1">
          {error}
        </div>
      )}
    </div>
  );
} 