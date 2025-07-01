'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface MarketingItem {
  id: string;
  name: string;
  description: string;
  type: 'poster' | 'flyer' | 'banner' | 'logo';
  format: string;
  imageUrl: string;
  downloadUrl: string;
}

// Mock marketing materialen
const marketingMaterials: MarketingItem[] = [
  {
    id: 'p1',
    name: 'Wasgeurtje A4 Poster',
    description: 'A4 Poster met productuitleg',
    type: 'poster',
    format: 'PDF (A4)',
    imageUrl: '/images/marketing/poster-placeholder.jpg',
    downloadUrl: '#'
  },
  {
    id: 'p2',
    name: 'Wasgeurtje A3 Poster',
    description: 'A3 Display poster voor in de winkel',
    type: 'poster',
    format: 'PDF (A3)',
    imageUrl: '/images/marketing/poster-placeholder.jpg',
    downloadUrl: '#'
  },
  {
    id: 'f1',
    name: 'Wasgeurtje Flyer',
    description: 'A5 Flyer met productinfo om uit te delen',
    type: 'flyer',
    format: 'PDF (A5)',
    imageUrl: '/images/marketing/flyer-placeholder.jpg',
    downloadUrl: '#'
  },
  {
    id: 'f2',
    name: 'Wasgeurtje Folder',
    description: 'Gevouwen folder met productuitleg en prijslijst',
    type: 'flyer',
    format: 'PDF (A4 gevouwen)',
    imageUrl: '/images/marketing/flyer-placeholder.jpg',
    downloadUrl: '#'
  },
  {
    id: 'b1',
    name: 'Banner voor website',
    description: 'Digitale banner voor op uw website',
    type: 'banner',
    format: 'JPG (1200x300px)',
    imageUrl: '/images/marketing/banner-placeholder.jpg',
    downloadUrl: '#'
  },
  {
    id: 'b2',
    name: 'Social media banner',
    description: 'Banner voor gebruik op sociale media',
    type: 'banner',
    format: 'JPG (1200x628px)',
    imageUrl: '/images/marketing/banner-placeholder.jpg',
    downloadUrl: '#'
  },
  {
    id: 'l1',
    name: 'Wasgeurtje Logo (kleur)',
    description: 'Officieel logo in kleur',
    type: 'logo',
    format: 'PNG (transparant)',
    imageUrl: '/images/marketing/logo-placeholder.png',
    downloadUrl: '#'
  },
  {
    id: 'l2',
    name: 'Wasgeurtje Logo (zwart)',
    description: 'Officieel logo in zwart',
    type: 'logo',
    format: 'PNG (transparant)',
    imageUrl: '/images/marketing/logo-placeholder.png',
    downloadUrl: '#'
  }
];

export default function MarketingPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type');
  const [activeType, setActiveType] = useState<string | null>(typeParam || null);
  
  // Filter materialen op type
  const filteredMaterials = activeType 
    ? marketingMaterials.filter(item => {
        if (activeType === 'posters') return item.type === 'poster';
        if (activeType === 'flyers') return item.type === 'flyer';
        if (activeType === 'digital') return item.type === 'banner';
        if (activeType === 'logos') return item.type === 'logo';
        return true;
      })
    : marketingMaterials;
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-b border-gray-200 pb-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketingmateriaal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Download marketingmateriaal voor uw winkel
        </p>
      </div>
      
      {/* Type filter */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <p className="text-sm text-gray-700">
              Selecteer een categorie om te filteren
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              !activeType 
                ? 'bg-pink-100 text-pink-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Alle materialen
          </button>
          <button
            onClick={() => setActiveType('posters')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeType === 'posters' 
                ? 'bg-pink-100 text-pink-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Posters
          </button>
          <button
            onClick={() => setActiveType('flyers')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeType === 'flyers' 
                ? 'bg-pink-100 text-pink-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Flyers & folders
          </button>
          <button
            onClick={() => setActiveType('digital')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeType === 'digital'
                ? 'bg-pink-100 text-pink-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Digitale banners
          </button>
          <button
            onClick={() => setActiveType('logos')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeType === 'logos'
                ? 'bg-pink-100 text-pink-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Logo's
          </button>
        </div>
      </div>
      
      {/* Marketing materialen grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredMaterials.map((item) => (
          <div key={item.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="h-48 bg-gray-100">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              <p className="mt-1 text-xs text-gray-500">Formaat: {item.format}</p>
              <div className="mt-4">
                <a
                  href={item.downloadUrl}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
                  download
                >
                  <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Downloaden
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredMaterials.length === 0 && (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">Geen marketingmateriaal gevonden voor deze categorie.</p>
        </div>
      )}
    </div>
  );
} 