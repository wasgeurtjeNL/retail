"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function RetailerPackageInfo() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [confetti, setConfetti] = useState<{x: number, y: number, size: number, color: string}[]>([]);
  // Timer state
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number}>({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });
  const [timerExpired, setTimerExpired] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Parallax effect for package elements
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left;
    const y = e.clientY - card.top;
    
    const centerX = card.width / 2;
    const centerY = card.height / 2;
    
    const moveX = (x - centerX) / 20;
    const moveY = (y - centerY) / 20;
    
    setPosition({ x: moveX, y: moveY });
  };
  
  // Create confetti explosion
  const explode = () => {
    if (isExploding) return;
    
    setIsExploding(true);
    
    const newConfetti = [];
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];
    
    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        x: 50 + Math.random() * 50 - 25,
        y: 50 + Math.random() * 50 - 25,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setConfetti(newConfetti);
    
    setTimeout(() => {
      setIsExploding(false);
      setConfetti([]);
    }, 2000);
  };

  // Initialize and update countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      // Get from localStorage or set a new end date (3 days from now)
      let endTime = localStorage.getItem('promoEndTime');
      let endDate: Date;
      
      if (!endTime || new Date(endTime).getTime() <= new Date().getTime()) {
        // Set a new end date (3 days from now) if timer expired or doesn't exist
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 3);
        endDate.setHours(23, 59, 59, 999); // End at midnight
        localStorage.setItem('promoEndTime', endDate.toString());
        setTimerExpired(false);
      } else {
        endDate = new Date(endTime);
      }
      
      const difference = endDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimerExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft());
    
    // Update timer every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // If timer expired, set a new end time for next visit
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setTimerExpired(true);
        
        // Reset timer for next time
        const nextEndDate = new Date();
        nextEndDate.setDate(nextEndDate.getDate() + 3);
        nextEndDate.setHours(23, 59, 59, 999);
        localStorage.setItem('promoEndTime', nextEndDate.toString());
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
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
    
    const element = document.getElementById('retailer-package');
    if (element) observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);
  
  const features = [
    {
      title: "5 Bestsellers",
      description: "Onze populairste geuren",
      icon: (
        <svg className="w-full h-full text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V8L16 3ZM7 7H12V9H7V7ZM17 17H7V15H17V17ZM17 13H7V11H17V13ZM15 9V5L19 9H15Z" />
        </svg>
      ),
      detail: "Bestaande uit Morning Vapor, Blossom Drip, Full Moon, Flower Rain en Sundance.",
      iconBg: "from-emerald-600 to-teal-500",
      cardBg: "emerald-500/5",
      border: "emerald-400"
    },
    {
      title: "Snelle Levering",
      description: "Binnen 2-3 werkdagen",
      icon: (
        <svg className="w-full h-full text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" />
        </svg>
      ),
      detail: "We verzenden je pakket direct na goedkeuring via PostNL pakketdienst.",
      iconBg: "from-purple-600 to-indigo-500",
      cardBg: "purple-500/5",
      border: "purple-400"
    },
    {
      title: "Hoge Marge",
      description: "Maximale winst",
      icon: (
        <svg className="w-full h-full text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.5 15H6.32C6.47 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" />
        </svg>
      ),
      detail: "Gemiddelde winstmarge van 60% op alle producten in ons assortiment.",
      iconBg: "from-amber-500 to-orange-500",
      cardBg: "amber-500/5",
      border: "amber-400"
    }
  ];

  return (
    <div 
      id="retailer-package"
      ref={cardRef}
      className="bg-slate-900/50 backdrop-blur-sm border border-blue-900/30 p-8 relative overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
    >
      {/* Animated background elements */}
      <div className="absolute -left-16 top-32 w-40 h-40 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute right-20 bottom-20 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full blur-3xl animate-float-slow"></div>
      <div className="absolute top-20 left-64 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      
      {/* Countdown timer */}
      <div className={`
        absolute top-4 right-4 z-20 
        px-3 py-2 rounded
        bg-gradient-to-r from-rose-500/80 to-amber-500/80 backdrop-blur-sm
        border border-amber-400/30
        transform transition-all duration-500
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
        animate-pulse-slow
      `}>
        <div className="flex flex-col items-center">
          <div className="text-xs text-white font-semibold mb-1 uppercase tracking-wider flex items-center">
            <svg className="w-3 h-3 mr-1 animate-pulse text-amber-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            Aanbieding verloopt in:
          </div>
          
          <div className="flex items-center space-x-2 justify-center">
            <div className="flex flex-col items-center">
              <div className="text-white font-bold text-lg min-w-[1.5rem] text-center">{String(timeLeft.days).padStart(2, '0')}</div>
              <div className="text-amber-200 text-[0.6rem] uppercase">Dagen</div>
            </div>
            
            <div className="text-white font-bold text-lg">:</div>
            
            <div className="flex flex-col items-center">
              <div className="text-white font-bold text-lg min-w-[1.5rem] text-center">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="text-amber-200 text-[0.6rem] uppercase">Uur</div>
            </div>
            
            <div className="text-white font-bold text-lg">:</div>
            
            <div className="flex flex-col items-center">
              <div className="text-white font-bold text-lg min-w-[1.5rem] text-center">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="text-amber-200 text-[0.6rem] uppercase">Min</div>
            </div>
            
            <div className="text-white font-bold text-lg">:</div>
            
            <div className="flex flex-col items-center">
              <div className="text-white font-bold text-lg min-w-[1.5rem] text-center">{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div className="text-amber-200 text-[0.6rem] uppercase">Sec</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 3D Floating package elements */}
      <div className="absolute w-20 h-20 top-8 right-16 opacity-40 animate-float-slow pointer-events-none hidden md:block"
           style={{
             transform: `translateX(${position.x * 1.5}px) translateY(${position.y * 1.5}px) rotate(${position.x}deg)`,
             transition: 'transform 0.1s ease-out'
           }}>
        <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-500/60">
          <path fill="currentColor" d="M50 0L93.3 25v50L50 100L6.7 75V25L50 0z"/>
        </svg>
      </div>
      
      <div className="absolute w-16 h-16 bottom-12 left-12 opacity-40 animate-float pointer-events-none hidden md:block"
           style={{
             transform: `translateX(${-position.x * 2}px) translateY(${-position.y * 2}px) rotate(${-position.y}deg)`,
             transition: 'transform 0.1s ease-out',
             animationDelay: '1s'
           }}>
        <svg viewBox="0 0 100 100" className="w-full h-full text-purple-500/60">
          <circle cx="50" cy="50" r="50" fill="currentColor"/>
        </svg>
      </div>
      
      <div className="absolute w-12 h-12 top-32 right-32 opacity-40 animate-float-slow pointer-events-none hidden md:block"
           style={{
             transform: `translateX(${-position.x * 1.3}px) translateY(${position.y * 1.3}px) rotate(${position.x * 2}deg)`,
             transition: 'transform 0.1s ease-out',
             animationDelay: '2s'
           }}>
        <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500/60">
          <rect width="100" height="100" fill="currentColor"/>
        </svg>
      </div>
      
      {/* Confetti explosion */}
      {isExploding && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((particle, i) => (
            <div 
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                transform: `scale(${Math.random() * 0.5 + 0.5})`,
                animationDuration: `${1 + Math.random() * 1}s`
              }}
            ></div>
          ))}
        </div>
      )}
      
      {/* Header with animated gradient */}
      <div 
        className={`flex items-center justify-between mb-8 pb-6 border-b border-blue-900/50 relative
          transition-all duration-1000 ease-out transform
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
      >
        <div className="flex items-center">
          <div 
            className="mr-3 p-3 bg-gradient-to-br from-amber-500 to-rose-600 relative overflow-hidden group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-shadow duration-500 cursor-pointer"
            onClick={explode}
          >
            {/* Animated gift box icon */}
            <svg className="h-6 w-6 text-white relative z-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z"/>
            </svg>
            
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </div>
          
          <div className="relative">
            <div className="flex items-center">
              <h3 className="text-2xl font-bold text-white tracking-wider relative z-10">
                GRATIS PROEFPAKKET
              </h3>
              <div className="hidden md:block ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-full transform -rotate-3 scale-90 animate-pulse-slow">
                Nieuw!
              </div>
            </div>
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></span>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col items-end">
          <div className="relative text-xs uppercase tracking-wider font-semibold px-3 py-1 overflow-hidden group-hover:text-white transition-colors duration-500 border border-amber-400/50 rounded-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 bg-gradient-to-r from-amber-400 to-rose-400 text-transparent bg-clip-text">T.W.V. €14,95</span>
          </div>
          
          {/* Limited availability message */}
          <div className={`
            mt-2 text-[0.65rem] text-rose-300 font-medium flex items-center
            ${timeLeft.days <= 1 ? 'animate-pulse' : ''}
          `}>
            <svg className="w-2.5 h-2.5 mr-1 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span>
              {timeLeft.days <= 0 
                ? "Laatste kans - bijna afgelopen!" 
                : timeLeft.days === 1 
                  ? "Nog maar één dag beschikbaar!"
                  : "Beperkt aantal pakketten beschikbaar"}
            </span>
          </div>
        </div>
      </div>
      
      {/* Features with animations */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-300 ease-out transform
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {features.map((feature, index) => (
          <div 
            key={index}
            className={`p-6 border-l-2 border-${feature.border} bg-${feature.cardBg} flex flex-col relative group/feature overflow-hidden rounded-r-sm`}
            onMouseEnter={() => setActiveFeature(index)}
            onMouseLeave={() => setActiveFeature(null)}
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `translateY(${isVisible ? '0px' : '20px'})`,
              transitionDelay: `${300 + index * 150}ms`
            }}
          >
            {/* Background glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.iconBg}/5 transform transition-transform duration-700 ease-in-out ${
              activeFeature === index ? 'scale-100' : 'scale-0'
            }`}></div>
            
            <div className="flex items-center mb-4 relative">
              <div className="w-8 h-8 relative">
                {/* Icon background with animated gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.iconBg} rounded-sm transform transition-all duration-300 ${
                  activeFeature === index ? 'scale-110 rotate-3 opacity-100' : 'scale-90 rotate-0 opacity-0'
                }`}></div>
                
                {/* Static icon */}
                <div className={`absolute inset-0 transition-all duration-300 ${
                  activeFeature === index ? 'opacity-0' : 'opacity-100'
                }`}>
                  {feature.icon}
                </div>
                
                {/* Animated icon (white version) */}
                <div className={`absolute inset-0 text-white transition-all duration-300 ${
                  activeFeature === index ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                }`}>
                  {feature.icon}
                </div>
              </div>
              
              <h4 className="ml-3 text-lg font-semibold text-white flex items-center">
                {feature.title}
                <span className={`inline-block ml-2 w-1.5 h-1.5 rounded-full bg-${feature.border} transition-all duration-300 ${
                  activeFeature === index ? 'opacity-100 scale-125' : 'opacity-0 scale-0'
                }`}></span>
              </h4>
            </div>
            
            <p className="text-blue-200 text-sm mt-auto">
              {feature.description}
            </p>
            
            {/* Expandable detail section with 3D effect */}
            <div 
              className={`
                relative mt-3 text-xs text-blue-300 rounded overflow-hidden transition-all duration-500 
                transform perspective-500
                ${activeFeature === index 
                  ? 'max-h-24 opacity-100 rotateX-0' 
                  : 'max-h-0 opacity-0 rotateX-90 overflow-hidden'
                }
              `}
              style={{
                transformOrigin: 'top'
              }}
            >
              <div className="p-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-sm">
                <div className="absolute inset-0 bg-gradient-to-br ${feature.iconBg}/5 opacity-50"></div>
                <p className="relative z-10">{feature.detail}</p>
              </div>
            </div>
            
            {/* Interactive show details button */}
            <button 
              className={`
                mt-3 text-xs flex items-center justify-center py-1.5 transition-all duration-300
                text-${feature.border} hover:text-white
                ${activeFeature === index ? 'opacity-0' : 'opacity-80 hover:opacity-100'}
              `}
              onClick={() => setActiveFeature(activeFeature === index ? null : index)}
            >
              <span>Meer details</span>
              <svg className="ml-1.5 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      
      {/* Message box with animated border */}
      <div className={`
        p-6 bg-slate-800/50 backdrop-blur-sm relative overflow-hidden
        transition-all duration-1000 delay-700 ease-out transform
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        {/* Animated rainbow gradient border */}
        <div className="absolute inset-0 p-[1px]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-purple-500 via-amber-500 to-rose-500 opacity-50 animate-border-move"></div>
        </div>
        
        <div className="relative">
          <p className="text-blue-100">
            <span className="inline-flex items-center text-rose-400 font-semibold mb-1">
              <svg className="w-4 h-4 mr-2 animate-pulse-slow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              Let op:
            </span> Na ontvangst van het proefpakket heb je 14 dagen om je account te activeren. 
            Bij activering ontvang je een starterspakket op factuur. Activeer je niet tijdig, dan kan je plek aan een andere retailer worden toegewezen.
          </p>
          
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center px-3 py-1.5 bg-emerald-900/30 rounded-full border border-emerald-500/30">
              <svg className="w-3 h-3 text-emerald-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <p className="text-xs text-emerald-300">Vrijblijvend proeven</p>
            </div>
            
            <div className="flex items-center px-3 py-1.5 bg-purple-900/30 rounded-full border border-purple-500/30">
              <svg className="w-3 h-3 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <p className="text-xs text-purple-300">Geen verplichting</p>
            </div>
            
            <div className="flex items-center px-3 py-1.5 bg-amber-900/30 rounded-full border border-amber-500/30">
              <svg className="w-3 h-3 text-amber-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <p className="text-xs text-amber-300">Persoonlijke ondersteuning</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className={`
        mt-8 flex justify-center gap-4 transform transition-all duration-1000 delay-1000
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}>
        <a 
          href="/register" 
          className={`
            group relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white overflow-hidden
            ${timeLeft.days === 0 ? 'animate-urgent' : ''}
          `}
        >
          {/* Button background and effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-rose-500 rounded"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-amber-500 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Glow effect */}
          <div className={`
            absolute inset-0 rounded transition-opacity duration-500 blur-md bg-gradient-to-r from-amber-500/50 to-rose-500/50
            ${timeLeft.days <= 0 ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'}
          `}></div>
          
          {/* Content */}
          <div className="relative flex items-center">
            <svg className={`w-5 h-5 mr-2 ${timeLeft.days === 0 ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z"></path>
            </svg>
            <span>
              {timeLeft.days === 0 
                ? "Direct Aanvragen - Laatste Kans!" 
                : "Vraag Proefpakket Aan"}
            </span>
          </div>
          
          {/* Urgency indicator */}
          {timeLeft.days <= 1 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          )}
        </a>
        
        <a 
          href="/contact" 
          className="group relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium overflow-hidden"
        >
          {/* Button background and effects */}
          <span className="relative z-10 text-blue-300 group-hover:text-white transition-colors duration-300">Meer informatie</span>
          <div className="absolute inset-0 border border-blue-500/30 rounded opacity-100 group-hover:border-blue-400 transition-colors duration-300"></div>
          <div className="absolute inset-0 bg-blue-600/0 rounded group-hover:bg-blue-600/80 transition-colors duration-300"></div>
        </a>
      </div>
      
      {/* Social sharing section - connects with social proof */}
      <div className={`
        mt-8 text-center transform transition-all duration-1000 delay-1200
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        <div className="text-xs text-blue-300 mb-2 uppercase tracking-wider">
          Deel dit pakket met collega retailers
        </div>
        
        <div className="flex justify-center space-x-3">
          {[
            { 
              name: "Facebook", 
              icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              ),
              url: "https://www.facebook.com/sharer/sharer.php?u=https://wasgeurtje.nl/retailer-worden"
            },
            { 
              name: "Twitter", 
              icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                </svg>
              ),
              url: "https://twitter.com/intent/tweet?text=Ontdek%20het%20Wasgeurtje%20retailer%20netwerk&url=https://wasgeurtje.nl/retailer-worden"
            },
            { 
              name: "LinkedIn", 
              icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              ),
              url: "https://www.linkedin.com/sharing/share-offsite/?url=https://wasgeurtje.nl/retailer-worden"
            },
            { 
              name: "WhatsApp", 
              icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.869 9.869 0 0 1-1.516-5.26c0-5.445 4.455-9.885 9.942-9.885a9.865 9.865 0 0 1 7.022 2.92 9.788 9.788 0 0 1 2.9 6.965c-.004 5.444-4.46 9.885-9.935 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411" />
                </svg>
              ),
              url: "https://wa.me/?text=Bekijk%20dit%20geweldige%20retailer%20programma%20van%20Wasgeurtje:%20https://wasgeurtje.nl/retailer-worden"
            },
          ].map((social, index) => (
            <button 
              key={index}
              className="group flex items-center justify-center w-8 h-8 rounded-full border border-blue-800/50 transition-all duration-300 hover:scale-110"
              onClick={(e) => {
                e.preventDefault();
                window.open(social.url, '_blank', 'width=600,height=400');
              }}
              aria-label={`Deel via ${social.name}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              <span className={`relative z-10 text-blue-300 group-hover:text-white transition-colors duration-300`}>
                {social.icon}
              </span>
            </button>
          ))}
        </div>
        
        <div className="mt-2 text-[0.65rem] text-blue-300 opacity-50">
          Exclusieve mogelijkheid voor een beperkt aantal retailers!
        </div>
      </div>
      
      {/* Click instruction */}
      <div className="absolute left-3 top-3 text-xs text-amber-300/70 flex items-center italic animate-pulse-slow">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3h-3z"/>
        </svg>
        <span>Klik op het cadeau-icoon!</span>
      </div>
    </div>
  );
} 