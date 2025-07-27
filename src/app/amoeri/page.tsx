'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import AmoeriNavigation from '../../components/AmoeriNavigation'
import AmoeriPremiumEffects from '../../components/AmoeriPremiumEffects'
import CounterCard from '../../components/AmoeriCounterCard'

// Meertalige content definitie
const translations = {
  nl: {
    heroTitle: "Van Wasgeurtje.nl naar Amoeri – Het bewezen succesverhaal dat explosief groeit",
    heroSubtitle: "Meer dan 300.000 klanten in 5 jaar. 60% herhaalaankopen. Nu is hét moment om partner te worden.",
    ctaDiscover: "Word nu partner - Pak je kans",
    ctaContact: "Claim exclusiviteit in jouw regio",
    
    introTitle: "Een explosief groeiende markt",
    introStory: "Wasgeurtje.nl is niet zomaar een product – het is een fenomeen. In 5 jaar tijd veroverden we 300.000+ harten met ongekende klantloyaliteit. Nu transformeren we naar Amoeri en bieden we jou de kans om deel uit te maken van dit bewezen succes.",
    socialProofCustomers: "+300.000 klanten",
    socialProofReviews: "+5.000 reviews (gemiddeld 4,8/5)",
    socialProofRegions: "60% herhaalaankopen - Bewezen klantbinding",
    introAmoeri: "Dit is jouw kans: Word partner van een product dat zichzelf verkoopt. Onze klanten komen terug, keer op keer.",
    
    rebrandTitle: "Waarom nu instappen als partner?",
    rebrandSubtitle: "Bewezen formule, explosieve groei",
    rebrandDescription: "Van lokaal succes naar internationale doorbraak. De vraag groeit sneller dan we kunnen leveren.",
    brandIdentityTitle: "Jouw voordelen:",
    brandIdentity: ["Bewezen product met 300.000+ fans", "60% klanten koopt opnieuw", "Explosieve groei = jouw kans"],
    visionTitle: "De markt ligt open:",
    visionDescription: "Claim nu exclusiviteit in jouw regio voordat een concurrent het doet. Dit momentum komt nooit meer terug.",
    
    benefitsTitle: "Waarom Amoeri een goudmijn is voor retailers",
    benefits: [
      "60% van je klanten komt terug voor meer - Gegarandeerde omzet",
      "300.000+ bewezen fans - Het product verkoopt zichzelf", 
      "Voorraad altijd op peil - Nooit nee verkopen",
      "Premium product = Premium marges",
      "Klanten bestellen gemiddeld 4x per jaar"
    ],
    
    ambitionTitle: "De explosie komt eraan - Stap nu in",
    focusCountries: "2025: Duitsland, Frankrijk, Scandinavië & UK - De markt ligt open",
    goal2026: "Van 300.000 naar 1 miljoen klanten - Groei mee met ons succes",
    retailStrategy: "Beperkt aantal partners per regio - First come, first serve",
    targetGroup: "Jouw klanten willen dit product - Bewezen door 300.000 fans",
    
    testimonialsTitle: "Waarom klanten terugkomen",
    testimonials: [
      "Dit is mijn 8e bestelling dit jaar. Ik ben verslaafd!",
      "Al mijn vrienden gebruiken het nu ook. Bedankt voor de tip!",
      "Gebruik het al 3 jaar. Kan niet meer zonder!",
      "Bestel elke maand. Beste investering ooit!"
    ],
    
    partnershipTitle: "Pak nu je kans - Voordat een ander het doet",
    partnershipSubtitle: "Word Amoeri partner en profiteer direct van:",
    partnershipBenefits: [
      "300.000 bewezen klanten die het product al kennen",
      "60% herhaalaankopen = stabiele inkomstenstroom", 
      "Marketing die werkt - 4,8/5 sterren uit 5000+ reviews",
      "Exclusiviteit mogelijk - Bescherm jouw marktpositie",
      "Groei mee met een explosief groeiend merk",
      "Voorraadinzichten & levergarantie"
    ],
    
    finalCta: "Wacht niet langer - Elke dag uitstel kost je klanten",
    ctaPortal: "Start vandaag nog - Word partner",
    ctaContactDistribution: "Claim exclusiviteit in jouw regio",
    qrSection: "Scan nu - Voor een ander het doet"
  },
  
  en: {
    heroTitle: "From Wasgeurtje.nl to Amoeri – The evolution of scent, luxury and trust.",
    heroSubtitle: "More than 100,000 satisfied customers. Now ready for international premium growth.",
    ctaDiscover: "Discover B2B benefits", 
    ctaContact: "Request information now",
    
    introTitle: "Our journey so far",
    introStory: "In 5 years, Wasgeurtje.nl grew into the leading brand in laundry perfume. Known for long-lasting scent experience and exceptional customer satisfaction.",
    socialProofCustomers: "+100,000 customers",
    socialProofReviews: "+2,500 reviews (average 4.8/5)",
    socialProofRegions: "Customers from Netherlands, Belgium and Germany",
    introAmoeri: "We proudly introduce Amoeri – a new chapter, built on the same quality, but with an international and more luxurious appeal.",
    
    rebrandTitle: "Why the rebrand to Amoeri?",
    rebrandSubtitle: "New name, strengthened vision",
    rebrandDescription: "Amoeri stands for love, purity and scent that touches.",
    brandIdentityTitle: "Brand identity:",
    brandIdentity: ["Elegant & timeless design", "Premium appearance", "Sustainable mission"],
    visionTitle: "Future vision:",
    visionDescription: "From local webshop to European brand – with focus on people, environment and scent experience.",
    
    benefitsTitle: "Why Amoeri? The benefits at a glance",
    benefits: [
      "Luxury scent experience with just one cap",
      "Sustainable ingredients & vegan formula",
      "Stable inventory & fast delivery (24-48 hours)",
      "Premium packaging for maximum experience", 
      "Consistent product quality with repeat orders up to 60%"
    ],
    
    ambitionTitle: "Our ambition: international growth",
    focusCountries: "Focus countries: Germany, France, Scandinavia & UK",
    goal2026: "Goal: to be a leading brand in premium laundry perfume by 2026",
    retailStrategy: "Retail strategy: Only with carefully chosen partners",
    targetGroup: "Target group: Quality-conscious shoppers & perfume lovers",
    
    testimonialsTitle: "Customer testimonials",
    testimonials: [
      "Never has my laundry smelled so good. I keep coming back!",
      "The scent lasts for days – even in the closet."
    ],
    
    partnershipTitle: "Exclusive partnership?",
    partnershipSubtitle: "Become a retail partner of Amoeri and benefit from:",
    partnershipBenefits: [
      "Fully equipped B2B portal",
      "Smart logistics & inventory management",
      "Customized marketing materials (social, POS, visuals)", 
      "Attractive margins & purchase conditions",
      "Possibility of regional exclusivity",
      "Inventory insights & delivery guarantee"
    ],
    
    finalCta: "Request your information package directly via the button below",
    ctaPortal: "To the B2B portal",
    ctaContactDistribution: "Contact us for distribution",
    qrSection: "Scan & discover our wholesale benefits"
  },
  
  de: {
    heroTitle: "Von Wasgeurtje.nl zu Amoeri – Die Evolution von Duft, Luxus und Vertrauen.",
    heroSubtitle: "Mehr als 100.000 zufriedene Kunden. Jetzt bereit für internationales Premium-Wachstum.",
    ctaDiscover: "B2B-Vorteile entdecken",
    ctaContact: "Jetzt Informationen anfordern",
    
    introTitle: "Unsere Reise bis jetzt",
    introStory: "In 5 Jahren wuchs Wasgeurtje.nl zur führenden Marke für Wäscheparfum. Bekannt für langanhaltende Dufterlebnisse und außergewöhnliche Kundenzufriedenheit.",
    socialProofCustomers: "+100.000 Kunden",
    socialProofReviews: "+2.500 Bewertungen (Durchschnitt 4,8/5)",
    socialProofRegions: "Kunden aus den Niederlanden, Belgien und Deutschland",
    introAmoeri: "Stolz präsentieren wir Amoeri – ein neues Kapitel, aufgebaut auf derselben Qualität, aber mit internationaler und luxuriöserer Ausstrahlung.",
    
    rebrandTitle: "Warum das Rebranding zu Amoeri?",
    rebrandSubtitle: "Neuer Name, gestärkte Vision",
    rebrandDescription: "Amoeri steht für Liebe, Reinheit und Duft, der berührt.",
    brandIdentityTitle: "Markenidentität:",
    brandIdentity: ["Elegantes & zeitloses Design", "Premium-Ausstrahlung", "Nachhaltige Mission"],
    visionTitle: "Zukunftsvision:",
    visionDescription: "Vom lokalen Webshop zur europäischen Marke – mit Blick auf Mensch, Umwelt und Dufterlebnis.",
    
    benefitsTitle: "Warum Amoeri? Die Vorteile auf einen Blick",
    benefits: [
      "Luxuriöses Dufterlebnis mit nur einem Verschluss",
      "Nachhaltige Inhaltsstoffe & vegane Formel",
      "Stabile Bestände & schnelle Lieferung (24-48 Stunden)",
      "Premium-Verpackung für maximales Erlebnis",
      "Konstante Produktqualität mit Wiederholungsbestellungen bis zu 60%"
    ],
    
    ambitionTitle: "Unser Ehrgeiz: internationales Wachstum",
    focusCountries: "Fokusländer: Deutschland, Frankreich, Skandinavien & UK",
    goal2026: "Ziel: 2026 eine führende Marke im Premium-Wäscheparfum zu sein",
    retailStrategy: "Einzelhandelsstrategie: Nur mit sorgfältig ausgewählten Partnern",
    targetGroup: "Zielgruppe: Qualitätsbewusste Käufer & Parfumliebhaber",
    
    testimonialsTitle: "Kunden sprechen",
    testimonials: [
      "Noch nie roch meine Wäsche so gut. Ich komme immer wieder!",
      "Der Duft hält tagelang an – sogar im Schrank."
    ],
    
    partnershipTitle: "Exklusive Partnerschaft?",
    partnershipSubtitle: "Werden Sie Handelspartner von Amoeri und profitieren Sie von:",
    partnershipBenefits: [
      "Vollständig eingerichtetes B2B-Portal",
      "Intelligente Logistik & Bestandsverwaltung",
      "Maßgeschneiderte Marketingmaterialien (Social, POS, Visuals)",
      "Attraktive Margen & Abnahmebedingungen", 
      "Möglichkeit regionaler Exklusivität",
      "Bestandseinblicke & Liefergarantie"
    ],
    
    finalCta: "Fordern Sie Ihr Informationspaket direkt über die Schaltfläche unten an",
    ctaPortal: "Zum B2B-Portal",
    ctaContactDistribution: "Kontakt für Vertrieb",
    qrSection: "Scannen & entdecken Sie unsere Großhandelsvorteile"
  },
  
  ar: {
    heroTitle: "من Wasgeurtje.nl إلى Amoeri – تطور العطر والفخامة والثقة.",
    heroSubtitle: "أكثر من 100,000 عميل راضٍ. جاهزون الآن للنمو المتميز دولياً.",
    ctaDiscover: "اكتشف مزايا B2B",
    ctaContact: "اطلب المعلومات الآن",
    
    introTitle: "رحلتنا حتى الآن",
    introStory: "في 5 سنوات، نمت Wasgeurtje.nl لتصبح العلامة التجارية الرائدة في عطور الغسيل. معروفة بتجربة العطر طويلة الأمد ورضا العملاء الاستثنائي.",
    socialProofCustomers: "+100,000 عميل",
    socialProofReviews: "+2,500 تقييم (متوسط 4.8/5)",
    socialProofRegions: "عملاء من هولندا وبلجيكا وألمانيا",
    introAmoeri: "نفتخر بتقديم Amoeri – فصل جديد، مبني على نفس الجودة، ولكن مع جاذبية دولية وأكثر فخامة.",
    
    rebrandTitle: "لماذا إعادة التسمية إلى Amoeri؟",
    rebrandSubtitle: "اسم جديد، رؤية معززة",
    rebrandDescription: "Amoeri يرمز للحب والنقاء والعطر الذي يلامس القلوب.",
    brandIdentityTitle: "هوية العلامة التجارية:",
    brandIdentity: ["تصميم أنيق وخالد", "مظهر متميز", "مهمة مستدامة"],
    visionTitle: "رؤية المستقبل:",
    visionDescription: "من متجر إلكتروني محلي إلى علامة تجارية أوروبية – مع التركيز على الإنسان والبيئة وتجربة العطر.",
    
    benefitsTitle: "لماذا Amoeri؟ المزايا لمحة سريعة",
    benefits: [
      "تجربة عطر فاخرة بغطاء واحد فقط",
      "مكونات مستدامة وتركيبة نباتية",
      "مخزون مستقر وتسليم سريع (24-48 ساعة)",
      "تغليف متميز للحصول على أقصى تجربة",
      "جودة منتج ثابتة مع طلبات متكررة تصل إلى 60%"
    ],
    
    ambitionTitle: "طموحنا: النمو الدولي",
    focusCountries: "البلدان المحورية: ألمانيا، فرنسا، الدول الاسكندنافية والمملكة المتحدة",
    goal2026: "الهدف: أن نكون علامة تجارية رائدة في عطور الغسيل المتميزة بحلول 2026",
    retailStrategy: "استراتيجية البيع بالتجزئة: فقط مع شركاء مختارين بعناية",
    targetGroup: "المجموعة المستهدفة: المتسوقون المهتمون بالجودة وعشاق العطور",
    
    testimonialsTitle: "شهادات العملاء",
    testimonials: [
      "لم تشم ملابسي رائحة جيدة من قبل. أعود دائماً!",
      "تدوم الرائحة لأيام – حتى في الخزانة."
    ],
    
    partnershipTitle: "شراكة حصرية؟",
    partnershipSubtitle: "كن شريك تجزئة مع Amoeri واستفد من:",
    partnershipBenefits: [
      "بوابة B2B مجهزة بالكامل",
      "لوجستيات ذكية وإدارة المخزون",
      "مواد تسويقية مخصصة (وسائل التواصل الاجتماعي، POS، المرئيات)",
      "هوامش جذابة وشروط شراء",
      "إمكانية الحصرية الإقليمية",
      "رؤى المخزون وضمان التسليم"
    ],
    
    finalCta: "اطلب حزمة المعلومات مباشرة عبر الزر أدناه",
    ctaPortal: "إلى بوابة B2B",
    ctaContactDistribution: "اتصل بنا للتوزيع",
    qrSection: "امسح واكتشف مزايا الجملة لدينا"
  }
}

