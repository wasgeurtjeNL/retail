'use client';

import { useRouter } from 'next/navigation';
import ProductEditor from '../../../../components/ProductEditor';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();

  const handleSave = async (product: any) => {
    try {
      // Hier zou je normaal gesproken een API call doen om het product op te slaan
      console.log('Nieuw product opgeslagen:', product);
      
      // Navigeer terug naar de productlijst na het opslaan
      router.push('/dashboard/products');
    } catch (err) {
      console.error('Fout bij het opslaan van het product:', err);
      alert('Er is een fout opgetreden bij het opslaan van het product');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nieuw product toevoegen</h1>
        <Link 
          href="/dashboard/products" 
          className="text-blue-600 hover:underline"
        >
          Terug naar overzicht
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <ProductEditor 
          onSave={handleSave} 
          onCancel={() => router.push('/dashboard/products')} 
        />
      </div>
    </div>
  );
} 