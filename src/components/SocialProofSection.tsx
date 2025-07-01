"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

type Testimonial = {
  id: number;
  name: string;
  business: string;
  location: string;
  text: string;
  avatar: string;
  rating: number;
  tag: 'success' | 'growth' | 'support';
  highlight?: string;
};

export default function SocialProofSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTag, setActiveTag] = useState<'all' | 'success' | 'growth' | 'support'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [interactionPoints, setInteractionPoints] = useState(0);
  const [hasShownInterest, setHasShownInterest] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{days: number, hours: number} | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // Retailer statistics with animated counters
  const [stats, setStats] = useState({
    retailers: 0,
    avgSales: 0,
    satisfaction: 0,
    retention: 0
  });
  
  const targetStats = {
    retailers: 217,
    avgSales: 64,
    satisfaction: 98,
    retention: 96
  };
  
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Emma de Vries",
      business: "Bloemenhuis Tulipa",
      location: "Amsterdam",
      text: "De wasgeurtjes zijn een perfecte aanvulling op ons assortiment. Klanten komen speciaal terug voor deze geuren en we zien een hogere herhalingsaankoop. De marge is uitstekend en de ondersteuning top!",
      avatar: "/images/avatars/retailer-1.jpg",
      rating: 5,
      tag: 'success',
      highlight: "60% hogere winstmarge"
    },
    {
      id: 2,
      name: "Lars Janssen",
      business: "Interieur & Meer",
      location: "Utrecht",
      text: "De producten verkopen zichzelf - elegant design, heerlijke geuren en een geweldige presentatie. Onze klanten zijn enthousiast en we kunnen de voorraad nauwelijks bijhouden. De samenwerking is professioneel en persoonlijk.",
      avatar: "/images/avatars/retailer-2.jpg",
      rating: 5,
      tag: 'growth',
      highlight: "2x omzetgroei in 3 maanden"
    },
    {
      id: 3,
      name: "Sophie Bakker",
      business: "Groene Vingers",
      location: "Groningen",
      text: "Wasgeurtje heeft ons geholpen ons assortiment uit te breiden met producten die echt passen bij onze winkel. De exclusiviteit per regio geeft ons een voorsprong op concurrenten. De starterspakketten maakten de investering laagdrempelig.",
      avatar: "/images/avatars/retailer-3.jpg",
      rating: 4,
      tag: 'support',
      highlight: "Exclusiviteit in de regio"
    },
    {
      id: 4,
      name: "Thomas Visser",
      business: "Sfeer & Cadeau",
      location: "Eindhoven",
      text: "Aanvankelijk twijfelde ik, maar het proefpakket overtuigde direct. De kwaliteit is consistent hoog en klanten komen terug voor navullingen. De marketing ondersteuning en display materialen maken het gemakkelijk om te verkopen.",
      avatar: "/images/avatars/retailer-4.jpg",
      rating: 5,
      tag: 'success',
      highlight: "43% herhalingsaankopen"
    },
    {
      id: 5,
      name: "Marieke Smit",
      business: "Huiskamer Conceptstore",
      location: "Rotterdam",
      text: "De wasgeurtjes zijn nu onze bestverkopende productlijn. Het team staat altijd klaar met advies en de seizoenscollecties houden het assortiment fris en interessant. Een echte aanrader voor winkels die zich willen onderscheiden.",
      avatar: "/images/avatars/retailer-5.jpg",
      rating: 5,
      tag: 'growth',
      highlight: "Bestverkopende productlijn"
    },
  ];
  
  const filteredTestimonials = activeTag === 'all' 
    ? testimonials 
    : testimonials.filter(t => t.tag === activeTag);
  
  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isExpanded) {
        setActiveIndex((current) => (current + 1) % filteredTestimonials.length);
      }
    }, 8000);
    
    return () => clearInterval(interval);
  }, [filteredTestimonials.length, isExpanded]);
  
  // Animate stats counters when visible
  useEffect(() => {
    if (!isVisible) return;
    
    const animateStats = () => {
      const duration = 2000; // 2 seconds
      const steps = 60;
      const interval = duration / steps;
      
      let step = 0;
      
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        
        setStats({
          retailers: Math.round(progress * targetStats.retailers),
          avgSales: Math.round(progress * targetStats.avgSales),
          satisfaction: Math.round(progress * targetStats.satisfaction),
          retention: Math.round(progress * targetStats.retention)
        });
        
        if (step >= steps) {
          clearInterval(timer);
        }
      }, interval);
      
      return () => clearInterval(timer);
    };
    
    animateStats();
  }, [isVisible]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    const element = document.getElementById('social-proof');
    if (element) observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);
  
  // Track user engagement
  const trackInteraction = (points: number, type: string) => {
    setInteractionPoints(prev => prev + points);
    
    // If user has shown significant interest, show special CTA
    if (interactionPoints > 5 && !hasShownInterest) {
      setHasShownInterest(true);
      
      // You could trigger a special offer or modal here
      try {
        // Store in localStorage that this user is highly interested
        localStorage.setItem('retailer_interest_level', 'high');
        
        // For analytics, you could send an event to your backend
        // This is just a placeholder - would need a real endpoint
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/interest', JSON.stringify({
            level: 'high',
            interactions: interactionPoints,
            testimonial_viewed: activeIndex,
            tag_selected: activeTag
          }));
        }
      } catch (e) {
        // Silent fail - analytics should never break UX
      }
    }
  };
  
  // Handle manual navigation
  const goToSlide = (index: number) => {
    setActiveIndex(index);
    setIsExpanded(false);
    trackInteraction(1, 'testimonial_navigation');
  };
  
  const handleTagFilter = (tag: 'all' | 'success' | 'growth' | 'support') => {
    setActiveTag(tag);
    setActiveIndex(0);
    trackInteraction(2, 'tag_filter');
  };
  
  // Check if there's an active timer from RetailerPackageInfo
  useEffect(() => {
    const checkTimer = () => {
      const endTimeStr = localStorage.getItem('promoEndTime');
      if (endTimeStr) {
        const endTime = new Date(endTimeStr);
        const now = new Date();
        const difference = endTime.getTime() - now.getTime();
        
        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
          setTimeRemaining({ days, hours });
        } else {
          setTimeRemaining(null);
        }
      }
    };
    
    // Check immediately and then every minute
    checkTimer();
    const interval = setInterval(checkTimer, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div 
      id="social-proof" 
      className="bg-slate-900/50 backdrop-blur-sm border border-blue-900/30 p-8 relative overflow-hidden mt-12"
    >
      {/* Background elements */}
      <div className="absolute -left-32 -top-32 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
      <div className="absolute -right-32 -bottom-32 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl"></div>
      
      {/* Timer-sync indicator */}
      {timeRemaining && timeRemaining.days <= 1 && (
        <div className={`
          absolute top-4 left-4 z-30 px-3 py-1 rounded-full bg-rose-500/80 
          text-xs text-white font-medium flex items-center gap-1
          animate-pulse
        `}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
          </svg>
          <span>
            {timeRemaining.days === 0 
              ? 'Aanbieding eindigt vandaag!' 
              : 'Nog 1 dag beschikbaar!'}
          </span>
        </div>
      )}
      
      {/* Header with TrustPilot score */}
      <div className={`
        flex flex-col md:flex-row items-center justify-between mb-10
        transform transition-all duration-1000
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}
      `}>
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-emerald-400 to-blue-500 text-transparent bg-clip-text">
              Winkeliers Vertrouwen Ons
            </span>
          </h2>
          <p className="text-blue-200 max-w-xl">
            Sluit je aan bij meer dan 200 succesvolle retailers die hun omzet verhoogden met onze premium wasgeurtjes
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-gray-400 text-sm">Reviews</div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg 
                  key={star} 
                  className={`w-5 h-5 ${star <= 4.5 ? 'text-emerald-500' : 'text-emerald-500/30'}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <div className="font-bold text-white text-lg">4,5</div>
          </div>
          <a 
            href="https://nl.trustpilot.com/review/wasgeurtje.nl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 group transition-transform hover:scale-105"
          >
            <span className="font-bold text-white">Trustpilot</span>
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">1.281 reviews</span>
            <svg className="w-3 h-3 text-gray-400 group-hover:text-gray-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.293 7.294-1.414-1.414L17.586 5H13V3h8z" />
            </svg>
          </a>
        </div>
      </div>
      
      {/* Retailer Stats Section */}
      <div className={`
        grid grid-cols-2 md:grid-cols-4 gap-4 mb-12
        transform transition-all duration-1000 delay-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-900/20 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.retailers}+</div>
          <div className="text-sm text-blue-300">Actieve retailers</div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-900/20 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.avgSales}%</div>
          <div className="text-sm text-blue-300">Gemiddelde winstmarge</div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-900/20 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.satisfaction}%</div>
          <div className="text-sm text-blue-300">Klanttevredenheid</div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-900/20 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.retention}%</div>
          <div className="text-sm text-blue-300">Retailer retentie</div>
        </div>
      </div>
      
      {/* Testimonial filters */}
      <div className={`
        flex flex-wrap gap-2 mb-6 justify-center
        transform transition-all duration-1000 delay-500
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        {[
          { label: 'Alle verhalen', value: 'all' },
          { label: '💰 Omzetgroei', value: 'success' },
          { label: '📈 Groeiverhalen', value: 'growth' },
          { label: '🤝 Ondersteuning', value: 'support' }
        ].map((tag) => (
          <button
            key={tag.value}
            onClick={() => handleTagFilter(tag.value as any)}
            className={`
              px-4 py-2 rounded-full text-sm transition-all
              ${activeTag === tag.value 
                ? 'bg-blue-600 text-white font-medium' 
                : 'bg-slate-800/50 text-blue-300 hover:bg-slate-700/50'}
            `}
          >
            {tag.label}
          </button>
        ))}
      </div>
      
      {/* Testimonials Slider */}
      <div 
        className={`
          relative overflow-hidden mb-8 transition-all duration-700
          ${isExpanded ? 'h-auto' : 'h-[220px] md:h-[200px]'}
        `}
        ref={sliderRef}
        onClick={() => trackInteraction(1, 'testimonial_read')}
      >
        <div className={`
          transition-all duration-1000 delay-700
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}>
          {filteredTestimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`
                absolute inset-0 p-6 bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-lg border border-blue-900/30
                flex flex-col transition-all duration-700 transform
                ${isExpanded 
                  ? 'static opacity-100 translate-y-0 mb-4 h-auto' 
                  : index === activeIndex 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8 pointer-events-none'}
              `}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-xl font-bold text-white overflow-hidden">
                  {testimonial.avatar ? (
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    testimonial.name.charAt(0)
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{testimonial.name}</h4>
                      <p className="text-sm text-blue-300">{testimonial.business}, {testimonial.location}</p>
                    </div>
                    
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i} 
                          className={`w-4 h-4 ${i < testimonial.rating ? 'text-amber-400' : 'text-gray-600'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-blue-100 text-sm mb-3 flex-1">"{testimonial.text}"</p>
              
              {testimonial.highlight && (
                <div className="mt-auto self-start inline-block bg-gradient-to-r from-emerald-900/50 to-blue-900/50 px-3 py-1 rounded-full text-xs text-emerald-300 border border-emerald-500/20">
                  ✨ {testimonial.highlight}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Slider controls */}
      <div className={`
        flex items-center justify-between
        transform transition-all duration-1000 delay-900
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <div className="flex items-center gap-2">
          {filteredTestimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                w-2 h-2 rounded-full transition-all
                ${activeIndex === index 
                  ? 'bg-blue-500 w-6' 
                  : 'bg-gray-600 hover:bg-gray-500'}
              `}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>
        
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            trackInteraction(3, isExpanded ? 'collapse_testimonials' : 'expand_testimonials');
          }}
          className="text-blue-300 hover:text-white text-sm flex items-center transition-colors"
        >
          <span>{isExpanded ? 'Minder tonen' : 'Alle verhalen tonen'}</span>
          <svg 
            className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Retailer map visualization */}
      <div className={`
        mt-12 pt-10 border-t border-blue-900/30
        transform transition-all duration-1000 delay-1000
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <h3 className="text-xl font-semibold text-white mb-6 text-center">
          Retailers door heel Nederland
        </h3>
        
        <div className="relative h-[300px] bg-slate-800/50 rounded-lg overflow-hidden border border-blue-900/30">
          {/* Country map outline with dots for retailers */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-64 border-2 border-blue-500/20 relative">
              {/* Stylized map of Netherlands */}
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" fill="none">
                <path 
                  d="M30,85 Q35,80 38,70 Q42,60 50,50 Q55,45 60,35 Q65,25 60,15 Q55,10 45,15 Q40,18 30,15 Q25,12 20,15 Q15,20 20,30 Q25,40 20,50 Q15,60 20,70 Q25,80 30,85 Z" 
                  className="stroke-blue-500/40 fill-blue-900/10"
                  strokeWidth="1"
                />
              </svg>
              
              {/* Animated retailer dots */}
              {[
                { x: 65, y: 20, delay: 0 },    // North Holland
                { x: 70, y: 30, delay: 0.5 },  // Utrecht
                { x: 60, y: 40, delay: 1 },    // South Holland
                { x: 45, y: 25, delay: 1.5 },  // Friesland
                { x: 40, y: 60, delay: 2 },    // North Brabant
                { x: 75, y: 65, delay: 2.5 },  // Limburg
                { x: 30, y: 45, delay: 3 },    // Zeeland
                { x: 55, y: 15, delay: 3.5 },  // Groningen
                { x: 30, y: 30, delay: 4 },    // Flevoland
                { x: 50, y: 75, delay: 4.5 },  // Limburg South
              ].map((dot, index) => (
                <div 
                  key={index}
                  className="absolute w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    animationDelay: `${dot.delay}s`,
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                  }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/20 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
            <span className="text-xs text-blue-100">Actieve retailer locaties</span>
          </div>
        </div>
      </div>
      
      {/* Call to action */}
      <div className={`
        mt-10 text-center
        transform transition-all duration-1000 delay-1100
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <a 
          href="/register" 
          className={`
            inline-flex items-center group
            ${timeRemaining && timeRemaining.days === 0 ? 'animate-urgent' : ''}
          `}
          onClick={() => trackInteraction(5, 'cta_click')}
        >
          <span className="relative inline-flex overflow-hidden rounded">
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-emerald-600"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            <span className="relative z-10 px-6 py-3 text-white font-medium">Word ook retailer</span>
          </span>
          <span className="ml-2 text-blue-400 group-hover:translate-x-1 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </a>
        
        {/* Enhanced CTA for engaged users */}
        {hasShownInterest && (
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-lg border border-emerald-500/20 animate-pulse-slow">
            <p className="text-emerald-300 text-sm">
              <span className="font-medium">Wow, wat leuk!</span> Jij lijkt echt geïnteresseerd in ons retailer netwerk. 
              <br className="hidden md:block" />
              <span className="text-white font-medium">
                {timeRemaining && timeRemaining.days <= 1 
                  ? "LAATSTE KANS: Vermeld code \"WASGEURTJE15\" voor 15% EXTRA korting op je starterpakket!" 
                  : "Vermeld code \"WASGEURTJE10\" bij je aanmelding voor 10% korting op je starterpakket!"}
              </span>
            </p>
          </div>
        )}
        
        <p className="mt-4 text-sm text-blue-300">
          Sluit je aan bij het succesverhaal van Wasgeurtje retailers
        </p>
      </div>
    </div>
  );
} 