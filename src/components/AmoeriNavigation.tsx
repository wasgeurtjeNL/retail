'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Language = 'nl' | 'en' | 'de' | 'ar'

interface AmoeriNavigationProps {
  currentLang: Language
  onLanguageChange: (lang: Language) => void
}

const navTranslations = {
  nl: {
    home: 'Home',
    story: 'Ons verhaal',
    benefits: 'Voordelen',
    partnership: 'Partnership',
    contact: 'Contact'
  },
  en: {
    home: 'Home',
    story: 'Our story',
    benefits: 'Benefits',
    partnership: 'Partnership',
    contact: 'Contact'
  },
  de: {
    home: 'Home',
    story: 'Unsere Geschichte',
    benefits: 'Vorteile',
    partnership: 'Partnerschaft',
    contact: 'Kontakt'
  },
  ar: {
    home: 'الرئيسية',
    story: 'قصتنا',
    benefits: 'المزايا',
    partnership: 'الشراكة',
    contact: 'اتصل بنا'
  }
}

export default function AmoeriNavigation({ currentLang, onLanguageChange }: AmoeriNavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  
  const t = navTranslations[currentLang]
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }
  
  const LanguageSwitcher = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex gap-1 ${mobile ? 'justify-center' : ''}`}>
      {(['nl', 'en', 'de', 'ar'] as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange(lang)}
          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
            currentLang === lang 
              ? 'bg-yellow-400 text-black' 
              : 'text-gray-300 hover:text-yellow-400 hover:bg-white/10'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-black/95 backdrop-blur-sm shadow-xl' 
        : 'bg-transparent'
    }`} dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Image 
                src="/assets/images/branding/logo.svg" 
                alt="Amoeri Logo" 
                width={24} 
                height={24}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold text-white">AMOERI</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('hero')}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              {t.home}
            </button>
            <button 
              onClick={() => scrollToSection('story')}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              {t.story}
            </button>
            <button 
              onClick={() => scrollToSection('benefits')}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              {t.benefits}
            </button>
            <button 
              onClick={() => scrollToSection('partnership')}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              {t.partnership}
            </button>
            <button 
              onClick={() => router.push('/contact')}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
            >
              {t.contact}
            </button>
          </div>
          
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <span className={`block h-0.5 bg-white transition-transform duration-300 ${
                isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''
              }`}></span>
              <span className={`block h-0.5 bg-white transition-opacity duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}></span>
              <span className={`block h-0.5 bg-white transition-transform duration-300 ${
                isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''
              }`}></span>
            </div>
          </button>
        </div>
        
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}>
          <div className="flex flex-col space-y-4 pt-4 border-t border-gray-700">
            <button 
              onClick={() => scrollToSection('hero')}
              className="text-gray-300 hover:text-yellow-400 transition-colors text-left"
            >
              {t.home}
            </button>
            <button 
              onClick={() => scrollToSection('story')}
              className="text-gray-300 hover:text-yellow-400 transition-colors text-left"
            >
              {t.story}
            </button>
            <button 
              onClick={() => scrollToSection('benefits')}
              className="text-gray-300 hover:text-yellow-400 transition-colors text-left"
            >
              {t.benefits}
            </button>
            <button 
              onClick={() => scrollToSection('partnership')}
              className="text-gray-300 hover:text-yellow-400 transition-colors text-left"
            >
              {t.partnership}
            </button>
            <button 
              onClick={() => router.push('/contact')}
              className="text-gray-300 hover:text-yellow-400 transition-colors text-left"
            >
              {t.contact}
            </button>
            
            <div className="pt-4 border-t border-gray-700">
              <LanguageSwitcher mobile />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 