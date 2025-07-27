'use client'
import React, { useEffect, useState } from 'react'

// Premium scroll-triggered animations and effects component
export default function AmoeriPremiumEffects() {
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isClient, setIsClient] = useState(false)
  
  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      })
    }
    
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isClient])
  
  useEffect(() => {
    if (!isClient) return
    
    // Animate elements as they come into view
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up')
          entry.target.classList.remove('opacity-0', 'translate-y-8')
        }
      })
    }, observerOptions)
    
    // Observe all elements with the animate class
    const animateElements = document.querySelectorAll('.animate-on-scroll')
    animateElements.forEach(el => observer.observe(el))
    
    return () => observer.disconnect()
  }, [isClient])
  
  // Add smooth reveal animations
  useEffect(() => {
    if (!isClient) return
    
    const handleReveal = () => {
      const reveals = document.querySelectorAll('.reveal-on-scroll')
      
      reveals.forEach(reveal => {
        const windowHeight = window.innerHeight
        const elementTop = reveal.getBoundingClientRect().top
        const elementVisible = 150
        
        if (elementTop < windowHeight - elementVisible) {
          reveal.classList.add('revealed')
        }
      })
    }
    
    window.addEventListener('scroll', handleReveal)
    handleReveal() // Check on load
    
    return () => window.removeEventListener('scroll', handleReveal)
  }, [isClient])
  
  // Don't render anything during SSR
  if (!isClient) {
    return null
  }
  
  return (
    <>
      {/* Premium cursor follower */}
      <div 
        className="fixed w-6 h-6 bg-yellow-400/20 rounded-full pointer-events-none z-[9999] blur-sm transition-transform duration-100 ease-out"
        style={{
          transform: `translate(${mousePosition.x * window.innerWidth - 12}px, ${mousePosition.y * window.innerHeight - 12}px)`
        }}
      />
      
      {/* Floating particles background effect */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Large floating orbs */}
        <div 
          className="absolute w-96 h-96 bg-gradient-to-br from-yellow-400/5 to-yellow-600/5 rounded-full blur-3xl"
          style={{
            top: '10%',
            left: '5%',
            transform: `translate(${scrollY * 0.05}px, ${scrollY * 0.03}px)`
          }}
        />
        <div 
          className="absolute w-72 h-72 bg-gradient-to-br from-orange-400/5 to-orange-600/5 rounded-full blur-3xl"
          style={{
            bottom: '20%',
            right: '10%',
            transform: `translate(${-scrollY * 0.04}px, ${-scrollY * 0.06}px)`
          }}
        />
        
        {/* Small floating particles */}
        <div 
          className="absolute w-2 h-2 bg-yellow-400/20 rounded-full animate-float"
          style={{
            top: '20%',
            left: '10%',
            animationDelay: '0s',
            transform: `translateY(${scrollY * 0.1}px)`
          }}
        />
        <div 
          className="absolute w-1 h-1 bg-yellow-300/30 rounded-full animate-float-slow"
          style={{
            top: '60%',
            right: '15%',
            animationDelay: '2s',
            transform: `translateY(${scrollY * 0.15}px)`
          }}
        />
        <div 
          className="absolute w-3 h-3 bg-yellow-500/10 rounded-full animate-float"
          style={{
            bottom: '30%',
            left: '20%',
            animationDelay: '4s',
            transform: `translateY(${scrollY * 0.08}px)`
          }}
        />
        <div 
          className="absolute w-1.5 h-1.5 bg-yellow-400/25 rounded-full animate-float-slow"
          style={{
            top: '40%',
            right: '25%',
            animationDelay: '1s',
            transform: `translateY(${scrollY * 0.12}px)`
          }}
        />
        <div 
          className="absolute w-2.5 h-2.5 bg-yellow-300/15 rounded-full animate-float"
          style={{
            bottom: '60%',
            right: '10%',
            animationDelay: '3s',
            transform: `translateY(${scrollY * 0.09}px)`
          }}
        />
      </div>
      
      {/* Noise texture overlay for premium feel */}
      <div 
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Cfilter id="noise"%3E%3CfeTurbulence baseFrequency="0.9" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")'
        }}
      />
    </>
  )
} 