type Language = 'nl' | 'en' | 'de' | 'ar'

// Pre-defined particle positions to avoid hydration mismatch
const particlePositions = [
  { top: 20, left: 10, delay: 0, duration: 15 },
  { top: 60, left: 85, delay: 2, duration: 20 },
  { top: 30, left: 20, delay: 4, duration: 18 },
  { top: 80, left: 70, delay: 1, duration: 22 },
  { top: 45, left: 50, delay: 3, duration: 16 },
  { top: 15, left: 90, delay: 5, duration: 25 },
  { top: 70, left: 30, delay: 2, duration: 19 },
  { top: 25, left: 60, delay: 4, duration: 21 },
  { top: 90, left: 40, delay: 1, duration: 17 },
  { top: 50, left: 15, delay: 3, duration: 23 },
  { top: 35, left: 75, delay: 0, duration: 20 },
  { top: 65, left: 45, delay: 2, duration: 18 },
  { top: 10, left: 35, delay: 4, duration: 24 },
  { top: 75, left: 80, delay: 1, duration: 16 },
  { top: 40, left: 25, delay: 3, duration: 22 },
  { top: 85, left: 55, delay: 5, duration: 19 },
  { top: 55, left: 95, delay: 2, duration: 21 },
  { top: 5, left: 65, delay: 0, duration: 17 },
  { top: 95, left: 5, delay: 4, duration: 23 },
  { top: 20, left: 40, delay: 1, duration: 20 }
]

