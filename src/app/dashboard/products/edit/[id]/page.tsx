'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductEditor from '../../../../../components/ProductEditor';
import Link from 'next/link';

// In een echte applicatie zou je dit uit je database halen
const fetchProduct = async (id: string) => {
  // Simuleer API call
  return {
    id,
    name: 'Voorbeeld Product',
    description: 'Dit is een voorbeeld productbeschrijving.',
    price: 49.99,
    imageUrl: '',
  };
};

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await fetchProduct(params.id);
        setProduct(productData);
      } catch (err) {
        setError('Er is een fout opgetreden bij het laden van het product');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [params.id]);

  const handleSave = async (updatedProduct: any) => {
    try {
      // Hier zou je normaal gesproken een API call doen om het product op te slaan
      console.log('Product opgeslagen:', updatedProduct);
      
      // Navigeer terug naar de productlijst na het opslaan
      router.push('/dashboard/products');
    } catch (err) {
      console.error('Fout bij het opslaan van het product:', err);
      alert('Er is een fout opgetreden bij het opslaan van het product');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="w-12 h-12 mx-auto border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        <p className="text-center mt-4">Product laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 p-4 rounded-md">
          <h2 className="text-red-800 font-medium">Fout</h2>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
        <div className="mt-4">
          <Link href="/dashboard/products" className="text-blue-600 hover:underline">
            Terug naar productoverzicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product bewerken</h1>
        <Link 
          href="/dashboard/products" 
          className="text-blue-600 hover:underline"
        >
          Terug naar overzicht
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <ProductEditor 
          product={product} 
          onSave={handleSave} 
          onCancel={() => router.push('/dashboard/products')} 
        />
      </div>
    </div>
  );
} 