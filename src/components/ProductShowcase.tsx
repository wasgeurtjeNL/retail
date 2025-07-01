"use client";

import { useState } from "react";
import Link from "next/link";

export default function ProductShowcase() {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const products = [
    {
      id: "wasstrips",
      name: "Wasstrips",
      description: "NIEUW: Revolutionaire eco-wasstrips, 25.000+ klanten in eerste maand",
      color: "bg-cyan-50",
      useImage: true,
      imagePath: "/assets/images/wasstrips-product.jpg",
      retailMargin: "60-70%",
      bestSeller: true,
      isNew: true,
      retailTip: "EXCLUSIEF: Speciale aanmelding & aanbetaling vereist vanwege explosieve vraag",
      exclusive: true,
      specialProduct: true,
      customerCount: "25.000+"
    },
    {
      id: "wasparfum-proef",
      name: "Wasparfum proefpakket",
      description: "Ontdek onze populairste geuren",
      color: "bg-amber-50",
      useImage: true,
      imagePath: "/assets/images/wasparfum-proefpakket-display.jpg",
      retailMargin: "45-55%",
      bestSeller: false,
      isNew: false,
      retailTip: "Perfecte starter voor nieuwe retailers"
    },
    {
      id: "morning-vapor",
      name: "Morning Vapor",
      description: "Fris en energiek voor de ochtend",
      color: "bg-red-50",
      useImage: true,
      imagePath: "/assets/images/morning-vapor-wasparfum.png",
      retailMargin: "50-60%",
      bestSeller: true,
      isNew: false,
      retailTip: "Klanten komen hier speciaal voor terug"
    },
    {
      id: "blossom-drip",
      name: "Blossom Drip",
      description: "Bloemige tonen met een frisse ondertoon",
      color: "bg-blue-50",
      useImage: true,
      imagePath: "/assets/images/blossom-drip.jpg",
      retailMargin: "45-55%",
      bestSeller: false,
      isNew: false,
      retailTip: "Populair in de lente/zomer"
    },
    {
      id: "full-moon",
      name: "Full Moon",
      description: "Mysterieus en elegant voor de avond",
      color: "bg-indigo-50",
      useImage: true,
      imagePath: "/assets/images/full-moon-wasparfum.png",
      retailMargin: "50-60%",
      bestSeller: false,
      isNew: true,
      retailTip: "Hoge vraag in najaar/winter"
    },
    {
      id: "flower-rain",
      name: "Flower Rain",
      description: "Verfrissend bloemig met een vleugje citrus",
      color: "bg-blue-50",
      useImage: true,
      imagePath: "/assets/images/flower-rain-wasparfum.png",
      retailMargin: "45-55%",
      bestSeller: false,
      isNew: false,
      retailTip: "Bestseller in voorjaar"
    },
    {
      id: "sundance",
      name: "Sundance",
      description: "Warm en zonnig met tropische tonen",
      color: "bg-orange-50",
      useImage: true,
      imagePath: "/assets/images/sundance-wasparfum.png",
      retailMargin: "50-60%",
      bestSeller: false,
      isNew: true,
      retailTip: "95% herhaalaankopen"
    },
    {
      id: "cadeauset",
      name: "Cadeauset wasparfum",
      description: "Complete giftset met al onze geuren",
      color: "bg-gray-50",
      useImage: true,
      imagePath: "/assets/images/cadeauset.jpg",
      retailMargin: "55-65%",
      bestSeller: true,
      isNew: false,
      retailTip: "Hoogste marge product"
    }
  ];

  // Define product type to fix TypeScript errors
  type Product = {
    id: string;
    name: string;
    description: string;
    color: string;
    useImage: boolean;
    imagePath?: string;
    retailMargin: string;
    bestSeller: boolean;
    isNew: boolean;
    retailTip: string;
    exclusive?: boolean;
    specialProduct?: boolean;
    customerCount?: string;
  };

  return (
    <div className="bg-gray-50 py-16 animate-fadeIn">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center mb-8">
          <div className="inline-block bg-yellow-400 text-black font-bold px-4 py-1 rounded-full mb-4 text-sm">
            EXCLUSIEVE B2B PRIJZEN
          </div>
          <h2 className="text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Ontdek Onze Premium Wasgeuren
          </h2>
          <div className="flex justify-center mt-2">
            <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm inline-flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
              Marges tot 65%
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm inline-flex items-center ml-2">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Gratis proefpakket
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 lg:mx-auto">
            <span className="font-medium">Prijzen alleen zichtbaar voor</span> geregistreerde retailers. 
            <span className="font-medium text-green-700"> Meld u aan</span> voor exclusieve B2B-tarieven.
          </p>
        </div>

        {/* Mobile Product Grid */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Exclusive Wasstrips Spotlight for Mobile */}
            {products.slice(0, 1).map((product) => (
              <div 
                key={product.id} 
                className="border-2 border-amber-400 rounded-lg overflow-hidden relative shadow-md hover:shadow-lg transition-all"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black text-sm font-bold px-3 py-1.5 z-10 flex items-center justify-between">
                  <span>EXCLUSIEF PRODUCT</span>
                  <span className="animate-pulse bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">Beperkte beschikbaarheid</span>
                </div>
                <div className="absolute -top-1 -left-3 bg-yellow-400 text-black px-3 py-1 text-xs font-bold uppercase transform -rotate-6 shadow-md z-10">
                  Extreem populair
                </div>
                <div className={`${product.color} p-4 flex items-center justify-center`}>
                  <div className="w-48 h-48 relative">
                    <img 
                      src={product.imagePath} 
                      alt={product.name} 
                      className="object-contain w-full h-full"
                    />
                    <div className="absolute bottom-0 right-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                      {product.retailMargin} marge
                    </div>
                  </div>
                </div>
                <div className="p-3 text-center bg-gradient-to-r from-cyan-50 to-blue-50">
                  <h3 className="text-base font-bold text-gray-800">{product.name}</h3>
                  <div className="mt-1 text-xs text-gray-700">{product.description}</div>
                  <div className="mt-2 bg-amber-100 rounded-md p-2 text-xs text-amber-800">
                    <span className="font-bold block">FOMO ALERT:</span> 
                    <span>Al {product.customerCount} klanten in eerste maand! Speciale aanmelding vereist.</span>
                  </div>
                  <Link 
                    href="/register" 
                    className="mt-2 block text-center bg-black text-white px-4 py-2 rounded-md font-medium"
                  >
                    Meld u nu aan voor toegang
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.slice(1, 5).map((product) => (
              <div 
                key={product.id} 
                className="border border-amber-200 rounded-lg overflow-hidden relative shadow-md hover:shadow-lg transition-all"
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {product.bestSeller && (
                  <div className="absolute top-0 left-0 bg-amber-500 text-white text-xs font-bold px-2 py-1 z-10">
                    BESTSELLER
                  </div>
                )}
                {product.isNew && (
                  <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 z-10">
                    NIEUW
                  </div>
                )}
                <div className={`${product.color} p-4 flex items-center justify-center`}>
                  <div className="w-32 h-32 relative">
                    <img 
                      src={product.imagePath} 
                      alt={product.name} 
                      className="object-contain w-full h-full"
                    />
                    <div className="absolute bottom-0 right-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                      {product.retailMargin} marge
                    </div>
                  </div>
                </div>
                <div className="p-2 text-center">
                  <h3 className="text-sm font-medium text-gray-700">{product.name}</h3>
                  <div className="mt-1 text-xs text-gray-500">{product.description}</div>
                  <div className="mt-2 flex items-center justify-center">
                    <div className="px-2 py-1 bg-gray-100 text-gray-400 rounded text-xs flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Prijs na registratie
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Mobile Registration Banner */}
          <div className="mt-6 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 p-4 rounded-lg shadow-md">
            <div className="font-bold text-center mb-2">Zie exclusieve B2B prijzen na registratie</div>
            <div className="text-sm text-center mb-3">Ontvang direct een gratis proefpakket</div>
            <Link 
              href="/register" 
              className="block text-center bg-black text-white px-4 py-2 rounded-md font-medium"
            >
              Registreer nu als retailer
            </Link>
          </div>
        </div>

        {/* Desktop Product Display */}
        <div className="hidden md:block">
          {/* Exclusive Product Spotlight for Wasstrips */}
          <div className="mb-12 bg-gradient-to-r from-cyan-50 via-white to-cyan-50 rounded-xl shadow-xl overflow-hidden border-2 border-amber-400 relative">
            <div className="absolute top-6 right-6 bg-red-600 text-white font-bold py-1.5 px-5 rounded-full transform rotate-12 shadow-lg animate-pulse">
              <span className="text-lg">HOGE VRAAG</span>
            </div>
            {products.slice(0, 1).map((product) => (
              <div key={product.id} className="grid grid-cols-5 gap-8 p-6">
                <div className="col-span-2 flex items-center justify-center relative">
                  <div className="absolute -top-1 -left-10 bg-yellow-400 text-black px-4 py-2 text-sm font-bold uppercase transform -rotate-6 shadow-md z-10">
                    Extreem populair
                  </div>
                  <div className="relative w-full h-80 animate-float-slow">
                    <img 
                      src={product.imagePath} 
                      alt={product.name} 
                      className="object-contain w-full h-full"
                    />
                    <div className="absolute bottom-0 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                      Tot {product.retailMargin} marge
                    </div>
                  </div>
                </div>
                <div className="col-span-3 flex flex-col justify-center p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-black text-yellow-400 px-3 py-1 text-xs uppercase font-bold rounded">Nieuw</div>
                    <div className="bg-amber-500 text-white px-3 py-1 text-xs uppercase font-bold rounded">Bestseller</div>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h2>
                  <p className="text-lg text-gray-700 mb-4">{product.description}</p>
                  
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                    <div className="font-bold text-gray-800 mb-1">EXCLUSIEF VOOR GEREGISTREERDE RETAILERS:</div>
                    <p className="text-gray-700">Dit product vereist een speciale aanmelding en aanbetaling vanwege de explosieve vraag. Al {product.customerCount} klanten in de eerste maand!</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center">
                      <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-800">Hoogste marge product</span>
                        <span className="text-xs text-gray-600">{product.retailMargin} winstmarge</span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-800">Beperkte toegang</span>
                        <span className="text-xs text-gray-600">Speciale aanmelding vereist</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Link 
                      href="/register" 
                      className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black px-6 py-3 rounded-md font-medium text-center transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      AANMELDEN VOOR EXCLUSIEVE TOEGANG
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
                    
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {products.slice(1, 5).map((product) => (
              <div 
                key={product.id} 
                className={`relative rounded-lg overflow-hidden shadow-md ${product.color} p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer group`}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {/* Bestseller tag */}
                {product.bestSeller && (
                  <div className="absolute top-4 left-0 bg-amber-500 text-white px-3 py-1 text-xs font-bold uppercase transform -rotate-2 shadow-md z-10">
                    Bestseller
                  </div>
                )}
                
                {/* New tag */}
                {product.isNew && (
                  <div className="absolute top-4 left-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase transform -rotate-2 shadow-md z-10">
                    Nieuw
                  </div>
                )}
                
                {/* Hover overlay with retailer tip */}
                <div className={`absolute inset-0 bg-black/70 flex items-center justify-center transition-all duration-300 z-20 ${hoveredProduct === product.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="text-center p-4">
                    <div className="text-yellow-400 font-bold mb-2">RETAILER TIP</div>
                    <p className="text-white">{product.retailTip}</p>
                    <div className="mt-4 text-yellow-300 font-bold">
                      Marge: {product.retailMargin}
                    </div>
                    <Link
                      href="/register"
                      className="mt-4 inline-block bg-yellow-400 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-300 transition-colors"
                    >
                      Bekijk B2B prijs
                    </Link>
                  </div>
                </div>
                
                {/* Product image with floating animation */}
                {product.useImage ? (
                  <div className="h-64 w-48 mx-auto mb-4 flex items-center justify-center relative animate-float">
                    <img 
                      src={product.imagePath} 
                      alt={product.name} 
                      className="h-full object-contain group-hover:opacity-80 transition-all"
                    />
                    <div className="absolute bottom-0 right-0 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold">
                      {product.retailMargin} marge
                    </div>
                  </div>
                ) : (
                  <div className="h-48 w-48 rounded-full mx-auto mb-4 bg-white shadow-inner flex items-center justify-center">
                    <span className="text-3xl text-pink-600">W</span>
                  </div>
                )}
                
                {/* Product info */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                  <p className="mt-2 text-gray-500">{product.description}</p>
                  <div className="mt-3 bg-gray-200 text-gray-500 rounded-full py-1 px-3 inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-sm">Prijs na registratie</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {products.slice(5, 7).map((product) => (
              <div 
                key={product.id} 
                className={`relative rounded-lg overflow-hidden shadow-md ${product.color} p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer group`}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {/* Bestseller tag */}
                {product.bestSeller && (
                  <div className="absolute top-4 left-0 bg-amber-500 text-white px-3 py-1 text-xs font-bold uppercase transform -rotate-2 shadow-md z-10">
                    Bestseller
                  </div>
                )}
                
                {/* New tag */}
                {product.isNew && (
                  <div className="absolute top-4 left-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase transform -rotate-2 shadow-md z-10">
                    Nieuw
                  </div>
                )}
                
                {/* Hover overlay with retailer tip */}
                <div className={`absolute inset-0 bg-black/70 flex items-center justify-center transition-all duration-300 z-20 ${hoveredProduct === product.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="text-center p-4">
                    <div className="text-yellow-400 font-bold mb-2">RETAILER TIP</div>
                    <p className="text-white">{product.retailTip}</p>
                    <div className="mt-4 text-yellow-300 font-bold">
                      Marge: {product.retailMargin}
                    </div>
                    <Link
                      href="/register"
                      className="mt-4 inline-block bg-yellow-400 text-black px-4 py-2 rounded-md font-medium hover:bg-yellow-300 transition-colors"
                    >
                      Bekijk B2B prijs
                    </Link>
                  </div>
                </div>
                
                {/* Product image */}
                {product.useImage ? (
                  <div className="h-64 w-48 mx-auto mb-4 flex items-center justify-center relative animate-float">
                    <div className="relative w-full h-80 animate-float-slow">
                    <img 
                      src={product.imagePath} 
                      alt={product.name} 
                        className="object-contain w-full h-full"
                    />
                      <div className="absolute bottom-0 right-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                        Tot {product.retailMargin} marge
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 w-48 rounded-full mx-auto mb-4 bg-white shadow-inner flex items-center justify-center">
                    <span className="text-3xl text-pink-600">W</span>
                  </div>
                )}
                
                {/* Product info */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                  <p className="mt-2 text-gray-500">{product.description}</p>
                  <div className="mt-3 bg-gray-200 text-gray-500 rounded-full py-1 px-3 inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-sm">Prijs na registratie</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* B2B Pricing Testimonial */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full transform translate-x-16 -translate-y-16 opacity-20"></div>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-6 md:mb-0 md:max-w-xl">
              <div className="text-xl font-semibold mb-3">Exclusieve groothandelsprijzen voor retailers</div>
              <p className="text-gray-600 leading-relaxed">
                "Als retailer hebt u toegang tot onze exclusieve B2B-prijzen, met marges tot 65% op de consumentenprijs. 
                Na registratie en goedkeuring kunt u direct bestellen tegen deze speciale tarieven."
              </p>
              <div className="mt-4 text-sm text-gray-500 italic">
                — Wasgeurtje.nl Retail Team
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-green-50 p-3 rounded-lg text-green-800 font-semibold flex items-center border border-green-200">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Gratis proefpakket bij registratie
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 font-semibold flex items-center border border-yellow-200">
                <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Marges tussen 45-65%
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-blue-800 font-semibold flex items-center border border-blue-200">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Direct toegang na goedkeuring
              </div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="mt-12 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 transform rotate-2"></div>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md shadow-lg text-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 hover:scale-105 transform transition-all duration-300"
          >
            Bekijk B2B-Prijzen <span className="ml-2" aria-hidden="true">→</span>
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Binnen 24 uur na goedkeuring toegang tot de volledige catalogus met exclusieve retailerprijzen
          </p>
        </div>
      </div>
    </div>
  );
} 