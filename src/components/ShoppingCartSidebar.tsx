"use client";

import { useState } from 'react';
import { Product } from '@/lib/supabase';

interface ShoppingCartSidebarProps {
  cart: {[key: string]: {product: Product, quantity: number}};
  cartItemCount: number;
  cartSubtotal: number;
  cartTotal: number;
  applicableDiscount: { threshold: number, discount: number, label: string };
  volumeDiscountAmount: number;
  specialDiscountAmount: number;
  specialDiscountActive: boolean;
  isMinimumOrderMet: boolean;
  MINIMUM_ORDER_AMOUNT: number;
  progressPercentage: number;
  nextDiscountTier: { threshold: number, discount: number, label: string } | undefined;
  nextTierProgressPercentage: number;
  amountToNextTier: number | null;
  orderLoading: boolean;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  handlePlaceOrder: () => void;
}

export default function ShoppingCartSidebar({
  cart,
  cartItemCount,
  cartSubtotal,
  cartTotal,
  applicableDiscount,
  volumeDiscountAmount,
  specialDiscountAmount,
  specialDiscountActive,
  isMinimumOrderMet,
  MINIMUM_ORDER_AMOUNT,
  progressPercentage,
  nextDiscountTier,
  nextTierProgressPercentage,
  amountToNextTier,
  orderLoading,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  handlePlaceOrder
}: ShoppingCartSidebarProps) {
  return (
    <>
      {/* Winkelwagen sidebar */}
      <div 
        id="cart-sidebar" 
        className="fixed right-0 top-0 h-full bg-white w-full max-w-sm shadow-xl transform translate-x-full transition-transform duration-300 z-50 flex flex-col"
      >
        <div className="p-3 bg-pink-600 text-white flex justify-between items-center">
          <h3 className="font-bold text-base flex items-center">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Winkelwagen ({cartItemCount} items)
          </h3>
          <button 
            onClick={() => {
              const cartSidebar = document.getElementById('cart-sidebar');
              if (cartSidebar) cartSidebar.classList.add('translate-x-full');
            }}
            className="text-white hover:text-gray-200 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
          {Object.keys(cart).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mb-2 text-lg font-medium">Uw winkelwagen is leeg</p>
              <p className="text-sm max-w-xs text-center mb-4">Begin met het toevoegen van producten aan uw winkelwagen om een bestelling te plaatsen</p>
              <button 
                onClick={() => {
                  const cartSidebar = document.getElementById('cart-sidebar');
                  if (cartSidebar) cartSidebar.classList.add('translate-x-full');
                }}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition"
              >
                Producten bekijken
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">Uw bestelling</h4>
                  <button 
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-800 transition flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Alles verwijderen
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                {Object.values(cart).map(item => (
                  <div key={item.product.id} data-cart-item={item.product.id} className="bg-white rounded-lg shadow-sm p-3 flex">
                    <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-grow">
                      <h4 className="font-medium text-gray-900 text-sm">{item.product.name}</h4>
                      <p className="text-gray-500 text-xs mb-2">{item.product.category}</p>
                      
                      {/* Add special indicator for Starterspakket */}
                      {item.product.name.toLowerCase().includes('starterspakket') && (
                        <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded mb-2 border border-blue-100 inline-block">
                          <p className="font-semibold mb-1">Inhoud Starterspakket (10 stuks per geur):</p>
                          <ul className="list-disc pl-4 text-xs space-y-0.5">
                            <li>Full Moon</li>
                            <li>Sundance</li>
                            <li>Morning Vapor</li>
                            <li>Flower Rain</li>
                            <li>Blossom Drip</li>
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-end">
                        <div className="flex items-center">
                          <button 
                            onClick={() => updateCartQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                            className="text-gray-500 hover:text-gray-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="mx-2 text-gray-700 w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="text-gray-500 hover:text-gray-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">€{(item.product.price * item.quantity).toFixed(2)}</span>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Volume discount information */}
              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Bestelgegevens</h4>
                
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotaal</span>
                    <span className="font-medium">€{cartSubtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Volume discount */}
                  {applicableDiscount.discount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Volumekorting ({applicableDiscount.label})</span>
                      <span>-€{volumeDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Special discount */}
                  {specialDiscountActive && specialDiscountAmount > 0 && (
                    <div className="flex justify-between text-pink-700">
                      <span>Speciale aanbieding (2%)</span>
                      <span>-€{specialDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold">
                    <span>Totaal</span>
                    <span>€{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Minimum order warning */}
                {!isMinimumOrderMet && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mt-3 text-amber-800 text-sm">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">Minimumbestelwaarde €{MINIMUM_ORDER_AMOUNT.toFixed(2)}</p>
                        <p className="mt-1">Om u de beste inkoopprijzen en exclusieve retailer-korting te kunnen bieden, hanteren wij een minimaal orderbedrag van €{MINIMUM_ORDER_AMOUNT.toFixed(2)}. U moet nog €{(MINIMUM_ORDER_AMOUNT - cartTotal).toFixed(2)} extra bestellen.</p>
                        <p className="mt-1 text-xs text-amber-700">Deze samenwerking stelt ons in staat u een significant betere marge te bieden dan consumenten.</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                  </div>
                )}
                
                {/* Show next discount tier motivational message */}
                {nextDiscountTier && (
                  <div className="bg-blue-50 border border-blue-100 rounded p-3 mt-3 text-blue-800 text-sm">
                    <p className="font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                      </svg>
                      Ontgrendel {nextDiscountTier.label} korting!
                    </p>
                    <p className="mt-1">
                      Bestel nog voor €{amountToNextTier?.toFixed(2)} extra om {nextDiscountTier.label} korting te krijgen op uw gehele bestelling!
                    </p>
                    
                    {/* Progress to next tier */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 flex items-center">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${nextTierProgressPercentage}%` }}></div>
                      <div className="h-4 w-4 bg-white border-2 border-blue-500 rounded-full -ml-2 shadow-sm"></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>€0</span>
                      <span>€{nextDiscountTier.threshold}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-white border-t border-gray-200">
          <button
            onClick={handlePlaceOrder}
            disabled={Object.keys(cart).length === 0 || orderLoading || !isMinimumOrderMet}
            className={`w-full py-3 px-4 rounded-md shadow-sm text-white font-medium ${
              Object.keys(cart).length === 0 || !isMinimumOrderMet
                ? 'bg-gray-400 cursor-not-allowed'
                : orderLoading
                ? 'bg-pink-400 cursor-wait'
                : 'bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500'
            }`}
          >
            {orderLoading ? (
              <div className="flex justify-center items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Bestelling plaatsen...
              </div>
            ) : (
              <>
                {Object.keys(cart).length === 0 ? (
                  'Voeg producten toe'
                ) : !isMinimumOrderMet ? (
                  `Nog €${(MINIMUM_ORDER_AMOUNT - cartTotal).toFixed(2)} nodig`
                ) : (
                  `Bestelling plaatsen (€${cartTotal.toFixed(2)})`
                )}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Door een bestelling te plaatsen, gaat u akkoord met onze algemene voorwaarden en ons retourbeleid.
          </p>
        </div>
      </div>
      
      {/* Floating cart button (only on mobile) */}
      <button 
        onClick={() => {
          const cartSidebar = document.getElementById('cart-sidebar');
          if (cartSidebar) cartSidebar.classList.remove('translate-x-full');
        }}
        className="cart-button fixed bottom-6 right-6 z-40 bg-pink-600 text-white w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center md:hidden"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {cartItemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {cartItemCount}
          </span>
        )}
        <span className="text-xs mt-1">Cart</span>
      </button>
    </>
  );
} 