// Pre-defined floating card positions for testimonials section
const floatingCardPositions = [
  { top: 20, left: 70, delay: 0, duration: 15 },
  { top: 10, left: 20, delay: 2, duration: 20 },
  { top: 60, left: 40, delay: 4, duration: 25 },
  { top: 80, left: 90, delay: 6, duration: 30 },
  { top: 50, left: 10, delay: 8, duration: 35 }
]

// Pre-defined partner section particles
const partnerParticlePositions = Array.from({ length: 30 }, (_, i) => ({
  top: 10 + (i * 3) % 80,
  left: 5 + (i * 4) % 90,
  delay: (i * 0.5) % 20,
  duration: 20 + (i % 20)
}))

export default function AmoeriLandingPage() {
  const [currentLang, setCurrentLang] = useState<Language>('nl')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [scrollProgress, setScrollProgress] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  const t = translations[currentLang]

  // Mouse tracking for parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: (e.clientX - rect.left - rect.width / 2) / rect.width,
          y: (e.clientY - rect.top - rect.height / 2) / rect.height
        })
      }
    }
    
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      const currentScroll = window.scrollY
      setScrollProgress(currentScroll / totalScroll)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className={`min-h-screen bg-black ${currentLang === 'ar' ? 'text-right' : 'text-left'}`} dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <AmoeriPremiumEffects />
      
      {/* Urgency Banner - Only for Dutch */}
      {currentLang === 'nl' && (
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-3 text-center relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-center gap-2 text-sm md:text-base font-bold animate-pulse">
            <span>🔥</span>
            <span>BEPERKT AANTAL PARTNERS - 300.000+ bewezen klanten wachten op jou - Claim jouw regio NU!</span>
            <span>🔥</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      )}
      
      <AmoeriNavigation currentLang={currentLang} onLanguageChange={setCurrentLang} />
      
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-900 z-50">
        <div 
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
      
      {/* Premium Hero Section with 3D Parallax */}
      <section 
        ref={heroRef}
        id="hero" 
        className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden"
      >
        {/* Video Background (optional) - commented out for now */}
        {/* <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 z-10"></div>
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          >
            <source src="/assets/videos/luxury-perfume-bg.mp4" type="video/mp4" />
          </video>
        </div> */}
        
        {/* Gradient background replacement */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/10 via-transparent to-yellow-800/10"></div>
        </div>
        
        {/* Interactive Background Elements */}
        <div className="absolute inset-0 z-0">
          {/* Animated gradient orbs */}
          <div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)',
              filter: 'blur(100px)',
              transform: `translate(${mousePosition.x * 50}px, ${mousePosition.y * 50}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
              filter: 'blur(100px)',
              transform: `translate(${-mousePosition.x * 50}px, ${-mousePosition.y * 50}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          />
          
          {/* Animated particles */}
          <div className="absolute inset-0">
            {particlePositions.map((particle, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400/50 rounded-full animate-float"
                style={{
                  top: `${particle.top}%`,
                  left: `${particle.left}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                  transform: `translate(${mousePosition.x * (20 + i)}px, ${mousePosition.y * (20 + i)}px)`
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center text-white">
          {/* Premium Logo Animation */}
          <div className="mb-12">
            <div 
              className="inline-flex items-center justify-center w-40 h-40 mb-8 relative group cursor-pointer"
              style={{
                transform: `perspective(1000px) rotateX(${mousePosition.y * 10}deg) rotateY(${mousePosition.x * 10}deg)`,
                transition: 'transform 0.3s ease-out'
              }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
              
              {/* Logo container */}
              <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black rounded-full p-6 shadow-2xl border border-yellow-400/20 group-hover:border-yellow-400/50 transition-all duration-500">
                <Image 
                  src="/assets/images/branding/LOGO-ZWART_Gold-2 (1)-min.svg" 
                  alt="Amoeri Logo" 
                  width={120} 
                  height={120}
                  className="object-contain w-full h-full"
                />
              </div>
              
              {/* Rotating ring */}
              <div className="absolute inset-0 rounded-full border-2 border-yellow-400/20 animate-spin-slow"></div>
              <div className="absolute inset-2 rounded-full border border-yellow-600/20 animate-spin-reverse"></div>
            </div>
            
            {/* Premium Typography */}
            <h1 className="text-7xl md:text-8xl font-bold mb-4 relative">
              <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-600 blur-xl opacity-70">
                AMOERI
              </span>
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-600 animate-gradient-shift">
                AMOERI
              </span>
            </h1>
            
            {/* Luxury tagline */}
            <p className="text-sm uppercase tracking-[0.3em] text-yellow-400/80 font-light">
              Premium Fragrance Experience
            </p>
          </div>
          
          {/* Hero Content with staggered animations */}
          <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight max-w-4xl mx-auto">
              <span className="inline-block transform hover:scale-110 transition-transform duration-300 text-yellow-400">✨</span> 
              <span className="inline-block hover:text-yellow-400 transition-colors duration-300">
                {t.heroTitle.split(' ').map((word, i) => (
                  <span 
                    key={i} 
                    className="inline-block mx-1 hover:transform hover:scale-105 transition-all duration-300"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
              {t.heroSubtitle}
            </p>
          </div>
          
          {/* Premium CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
            <button 
              onClick={() => router.push('/retailer-dashboard')}
              className="group relative px-10 py-5 overflow-hidden rounded-lg text-lg font-bold transition-all duration-500 transform hover:scale-105"
              onMouseEnter={(e) => {
                const btn = e.currentTarget
                btn.style.transform = 'scale(1.05) translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget
                btn.style.transform = 'scale(1) translateY(0)'
              }}
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 transition-all duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-shimmer"></div>
              </div>
              
              {/* Button content */}
              <span className="relative flex items-center text-black">
                <span className="mr-2 transform group-hover:translate-x-1 transition-transform duration-300">👉</span> 
                {t.ctaDiscover}
              </span>
            </button>
            
            <button 
              onClick={() => router.push('/contact')}
              className="group relative px-10 py-5 overflow-hidden rounded-lg text-lg font-bold transition-all duration-500"
            >
              {/* Border gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg"></div>
              <div className="absolute inset-[2px] bg-black rounded-lg group-hover:bg-transparent transition-colors duration-500"></div>
              
              {/* Button content */}
              <span className="relative flex items-center text-yellow-400 group-hover:text-black transition-colors duration-500">
                {t.ctaContact}
              </span>
            </button>
          </div>
        </div>
        
        {/* Premium Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="relative group cursor-pointer" onClick={() => {
            document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            <div className="w-12 h-20 border-2 border-yellow-400/50 rounded-full flex justify-center group-hover:border-yellow-400 transition-colors duration-300">
              <div className="w-2 h-4 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full mt-3 animate-bounce"></div>
            </div>
            <div className="absolute -inset-4 bg-yellow-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </div>
        </div>
      </section>

      {/* Premium Introduction Section with Animated Stats */}
      <section id="story" className="py-32 bg-black relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-transparent to-yellow-600 animate-gradient-shift"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            {/* Section title with reveal animation */}
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 animate-on-scroll">
              <span className="text-gradient-gold">{t.introTitle}</span>
            </h2>
            
            {/* Story with typewriter effect */}
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-4xl mx-auto mb-16 animate-on-scroll font-light">
              {t.introStory}
            </p>
            
            {/* Interactive Animated Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <CounterCard 
                endValue={300000}
                prefix="+"
                suffix=""
                label={t.socialProofCustomers}
                delay={0}
              />
              <CounterCard 
                endValue={60}
                prefix=""
                suffix="%"
                label={t.socialProofRegions}
                delay={200}
              />
              <CounterCard 
                endValue={5000}
                prefix="+"
                suffix=" reviews"
                label={t.socialProofReviews}
                delay={400}
              />
            </div>
            
            {/* Premium announcement card */}
            <div className="relative group cursor-pointer animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-r from-gray-900 to-black p-12 rounded-2xl border border-yellow-400/20 group-hover:border-yellow-400/40 transition-all duration-500 overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[url('/assets/patterns/luxury-pattern.svg')] bg-repeat opacity-20"></div>
                </div>
                
                <p className="text-2xl md:text-3xl leading-relaxed text-white relative z-10 font-light">
                  {t.introAmoeri}
                </p>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rebranding Section with Interactive Product Showcase */}
      <section className="py-20 bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 animate-on-scroll">{t.rebrandTitle}</h2>
            <h3 className="text-2xl text-yellow-400 font-semibold mb-8 animate-on-scroll" style={{ animationDelay: '100ms' }}>{t.rebrandSubtitle}</h3>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto animate-on-scroll" style={{ animationDelay: '200ms' }}>{t.rebrandDescription}</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text Content */}
            <div className="space-y-8">
              <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-yellow-400/20 animate-on-scroll premium-hover group">
                <h4 className="text-2xl font-bold text-yellow-400 mb-6 group-hover:text-yellow-300 transition-colors">{t.brandIdentityTitle}</h4>
                <ul className="space-y-4">
                  {t.brandIdentity.map((item, index) => (
                    <li key={index} className="flex items-center text-gray-300 group-hover:text-white transition-colors">
                      <span className="text-yellow-500 mr-3 text-2xl transform group-hover:scale-125 transition-transform">✨</span>
                      <span className="text-lg">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-yellow-400/20 animate-on-scroll premium-hover group" style={{ animationDelay: '300ms' }}>
                <h4 className="text-2xl font-bold text-yellow-400 mb-6 group-hover:text-yellow-300 transition-colors">{t.visionTitle}</h4>
                <p className="text-gray-300 text-lg leading-relaxed group-hover:text-white transition-colors">{t.visionDescription}</p>
              </div>
            </div>
            
            {/* Interactive Product Showcase */}
            <div className="relative flex items-center justify-center h-[500px] lg:h-[600px] product-showcase-container mt-12 lg:mt-0">
              {/* Ambient glow background */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-96 h-96 bg-gradient-to-r from-yellow-400/30 to-yellow-600/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute w-80 h-80 bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
              
              {/* Rotating rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[300px] md:w-[400px] lg:w-[450px] h-[300px] md:h-[400px] lg:h-[450px] border-2 border-yellow-400/20 rounded-full animate-spin-slow"></div>
                <div className="absolute w-[250px] md:w-[350px] lg:w-[400px] h-[250px] md:h-[350px] lg:h-[400px] border border-yellow-600/30 rounded-full animate-spin-reverse"></div>
                <div className="absolute w-[200px] md:w-[300px] lg:w-[350px] h-[200px] md:h-[300px] lg:h-[350px] border border-yellow-400/10 rounded-full animate-spin-slow" style={{ animationDuration: '25s' }}></div>
              </div>
              
              {/* Product container with 3D effect */}
              <div 
                className="relative z-10 product-float cursor-pointer group"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = (e.clientX - rect.left) / rect.width - 0.5
                  const y = (e.clientY - rect.top) / rect.height - 0.5
                  e.currentTarget.style.transform = `perspective(1000px) rotateX(${y * -20}deg) rotateY(${x * 20}deg) translateZ(50px)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
                }}
                style={{
                  transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
                  transition: 'transform 0.3s ease-out',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Glass reflection effect */}
                <div className="absolute -inset-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-3xl backdrop-blur-sm group-hover:from-white/20 group-hover:via-white/10 transition-all duration-500"></div>
                
                {/* Product image with shadow */}
                <div className="relative">
                  <Image
                    src="/assets/images/amoeri-oromea.png"
                    alt="Amoeri Oromea - Premium Wasparfum"
                    width={350}
                    height={525}
                    className="relative z-10 drop-shadow-2xl product-reveal transform group-hover:scale-105 transition-transform duration-500 w-[250px] md:w-[300px] lg:w-[350px] h-auto"
                    priority
                  />
                  
                  {/* Animated shadow */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-black/30 rounded-[50%] blur-2xl transform group-hover:scale-125 transition-transform duration-500"></div>
                </div>
                
                {/* Shimmer effect overlay */}
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"></div>
                </div>
                
                {/* Premium label with glow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 blur-lg opacity-70 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-3 rounded-full text-sm font-bold shadow-2xl transform hover:scale-110 transition-all duration-300 cursor-pointer">
                      FIRST CLASS WASHING PERFUME
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating sparkles around product */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-float"
                    style={{
                      top: `${15 + (i * 10)}%`,
                      left: `${15 + Math.sin(i * 45) * 30}%`,
                      animationDelay: `${i * 0.4}s`,
                      animationDuration: `${4 + (i % 3)}s`
                    }}
                  >
                    <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-400/50"></div>
                  </div>
                ))}
              </div>
              
              {/* Text annotations that appear on hover - hidden on mobile */}
              <div className="hidden lg:block absolute top-10 left-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-400/30">
                  <p className="text-yellow-400 text-sm font-semibold">Premium Quality</p>
                </div>
              </div>
              
              <div className="hidden lg:block absolute top-1/3 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-400/30">
                  <p className="text-yellow-400 text-sm font-semibold">100% Vegan</p>
                </div>
              </div>
              
              <div className="hidden lg:block absolute bottom-1/3 left-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-300">
                <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-400/30">
                  <p className="text-yellow-400 text-sm font-semibold">Long-lasting Fragrance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Interactive Benefits Showcase */}
      <section id="benefits" className="py-32 bg-black relative overflow-hidden">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-black to-yellow-800/20 animate-gradient-shift"></div>
          <div className="absolute inset-0 bg-[url('/assets/patterns/mesh-gradient.svg')] opacity-10"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 animate-on-scroll">
              <span className="text-gradient-gold">{t.benefitsTitle}</span>
            </h2>
            <p className="text-xl text-gray-400 font-light">Ervaar de luxe van premium wasparfum</p>
          </div>
          
          {/* 3D Interactive Benefits Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {t.benefits.map((benefit, index) => {
              const icons = ['💎', '🌿', '🚀', '🎁', '🔄']
              const gradients = [
                'from-yellow-400 to-orange-500',
                'from-green-400 to-emerald-600',
                'from-blue-400 to-indigo-600',
                'from-purple-400 to-pink-600',
                'from-red-400 to-rose-600'
              ]
              
              return (
                <div
                  key={index}
                  className="relative group preserve-3d cursor-pointer animate-on-scroll"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    perspective: '1000px'
                  }}
                >
                  {/* Card glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
                  
                  {/* 3D Card */}
                  <div 
                    className="relative bg-gradient-to-br from-gray-900/90 to-black/90 p-8 rounded-2xl border border-gray-800 group-hover:border-yellow-400/50 transition-all duration-500 transform-gpu group-hover:scale-105"
                    onMouseMove={(e) => {
                      const card = e.currentTarget
                      const rect = card.getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      
                      card.style.transform = `
                        perspective(1000px)
                        rotateY(${(x - 0.5) * 20}deg)
                        rotateX(${(y - 0.5) * -20}deg)
                        scale(1.05)
                      `
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)'
                    }}
                  >
                    {/* Icon */}
                    <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                      {icons[index]}
                    </div>
                    
                    {/* Benefit text */}
                    <p className="text-lg text-gray-300 leading-relaxed">
                      {benefit}
                    </p>
                    
                    {/* Hover indicator */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                        <span className="text-black text-sm">→</span>
                      </div>
                    </div>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Interactive CTA */}
          <div className="text-center mt-16">
            <button
              onClick={() => router.push('/retailer-dashboard')}
              className="group relative inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-black font-bold text-lg overflow-hidden transition-all duration-500 hover:scale-105"
            >
              <span className="relative z-10">Ontdek alle voordelen</span>
              <span className="relative z-10 group-hover:translate-x-2 transition-transform duration-300">→</span>
              
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
          </div>
        </div>
      </section>

      {/* Ambition Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-12">{t.ambitionTitle}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-xl">
              <p className="text-lg text-gray-800 font-medium">{t.focusCountries}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-xl">
              <p className="text-lg text-gray-800 font-medium">{t.goal2026}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-xl">
              <p className="text-lg text-gray-800 font-medium">{t.retailStrategy}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-xl">
              <p className="text-lg text-gray-800 font-medium">{t.targetGroup}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Interactive Testimonials */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
        {/* Floating testimonial cards background */}
        <div className="absolute inset-0 opacity-10">
          {floatingCardPositions.map((card, i) => (
            <div
              key={i}
              className="absolute w-64 h-32 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg blur-3xl animate-float"
              style={{
                top: `${card.top}%`,
                left: `${card.left}%`,
                animationDelay: `${card.delay}s`,
                animationDuration: `${card.duration}s`
              }}
            />
          ))}
        </div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 animate-on-scroll">
              <span className="text-gradient-gold">{t.testimonialsTitle}</span>
            </h2>
            <p className="text-xl text-gray-400 font-light">Wat onze klanten zeggen</p>
          </div>
          
          {/* 3D Testimonial Carousel */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {t.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="relative group animate-on-scroll"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  {/* Testimonial card with 3D effect */}
                  <div 
                    className="relative bg-gradient-to-br from-gray-900 to-black p-10 rounded-3xl border border-yellow-400/20 group-hover:border-yellow-400/40 transition-all duration-500 transform-gpu group-hover:scale-105"
                    onMouseMove={(e) => {
                      const card = e.currentTarget
                      const rect = card.getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      
                      card.style.transform = `
                        perspective(1000px)
                        rotateY(${(x - 0.5) * 10}deg)
                        rotateX(${(y - 0.5) * -10}deg)
                        scale(1.05)
                      `
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)'
                    }}
                  >
                    {/* Quote icon */}
                    <div className="absolute -top-4 -left-4 text-6xl text-yellow-400/20">"</div>
                    
                    {/* Stars with animation */}
                    <div className="flex gap-1 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={i} 
                          className="text-3xl text-yellow-400 animate-pulse"
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    
                    {/* Testimonial text */}
                    <p className="text-xl text-gray-300 italic leading-relaxed mb-6">
                      "{testimonial}"
                    </p>
                    
                    {/* Customer info */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold">
                        {['JW', 'MS'][index]}
                      </div>
                      <div>
                        <p className="text-white font-medium">{['Jack W.', 'Maria S.'][index]}</p>
                        <p className="text-gray-500 text-sm">Verified Customer</p>
                      </div>
                    </div>
                    
                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-yellow-400/0 to-yellow-600/0 group-hover:from-yellow-400/10 group-hover:to-yellow-600/10 transition-all duration-500"></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Trust indicators */}
            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-8 text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <span>100% Verified Reviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span>4.8/5 Average Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  <span>2500+ Reviews</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Partnership Experience */}
      <section id="partnership" className="py-32 bg-black relative overflow-hidden">
        {/* Animated golden particles */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 via-transparent to-transparent"></div>
          {partnerParticlePositions.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400/30 rounded-full animate-float"
              style={{
                top: `${particle.top}%`,
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Header with premium animation */}
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-bold mb-6 animate-on-scroll">
              <span className="text-gradient-gold animate-text-glow">{t.partnershipTitle}</span>
            </h2>
            <p className="text-2xl text-gray-300 font-light animate-on-scroll">{t.partnershipSubtitle}</p>
          </div>
          
          {/* Interactive Benefits Grid with Flip Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
            {t.partnershipBenefits.map((benefit, index) => {
              const icons = ['🛒', '🚚', '📈', '💰', '🤝', '📦']
              
              // Extra informatie voor de achterkant van elke card
              const extraInfo = [
                'Tap direct in op 300.000+ bewezen klanten. Ons B2B-portaal geeft je realtime inzicht in trending producten en bestelpatronen. Start vandaag en zie morgen al resultaat.',
                '60% van onze klanten bestelt binnen 3 maanden opnieuw. Met onze slimme logistiek lever je altijd op tijd. Nooit meer "nee" verkopen = nooit meer omzet missen.',
                'Profiteer van 5000+ positieve reviews. Kant-en-klare campagnes die bewezen werken. Jouw klanten kennen het product al van social media - ze wachten alleen nog op jou.',
                'Premium product = Premium marges. Klanten bestellen gemiddeld 4x per jaar. Met staffelkortingen groei je mee met het succes. ROI binnen 3 maanden gegarandeerd.',
                'LAATSTE KANS: Slechts 2-3 partners per regio. Als je nu niet handelt, doet je concurrent het morgen. 300.000 klanten in jouw regio wachten op een verkooppunt.',
                'Groei mee van 300.000 naar 1 miljoen klanten. Onze AI-gestuurde voorraadtools voorspellen de vraag. Je bent altijd voorbereid op de explosieve groei die eraan komt.'
              ]
              
              return (
                <div
                  key={index}
                  className="relative group cursor-pointer animate-on-scroll h-[300px] [perspective:1000px]"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {/* Flip Card Container */}
                  <div 
                    className="relative w-full h-full [transform-style:preserve-3d] transition-all duration-700 group-hover:[transform:rotateY(180deg)]"
                  >
                    {/* Front of card */}
                    <div 
                      className="absolute inset-0 w-full h-full [backface-visibility:hidden]"
                    >
                      <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-sm p-8 rounded-2xl border border-yellow-400/20 shadow-2xl">
                        {/* Icon */}
                        <div className="text-5xl mb-6">{icons[index]}</div>
                        
                        {/* Benefit text */}
                        <p className="text-lg lg:text-xl text-white/90 leading-relaxed flex-grow">{benefit}</p>
                        
                        {/* Hover indicator */}
                        <div className="mt-auto pt-4">
                          <p className="text-yellow-400/60 text-sm">Beweeg over de kaart voor meer info →</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Back of card */}
                    <div 
                      className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    >
                      <div className="h-full flex flex-col bg-gradient-to-br from-yellow-500/95 to-yellow-600/95 backdrop-blur-sm p-8 rounded-2xl border border-yellow-400/50 shadow-2xl">
                        {/* Icon smaller on back */}
                        <div className="text-3xl mb-4 opacity-80">{icons[index]}</div>
                        
                        {/* Title */}
                        <h3 className="text-xl font-bold text-black/90 mb-4">{benefit}</h3>
                        
                        {/* Extra info */}
                        <p className="text-black/80 text-base leading-relaxed flex-grow">{extraInfo[index]}</p>
                        
                        {/* CTA */}
                        <div className="mt-auto pt-4">
                          <p className="text-black/70 text-sm font-semibold">Start vandaag - Morgen kan te laat zijn ↓</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Premium CTA Section */}
          <div className="relative mt-32">
            {/* Background decoration */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative text-center">
              <p className="text-2xl text-gray-300 mb-8 animate-on-scroll">{t.finalCta}</p>
              
              {/* QR Code Section */}
              <div className="mb-12 animate-on-scroll">
                <div className="inline-flex items-center gap-6 p-8 bg-gradient-to-br from-gray-900/90 to-black/90 rounded-2xl border border-yellow-400/20">
                  <div className="w-32 h-32 bg-white p-2 rounded-lg">
                    <div className="w-full h-full bg-black rounded flex items-center justify-center text-white font-mono text-xs">
                      QR Code
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xl text-yellow-400 font-medium mb-2">{t.qrSection}</p>
                    <p className="text-gray-400">Direct toegang tot B2B portal</p>
                  </div>
                </div>
              </div>
              
              {/* Premium CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-8 justify-center">
                <button 
                  onClick={() => router.push('/retailer-dashboard')}
                  className="group relative px-12 py-6 overflow-hidden rounded-full text-xl font-bold transition-all duration-500"
                >
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 transition-all duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Button content */}
                  <span className="relative flex items-center justify-center gap-3 text-black">
                    <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">🔗</span>
                    {t.ctaPortal}
                    <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
                  </span>
                  
                  {/* Ripple effect on hover */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100">
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
                  </div>
                </button>
                
                <button 
                  onClick={() => router.push('/contact')}
                  className="group relative px-12 py-6 overflow-hidden rounded-full text-xl font-bold transition-all duration-500"
                >
                  {/* Border gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"></div>
                  <div className="absolute inset-[2px] bg-black rounded-full group-hover:bg-transparent transition-colors duration-500"></div>
                  
                  {/* Button content */}
                  <span className="relative flex items-center justify-center gap-3 text-yellow-400 group-hover:text-black transition-colors duration-500">
                    <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">📩</span>
                    {t.ctaContactDistribution}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="mb-8">
            <Image 
              src="/assets/images/branding/logo.svg" 
              alt="Amoeri Logo" 
              width={60} 
              height={60}
              className="mx-auto mb-4 invert"
            />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              AMOERI
            </h3>
          </div>
          <p className="text-gray-400">
            © 2024 Amoeri. {currentLang === 'nl' ? 'Alle rechten voorbehouden' : 
              currentLang === 'en' ? 'All rights reserved' : 
              currentLang === 'de' ? 'Alle Rechte vorbehalten' : 
              'جميع الحقوق محفوظة'}.
          </p>
        </div>
      </footer>
    </div>
  )
} 