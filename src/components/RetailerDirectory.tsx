"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { allRetailers, getRecentRetailers, Retailer } from '@/data/retailers';

function RetailerDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isVisible, setIsVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(
    searchParams?.get('province') || null
  );
  const [view, setView] = useState<'map' | 'list'>(
    searchParams?.get('view') as any || 'map'
  );
  const [displayCount, setDisplayCount] = useState(24);
  const [activeRetailer, setActiveRetailer] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllRetailers, setShowAllRetailers] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Get retailers from our database
  const retailers = useMemo(() => allRetailers, []);
  
  // Get recent retailers (last 60 days) for special highlighting
  const recentRetailers = useMemo(() => getRecentRetailers(60), []);
  
  // NEW: Get retailers from last 180 days for growth statistics display
  const extendedRecentRetailers = useMemo(() => getRecentRetailers(180), []);
  
  // NEW: Track retailers that match the current search
  const [matchedRetailers, setMatchedRetailers] = useState<Retailer[]>([]);
  
  // NEW: Typing animation state
  const [isTyping, setIsTyping] = useState(false);
  const [typedContent, setTypedContent] = useState('');
  const [fullContent, setFullContent] = useState('');
  
  // Categories for filtering
  const categories = [
    { id: 'all', name: 'Alle winkels', icon: '🏪' },
    { id: 'beauty', name: 'Beauty & Wellness', icon: '💆' },
    { id: 'fashion', name: 'Mode & Kleding', icon: '👚' },
    { id: 'home', name: 'Wonen & Interieur', icon: '🏠' },
    { id: 'flowers', name: 'Bloemen & Planten', icon: '🌷' },
    { id: 'kids', name: 'Baby & Kids', icon: '👶' },
    { id: 'lifestyle', name: 'Lifestyle & Cadeaus', icon: '🎁' },
    { id: 'pets', name: 'Dierenspeciaalzaken', icon: '🐾' },
    { id: 'sleep', name: 'Beddenspecialisten', icon: '🛏️' },
  ];
  
  // Extended list with all major cities in the Netherlands for autocomplete
  const allDutchCities = useMemo(() => [
    "Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Groningen", "Tilburg", "Almere", 
    "Breda", "Nijmegen", "Apeldoorn", "Haarlem", "Arnhem", "Amersfoort", "Zaanstad", "Haarlemmermeer",
    "Den Bosch", "'s-Hertogenbosch", "Zwolle", "Zoetermeer", "Leiden", "Maastricht", "Dordrecht", "Ede",
    "Alphen aan den Rijn", "Leeuwarden", "Alkmaar", "Emmen", "Westland", "Delft", "Venlo", "Deventer",
    "Sittard-Geleen", "Helmond", "Oss", "Amstelveen", "Hilversum", "Hengelo", "Roosendaal", "Purmerend",
    "Schiedam", "Spijkenisse", "Lelystad", "Gouda", "Almelo", "Vlaardingen", "Assen", "Bergen op Zoom",
    "Capelle aan den IJssel", "Hoorn", "Nieuwegein", "Terneuzen", "Middelburg", "Goes", "Heerlen", "Roermond", 
    "Emmeloord", "Woerden", "Kampen", "Harderwijk", "Sneek", "Hoogeveen", "Veenendaal", "Uden", "Tiel", 
    "Rijswijk", "Hoofddorp", "Weert", "Wageningen", "Zeist", "Huizen", "Best", "Zutphen",
    // Add more cities as needed
  ], []);
  
  // List of retailer cities
  const retailerCities = useMemo(() => retailers.map(r => r.city)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort(), [retailers]);

  // All cities for the autocomplete suggestions
  const allCities = useMemo(() => {
    const combinedCities = [...retailerCities, ...allDutchCities];
    return [...new Set(combinedCities)]; // Remove duplicates
  }, [retailerCities, allDutchCities]);
  
  // Provinces for filtering
  const provinces = [
    { id: 'all', name: 'Heel Nederland' },
    { id: 'noord-holland', name: 'Noord-Holland' },
    { id: 'zuid-holland', name: 'Zuid-Holland' },
    { id: 'utrecht', name: 'Utrecht' },
    { id: 'flevoland', name: 'Flevoland' },
    { id: 'gelderland', name: 'Gelderland' },
    { id: 'overijssel', name: 'Overijssel' },
    { id: 'drenthe', name: 'Drenthe' },
    { id: 'groningen', name: 'Groningen' },
    { id: 'friesland', name: 'Friesland' },
    { id: 'noord-brabant', name: 'Noord-Brabant' },
    { id: 'limburg', name: 'Limburg' },
    { id: 'zeeland', name: 'Zeeland' },
    { id: 'belgium', name: 'België' },
  ];
  
  // Handle visibility with Intersection Observer
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
    
    const element = document.getElementById('retailer-directory');
    if (element) observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, []);
  
  // Update search suggestions based on search term
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const results = allCities.filter(city => 
        city.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5);
      
      setSearchResults(results);
      setShowSuggestions(results.length > 0);

      // NEW: Find retailers that match the search term
      const retailerMatches = retailers.filter(retailer => 
        retailer.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        retailer.postalCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setMatchedRetailers(retailerMatches);
      
      // NEW: Prepare content for typing animation
      if (retailerMatches.length > 0) {
        const content = retailerMatches.slice(0, 3).map(r => 
          `${r.name} - ${r.address}, ${r.postalCode} ${r.city}`
        ).join('\n');
        setFullContent(content);
        setTypedContent('');
        setIsTyping(true);
      } else {
        setIsTyping(false);
        setTypedContent('');
        setFullContent('');
      }
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
      setMatchedRetailers([]);
      setIsTyping(false);
      setTypedContent('');
      setFullContent('');
    }
  }, [searchTerm, allCities, retailers]);
  
  // NEW: Typing effect for matched retailers
  useEffect(() => {
    if (isTyping && typedContent.length < fullContent.length) {
      const timeout = setTimeout(() => {
        setTypedContent(fullContent.substring(0, typedContent.length + 1));
      }, 25);
      return () => clearTimeout(timeout);
    } else if (typedContent.length === fullContent.length) {
      setIsTyping(false);
    }
  }, [isTyping, typedContent, fullContent]);
  
  // Filter retailers based on search term and filters
  const filteredRetailers = useMemo(() => {
    let result = [...retailers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(retailer => 
        retailer.name.toLowerCase().includes(term) ||
        retailer.city.toLowerCase().includes(term) ||
        retailer.postalCode.toLowerCase().includes(term)
      );
    }
    
    // Apply province filter
    if (selectedProvince && selectedProvince !== 'all') {
      // This would use actual province data in production
      // For simplicity, we're not implementing the real province filtering
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Set the "no results" flag
    setNoResultsFound(searchTerm.length > 2 && result.length === 0);
    
    return result;
  }, [retailers, searchTerm, selectedProvince]);
  
  // Function to show more retailers
  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + 24, filteredRetailers.length));
  };

  // Select a search suggestion
  const selectSuggestion = (city: string) => {
    setSearchTerm(city);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // NEW: Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAllRetailers(false);
      }
    };

    if (showAllRetailers) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showAllRetailers]);
  
  return (
    <div 
      id="retailer-directory" 
      className="bg-slate-900/50 backdrop-blur-sm border border-blue-900/30 p-8 relative overflow-hidden mt-12"
    >
      {/* Background elements */}
      <div className="absolute -left-32 -top-32 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
      <div className="absolute -right-32 -bottom-32 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl"></div>
      
      {/* Title */}
      <div className={`
        mb-8 text-center
        transform transition-all duration-1000
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}
      `}>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          <span className="bg-gradient-to-r from-blue-400 to-emerald-500 text-transparent bg-clip-text">
            Aangesloten Winkels
          </span>
        </h2>
        <p className="text-blue-200 max-w-2xl mx-auto">
          Ontdek onze {retailers.length}+ retailers verspreid over heel Nederland en België. 
          Vind een winkel bij jou in de buurt voor de lekkerste wasgeurtjes.
        </p>
      </div>
      
      {/* Search and filters */}
      <div className={`
        mb-8
        transform transition-all duration-1000 delay-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Zoek op winkel of plaats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-blue-900/50 rounded-lg text-white placeholder-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
            />
            <svg className="absolute right-3 top-3.5 w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            {/* Autocomplete suggestions */}
            {showSuggestions && (
              <div className="absolute z-30 w-full mt-2 bg-slate-800 border border-blue-900/50 rounded-lg shadow-xl max-h-60 overflow-auto">
                {searchResults.map((city, index) => (
                  <div 
                    key={index}
                    className="px-4 py-2 hover:bg-blue-600/30 cursor-pointer text-blue-100 transition-colors"
                    onClick={() => selectSuggestion(city)}
                  >
                    {city}
                  </div>
                ))}
              </div>
            )}
            
            {/* NEW: Interactive retailer results with typing effect */}
            {searchTerm.length >= 2 && matchedRetailers.length > 0 && !showSuggestions && (
              <div className="absolute z-30 w-full mt-2 bg-slate-800/90 backdrop-blur-sm border border-blue-500/30 rounded-lg shadow-xl max-h-60 overflow-auto">
                <div className="p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                    <span className="text-emerald-300 text-sm font-medium">
                      Gevonden winkels in {searchTerm}
                    </span>
                  </div>
                  <div className="text-blue-100 text-sm font-mono whitespace-pre-line">
                    {typedContent}
                    <span className="animate-pulse">|</span>
                  </div>
                  {matchedRetailers.length > 3 && (
                    <div className="mt-2 text-blue-400 text-xs">
                      + {matchedRetailers.length - 3} andere winkels gevonden
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-slate-800/80 border border-blue-900/50 rounded-lg text-blue-300 hover:text-white transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
            </button>
            
            <div className="bg-slate-800/80 border border-blue-900/50 rounded-lg flex overflow-hidden">
              <button 
                onClick={() => setView('map')} 
                className={`px-4 py-3 flex items-center ${view === 'map' ? 'bg-blue-600 text-white' : 'text-blue-300 hover:text-white'} transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <button 
                onClick={() => setView('list')} 
                className={`px-4 py-3 flex items-center ${view === 'list' ? 'bg-blue-600 text-white' : 'text-blue-300 hover:text-white'} transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-800/80 border border-blue-900/50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div>
              <h3 className="text-white text-sm font-medium mb-3">Provincie</h3>
              <div className="flex flex-wrap gap-2">
                {provinces.map(province => (
                  <button
                    key={province.id}
                    onClick={() => setSelectedProvince(province.id === 'all' ? null : province.id)}
                    className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                      (province.id === 'all' && selectedProvince === null) || province.id === selectedProvince
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/80 text-blue-300 hover:bg-slate-700'
                    }`}
                  >
                    {province.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-white text-sm font-medium mb-3">Categorie</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {/* Category filtering would be implemented here */}}
                    className={`px-3 py-1.5 text-xs rounded-full bg-slate-700/80 text-blue-300 hover:bg-slate-700 transition-colors flex items-center`}
                  >
                    <span className="mr-1.5">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* No results message with opportunity */}
        {noResultsFound && (
          <div className="mt-6 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-500/30 p-4 rounded-lg animate-fade-in">
            <div className="flex items-start">
              <div className="mr-4 mt-1">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Goed nieuws voor {searchTerm}!</h3>
                <p className="text-blue-100 mb-3">
                  We hebben nog geen aangesloten winkel in {searchTerm}, wat betekent dat er een unieke kans is voor jouw bedrijf!
                </p>
                <p className="text-emerald-300 text-sm">
                  Als retailer in {searchTerm} profiteer je van exclusiviteit in jouw regio. 
                  Wij hanteren een één-winkelpolitiek per gebied waardoor jij als eerste de Wasgeurtje-producten kunt aanbieden.
                </p>
                <div className="mt-4">
                  <a 
                    href="/register" 
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors group"
                  >
                    <span>Claim jouw exclusieve plek</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Map View */}
      {view === 'map' && (
        <div className={`
          relative h-[500px] bg-slate-800/50 rounded-lg overflow-hidden border border-blue-900/30 mb-8
          transform transition-all duration-1000 delay-500
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}>
          {/* Dutch map with more accurate Netherlands outline */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-4/5 relative">
              {/* More accurate Netherlands outline */}
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" fill="none">
                <path 
                  // Improved outline of the Netherlands
                  d="M38,18 Q40,15 42,18 L45,15 L47,16 L50,13 L53,14 L54,12 L58,15 L60,12 L63,16 L61,18 L63,23 L66,24 L68,27 L65,29 L68,33 L65,36 L67,39 L64,43 L62,48 L59,49 L60,53 L56,58 L58,62 L55,64 L56,68 L52,71 L48,69 L42,73 L39,70 L35,73 L32,71 L30,74 L28,69 L32,65 L28,61 L31,58 L27,56 L30,52 L25,50 L28,46 L33,48 L35,44 L32,41 L35,39 L31,36 L33,30 L30,27 L33,25 L30,21 L34,20 L35,17 L38,18 Z M72,24 L74,26 L73,30 L76,31 L77,36 L74,38 L76,41 L72,40 L71,44 L67,43 L69,39 L66,37 L69,33 L66,29 L70,30 L71,26 L72,24 Z" 
                  className="stroke-blue-500/70 fill-blue-900/20"
                  strokeWidth="1"
                />
                
                {/* Water elements */}
                <path 
                  // IJsselmeer
                  d="M45,30 Q48,28 51,30 Q53,33 51,36 Q48,38 45,36 Q43,33 45,30 Z"
                  className="fill-blue-500/20 stroke-blue-400/30"
                  strokeWidth="0.5"
                />
                
                {/* Rivers */}
                <path 
                  // Rhine river
                  d="M70,35 Q65,38 60,38 Q55,42 50,45 Q45,46 40,50 Q35,53 30,60"
                  className="stroke-blue-400/40"
                  strokeWidth="0.5"
                  strokeDasharray="1 1"
                />
                
                <path 
                  // Meuse river
                  d="M65,55 Q60,52 55,55 Q50,55 45,60 Q40,58 35,63"
                  className="stroke-blue-400/40"
                  strokeWidth="0.5"
                  strokeDasharray="1 1"
                />
                
                {/* Major cities */}
                <circle cx="40" cy="36" r="1" className="fill-white/50" /> {/* Amsterdam */}
                <circle cx="32" cy="53" r="1" className="fill-white/50" /> {/* Rotterdam */}
                <circle cx="36" cy="53" r="1" className="fill-white/50" /> {/* Den Haag */}
                <circle cx="46" cy="51" r="1" className="fill-white/50" /> {/* Utrecht */}
                <circle cx="60" cy="64" r="1" className="fill-white/50" /> {/* Maastricht */}
                <circle cx="45" cy="22" r="1" className="fill-white/50" /> {/* Groningen */}
              </svg>
              
              {/* Province overlay outlines */}
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100">
                {/* Provinces */}
                <path 
                  d="M38,18 Q40,15 42,18 L45,15 L47,16 L50,13 L53,14 L54,12 L58,15 L60,12 L63,16 L61,18 L63,23 L59,24 L57,21 L54,22 L53,25 L49,24 L46,26 L42,25 L39,22 L36,24 L35,17 L38,18 Z" 
                  className={`${selectedProvince === 'groningen' ? 'fill-blue-500/30' : 'fill-transparent hover:fill-blue-500/20'} cursor-pointer transition-colors`}
                  onClick={() => setSelectedProvince(selectedProvince === 'groningen' ? null : 'groningen')}
                />
                
                <path 
                  d="M42,25 L46,26 L49,24 L53,25 L54,22 L57,21 L59,24 L63,23 L66,24 L68,27 L65,29 L68,33 L65,36 L62,35 L60,32 L56,33 L52,31 L48,33 L44,31 L41,33 L38,31 L35,33 L33,30 L30,27 L33,25 L30,21 L34,20 L39,22 L42,25 Z" 
                  className={`${selectedProvince === 'friesland' ? 'fill-blue-500/30' : 'fill-transparent hover:fill-blue-500/20'} cursor-pointer transition-colors`}
                  onClick={() => setSelectedProvince(selectedProvince === 'friesland' ? null : 'friesland')}
                />
                
                {/* Add more provinces as needed */}
              </svg>
              
              {/* Retailer dots */}
              {filteredRetailers.map((retailer) => {
                // Use a deterministic but varied distribution based on postal code
                // This creates a pattern that keeps retailers in their approximate regions
                const postalInt = parseInt(retailer.postalCode.replace(/\D/g, '')) || retailer.id;
                
                // Distribute retailers across the map based on postal code
                // Dutch postal codes are regional: 1xxx = North Holland, 2xxx = South Holland, etc.
                let x, y;
                
                // First digit of postal code roughly maps to regions in NL
                const region = Math.floor(postalInt / 1000);
                
                switch(region) {
                  case 1: // North Holland
                    x = 35 + (postalInt % 20);
                    y = 25 + (postalInt % 15);
                    break;
                  case 2: // South Holland
                    x = 30 + (postalInt % 15);
                    y = 45 + (postalInt % 15);
                    break;
                  case 3: // Utrecht
                    x = 45 + (postalInt % 10);
                    y = 45 + (postalInt % 10);
                    break;
                  case 4: // Zeeland
                    x = 25 + (postalInt % 10);
                    y = 65 + (postalInt % 10);
                    break;
                  case 5: // North Brabant
                    x = 45 + (postalInt % 20);
                    y = 60 + (postalInt % 10);
                    break;
                  case 6: // Limburg/Gelderland
                    x = 60 + (postalInt % 15);
                    y = 55 + (postalInt % 20);
                    break;
                  case 7: // Gelderland/Overijssel
                    x = 55 + (postalInt % 15);
                    y = 45 + (postalInt % 15);
                    break;
                  case 8: // Overijssel/Drenthe
                    x = 50 + (postalInt % 15);
                    y = 30 + (postalInt % 15);
                    break;
                  case 9: // Groningen/Friesland
                    x = 45 + (postalInt % 15);
                    y = 20 + (postalInt % 15);
                    break;
                  default: // Fallback / Others
                    x = 40 + (postalInt % 25);
                    y = 40 + (postalInt % 25);
                }
                
                // Ensure points stay within bounds
                x = Math.min(Math.max(x, 20), 80);
                y = Math.min(Math.max(y, 10), 85);
                
                // Check if it's a recently added shop (last 60 days)
                const isRecent = retailer.date > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
                
                return (
                  <div 
                    key={retailer.id}
                    className={`
                      absolute w-2.5 h-2.5 rounded-full cursor-pointer
                      ${retailer.id === activeRetailer ? 'bg-emerald-400 z-20' : 'bg-emerald-500/80 hover:bg-emerald-400 z-10'}
                      transition-all duration-300
                      ${isRecent ? 'animate-pulse' : ''}
                    `}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      boxShadow: retailer.id === activeRetailer ? '0 0 0 4px rgba(16, 185, 129, 0.2), 0 0 16px rgba(16, 185, 129, 0.6)' : '0 0 8px rgba(16, 185, 129, 0.6)'
                    }}
                    onClick={() => setActiveRetailer(retailer.id === activeRetailer ? null : retailer.id)}
                    onMouseEnter={() => setActiveRetailer(retailer.id)}
                    onMouseLeave={() => setActiveRetailer(null)}
                  >
                    {/* Tooltip */}
                    {retailer.id === activeRetailer && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-slate-900/90 backdrop-blur-sm border border-emerald-500/30 p-3 rounded-lg shadow-lg whitespace-nowrap z-30">
                        <div className="font-medium text-white text-sm mb-1">{retailer.name}</div>
                        <div className="text-blue-200 text-xs">{retailer.address}</div>
                        <div className="text-blue-200 text-xs">{retailer.postalCode} {retailer.city}</div>
                        <div className="mt-1.5 text-emerald-400 text-[0.65rem] font-medium">
                          {isRecent
                            ? '✨ Nieuw aangesloten!' 
                            : 'Officiële Wasgeurtje-partner'
                          }
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900/90 border-r border-b border-emerald-500/30"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-500/20 flex items-center">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
            <button 
              onClick={() => setShowAllRetailers(true)}
              className="text-xs text-blue-100 hover:text-blue-300 transition-colors cursor-pointer flex items-center"
            >
              {retailers.length} officiële verkooppunten
              {filteredRetailers.length !== retailers.length && ` (${filteredRetailers.length} getoond)`}
              <svg className="w-3 h-3 ml-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Recently added indicator */}
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-500/20 flex items-center">
            <span className="text-xs text-blue-100">
              <span className="text-emerald-400 font-medium">
                {recentRetailers.length}
              </span> nieuwe partners in de afgelopen 2 maanden
            </span>
          </div>
        </div>
      )}
      
      {/* List View */}
      {view === 'list' && (
        <div className={`
          transform transition-all duration-1000 delay-500
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}>
          {noResultsFound ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center px-4 py-8 bg-gradient-to-br from-slate-800/70 to-slate-900/70 rounded-lg border border-blue-900/30 max-w-xl">
                <svg className="w-12 h-12 text-emerald-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">Geen winkels gevonden in {searchTerm}</h3>
                <p className="text-blue-200 mb-4">
                  Wij hebben nog geen officiële Wasgeurtje-partner in deze locatie. Dit is jouw kans!
                </p>
                <div className="border-t border-blue-900/30 pt-4 mt-4">
                  <p className="text-emerald-300 font-medium mb-4">
                    Wist je dat wij maar één retailer per plaats of wijk accepteren?
                    Wees er snel bij en profiteer van exclusiviteit!
                  </p>
                  <a 
                    href="/register" 
                    className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-lg transition-colors group font-medium"
                  >
                    <span>Word de eerste in {searchTerm}</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Recently added banner */}
              {filteredRetailers.some(r => r.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) && (
                <div className="mb-6 p-3 bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                    <p className="text-emerald-300 text-sm">
                      <span className="font-medium">Nieuw!</span> De nieuwste winkels zijn gemarkeerd met een badge. Elke maand verwelkomen we nieuwe partners in ons netwerk.
                    </p>
                  </div>
                </div>
              )}
            
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRetailers.slice(0, displayCount).map((retailer) => {
                  // Check if retailer was added in the last 30 days
                  const isRecent = retailer.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div
                      key={retailer.id}
                      className={`
                        bg-slate-800/50 rounded-lg overflow-hidden border transition-all duration-300
                        ${isRecent 
                          ? 'border-emerald-500/30 shadow-lg shadow-emerald-900/20' 
                          : 'border-blue-900/30 hover:border-blue-500/30'}
                      `}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-white">{retailer.name}</h3>
                          {isRecent && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[0.6rem] px-1.5 py-0.5 rounded-full uppercase font-medium">
                              Nieuw
                            </span>
                          )}
                        </div>
                        
                        <div className="text-blue-200 text-sm">{retailer.address}</div>
                        <div className="text-blue-200 text-sm">{retailer.postalCode} {retailer.city}</div>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center">
                            <svg className="w-3 h-3 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span className="text-blue-400 text-xs">Officiële partner</span>
                          </div>
                          
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${retailer.name} ${retailer.address} ${retailer.city}`
                            )}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-300 hover:text-white flex items-center transition-colors"
                          >
                            <span>Routebeschrijving</span>
                            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Load more button */}
              {displayCount < filteredRetailers.length && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    className="inline-flex items-center px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <span>Toon meer winkels</span>
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Dynamic growth statistics */}
      <div className={`
        mt-12 pt-10 border-t border-blue-900/30
        transform transition-all duration-1000 delay-700
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}>
        <h3 className="text-xl font-semibold text-white mb-6 text-center">
          Onze Groei
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-900/20 text-center">
            <div className="text-3xl font-bold text-white mb-1">{retailers.length}</div>
            <div className="text-sm text-blue-300">Totaal aantal partners</div>
          </div>
          
          {/* MODIFIED: Strategic solution for "0 nieuwe partners" issue */}
          <div className="bg-gradient-to-br from-slate-800/50 to-emerald-900/20 p-4 rounded-lg border border-emerald-500/20 text-center group relative overflow-hidden">
            {recentRetailers.length === 0 ? (
              <>
                <div className="absolute inset-0 bg-emerald-600/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                <div className="text-2xl font-bold text-white mb-1 flex items-center justify-center">
                  <span className="text-emerald-400">Exclusieve</span>
                  <span className="relative ml-1.5">
                    <span className="absolute -inset-1 rounded-full bg-blue-500/20 animate-ping opacity-75"></span>
                    <span className="relative w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                  </span>
                </div>
                <div className="text-sm text-blue-300">
                  Kans voor nieuwe partners
                </div>
                <div className="mt-1 text-xs text-emerald-400">Claim nu je regio!</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-1">
                  {recentRetailers.length}
                </div>
                <div className="text-sm text-blue-300">
                  Nieuwe partners <span className="text-xs text-emerald-400">(60 dagen)</span>
                </div>
              </>
            )}
          </div>
          
          {/* NEW: Extended period growth indicator */}
          <div className="bg-gradient-to-br from-slate-800/50 to-blue-900/20 p-4 rounded-lg border border-blue-900/20 text-center">
            {extendedRecentRetailers.length === 0 ? (
              <>
                <div className="text-3xl font-bold text-white mb-1 flex items-center justify-center">
                  <span className="relative text-blue-400">
                    <span className="absolute -inset-1 rounded-full bg-blue-500/10 animate-pulse opacity-75"></span>
                    <span>Nieuw</span>
                  </span>
                </div>
                <div className="text-sm text-blue-300">Groeiende markt</div>
                <div className="mt-1 text-xs text-blue-400">Perfecte timing om in te stappen</div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-1">
                  {extendedRecentRetailers.length}
                </div>
                <div className="text-sm text-blue-300">
                  Groei dit jaar <span className="text-xs text-blue-400">+{Math.round((extendedRecentRetailers.length / retailers.length) * 100)}%</span>
                </div>
              </>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-lg border border-blue-900/20 text-center">
            <div className="text-3xl font-bold text-white mb-1">{retailerCities.length}</div>
            <div className="text-sm text-blue-300">Steden en dorpen</div>
          </div>
        </div>
      </div>

      {/* NEW: Full Retailer List Modal */}
      {showAllRetailers && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="relative bg-slate-800 border border-blue-900/50 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center p-4 border-b border-blue-900/30 bg-slate-900/50">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span>
                Alle {retailers.length} officiële verkooppunten
              </h3>
              <button 
                onClick={() => setShowAllRetailers(false)}
                className="text-blue-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal search and filters */}
            <div className="p-4 border-b border-blue-900/30 bg-slate-900/30">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Zoek op naam, plaats, of postcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/80 border border-blue-900/50 rounded-lg text-white placeholder-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute right-3 top-2.5 w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <div className="flex gap-2">
                  <select 
                    className="px-3 py-2 bg-slate-800/80 border border-blue-900/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => setSelectedProvince(e.target.value === 'all' ? null : e.target.value)}
                    value={selectedProvince || 'all'}
                  >
                    {provinces.map(province => (
                      <option key={province.id} value={province.id}>{province.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Modal content - retailer list */}
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {filteredRetailers.map((retailer) => {
                  // Check if retailer was added in the last 30 days
                  const isRecent = retailer.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div
                      key={retailer.id}
                      className="p-3 border-b border-blue-900/20 hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-white text-sm">{retailer.name}</h4>
                        {isRecent && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-[0.6rem] px-1.5 py-0.5 rounded-full uppercase font-medium">
                            Nieuw
                          </span>
                        )}
                      </div>
                      
                      <div className="text-blue-200 text-xs mt-1">{retailer.address}</div>
                      <div className="text-blue-200 text-xs">{retailer.postalCode} {retailer.city}</div>
                      
                      <div className="flex justify-between items-center mt-2 pt-1 text-[0.65rem]">
                        <span className="text-blue-400">
                          {retailer.province || 'Nederland'}
                        </span>
                        
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${retailer.name} ${retailer.address} ${retailer.city}`
                          )}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-300 hover:text-white flex items-center transition-colors"
                        >
                          <span>Route</span>
                          <svg className="w-2.5 h-2.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal footer */}
            <div className="border-t border-blue-900/30 p-4 bg-slate-900/50 flex justify-between items-center">
              <div className="text-sm text-blue-200">
                {filteredRetailers.length} van {retailers.length} winkels getoond
              </div>
              <button 
                onClick={() => setShowAllRetailers(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RetailerDirectory() {
  return (
    <Suspense fallback={
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Retailer directory wordt geladen...</p>
          </div>
        </div>
      </div>
    }>
      <RetailerDirectoryContent />
    </Suspense>
  );
} 