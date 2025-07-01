import React, { useState, useEffect } from 'react';
import CatalogSearchFilter from './CatalogSearchFilter';

// Custom hook voor de cijferanimatie
const useCountUp = (end: number, duration: number = 500) => {
  const [count, setCount] = useState(0);
  const frameRate = 1000 / 60;
  const totalFrames = Math.round(duration / frameRate);

  useEffect(() => {
    let currentFrame = 0;
    const counter = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / totalFrames;
      setCount(end * progress);

      if (currentFrame === totalFrames) {
        clearInterval(counter);
        setCount(end); // Zorg dat het eindigt op de exacte waarde
      }
    }, frameRate);

    return () => {
      clearInterval(counter);
    };
  }, [end, duration, totalFrames]);
  
  // Start de animatie altijd vanaf 0, maar toon de eindwaarde direct
  useEffect(() => {
      setCount(end);
  }, [end]);


  return count;
};


interface StickyCatalogHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  categories: string[];
  cartItemCount: number;
  cartSubtotal: number;
  amountToNextTier: number | null;
  nextDiscountTier: { label: string; threshold: number } | undefined;
  lastItemAddedTimestamp: number | null;
  onCartClick: () => void;
}

// Dit component toont een professionele, interactieve sticky header.
const StickyCatalogHeader: React.FC<StickyCatalogHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  cartItemCount,
  cartSubtotal,
  amountToNextTier,
  nextDiscountTier,
  lastItemAddedTimestamp,
  onCartClick
}) => {
  const [isJiggling, setIsJiggling] = useState(false);
  const animatedSubtotal = useCountUp(cartSubtotal);

  useEffect(() => {
    if (lastItemAddedTimestamp) {
      setIsJiggling(true);
      const timer = setTimeout(() => setIsJiggling(false), 400); // Duur van de animatie
      return () => clearTimeout(timer);
    }
  }, [lastItemAddedTimestamp]);


  const progressToNextTier = nextDiscountTier
    ? Math.min(100, (cartSubtotal / nextDiscountTier.threshold) * 100)
    : 0;

  const isTierReached = progressToNextTier >= 100;

  return (
    <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-200 p-3 z-40 animate-fade-in-down">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center gap-4">
          {/* Zoek & Filter Sectie */}
          <div className="flex-grow">
            {/* Het zoekfilter component wordt hier hergebruikt */}
            <CatalogSearchFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories}
            />
          </div>

          {/* Winkelwagen & Korting Sectie, alleen getoond als er items zijn */}
          {cartItemCount > 0 && (
            <div className="flex items-center gap-4 transition-opacity duration-300">
              {/* Winkelwagen Knop */}
              <button
                onClick={onCartClick}
                className={`flex items-center gap-3 bg-pink-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-pink-700 transition-all duration-200 transform hover:scale-105 ${isJiggling ? 'animate-jiggle' : ''}`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-left">
                  <span className="font-bold text-sm">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
                  <span className="block text-xs opacity-90">€{animatedSubtotal.toFixed(2)}</span>
                </div>
              </button>
              
              {/* Korting Progressie Widget */}
              {nextDiscountTier && amountToNextTier !== null && (
                <div className="hidden lg:block w-56 bg-gray-50 p-2 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-700 mb-1 font-medium">
                    {isTierReached ? (
                      <span className="text-green-600 font-bold">Volgende korting bereikt!</span>
                    ) : (
                      <span>
                        Nog <span className="font-bold text-gray-900">€{amountToNextTier.toFixed(2)}</span> tot {nextDiscountTier.label}
                      </span>
                    )}
                  </div>
                  <div className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${isTierReached ? 'shadow-inner' : ''}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${isTierReached ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse-slow' : 'bg-green-500'}`} 
                      style={{ width: `${progressToNextTier}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyCatalogHeader; 