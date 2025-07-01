"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RetailerTimeline() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  
  // Add intersection observer to trigger entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimateIn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    
    const element = document.getElementById('retailer-timeline');
    if (element) observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);
  
  // Handle click to toggle expanded step
  const handleStepClick = (index: number) => {
    if (expandedStep === index) {
      setExpandedStep(null);
    } else {
      setExpandedStep(index);
    }
  };
  
  const steps = [
    {
      title: "Aanmelding",
      description: "Meld je vrijblijvend aan via ons formulier",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h2v-2h-2v2zm-4 0h2v-2h-2v2zm-4 0h2v-2H6v2zM6 5h2v2H6V5zm0 4h8v2H6V9zm0 4h4v2H6v-2zm10-8h2v6h-2V5z" />
        </svg>
      ),
      detail: "Deel je gegevens en vertel ons over je winkel. Dit duurt slechts 2 minuten.",
      color: "from-emerald-600 to-teal-700",
      accentColor: "emerald-400"
    },
    {
      title: "Beoordeling",
      description: "Wij beoordelen je aanvraag en locatie binnen 24 uur",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
        </svg>
      ),
      detail: "We controleren of er ruimte is in jouw regio en of je locatie past binnen ons netwerk. Ons team beoordeelt elke aanvraag persoonlijk.",
      color: "from-purple-600 to-indigo-700",
      accentColor: "purple-400"
    },
    {
      title: "Gratis proefpakket",
      description: "Bij goedkeuring sturen we een gratis proefpakket (t.w.v. €14,95)",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z" />
        </svg>
      ),
      detail: "Ontvang onze 5 bestsellers om zelf te ervaren. Het proefpakket bevat alle materialen om je klanten te laten kennismaken met onze producten.",
      color: "from-amber-500 to-orange-600",
      accentColor: "amber-400" 
    },
    {
      title: "Account activeren",
      description: "Activeer je account binnen 14 dagen om je plek te behouden",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
      ),
      detail: "Log in op ons retailer portaal en activeer je account. Hiermee bevestig je je interesse en behoud je de exclusiviteit in jouw regio.",
      color: "from-cyan-500 to-blue-600",
      accentColor: "cyan-400"
    },
    {
      title: "Starterspakket",
      description: "Ontvang je starterspakket op factuur (betaling binnen 14 dagen)",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
      detail: "We sturen je een compleet starterspakket met display, promotiemateriaal en voorraad om direct te kunnen starten met verkopen.",
      color: "from-rose-500 to-pink-700",
      accentColor: "rose-400"
    }
  ];

  return (
    <div 
      id="retailer-timeline"
      className="bg-slate-900/50 backdrop-blur-sm border border-blue-900/30 p-8 overflow-hidden relative group"
    >
      {/* Colorful animated background elements */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl animate-pulse-slow"></div>
      <div className="absolute left-32 top-64 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute right-32 bottom-64 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
      
      {/* Interactive header with animated underline */}
      <h3 className="text-2xl font-bold text-white mb-8 relative">
        <span className="relative inline-block">
          Zo werkt het
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 via-purple-400 to-rose-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></span>
        </span>
        <div className="absolute -right-1 top-0 w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse-slow"></div>
      </h3>
      
      <div className="relative">
        {/* Vertical timeline line with rainbow gradient and animation */}
        <div className="absolute left-8 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 via-blue-500 via-purple-500 via-amber-500 to-rose-500 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-white/30 to-transparent animate-timeline-pulse"></div>
        </div>
        
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`
              relative z-10 flex mb-8 last:mb-0 group/step 
              transition-all duration-500 ease-in-out
              ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}
              ${expandedStep === index ? 'scale-105' : 'scale-100'}
            `}
            style={{ 
              transitionDelay: `${index * 150}ms`,
              transform: expandedStep === index ? 'translateX(10px)' : 'translateX(0)' 
            }}
            onMouseEnter={() => setActiveStep(index)}
            onMouseLeave={() => setActiveStep(null)}
            onClick={() => handleStepClick(index)}
          >
            {/* Number indicator with interactive animation */}
            <div 
              className={`
                flex-shrink-0 w-16 h-16 flex items-center justify-center
                text-xl font-bold text-white relative transition-all duration-500
                cursor-pointer
                ${expandedStep === index 
                  ? 'scale-110 shadow-lg shadow-' + step.accentColor + '/30' 
                  : activeStep === index 
                    ? 'scale-105 shadow-md shadow-' + step.accentColor + '/20'
                    : 'scale-100'
                }
              `}
            >
              {/* Animated background with dynamic color */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${step.color}
                transition-all duration-500 
                ${(expandedStep === index || activeStep === index) ? 'opacity-100' : 'opacity-90'}
              `}></div>
              
              {/* Pulsing border effect */}
              <div className={`
                absolute -inset-0.5 bg-gradient-to-r from-transparent via-${step.accentColor} to-transparent 
                opacity-0 transition-opacity duration-500 blur-sm
                ${expandedStep === index ? 'opacity-40 animate-border-pulse' : ''}
              `}></div>
              
              {/* Animated icon */}
              <div className={`
                absolute inset-0 flex items-center justify-center
                transition-all duration-500 ease-in-out
                ${(expandedStep === index || activeStep === index) ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-90'}
              `}>
                {step.icon}
              </div>
              
              {/* Step number */}
              <span className={`
                relative z-10 transition-all duration-300
                ${(expandedStep === index || activeStep === index) ? 'opacity-0' : 'opacity-100'}
              `}>
                {index + 1}
              </span>
            </div>
            
            {/* Content with hover/click effects */}
            <div className={`
              ml-6 transition-all duration-500
              ${expandedStep === index 
                ? 'transform translate-x-3' 
                : activeStep === index 
                  ? 'transform translate-x-2' 
                  : 'transform translate-x-0'
              }
              cursor-pointer
            `}>
              <h4 className="text-lg font-semibold text-white flex items-center">
                {step.title}
                <span className={`
                  ml-2 w-2 h-2 rounded-full bg-${step.accentColor}
                  transition-all duration-300
                  ${(expandedStep === index || activeStep === index) ? 'opacity-100' : 'opacity-0'}
                `}></span>
              </h4>
              
              <p className="text-blue-200 mt-1">{step.description}</p>
              
              {/* Interactive expandable detail section */}
              <div 
                className={`
                  mt-3 text-sm text-blue-300 bg-${step.color.split(' ')[0]}/10 p-4 rounded border-l border-${step.accentColor}
                  transform origin-top transition-all duration-500 ease-in-out
                  ${expandedStep === index 
                    ? 'opacity-100 max-h-48 scale-y-100' 
                    : 'opacity-0 max-h-0 scale-y-0 overflow-hidden'
                  }
                `}
              >
                <p className="mb-3">{step.detail}</p>
                
                {/* Extra interaction button - only shown when expanded */}
                {index === 0 && (
                  <Link 
                    href="/register" 
                    className={`
                      inline-flex items-center text-xs font-medium text-${step.accentColor} hover:text-white 
                      transition-colors duration-300 mt-2 bg-${step.color.split(' ')[0]}/30 
                      px-3 py-1.5 rounded-full
                    `}
                  >
                    <span>Direct aanmelden</span>
                    <svg className="ml-1.5 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
                
                {index === 2 && (
                  <div className="flex items-center space-x-1 mt-2 text-xs text-amber-300">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    <span className="ml-1">5-sterren beoordeeld</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Enhanced call-to-action at the end of timeline */}
      <div className="mt-10 text-center">
        <div className="inline-block relative mb-1.5">
          <div className="h-0.5 w-16 bg-gradient-to-r from-emerald-400 via-purple-400 to-rose-400 mx-auto"></div>
        </div>
        <Link 
          href="/register" 
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white rounded-full relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-80"></span>
          <span className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 opacity-0 group-hover:opacity-90 transition-opacity duration-500"></span>
          
          <span className="relative z-10 flex items-center">
            Begin je aanmelding
            <svg 
              className="ml-2 w-4 h-4 transform transition-transform duration-500 group-hover:translate-x-1" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </Link>
        <div className="text-xs text-blue-300 mt-2 opacity-80">Binnen 2 minuten geregeld</div>
      </div>
      
      {/* Click instruction */}
      <div className="absolute right-3 top-3 text-xs text-blue-300/70 flex items-center italic animate-pulse-slow">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
        </svg>
        <span>Klik voor meer info</span>
      </div>
    </div>
  );
} 