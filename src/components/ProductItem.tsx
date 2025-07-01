'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/supabase';

interface ProductItemProps {
  product: Product;
  addToCart: (product: Product, quantity?: number) => void;
  inCart?: boolean;
  inCartQuantity?: number;
}

export default function ProductItem({
  product,
  addToCart,
  inCart = false,
  inCartQuantity = 0
}: ProductItemProps) {
  const [addedToCart, setAddedToCart] = useState(false);
  
  // Reset the added to cart animation after 1.5 seconds
  useEffect(() => {
    if (addedToCart) {
      const timer = setTimeout(() => {
        setAddedToCart(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [addedToCart]);

  const handleAddToCart = (quantity: number = 1) => {
    if (product.stock_quantity >= quantity) {
      addToCart(product, quantity);
      setAddedToCart(true);
    }
  };

  // Check if this is a featured product (proefpakket or cadeauset)
  const isFeaturedProduct = 
    product.name.toLowerCase().includes('proefpakket') || 
    product.name.toLowerCase().includes('cadeauset');
  
  // Specifieke voordelen op basis van product type
  const getProductBenefits = () => {
    if (product.name.toLowerCase().includes('proefpakket')) {
      return [
        "Verhoog uw verkoop: klanten die geuren kunnen uitproberen, kopen vaker",
        "Ideaal als kassakoopje of toegevoegde waarde bij grotere aankopen",
        "Stimuleert terugkerende klanten en vergroot loyaliteit aan uw winkel"
      ];
    } else if (product.name.toLowerCase().includes('cadeauset')) {
      return [
        "Premium uitstraling verhoogt het gevoel van luxe in uw winkel",
        "Hogere winstmarge: klanten besteden meer aan geschenken (+35%)",
        "Perfecte aanvulling tijdens feestdagen, verjaardagen en speciale gelegenheden"
      ];
    }
    return [];
  };

  const featuredBenefits = getProductBenefits();

  return (
    <div className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow product-card group
      ${isFeaturedProduct ? 'border-2 border-amber-400 shadow-lg hover:shadow-xl ring-4 ring-amber-100' : 'border-gray-200'}`}>
      <div className="h-36 md:h-48 bg-gray-100 relative overflow-hidden">
        {/* Pulserende ster-achtergrond voor featured producten */}
        {isFeaturedProduct && (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 to-amber-100/50 z-0">
            <div className="absolute top-0 right-0 h-16 w-16 -mr-4 -mt-4 bg-amber-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 h-16 w-16 -ml-4 -mb-4 bg-amber-400 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </div>
        )}
        
        <img
          src={product.image_url || '/placeholder.png'}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 relative z-10 
            ${isFeaturedProduct ? 'shadow-inner' : ''}`}
        />
        
        {/* Featured product badge */}
        {isFeaturedProduct && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold py-1.5 px-3 rounded-md z-20 shadow-md rotate-2 transform hover:rotate-0 transition-transform flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {product.badge_text || (product.name.toLowerCase().includes('proefpakket') ? 'Meest verkocht!' : 'Omzetverhoger!')}
          </div>
        )}
        
        {product.stock_quantity <= 5 && product.stock_quantity > 0 && !product.badge_text && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold py-1 px-2 rounded-md z-20">
            Nog maar {product.stock_quantity} op voorraad!
          </div>
        )}
        
        {/* Added to cart animation */}
        {addedToCart && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold py-1 px-2 rounded-full animate-pulse z-20">
            Toegevoegd!
          </div>
        )}
        
        {/* In cart badge */}
        {inCart && inCartQuantity > 0 && (
          <div className="absolute bottom-2 right-2 bg-pink-600 text-white text-xs font-bold py-1 px-2 rounded-full z-20">
            {inCartQuantity}x in winkelwagen
          </div>
        )}
      </div>
      
      <div className={`p-3 md:p-4 ${isFeaturedProduct ? 'bg-gradient-to-b from-white to-amber-50' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className={`text-sm md:text-lg font-medium ${isFeaturedProduct ? 'text-amber-800' : 'text-gray-900'}`}>
            {product.name}
            {isFeaturedProduct && (
              <span className="inline-flex items-center ml-2 animate-bounce">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            )}
          </h3>
          <span className={`text-sm md:text-lg font-bold ${isFeaturedProduct ? 'text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full' : 'text-pink-600'}`}>
            €{typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price).toFixed(2)}
          </span>
        </div>
        
        <p className="text-xs md:text-sm text-gray-500 mb-2 md:mb-4 line-clamp-2">{product.description_frontend}</p>
        
        {/* Alleen voordelen tonen voor featured producten */}
        {isFeaturedProduct && featuredBenefits.length > 0 && (
          <div className="my-2 p-2 bg-amber-50 rounded-md border border-amber-100">
            <h4 className="text-xs font-semibold text-amber-800 mb-1.5">Voordelen voor uw verkoop:</h4>
            <ul className="text-xs text-amber-700 space-y-1">
              {featuredBenefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start">
                  <svg className="h-3.5 w-3.5 text-amber-500 mr-1.5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="line-clamp-2">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              product.stock_quantity > 10 
                ? 'bg-green-100 text-green-800' 
                : product.stock_quantity > 0 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-red-100 text-red-800'
            }`}>
              {product.stock_quantity > 0 ? 'Voorraad' : 'Uitverkocht'}
            </span>
            
            {/* Verzendstatus - Voor 16:00 besteld, vandaag verzonden */}
            {product.stock_quantity > 0 && (
              <span className="text-xs text-green-700 font-medium flex items-center group">
                <svg className="h-3 w-3 mr-1 animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline group-hover:underline">Voor 16:00 besteld = </span>
                <span className="group-hover:underline transition-colors duration-200 hover:text-green-800">Vandaag verzonden</span>
              </span>
            )}
          </div>
          
          {/* Knoppen voor +5 of +10 alleen tonen voor featured producten */}
          {isFeaturedProduct ? (
            <div className="flex flex-col space-y-2 mt-2">
              <button
                onClick={() => handleAddToCart(1)}
                disabled={product.stock_quantity === 0}
                className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  product.stock_quantity === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                }`}
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Toevoegen aan bestelling
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddToCart(5)}
                  disabled={product.stock_quantity < 5}
                  className={`inline-flex justify-center items-center px-2 py-1.5 border text-xs font-medium rounded-md ${
                    product.stock_quantity < 5
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Bestel 5 stuks
                </button>
                
                <button
                  onClick={() => handleAddToCart(10)}
                  disabled={product.stock_quantity < 10}
                  className={`inline-flex justify-center items-center px-2 py-1.5 border text-xs font-medium rounded-md ${
                    product.stock_quantity < 10
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Bestel 10 stuks
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 mt-2">
              <button
                onClick={() => handleAddToCart(1)}
                disabled={product.stock_quantity === 0}
                className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  product.stock_quantity === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-pink-600 hover:bg-pink-700'
                }`}
                data-product-id={product.id}
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Voeg toe
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddToCart(5)}
                  disabled={product.stock_quantity < 5}
                  className={`inline-flex justify-center items-center px-2 py-1.5 border text-xs font-medium rounded-md ${
                    product.stock_quantity < 5
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-pink-300 bg-pink-50 text-pink-800 hover:bg-pink-100'
                  }`}
                  data-product-id={product.id}
                >
                  <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Bestel 5 stuks
                </button>
                
                <button
                  onClick={() => handleAddToCart(10)}
                  disabled={product.stock_quantity < 10}
                  className={`inline-flex justify-center items-center px-2 py-1.5 border text-xs font-medium rounded-md ${
                    product.stock_quantity < 10
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-pink-300 bg-pink-50 text-pink-800 hover:bg-pink-100'
                  }`}
                  data-product-id={product.id}
                >
                  <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Bestel 10 stuks
                </button>
              </div>
            </div>
          )}
          
          {/* Bulk bestelling tonen voor het proefpakket */}
          {product.name.toLowerCase().includes('proefpakket') && (
            <div className="mt-2 bg-blue-50 p-2 rounded-md border border-blue-100">
              <p className="text-xs text-blue-800 font-medium">
                <span className="text-blue-600 font-bold">Verkooptip:</span> Verdubbel uw verkoop door deze proefpakketten bij de kassa te plaatsen en als een kleine attentie aan te bieden bij bestedingen vanaf €50.
              </p>
            </div>
          )}
          
          {/* Speciale melding voor de cadeauset */}
          {product.name.toLowerCase().includes('cadeauset') && (
            <div className="mt-2 bg-rose-50 p-2 rounded-md border border-rose-100">
              <p className="text-xs text-rose-800 font-medium">
                <span className="text-rose-600 font-bold">Verkoopmogelijkheid:</span> Verhoog uw gemiddelde orderwaarde met 35% door deze cadeauset in uw etalage te presenteren tijdens cadeauseizoenen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 