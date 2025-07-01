'use client';

import { useState } from 'react';
import ImageUploader from './ImageUploader';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  // Andere producteigenschappen hier toevoegen
}

interface ProductEditorProps {
  product?: Product;
  onSave: (product: Product) => void;
  onCancel?: () => void;
}

export default function ProductEditor({ 
  product, 
  onSave, 
  onCancel 
}: ProductEditorProps) {
  const [formData, setFormData] = useState<Product>(
    product || {
      name: '',
      description: '',
      price: 0,
      image_url: '',
    }
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error for this field when changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      image_url: imageUrl
    }));
    
    // Clear error for image when uploaded
    if (errors.image_url) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.image_url;
        return newErrors;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Productnaam is verplicht';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Productbeschrijving is verplicht';
    }
    
    if (formData.price <= 0) {
      newErrors.price = 'Prijs moet groter zijn dan 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Hier zou je normaal een API-call maken om het product op te slaan
      // Voor nu geven we het product gewoon door aan de onSave callback
      onSave(formData);
    } catch (error) {
      console.error('Error saving product:', error);
      // Hier zou je een melding kunnen tonen aan de gebruiker
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Productnaam
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : ''
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Beschrijving
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.description ? 'border-red-500' : ''
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Prijs (€)
        </label>
        <input
          type="number"
          id="price"
          name="price"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.price ? 'border-red-500' : ''
          }`}
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{errors.price}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Productafbeelding
        </label>
        <ImageUploader
          onImageUploaded={handleImageUploaded}
          existingImageUrl={formData.image_url}
        />
        {errors.image_url && (
          <p className="mt-1 text-sm text-red-600">{errors.image_url}</p>
        )}
      </div>
      
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuleren
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Bezig met opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
} 