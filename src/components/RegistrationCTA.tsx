"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RetailerTimeline from './RetailerTimeline';
import RetailerPackageInfo from './RetailerPackageInfo';
import SocialProofSection from './SocialProofSection';
import RetailerDirectory from './RetailerDirectory';

interface AnimatedElement {
  top: number;
  left: number;
  animationDelay: number;
  animationDuration: number;
  width: number;
  rotation: number;
}

export default function RegistrationCTA() {
  const [animate, setAnimate] = useState(false);
  const [elements, setElements] = useState<AnimatedElement[]>([]);
  
  useEffect(() => {
    // Generate diagonal lines elements
    const newElements: AnimatedElement[] = Array(8).fill(0).map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      animationDelay: Math.random() * 2,
      animationDuration: Math.random() * 3 + 4,
      width: Math.random() * 80 + 20,
      rotation: Math.random() * 45
    }));
    
    setElements(newElements);
  
    // Set up intersection observer to trigger animation when element is in view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    const element = document.getElementById('registration-cta');
    if (element) observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);

  return (
    <div 
      id="registration-cta" 
      className="relative py-28 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" 
        style={{ 
          backgroundImage: "linear-gradient(30deg, rgba(255,255,255,0.1) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.1) 87.5%, rgba(255,255,255,0.1)), linear-gradient(150deg, rgba(255,255,255,0.1) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.1) 87.5%, rgba(255,255,255,0.1))",
          backgroundSize: "40px 40px" 
        }}
      ></div>
      
      {/* Diagonal animated lines */}
      <div className="absolute inset-0 overflow-hidden">
        {elements.map((element, i) => (
          <div 
            key={i}
            className="absolute h-px animate-pulse-slow"
            style={{
              width: `${element.width}px`,
              top: `${element.top}%`,
              left: `${element.left}%`,
              transform: `rotate(${element.rotation}deg)`,
              animationDelay: `${element.animationDelay}s`,
              animationDuration: `${element.animationDuration}s`,
              background: 'linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.5), transparent)'
            }}
          />
        ))}
      </div>
      
      {/* Diagonal overlay accent */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute h-[200px] w-full -top-32 -right-32 rotate-12 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
        <div className="absolute h-[200px] w-full bottom-0 -left-32 rotate-12 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
      </div>
      
      <div className="relative max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className={`transition-all duration-1000 transform ${animate ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          {/* Main content */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-1 bg-blue-400"></div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto">
              <span className="block mb-3">Klaar om te beginnen?</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-400">
                Word vandaag nog partner!
              </span>
            </h2>
            
            <p className="mt-6 text-xl text-blue-100 max-w-2xl mx-auto">
              Meld je vrijblijvend aan voor ons exclusieve retailer netwerk. Bij goedkeuring ontvang je een gratis proefpakket (t.w.v. €14,95).
            </p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link 
                href="/register" 
                className="relative flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium shadow-lg hover:shadow-blue-900/20 transition duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-70"></div>
                <span className="relative">Nu Aanmelden</span>
              </Link>
              
              <Link 
                href="/contact" 
                className="flex items-center justify-center px-6 py-4 text-base font-medium text-blue-200 hover:text-white border border-blue-500 hover:border-blue-300 transition duration-300"
              >
                Contact Opnemen
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* Exclusivity notice */}
          <div className="max-w-3xl mx-auto mb-16 p-4 bg-blue-900/30 border-l-2 border-blue-500">
            <p className="text-blue-100 text-center">
              <span className="font-semibold text-blue-300">Exclusief netwerk:</span> Wij hanteren een beleid van exclusiviteit per regio om voldoende omzet voor al onze partners te garanderen.
            </p>
          </div>
          
          {/* Split into two sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Timeline section */}
            <RetailerTimeline />
            
            {/* Package info section */}
            <RetailerPackageInfo />
          </div>
          
          {/* Social Proof Section - strategically placed between product info and final CTA */}
          <SocialProofSection />
          
          {/* Retailer Directory - shows all connected stores */}
          <RetailerDirectory />
          
          {/* Footer Info */}
          <div className="mt-12 flex justify-center space-x-8 text-sm text-blue-300">
            <div className="flex items-center">
              <span className="w-4 h-0.5 bg-blue-500 mr-2"></span>
              Geen verplichtingen
            </div>
            <div className="flex items-center">
              <span className="w-4 h-0.5 bg-blue-500 mr-2"></span>
              Gratis proefpakket
            </div>
            <div className="flex items-center">
              <span className="w-4 h-0.5 bg-blue-500 mr-2"></span>
              Persoonlijke ondersteuning
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 