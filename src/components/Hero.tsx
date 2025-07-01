"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function Hero() {
  // State for the interactive CTA elements
  const [showPromo, setShowPromo] = useState(false);
  const [registrationsToday, setRegistrationsToday] = useState(0);
  const [availableSamples, setAvailableSamples] = useState(0);
  const [email, setEmail] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 });
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [expiryHours] = useState(24); // Set how many hours the offer is valid for
  
  // Handle email submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Save to localStorage for persistence between page refreshes
      localStorage.setItem("retailer_interest_email", email);
      
      // Redirect to registration with email pre-filled
      window.location.href = `/register?email=${encodeURIComponent(email)}`;
    }
  };

  // Animate in limited availability metrics to create urgency
  useEffect(() => {
    // Set initial values after a short delay to create animation effect
    const timer1 = setTimeout(() => {
      setShowPromo(true);
    }, 800);
    
    // Generate a random number of today's registrations (between 8-17)
    const timer2 = setTimeout(() => {
      setRegistrationsToday(Math.floor(Math.random() * 10) + 8);
    }, 1500);
    
    // Calculate "remaining" sample packages (between 3-12)
    const timer3 = setTimeout(() => {
      setAvailableSamples(Math.floor(Math.random() * 10) + 3);
    }, 2000);
    
    // Handle countdown timer
    const interval = setInterval(() => {
      setCountdown(prev => {
        const newSeconds = prev.seconds - 1;
        if (newSeconds >= 0) return { ...prev, seconds: newSeconds };
        
        const newMinutes = prev.minutes - 1;
        if (newMinutes >= 0) return { hours: prev.hours, minutes: newMinutes, seconds: 59 };
        
        const newHours = prev.hours - 1;
        if (newHours >= 0) return { hours: newHours, minutes: 59, seconds: 59 };
        
        // Reset to 23:59:59 when it reaches 0
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative">
      {/* Main Hero Section */}
      <div className="relative overflow-hidden">
        {/* Limited Time Offer Banner - Both Mobile and Desktop */}
        <div className="bg-black text-white py-1.5 text-center flex justify-center items-center space-x-2 text-xs sm:text-sm sm:space-x-3 sm:py-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse-slow"></div>
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Tijdelijk aanbod: Gratis proefpakket nog</span>
          <span className="font-medium bg-yellow-500 text-black px-1.5 py-0.5 rounded">
            {countdown.hours.toString().padStart(2, '0')}:{countdown.minutes.toString().padStart(2, '0')}:{countdown.seconds.toString().padStart(2, '0')}
          </span>
          <span className="font-medium">beschikbaar</span>
        </div>
        
        {/* NEW: Wasstrips Banner - Both Mobile and Desktop */}
        <div className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600 text-white py-2 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-300/20 to-cyan-500/0 animate-pulse-slow"></div>
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center sm:space-x-4">
            <div className="flex items-center">
              <span className="inline-block bg-red-500 text-white text-xs px-2 py-0.5 font-bold rounded-full mr-2 animate-pulse">NIEUW</span>
              <span className="font-bold mr-1">Wasstrips:</span>
              <span className="hidden sm:inline">Revolutionaire eco-wasstrips - </span>
              <span className="font-medium">Al 25.000+ klanten in eerste maand!</span>
            </div>
            <Link 
              href="/register" 
              className="mt-1 sm:mt-0 inline-block bg-black text-white text-xs sm:text-sm px-3 py-1 rounded font-medium hover:bg-gray-800 transition-colors"
            >
              Meld u nu aan voor exclusieve toegang
            </Link>
          </div>
        </div>
        
        {/* Mobile text content - now ABOVE the image */}
        <div className="block md:hidden bg-yellow-400 p-5">
          {/* Star Rating */}
          <div className="bg-white rounded-full px-3 py-1.5 inline-flex items-center w-fit mb-3">
            <div className="flex text-yellow-400 mr-2">
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>
            <span className="text-gray-700 text-xs">4.8/5 (1400+ google reviews)</span>
          </div>
          
          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Boost Uw Omzet Met Premium Wasgeuren
          </h1>
          
          {/* Subheading */}
          <p className="text-sm text-gray-800 mb-3">
            <span className="font-semibold">150+ succesvolle retailers</span> verkopen al onze premium wasgeuren. Meld u nu aan en ontvang een <span className="bg-black text-white px-1">gratis proefpakket!</span>
          </p>
          
          {/* Interactive Promo Banners - Mobile */}
          <div className={`flex flex-col gap-2 mb-3 transition-all duration-700 ${showPromo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* NEW: Wasstrips Exclusive Promo for Mobile */}
            <div className="bg-white p-2.5 rounded-md border-2 border-cyan-500 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs px-2 py-0.5 font-semibold">
                Beperkte beschikbaarheid
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center mt-4">
                <div className="w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mr-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-800 font-semibold">NIEUW: Exclusieve Wasstrips</span>
                  <div className="text-xs text-gray-600">Al 25.000+ klanten - Speciale aanmelding vereist</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-2.5 rounded-md border border-yellow-500 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mr-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-800 font-semibold">100% vrijblijvend en zonder risico</span>
                  <div className="text-xs text-gray-600">Geen verplichtingen of contracten</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-2.5 rounded-md border border-yellow-500 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center">
                <div className="w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mr-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-800 font-semibold">Tot 60% marge op elk product</span>
                  <div className="text-xs text-gray-600">Exclusieve B2B-prijzen voor partners</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Email Form for Quick Registration - Mobile */}
          <form onSubmit={handleSubmit} className="mb-3">
            <div className="relative">
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                placeholder="Uw e-mailadres"
                className={`w-full p-2.5 border text-gray-900 rounded-md ${isEmailFocused ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-300'} focus:outline-none transition-all duration-300`}
                required
              />
              <div className="absolute top-2.5 right-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full mt-2 bg-black text-white px-6 py-2.5 text-base font-medium uppercase hover:bg-gray-800 transition-colors relative overflow-hidden group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-400/0 via-yellow-400/30 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ transform: 'translateX(-100%)' }}></div>
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-400/0 via-yellow-400/30 to-yellow-400/0 animate-shimmer-slow"></div>
              <span className="relative">DIRECT AANMELDEN</span>
            </button>
          </form>
          
          {/* Featured Retailer Quote - Mobile (moved from image overlay to here) */}
          <div className="mb-3 bg-yellow-200 rounded-lg p-3 border-l-4 border-yellow-400 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-300 rounded-full transform translate-x-8 -translate-y-8 opacity-20"></div>
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                </svg>
              </div>
              <div className="ml-2.5">
                <p className="text-gray-800 text-sm font-medium">
                  "Sinds we Wasgeurtje verkopen is onze omzet met 23% gestegen. Klanten komen speciaal hiervoor terug."
                </p>
                <p className="text-gray-700 text-xs mt-1 font-medium">- Emma de Vries, Bloemstylist & Partner</p>
              </div>
            </div>
          </div>
          
          {/* Limited Availability Counter - Mobile */}
          <div className={`transition-all duration-1000 ${registrationsToday > 0 ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-between text-xs text-gray-800 mb-1">
              <span className="flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                <span>{registrationsToday} aanmeldingen vandaag</span>
              </span>
              <span className="flex items-center">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                <span>Nog {availableSamples} proefpakketten</span>
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(registrationsToday / 20) * 100}%` }}></div>
            </div>
            
            {/* Guarantee text */}
            <div className="text-center text-xs text-gray-700">
              <span className="underline">100% tevredenheidsgarantie</span> - Geen verplichtingen
            </div>
          </div>
        </div>

        {/* Mobile First Approach - Image below the text on Mobile */}
        <div className="block md:hidden relative w-full h-[300px] overflow-hidden">
          <Image 
            src="/assets/images/hero/home-hero-new-2.webp" 
            alt="Wasgeurtje Hero"
            className="object-cover"
            objectPosition="115% 50%"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2">
          {/* Left Column - Gold Background with Text */}
          <div className="bg-yellow-400 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative z-10">
            {/* Star Rating */}
            <div className="bg-white rounded-full px-4 py-1.5 inline-flex items-center w-fit mb-6">
              <div className="flex text-yellow-400 mr-2">
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>
              <span className="text-gray-700 text-sm">4.8/5 (1400+ google reviews)</span>
            </div>
            
            {/* Heading */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              <span className="block">Boost Uw Omzet</span> 
              <span className="block">Met Premium Wasgeuren</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg text-gray-800 mb-6">
              <span className="font-semibold">150+ succesvolle retailers</span> verkopen al onze premium wasgeuren. Meld u nu aan en ontvang een <span className="bg-black text-white px-1">gratis proefpakket!</span>
            </p>
            
            {/* Interactive Promo Banners - Desktop */}
            <div className={`flex flex-col gap-3 mb-6 transition-all duration-700 ${showPromo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* NEW: Wasstrips Exclusive Promo for Desktop */}
              <div className="bg-gradient-to-r from-cyan-50 to-white p-3 rounded-lg border-l-4 border-cyan-500 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-red-600 text-white px-2 py-0.5 font-semibold">
                  BEPERKTE BESCHIKBAARHEID
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center mt-4">
                  <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-base text-gray-800 font-semibold">NIEUW: Exclusieve Wasstrips - Al 25.000+ klanten!</span>
                    <div className="text-sm text-gray-700">Beschikbaar na speciale aanmelding & aanbetaling - Explosieve vraag</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border-l-4 border-yellow-500 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-base text-gray-800 font-semibold">100% vrijblijvend en zonder risico</span>
                    <div className="text-sm text-gray-700">Geen verplichtingen, geen contracten, geen minimale afname</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border-l-4 border-yellow-500 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
            <div>
                    <span className="text-base text-gray-800 font-semibold">Tot 60% marge op elk product</span>
                    <div className="text-sm text-gray-700">Exclusieve B2B-prijzen voor retailpartners</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Email Form for Quick Registration - Desktop */}
            <form onSubmit={handleSubmit} className="mb-5 max-w-md">
              <div className="relative">
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  placeholder="Uw e-mailadres"
                  className={`w-full py-3 px-4 border text-gray-900 rounded-md ${isEmailFocused ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-300'} focus:outline-none transition-all duration-300`}
                  required
                />
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full mt-2 bg-black text-white px-6 py-3 text-base font-medium uppercase hover:bg-gray-800 transition-colors relative overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-400/0 via-yellow-400/30 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ transform: 'translateX(-100%)' }}></div>
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-400/0 via-yellow-400/30 to-yellow-400/0 animate-shimmer-slow"></div>
                <span className="relative">DIRECT AANMELDEN</span>
              </button>
            </form>
            
            {/* Featured Retailer Quote - Desktop (placed prominently before availability counter) */}
            <div className="mb-5 bg-yellow-100 rounded-lg p-4 border-l-4 border-yellow-400 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-300 rounded-full transform translate-x-8 -translate-y-8 opacity-20"></div>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-gray-800 text-base font-medium">
                    "Sinds we Wasgeurtje verkopen is onze omzet met 23% gestegen. Klanten komen speciaal hiervoor terug."
                  </p>
                  <p className="text-gray-700 text-sm mt-1.5 font-medium">- Emma de Vries, Bloemstylist & Partner</p>
                </div>
              </div>
            </div>
            
            {/* Limited Availability and Social Proof - Desktop */}
            <div className={`flex flex-col md:flex-row items-start transition-all duration-1000 ${registrationsToday > 0 ? 'opacity-100' : 'opacity-0'}`}>
              {/* Limited Availability Info */}
              <div className="flex-1 mb-3 md:mb-0">
                <div className="flex items-center gap-4 mb-1.5">
                  <span className="flex items-center">
                    <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    <span className="text-gray-800 text-sm">{registrationsToday} aanmeldingen vandaag</span>
                  </span>
                  <span className="flex items-center">
                    <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>
                    <span className="text-gray-800 text-sm">Nog {availableSamples} proefpakketten</span>
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-2">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full relative overflow-hidden"
                    style={{ width: `${(registrationsToday / 20) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/70 to-green-400/0 animate-shimmer"></div>
                  </div>
                </div>
                
                {/* Guarantee text */}
                <div className="text-sm text-gray-00">
                  <span className="underline">100% tevredenheidsgarantie</span> - Geen verplichtingen
                </div>
              </div>
              
              {/* Retailer testimonial - Removed since we moved it higher up */}
            </div>
          </div>
          
          {/* Right Column - Product Image */}
          <div className="bg-gray-100 relative overflow-hidden">
            <div className="h-full w-full">
              <div className="relative h-full w-full min-h-[550px]">
                <Image 
                  src="/assets/images/hero/home-hero-new-2.webp" 
                  alt="Wasgeurtje Hero"
                  className="object-cover scale-[1.2]"
                  objectPosition="95% 35%"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                
                {/* Overlay Markers showing retailers on map */}
                <div className="absolute inset-0">
                  {/* Example Retailer Markers (positioned using percentages) */}
                  <div className="absolute top-[25%] left-[35%]">
                    <div className="relative">
                      <div className="animate-ping-slow absolute h-4 w-4 rounded-full bg-yellow-400 opacity-75"></div>
                      <div className="relative h-2 w-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                  <div className="absolute top-[45%] left-[55%]">
                    <div className="relative">
                      <div className="animate-ping-slow absolute h-4 w-4 rounded-full bg-yellow-400 opacity-75"></div>
                      <div className="relative h-2 w-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                  <div className="absolute top-[65%] left-[30%]">
                    <div className="relative">
                      <div className="animate-ping-slow absolute h-4 w-4 rounded-full bg-yellow-400 opacity-75"></div>
                      <div className="relative h-2 w-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                  <div className="absolute top-[35%] left-[70%]">
                    <div className="relative">
                      <div className="animate-ping-slow absolute h-4 w-4 rounded-full bg-yellow-400 opacity-75"></div>
                      <div className="relative h-2 w-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                  <div className="absolute top-[55%] left-[45%]">
                    <div className="relative">
                      <div className="animate-ping-slow absolute h-4 w-4 rounded-full bg-yellow-400 opacity-75"></div>
                      <div className="relative h-2 w-2 rounded-full bg-yellow-500"></div>
                    </div>
                  </div>
                </div>
                
                {/* NEW Badge Overlay */}
                <div className="absolute top-6 right-6 bg-yellow-500 text-black font-bold py-1.5 px-5 rounded-full transform rotate-12 shadow-lg">
                  <span className="text-lg">NIEUW</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Benefits Section (horizontal) */}
        <div className="md:hidden bg-white py-3">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center text-center">
              {/* Benefit 1 */}
              <div className="flex flex-col items-center w-1/3">
                <div className="h-10 w-10 text-[#c8a655] mb-1.5">
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-700">Veilig voor alle<br />stoffen en machines</p>
              </div>
              
              {/* Benefit 2 */}
              <div className="flex flex-col items-center w-1/3">
                <div className="h-10 w-10 text-[#c8a655] mb-1.5">
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-700">Geformuleerd voor<br />de gevoelige huid</p>
              </div>
              
              {/* Benefit 3 */}
              <div className="flex flex-col items-center w-1/3">
                <div className="h-10 w-10 text-[#c8a655] mb-1.5">
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-700">Milieuvriendelijk &<br />Parabeenvrij</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wavy Divider */}
        <div className="absolute bottom-0 left-0 w-full z-10 hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="w-full" preserveAspectRatio="none">
            <path 
              fill="#f8f5eb" 
              fillOpacity="1" 
              d="M0,100 L0,40 C240,90 480,10 720,30 C960,50 1200,90 1440,40 L1440,100 Z"
            ></path>
          </svg>
        </div>
      </div>
      
      {/* Desktop Benefits Section */}
      <div className="hidden md:block relative bg-[#f8f5eb] z-20 pb-16 pt-12 border-b border-[#e3d8b5]">
        {/* Top wavy border */}
        <div className="absolute top-0 left-0 w-full z-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 30" className="w-full" preserveAspectRatio="none">
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Benefit 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-[#e3d8b5]">
                <div className="h-10 w-10 text-[#c8a655]">
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-medium text-gray-700">Gratis startpakket bij<br />goedkeuring</h3>
            </div>
            
            {/* Benefit 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-[#e3d8b5]">
                <div className="h-10 w-10 text-[#c8a655]">
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-medium text-gray-700">Hoge marges en<br />B2B-prijzen</h3>
            </div>
            
            {/* Benefit 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-[#e3d8b5]">
                <div className="h-10 w-10 text-[#c8a655]">
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-medium text-gray-700">Direct toegang tot ons<br />retail portaal</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 