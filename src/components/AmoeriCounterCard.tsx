'use client'
import React, { useEffect, useState, useRef } from 'react'

interface CounterCardProps {
  endValue: number
  prefix?: string
  suffix?: string
  label: string
  delay?: number
}

export default function CounterCard({ endValue, prefix = '', suffix = '', label, delay = 0 }: CounterCardProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    
    if (cardRef.current) {
      observer.observe(cardRef.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  useEffect(() => {
    if (!isVisible) return
    
    const duration = 2000 // 2 seconds
    const steps = 60
    const stepDuration = duration / steps
    const increment = endValue / steps
    
    let current = 0
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment
        if (current >= endValue) {
          setCount(endValue)
          clearInterval(interval)
        } else {
          setCount(Math.floor(current))
        }
      }, stepDuration)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [isVisible, endValue, delay])
  
  return (
    <div 
      ref={cardRef}
      className="relative group cursor-pointer"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
      
      {/* Card */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black p-10 rounded-2xl shadow-2xl border border-yellow-400/20 group-hover:border-yellow-400/40 transition-all duration-500 transform group-hover:scale-105">
        {/* Counter */}
        <div className="text-5xl md:text-6xl font-bold text-gradient-gold mb-4">
          {prefix}{count.toLocaleString()}{suffix}
        </div>
        
        {/* Label */}
        <div className="text-gray-400 font-medium text-lg">{label}</div>
        
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-xl"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-tr from-yellow-600/10 to-transparent rounded-full blur-xl"></div>
      </div>
    </div>
  )
} 