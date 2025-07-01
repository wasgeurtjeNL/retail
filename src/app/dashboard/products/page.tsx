"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import { getProducts, addProduct, updateProduct, deleteProduct, Product } from "@/lib/supabase";
import { syncProductToStripe } from "@/lib/stripe";
import Image from 'next/image';
import ImageUploader from '@/components/ImageUploader';

export default function ProductsManagementPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const initialProductState = {
    name: "",
    description_frontend: "",
    description_internal: "",
    price: 0,
    image_url: "",
    stock_quantity: 0,
    category: "Wasparfum"
  };
  
  useEffect(() => {
    const loadProducts = async () => {
      if (!authLoading && user && isAdmin) {
        setIsLoading(true);
        try {
          const productsData = await getProducts();
          if (productsData) {
            setProducts(productsData);
          } else {
            console.error('Error loading products: No data returned');
            setProducts([]);
          }
        } catch (error) {
          console.error('Error fetching products:', error);
          setProducts([]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadProducts();
  }, [user, authLoading, isAdmin]);
  
  const handleOpenModal = (product?: Product) => {
    if (product) {
      setCurrentProduct(product);
    } else {
      setCurrentProduct(initialProductState);
    }
    setIsModalOpen(true);
    setErrorMessage(null);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
    setErrorMessage(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price' || name === 'stock_quantity') {
      // Converteer naar nummer voor numerieke velden
      const numValue = parseFloat(value);
      setCurrentProduct(prev => prev ? { ...prev, [name]: isNaN(numValue) ? 0 : numValue } : null);
    } else {
      setCurrentProduct(prev => prev ? { ...prev, [name]: value } : null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      let result: { error: any | null; product?: Product } = { error: null };
      
      if ('id' in currentProduct && currentProduct.id) {
        // Update bestaand product
        const { id, ...updates } = currentProduct;
        result = await updateProduct(id, updates);
        
        if (result.error) {
          throw new Error(result.error.message || 'Fout bij het bijwerken van het product');
        } else {
          setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        }
      } else {
        // Nieuw product toevoegen
        result = await addProduct(currentProduct as Omit<Product, 'id'|'created_at'>);
        
        if (result.error) {
          throw new Error(result.error.message || 'Fout bij het toevoegen van het product');
        } else if (result.product) {
          setProducts(prev => [...prev, result.product as Product]);
        }
      }
      
      handleCloseModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Er is een onverwachte fout opgetreden.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Weet u zeker dat u dit product wilt verwijderen?')) {
      return;
    }
    
    try {
      const { error } = await deleteProduct(id);
      if (error) {
        throw new Error(error.message || 'Fout bij verwijderen.');
      }
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert('Fout bij verwijderen: ' + (error instanceof Error ? error.message : 'Onbekende fout.'));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Toegang geweigerd</h1>
            <p className="text-gray-600 mb-6">
              U heeft geen toegang tot deze pagina. Log in als admin om toegang te krijgen.
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700"
            >
              Inloggen
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            
            <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold leading-6 text-gray-900">Producten Beheer</h2>
              <div className="mt-3 sm:mt-0 sm:ml-4">
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Product Toevoegen
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    {isLoading ? (
                      <div className="bg-white px-4 py-12 sm:px-6 flex justify-center">
                        <svg className="animate-spin h-8 w-8 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="bg-white px-4 py-12 sm:px-6 text-center">
                        <p className="text-gray-500">Er zijn nog geen producten toegevoegd.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenModal()}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                        >
                          Product Toevoegen
                        </button>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Afbeelding
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Naam
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Categorie
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Prijs
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Voorraad
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Acties</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products.map((product) => (
                            <tr key={product.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="relative h-16 w-16 rounded-md overflow-hidden">
                                  {product.image_url ? (
                                    <Image
                                      src={product.image_url}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-200">
                                      <svg 
                                        className="h-8 w-8 text-gray-400" 
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
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-500 truncate max-w-xs" title={product.description_frontend}>
                                  {product.description_frontend}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                  product.category === 'Wasparfum' 
                                    ? 'bg-pink-100 text-pink-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {product.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  €{product.price.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  product.stock_quantity > 10 
                                    ? 'bg-green-100 text-green-800' 
                                    : product.stock_quantity > 0 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-red-100 text-red-800'
                                }`}>
                                  {product.stock_quantity} stuks
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleOpenModal(product)}
                                  className="text-pink-600 hover:text-pink-900 mr-4"
                                >
                                  Bewerken
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Verwijderen
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Product Modal */}
      {isModalOpen && currentProduct && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {'id' in currentProduct ? 'Product Bewerken' : 'Product Toevoegen'}
                      </h3>
                      
                      {errorMessage && (
                        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
                          <p>{errorMessage}</p>
                        </div>
                      )}
                      
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Productnaam*
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            value={currentProduct.name || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="description_frontend" className="block text-sm font-medium text-gray-700">
                            Omschrijving voor Retailer (Frontend)
                          </label>
                          <textarea
                            name="description_frontend"
                            id="description_frontend"
                            required
                            rows={4}
                            value={currentProduct.description_frontend || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                            placeholder="Bijv: Een explosie van bloemengeuren met tonen van jasmijn en een vleugje roos."
                          />
                          <p className="mt-1 text-xs text-gray-500">Deze tekst is publiekelijk zichtbaar voor retailers in hun productcatalogus.</p>
                        </div>

                        <div>
                          <label htmlFor="description_internal" className="block text-sm font-medium text-gray-700">
                            Interne Notities (Backend)
                          </label>
                          <textarea
                            name="description_internal"
                            id="description_internal"
                            rows={3}
                            value={currentProduct.description_internal || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                            placeholder="Bijv: Inkoopsprijs, leverancier, marge-informatie, etc."
                          />
                          <p className="mt-1 text-xs text-gray-500">Alleen zichtbaar voor admins. Niet zichtbaar voor retailers.</p>
                        </div>
                        
                        <div>
                          <label htmlFor="badge_text" className="block text-sm font-medium text-gray-700">
                            Badge Tekst (optioneel)
                          </label>
                          <input
                            type="text"
                            name="badge_text"
                            id="badge_text"
                            value={currentProduct.badge_text || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                            placeholder="Bijv: 45-55% marge"
                          />
                          <p className="mt-1 text-xs text-gray-500">Gele badge die op de productkaart wordt getoond.</p>
                        </div>
                        
                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Categorie*
                          </label>
                          <select
                            name="category"
                            id="category"
                            required
                            value={currentProduct.category || 'Wasparfum'}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                          >
                            <option value="Wasparfum">Wasparfum</option>
                            <option value="Wasstrips">Wasstrips</option>
                          </select>
                        </div>
                        
                        <div>
                          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                            Prijs (€)*
                          </label>
                          <input
                            type="number"
                            name="price"
                            id="price"
                            required
                            step="0.01"
                            min="0"
                            value={currentProduct.price || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                            Productafbeelding
                          </label>
                          <ImageUploader
                            onImageUploaded={(imageUrl: string) => {
                              setCurrentProduct(prev => prev ? { ...prev, image_url: imageUrl } : null);
                            }}
                            existingImageUrl={currentProduct.image_url || ''}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                            Voorraad*
                          </label>
                          <input
                            type="number"
                            name="stock_quantity"
                            id="stock_quantity"
                            required
                            min="0"
                            value={currentProduct.stock_quantity || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-pink-600 text-base font-medium text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Opslaan...
                      </>
                    ) : (
                      'Opslaan'
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={handleCloseModal}
                  >
                    Annuleren
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
} 