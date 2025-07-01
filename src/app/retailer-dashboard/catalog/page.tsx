'use client';

import React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProducts, Product } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import Link from 'next/link';
import ProductItem from '@/components/ProductItem';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ProductItemSkeleton from '@/components/ProductItemSkeleton';
import CatalogSearchFilter from '@/components/CatalogSearchFilter';
import StickyCatalogHeader from '@/components/StickyCatalogHeader';

const ShoppingCartSidebar = dynamic(() => import('@/components/ShoppingCartSidebar'), {
  loading: () => <p>Winkelwagen laden...</p>,
  ssr: false
});

// Define quick order packages
const QUICK_ORDER_PACKAGES = [
  {
    id: 'starter-package',
    name: 'Starterspakket',
    description: 'Perfect voor nieuwe retailers - alle 5 topgeuren (10 stuks per geur): Full Moon, Sundance, Morning Vapor, Flower Rain en Blossom Drip.',
    price: 350,
    savings: 25, // Savings compared to buying individually
    image: '/assets/images/cadeauset.jpg',
    badge: 'Populair',
    products: [
      { sku: 'WP-FULLMOON-250', quantity: 10 },
      { sku: 'WP-SUNDANCE-250', quantity: 10 },
      { sku: 'WP-MORNING-250', quantity: 10 },
      { sku: 'WP-FLOWER-250', quantity: 10 },
      { sku: 'WP-BLOSSOM-250', quantity: 10 }
    ]
  },
  {
    id: 'discount-tier1',
    name: '3% Korting Pakket',
    description: 'Bereik direct de 3% kortingsdrempel met deze selectie',
    price: 500,
    savings: 40,
    image: '/assets/images/wasparfum-proefpakket-display.jpg',
    badge: 'Bespaar 3%',
    products: [
      { sku: 'WP-BLOSSOM-250', quantity: 8 },
      { sku: 'WP-MORNING-250', quantity: 8 },
      { sku: 'WP-SUNDANCE-250', quantity: 5 }
    ]
  },
  {
    id: 'discount-tier2',
    name: '5% Korting Pakket',
    description: 'Onze meest populaire combinatie met 5% volumekorting',
    price: 750,
    savings: 65,
    image: '/assets/images/full-moon-wasparfum.png',
    badge: 'Bespaar 5%',
    products: [
      { sku: 'WP-PROEF-001', quantity: 10 },
      { sku: 'WP-FLOWER-250', quantity: 10 },
      { sku: 'WS-START-32', quantity: 10 },
      { sku: 'WP-FULLMOON-250', quantity: 5 }
    ]
  }
];

// Definieer het type voor de pakketproducten voor TypeScript
interface PackageProduct {
  sku: string; // Veranderd van id naar sku
  quantity: number;
}

export default function CatalogPage() {
  const { user, retailerName } = useAuth();
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{[key: string]: {product: Product, quantity: number}}>({});
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedToCartMessage, setAddedToCartMessage] = useState<{productId: string, quantity: number} | null>(null);
  const [lastItemAddedTimestamp, setLastItemAddedTimestamp] = useState<number | null>(null);
  const [showStickyDiscount, setShowStickyDiscount] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const volumeDiscountRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const addedMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{hours: number, minutes: number, seconds: number}>({
    hours: 3,
    minutes: 0,
    seconds: 0
  });
  const [specialDiscountActive, setSpecialDiscountActive] = useState(true);
  const specialDiscountRate = 0.02; // Additional 2% on top of volume discounts
  const router = useRouter();
  
  // Bereken totalen
  const cartItemCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = Object.values(cart).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  // Discount tiers
  const DISCOUNT_TIERS = [
    { threshold: 500, discount: 0.03, label: '3%' }, // 3% discount for orders above €500
    { threshold: 750, discount: 0.05, label: '5%' }, // 5% discount for orders above €750
    { threshold: 1000, discount: 0.08, label: '8%' }, // 8% discount for orders above €1000
  ];
  
  // Calculate applicable discount
  const applicableDiscount = DISCOUNT_TIERS.filter(tier => cartSubtotal >= tier.threshold)
    .reduce((max, tier) => tier.discount > max.discount ? tier : max, { threshold: 0, discount: 0, label: '0%' });
  
  // Minimum order requirement
  const MINIMUM_ORDER_AMOUNT = 300;
  
  // Calculate final discount including special time-limited offer
  // De speciale korting geldt alleen voor het bedrag BOVEN het minimumbestelbedrag
  const specialDiscountApplicableAmount = specialDiscountActive && cartSubtotal > MINIMUM_ORDER_AMOUNT
    ? cartSubtotal - MINIMUM_ORDER_AMOUNT 
    : 0;
    
  const specialDiscountAmount = specialDiscountApplicableAmount * specialDiscountRate;
  
  // Recalculate discount amount with special offer if active
  const volumeDiscountAmount = cartSubtotal * applicableDiscount.discount;
  const discountAmount = volumeDiscountAmount + specialDiscountAmount;
  const cartTotal = cartSubtotal - discountAmount;
  
  // Calculate next discount tier
  const nextDiscountTier = DISCOUNT_TIERS.find(tier => cartSubtotal < tier.threshold);
  
  const isMinimumOrderMet = cartTotal >= MINIMUM_ORDER_AMOUNT;
  const progressPercentage = Math.min(100, (cartSubtotal / MINIMUM_ORDER_AMOUNT) * 100);
  
  // Progress to next discount tier (if applicable)
  const nextTierProgressPercentage = nextDiscountTier 
    ? Math.min(100, (cartSubtotal / nextDiscountTier.threshold) * 100) 
    : 100;
  
  // Add scroll event listener to track when volume discount section is out of viewport
  useEffect(() => {
    // Create mounted flag
    let isMounted = true;
    
    const handleScroll = () => {
      if (!isMounted) return;
      const currentScrollY = window.scrollY;
      const scrollThreshold = window.innerHeight * 0.3;
      
      // Sticky discount footer
      if (volumeDiscountRef.current) {
      const rect = volumeDiscountRef.current.getBoundingClientRect();
      setShowStickyDiscount(rect.bottom < 0);
      }
      
      // Verberg header als we bovenaan zijn
      if (currentScrollY < scrollThreshold) {
        setIsHeaderSticky(false);
      } else {
        // Toon bij naar beneden scrollen, verberg bij naar boven scrollen
        if (currentScrollY > lastScrollY.current) {
          setIsHeaderSticky(true); // Naar beneden
        } else if (currentScrollY < lastScrollY.current) {
          setIsHeaderSticky(false); // Naar boven
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Run once on mount to set initial state
    handleScroll();
    
    // Clean up
    return () => {
      isMounted = false;
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1200)); 

        const productsData = await getProducts(); // Correcte aanroep
        if (productsData) {
          setProducts(productsData);
        } else {
          console.error('Error loading products: No data returned');
          setProducts([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
  // Filter producten op basis van categorie en zoekterm
  const filteredProducts = products.filter(product => {
    const matchesCategory = !activeCategory || product.category === activeCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Exclude "Wasparfum proefpakket" and "Cadeauset wasparfum" from the "Alle producten" section
    const isExcluded = product.name.toLowerCase().includes('proefpakket') || 
                       product.name.toLowerCase().includes('cadeauset');
    
    return matchesCategory && matchesSearch && !isExcluded;
  });
  
  // Vind de speciale aanbevolen producten (proefpakket en cadeauset)
  const featuredProducts = products.filter(product => 
    product.name.toLowerCase().includes('proefpakket') || 
    product.name.toLowerCase().includes('cadeauset')
  );
  
  // Alle beschikbare categorieën berekenen
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
  
  // Modified addToCart function to handle bulk orders
  const addToCart = (product: Product, quantity: number = 1) => {
    // Clear any existing timeout to prevent memory leaks
    if (addedMessageTimeoutRef.current) {
      clearTimeout(addedMessageTimeoutRef.current);
      addedMessageTimeoutRef.current = null;
    }
    
    // Stuur een signaal dat een item is toegevoegd voor de header animatie
    setLastItemAddedTimestamp(Date.now());
    
    // Toon een visueel effect op de knop
    const button = document.querySelector(`button[data-product-id="${product.id}"]`);
    if (button) {
      button.classList.add('animate-pulse', 'bg-green-600');
      setTimeout(() => {
        button.classList.remove('animate-pulse', 'bg-green-600');
      }, 800);
      
      // Creëer een "vliegende" animatie van het product naar de winkelwagen
      const productCard = button.closest('.product-card');
      if (productCard) {
        const productImage = productCard.querySelector('img');
        if (productImage) {
          // Creëer een kloon van de afbeelding voor de animatie
          const flyingImg = document.createElement('img');
          flyingImg.src = productImage.src;
          flyingImg.alt = productImage.alt;
          flyingImg.style.position = 'fixed';
          flyingImg.style.zIndex = '9999';
          flyingImg.style.width = '50px';
          flyingImg.style.height = '50px';
          flyingImg.style.objectFit = 'cover';
          flyingImg.style.borderRadius = '50%';
          flyingImg.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          
          // Bereken startpositie (bij de productafbeelding)
          const rect = productImage.getBoundingClientRect();
          flyingImg.style.top = rect.top + 'px';
          flyingImg.style.left = rect.left + 'px';
          
          // Voeg toe aan body
          document.body.appendChild(flyingImg);
          
          // Bereken eindpositie (bij de winkelwagen knop)
          const cartButton = document.querySelector('.cart-button');
          if (cartButton) {
            const cartRect = cartButton.getBoundingClientRect();
            
            // Start de animatie
            setTimeout(() => {
              flyingImg.style.transition = 'all 1.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
              flyingImg.style.top = cartRect.top + 'px';
              flyingImg.style.left = cartRect.left + 'px';
              flyingImg.style.opacity = '0.5';
              flyingImg.style.transform = 'scale(0.3) rotate(720deg)';
              
              // Verwijder de afbeelding na de animatie
              setTimeout(() => {
                document.body.removeChild(flyingImg);
              }, 1800);
            }, 10);
          }
        }
      }
    }
    
    setCart(currentCart => {
      const updatedCart = { ...currentCart };
      
      if (updatedCart[product.id]) {
        updatedCart[product.id].quantity += quantity;
      } else {
        updatedCart[product.id] = { product, quantity };
      }
      
      return updatedCart;
    });
    
    // Show confirmation message
    setAddedToCartMessage({ productId: product.id, quantity });
    
    // Open cart sidebar alleen op desktop
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar && window.innerWidth > 768) { // Alleen openen op desktop (>768px)
      cartSidebar.classList.remove('translate-x-full');
      // Voeg een highlight toe aan het item in de winkelwagen
      setTimeout(() => {
        const cartItem = document.querySelector(`div[data-cart-item="${product.id}"]`);
        if (cartItem) {
          cartItem.classList.add('bg-green-50', 'transition-colors', 'duration-700');
          setTimeout(() => {
            cartItem.classList.remove('bg-green-50');
          }, 1500);
        }
      }, 300);
    }
    
    // Set timeout to clear the message
    addedMessageTimeoutRef.current = setTimeout(() => {
      setAddedToCartMessage(null);
      // Clear the ref to prevent memory leaks
      addedMessageTimeoutRef.current = null;
    }, 3000);
  };
  
  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart(currentCart => {
      const updatedCart = { ...currentCart };
      
      if (quantity <= 0) {
        delete updatedCart[productId];
      } else {
        updatedCart[productId].quantity = quantity;
      }
      
      return updatedCart;
    });
  };
  
  const removeFromCart = (productId: string) => {
    setCart(currentCart => {
      const updatedCart = { ...currentCart };
      delete updatedCart[productId];
      return updatedCart;
    });
  };
  
  const clearCart = () => {
    setCart({});
  };
  
  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };
  
  const handlePlaceOrder = async () => {
    if (getCartTotal() < 300) {
      // Use a simple alert instead of toast
      alert('Het minimale orderbedrag is €300.');
      return;
    }
    
    setOrderLoading(true);
    
    try {
      // Simulate API call (in a production app, this would be a real API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create an order record to save to localStorage
      const order = {
        id: `ORD-${Date.now()}`,
        totalAmount: getCartTotal(),
        items: Object.values(cart).map(item => ({
          id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          image_url: item.product.image_url || '/assets/images/products/product-main.png'
        })),
        date: new Date().toISOString()
      };
      
      // Save the order to localStorage
      localStorage.setItem('lastOrder', JSON.stringify(order));
      
      // Sla winkelwagen op in localStorage voor het geval gebruiker terugkeert
      localStorage.setItem('retailerCart', JSON.stringify(cart));
      
      // Synchroniseer de bestelling met het admin dashboard
      syncOrderToAdminDashboard(order);
      
      // Navigeer naar adreskeuze pagina in plaats van betalingspagina
      router.push('/retailer-dashboard/orders/address');
    } catch (error) {
      console.error('Error creating order:', error);
      // Use alert instead of toast
      alert('Er is iets misgegaan bij het plaatsen van je bestelling. Probeer het opnieuw.');
    } finally {
      setOrderLoading(false);
    }
  };
  
  // Functie om bestellingen te synchroniseren met het admin dashboard
  const syncOrderToAdminDashboard = (order: any) => {
    try {
      // Haal bestaande admin bestellingen op
      const savedMockOrders = localStorage.getItem('mockOrders');
      console.log('DEBUG: syncOrderToAdminDashboard aangeroepen', {
        order_id: order.id,
        heeftBestaandeData: !!savedMockOrders,
        lengte: savedMockOrders?.length
      });
      
      let mockOrdersData: any[] = [];
      
      if (savedMockOrders) {
        mockOrdersData = JSON.parse(savedMockOrders);
        console.log('DEBUG: Bestaande mockOrders geladen', {
          aantal: mockOrdersData.length,
          ids: mockOrdersData.map((o: any) => o.id).join(', ')
        });
      }
      
      // Controleer of de bestelling al bestaat
      const existingOrderIndex = mockOrdersData.findIndex((o: any) => o.id === order.id);
      
      // Omzetten van retailer order naar admin order format
      const adminOrder = {
        id: order.id,
        retailer_id: '4', // In een echte implementatie zou dit de daadwerkelijke retailer ID zijn
        total_amount: order.totalAmount,
        items: order.items,
        date: order.date,
        shipping_address: order.shippingAddress || {},
        payment_method: order.paymentMethod || 'invoice',
        payment_status: order.paymentStatus || 'pending',
        fulfillment_status: 'pending',
        payment_intent_id: order.paymentIntentId,
        stripe_session_id: order.stripeSessionId,
        retailer_business_name: 'Wasparfum Express' // In een echte implementatie zou dit de daadwerkelijke naam zijn
      };
      
      if (existingOrderIndex >= 0) {
        // Update bestaande bestelling
        mockOrdersData[existingOrderIndex] = adminOrder;
        console.log('DEBUG: Bestaande order bijgewerkt', { id: adminOrder.id, index: existingOrderIndex });
      } else {
        // Voeg nieuwe bestelling toe aan het begin van de array
        mockOrdersData.unshift(adminOrder);
        console.log('DEBUG: Nieuwe order toegevoegd', { id: adminOrder.id, nieuwAantal: mockOrdersData.length });
      }
      
      // Sla bijgewerkte mockOrders op
      localStorage.setItem('mockOrders', JSON.stringify(mockOrdersData));
      console.log('DEBUG: mockOrders opgeslagen in localStorage', {
        aantal: mockOrdersData.length,
        ids: mockOrdersData.map((o: any) => o.id).join(', ')
      });
    } catch (error) {
      console.error('Fout bij synchroniseren van bestelling met admin dashboard:', error);
    }
  };

  // Generate product recommendations based on cart contents
  useEffect(() => {
    // Only process if component is mounted and we have products
    if (products.length === 0) return;
    
    let isMounted = true;

    const generateRecommendations = () => {
      if (products.length > 0 && Object.keys(cart).length > 0) {
        // Get categories in cart
        const categoriesInCart = new Set(
          Object.values(cart).map(item => item.product.category)
        );
        
        // Get products not in cart that match categories in cart or are frequently bought together
        const possibleRecommendations = products.filter(product => 
          // Not already in cart
          !cart[product.id] && 
          // Either same category as something in cart or complementary product
          (categoriesInCart.has(product.category) || 
           // Simple complementary logic - could be more sophisticated in real app
           Object.values(cart).some(item => 
             // For demo assume products with similar pricing might go together
             Math.abs(item.product.price - product.price) < 10
           )
          )
        );
        
        // Sort by most relevant (could use actual purchase history in real app)
        const sortedRecommendations = [...possibleRecommendations].sort((a, b) => {
          // Prioritize products that would help reach the next discount tier
          if (nextDiscountTier) {
            const amountNeeded = nextDiscountTier.threshold - cartSubtotal;
            const diffA = Math.abs(a.price - amountNeeded);
            const diffB = Math.abs(b.price - amountNeeded);
            if (diffA < diffB) return -1;
            if (diffA > diffB) return 1;
          }
          
          // Then prioritize by stock availability and price
          if (a.stock_quantity > b.stock_quantity) return -1;
          if (a.stock_quantity < b.stock_quantity) return 1;
          return 0;
        });
        
        // Take top 3 recommendations
        if (isMounted) {
          setRecommendedProducts(sortedRecommendations.slice(0, 3));
        }
      } else if (isMounted) {
        setRecommendedProducts([]);
      }
    };

    // Generate recommendations
    generateRecommendations();
    
    // Clean up
    return () => {
      isMounted = false;
    };
  }, [cart, products, cartSubtotal]);

  // Calculate how much more a customer needs to spend to reach the next discount tier
  const amountToNextTier = useMemo(() => {
    if (!nextDiscountTier) return null;
    return nextDiscountTier.threshold - cartSubtotal;
  }, [nextDiscountTier, cartSubtotal]);

  // Countdown timer for special discount
  useEffect(() => {
    if (!specialDiscountActive) return;
    
    // Create a flag to track if component is mounted
    let isMounted = true;
    
    // Set expiration from localStorage or create new one
    const getInitialExpiration = () => {
      const savedExpiration = localStorage.getItem('specialDiscountExpiration');
      if (savedExpiration) {
        const expirationTime = parseInt(savedExpiration);
        if (expirationTime > Date.now()) {
          return expirationTime;
        }
      }
      
      // Set new expiration for 3 hours from now
      const newExpiration = Date.now() + (3 * 60 * 60 * 1000);
      localStorage.setItem('specialDiscountExpiration', newExpiration.toString());
      return newExpiration;
    };
    
    const expirationTime = getInitialExpiration();
    
    const updateTimer = () => {
      // Don't update state if component is unmounted
      if (!isMounted) return;
      
      const now = Date.now();
      const diff = expirationTime - now;
      
      if (diff <= 0) {
        if (isMounted) {
          setSpecialDiscountActive(false);
          localStorage.removeItem('specialDiscountExpiration');
        }
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (isMounted) {
        setTimeRemaining({ hours, minutes, seconds });
      }
    };
    
    // Update immediately
    updateTimer();
    
    // Set interval for countdown
    const interval = setInterval(updateTimer, 1000);
    
    // Clean up function to prevent memory leaks and updates after unmount
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [specialDiscountActive]);

  // Find most appropriate quick order package based on cart status
  const recommendedPackage = useMemo(() => {
    if (cartSubtotal === 0) {
      // For empty cart, recommend starter package
      return QUICK_ORDER_PACKAGES[0];
    } else if (nextDiscountTier) {
      // Find package that helps reach next discount tier
      if (nextDiscountTier.threshold === 500) {
        return QUICK_ORDER_PACKAGES[1]; // 3% discount package
      } else if (nextDiscountTier.threshold === 750) {
        return QUICK_ORDER_PACKAGES[2]; // 5% discount package
      }
    }
    
    // Default to starter package
    return QUICK_ORDER_PACKAGES[0];
  }, [cartSubtotal, nextDiscountTier && nextDiscountTier.threshold]);
  
  // Function to add package to cart
  const addPackageToCart = (packageData: typeof QUICK_ORDER_PACKAGES[0]) => {
    // Map package product SKUs to actual product objects
    const packageProducts = packageData.products.map((item: PackageProduct) => {
      // Zoek het product op SKU, dit is de meest betrouwbare methode
      const product = products.find(p => p.sku === item.sku);
      
      // Debug logging om te zien welke producten gevonden worden
      console.log(`Zoek product met SKU: ${item.sku}`, product ? 'gevonden' : 'niet gevonden');
      
      return product ? { product, quantity: item.quantity } : null;
    }).filter(Boolean) as {product: Product, quantity: number}[];
    
    // Debug logging om te controleren hoeveel producten worden toegevoegd
    console.log(`Aantal producten om toe te voegen: ${packageProducts.length}`);
    
    // Als het een Starterspakket is en we niet alle producten konden vinden, toon een waarschuwing
    if (packageData.id === 'starter-package' && packageProducts.length < packageData.products.length) {
      console.warn(`Niet alle producten van het Starterspakket konden worden gevonden. Gevonden: ${packageProducts.length}/${packageData.products.length}`);
      alert(`Let op: Niet alle producten van het Starterspakket konden worden gevonden. Het pakket bevat normaal 10 stuks van elk van de 5 geuren.`);
    }
    
    // Toon een visueel effect op de knop
    const button = document.querySelector(`button[data-package-id="${packageData.id}"]`);
    if (button) {
      button.classList.add('animate-pulse', 'bg-purple-800');
      setTimeout(() => {
        button.classList.remove('animate-pulse', 'bg-purple-800');
      }, 800);
      
      // Creëer een "vliegende" animatie van het pakket naar de winkelwagen
      const packageCard = button.closest('.package-card');
      if (packageCard) {
        const packageImage = packageCard.querySelector('img');
        if (packageImage) {
          // Creëer een kloon van de afbeelding voor de animatie
          const flyingImg = document.createElement('img');
          flyingImg.src = packageImage.src;
          flyingImg.alt = 'Package';
          flyingImg.style.position = 'fixed';
          flyingImg.style.zIndex = '9999';
          flyingImg.style.width = '70px';
          flyingImg.style.height = '70px';
          flyingImg.style.objectFit = 'cover';
          flyingImg.style.borderRadius = '50%';
          flyingImg.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
          
          // Bereken startpositie (bij de pakketafbeelding)
          const rect = packageImage.getBoundingClientRect();
          flyingImg.style.top = rect.top + 'px';
          flyingImg.style.left = rect.left + 'px';
          
          // Voeg toe aan body
          document.body.appendChild(flyingImg);
          
          // Bereken eindpositie (bij de winkelwagen knop)
          const cartButton = document.querySelector('.cart-button');
          if (cartButton) {
            const cartRect = cartButton.getBoundingClientRect();
            
            // Start de animatie
            setTimeout(() => {
              flyingImg.style.transition = 'all 1.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
              flyingImg.style.top = cartRect.top + 'px';
              flyingImg.style.left = cartRect.left + 'px';
              flyingImg.style.opacity = '0.5';
              flyingImg.style.transform = 'scale(0.3) rotate(360deg)';
              
              // Verwijder de afbeelding na de animatie
              setTimeout(() => {
                document.body.removeChild(flyingImg);
              }, 1800);
            }, 10);
          }
        }
      }
    }
    
    // Add all products to cart
    setCart(currentCart => {
      const updatedCart = { ...currentCart };
      
      packageProducts.forEach(item => {
        if (updatedCart[item.product.id]) {
          updatedCart[item.product.id].quantity += item.quantity;
        } else {
          updatedCart[item.product.id] = item;
        }
      });
      
      // Debug logging om de bijgewerkte winkelwagen te bekijken
      console.log('Bijgewerkte winkelwagen:', updatedCart);
      
      return updatedCart;
    });
    
    // Stuur een signaal dat een item is toegevoegd voor de header animatie
    setLastItemAddedTimestamp(Date.now());
    
    // Open cart sidebar alleen op desktop
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar && window.innerWidth > 768) { // Alleen openen op desktop (>768px)
      cartSidebar.classList.remove('translate-x-full');
      
      // Voeg een highlight toe aan de toegevoegde items in de winkelwagen
      setTimeout(() => {
        packageProducts.forEach(item => {
          const cartItem = document.querySelector(`div[data-cart-item="${item.product.id}"]`);
          if (cartItem) {
            cartItem.classList.add('bg-purple-50', 'transition-colors', 'duration-700');
            setTimeout(() => {
              cartItem.classList.remove('bg-purple-50');
            }, 1500);
          }
        });
      }, 300);
    }
  };

  // Function to get motivational message based on discount tier
  const getDiscountMotivationMessage = () => {
    // Als er al een volumekorting is, toon bericht voor de volgende drempel
    if (applicableDiscount.discount > 0) {
      if (nextDiscountTier) {
        return {
          title: `U ontvangt nu ${applicableDiscount.label} korting! Volgende stap: ${nextDiscountTier.label}`,
          description: `Bestel nog voor €${(nextDiscountTier.threshold - cartSubtotal).toFixed(2)} extra om ${nextDiscountTier.label} korting te krijgen op uw gehele bestelling!`
        };
      } else {
        // Hoogste niveau bereikt
        return {
          title: `Gefeliciteerd! U ontvangt het maximale kortingspercentage van ${applicableDiscount.label}!`,
          description: "U profiteert van onze hoogste kortingsniveau op uw gehele bestelling."
        };
      }
    } else if (nextDiscountTier) {
      // Nog geen korting, maar wel op weg naar de eerste drempel
      return {
        title: `Op weg naar ${nextDiscountTier.label} korting!`,
        description: `Bestel nog voor €${(nextDiscountTier.threshold - cartSubtotal).toFixed(2)} extra om ${nextDiscountTier.label} korting te krijgen op uw gehele bestelling!`
      };
    }
    
    // Fallback bericht
    return {
      title: `Bestel meer voor korting!`,
      description: `Bestel voor €${(DISCOUNT_TIERS[0].threshold - cartSubtotal).toFixed(2)} extra om ${DISCOUNT_TIERS[0].label} korting te krijgen.`
    };
  };

  // Controleer of de Stripe keys beschikbaar zijn
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const secretKey = localStorage.getItem('STRIPE_SECRET_KEY');
      const publishableKey = localStorage.getItem('STRIPE_PUBLISHABLE_KEY');
      
      console.log('Stripe keys in catalogus:', {
        secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : 'Niet beschikbaar',
        publishableKey: publishableKey ? `${publishableKey.substring(0, 10)}...` : 'Niet beschikbaar',
        secretKeyLength: secretKey?.length || 0,
        publishableKeyLength: publishableKey?.length || 0
      });
    }
  }, []);

  return (
    <main className="flex-grow py-6">
      {isHeaderSticky && (
        <StickyCatalogHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          categories={categories}
          cartItemCount={cartItemCount}
          cartSubtotal={cartSubtotal}
          amountToNextTier={amountToNextTier}
          nextDiscountTier={nextDiscountTier}
          lastItemAddedTimestamp={lastItemAddedTimestamp}
          onCartClick={() => {
            const cartSidebar = document.getElementById('cart-sidebar');
            if (cartSidebar) cartSidebar.classList.remove('translate-x-full');
          }}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Catalogus</h1>
          <p className="text-sm text-gray-500">
            Bekijk en bestel onze producten voor uw winkel.
          </p>
      </div>
      
        {/* Winkelwagen samenvatting */}
        {cartItemCount > 0 && (
          <div className="bg-white shadow-md rounded-lg p-4 mb-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-pink-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-gray-700">Uw winkelwagen</h3>
                  <p className="text-sm text-gray-500">{cartItemCount} {cartItemCount === 1 ? 'product' : 'producten'} (€{cartSubtotal.toFixed(2)})</p>
                </div>
              </div>
              
              <div className="space-x-2">
                <button 
                  onClick={() => {
                    const cartSidebar = document.getElementById('cart-sidebar');
                    if (cartSidebar) cartSidebar.classList.remove('translate-x-full');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  Bekijk winkelwagen
                </button>
                
                <button
                  onClick={handlePlaceOrder}
                  disabled={!isMinimumOrderMet || orderLoading}
                  className={`hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                    !isMinimumOrderMet 
                      ? 'text-gray-700 bg-gray-200 cursor-not-allowed' 
                      : 'text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                >
                  {orderLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Bestellen...
                    </>
                  ) : (
                    'Bestelling plaatsen'
                  )}
                </button>
              </div>
            </div>
            
            {!isMinimumOrderMet && (
              <div className="mt-3">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200">
                        Minimaal bestelbedrag
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-pink-600">
                        €{(MINIMUM_ORDER_AMOUNT - cartTotal).toFixed(2)} tekort
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-pink-200">
                    <div style={{ width: `${progressPercentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500 transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Absolute decorative elements */}
            <div className="absolute right-0 top-0 h-16 w-16 -mr-8 -mt-8 bg-pink-500 rounded-full opacity-10"></div>
            <div className="absolute left-0 bottom-0 h-16 w-16 -ml-8 -mb-8 bg-pink-500 rounded-full opacity-10"></div>
          </div>
        )}
        
        {/* Volume korting informatie */}
        <div ref={volumeDiscountRef} className={`bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md rounded-lg p-4 mb-6 ${cartItemCount === 0 ? '' : 'border-2 border-blue-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-indigo-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12zm-1-5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Exclusieve Retailer Voordelen
            </h3>
            {specialDiscountActive && (
              <div className="flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-1 rounded-full animate-pulse">
                <svg className="w-3 h-3 mr-1 text-pink-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <span className="font-bold">Tijdelijke aanbieding:</span> nog {timeRemaining.hours}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </div>
            )}
          </div>
          
          <div className="bg-white p-3 rounded-md mb-3 border border-indigo-100">
            <p className="text-sm text-gray-800 mb-1 font-medium">
              <span className="text-indigo-700 font-bold">Minimale bestelwaarde €300</span> - Voor optimale samenwerking hanteren wij een minimale bestelwaarde, wat u voordeel biedt:
            </p>
            <ul className="text-xs text-gray-700 pl-4 list-disc space-y-1">
              <li>Exclusieve inkoopprijzen voor retailpartners</li>
              <li>Minimale orderwaarde garandeert u betere marges</li>
              <li>Bij proefpakket: retailer prijs €7 (i.p.v. €14,95 consumentenprijs)</li>
              <li>Bulk voordeel: vanaf 100 stuks proefpakket voor slechts €6 per stuk (€1 extra voordeel)</li>
            </ul>
          </div>
          
          <p className="text-sm text-indigo-700 mb-2">
            <span className="font-bold">95% van onze topretailers</span> profiteert van extra inkoopkorting bij grotere bestellingen. Hoe meer u bestelt, hoe hoger uw winstmarge wordt.
          </p>
          
          <div className="flex items-center space-x-4 mb-2">
            {DISCOUNT_TIERS.map((tier, index) => (
              <div key={index} className={`px-3 py-2 rounded-md text-center flex-1 relative ${
                cartSubtotal >= tier.threshold
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md transform -translate-y-1'
                  : 'bg-white text-indigo-900 border border-gray-200'
              }`}>
                <div className="font-bold text-lg mb-0.5">{tier.label}</div>
                <div className={`text-xs ${cartSubtotal >= tier.threshold ? 'text-blue-100' : 'text-gray-500'}`}>
                  vanaf €{tier.threshold}
                </div>
                {cartSubtotal >= tier.threshold && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold py-1 px-2 rounded-full">
                    Ontgrendeld!
                  </div>
                )}
                {nextDiscountTier && tier.threshold === nextDiscountTier.threshold && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold py-1 px-2 rounded-full animate-bounce">
                    Bijna daar!
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Motivational message */}
          <div className="text-sm text-indigo-800 font-medium mt-2">
            {getDiscountMotivationMessage().title}
          </div>
          <div className="text-xs text-indigo-700 mt-0.5">
            {getDiscountMotivationMessage().description}
          </div>
          
          {/* Social Proof + Loss Aversion */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center text-xs text-indigo-700">
              <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <p><span className="font-bold">8 andere retailers</span> in uw regio hebben deze week al hun kortingsvoordeel veiliggesteld</p>
            </div>
            {amountToNextTier && amountToNextTier < 100 && (
              <div className="flex items-center text-xs text-pink-700 mt-1">
                <svg className="w-4 h-4 mr-1.5 text-pink-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p><span className="font-bold">Slechts €{amountToNextTier.toFixed(2)}</span> verwijderd van extra korting die u anders misloopt!</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Sticky Retailer Voordelen voor wanneer de gebruiker scrollt */}
        {showStickyDiscount && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg border-t-2 border-blue-200 p-3 z-50 transition-transform duration-300 transform translate-y-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12zm-1-5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-indigo-900 text-sm">Exclusieve Retailer Voordelen</h3>
                    <div className="text-xs text-indigo-700">{getDiscountMotivationMessage().title}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {specialDiscountActive && (
                    <div className="hidden md:flex items-center bg-pink-100 text-pink-800 text-xs font-medium px-2.5 py-1 rounded-full animate-pulse">
                      <span className="font-bold">Tijdelijke aanbieding:</span> nog {timeRemaining.hours}:{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    {DISCOUNT_TIERS.map((tier, index) => (
                      <div key={index} className={`px-2 py-1 rounded-md text-center ${
                        cartSubtotal >= tier.threshold
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                          : 'bg-white text-indigo-900 border border-gray-200'
                      }`}>
                        <div className="font-bold text-xs">{tier.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => {
                      // Scroll terug naar de oorspronkelijke korting sectie
                      volumeDiscountRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="ml-2 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Aanbevelingen voor upsell */}
        {cartItemCount > 0 && recommendedProducts.length > 0 && (
          <div className="bg-white shadow rounded-lg p-4 mb-6 border-l-4 border-green-500">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                <span className="relative">
                  Persoonlijke Aanbevelingen
                  <span className="absolute -top-1 -right-8 bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-xl">AI</span>
                </span>
              </h3>
              <span className="text-xs text-gray-500">Exclusief voor {retailerName || 'u'} geselecteerd</span>
            </div>
            
            <div className="bg-green-50 p-2 rounded-md mb-4 flex items-center">
              <svg className="w-5 h-5 text-green-700 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              <span className="text-sm text-green-800">
                {nextDiscountTier ? (
                  <>
                    <span className="font-bold">Exclusieve tip:</span> Door deze producten toe te voegen bereikt u de <span className="font-bold">{nextDiscountTier.label}</span> korting. Een besparing van <span className="font-bold">€{(cartSubtotal * (nextDiscountTier.discount - applicableDiscount.discount)).toFixed(2)}</span> op uw huidige bestelling!
                  </>
                ) : (
                  <>
                    <span className="font-bold">Insider tip:</span> 92% van de retailers die deze combinatie bestellen zien een omzetgroei van 15-20% in de eerste maand.
                  </>
                )}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommendedProducts.map(product => (
                <div key={product.id} className="p-3 bg-green-50 rounded-lg border border-green-100 hover:shadow-md transition flex items-start relative group">
                  {/* Scarcity Badge */}
                  {product.stock_quantity <= 10 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold py-0.5 px-1.5 rounded-full z-10">
                      Nog maar {product.stock_quantity} op voorraad!
                    </div>
                  )}

                  <div className="w-12 h-12 bg-white rounded overflow-hidden flex-shrink-0 mr-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-medium text-gray-900 mb-0.5">{product.name}</h4>
                    
                    {/* Social Proof - only visible on hover */}
                    <p className="text-xs text-green-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="font-bold">{Math.floor(Math.random() * 15) + 5}</span> retailers kochten dit recent
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-700">€{product.price.toFixed(2)}</span>
                      <button
                        onClick={() => addToCart(product, 1)}
                        className="inline-flex items-center justify-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 group-hover:animate-pulse"
                        data-product-id={product.id}
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Slimme Productaanbevelingen voor lege winkelwagen */}
        {cartItemCount === 0 && !searchQuery && !activeCategory && (
      <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path>
                </svg>
                <span>Bestseller Starterspakketten</span>
              </h3>
              <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">Beperkte voorraad</span>
              </div>
            
            <p className="text-sm text-gray-600 mb-2">
              Begin direct met onze meest populaire combinaties en bespaar tot <span className="font-bold text-blue-700">€65,00</span> t.o.v. losse bestellingen.
            </p>
            
            {/* Limited time offer banner */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-yellow-800">
                <span className="font-bold">Tijdelijke actie:</span> Bestel vandaag een starterspakket en ontvang gratis een displaystandaard (t.w.v. €29,95)!
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {QUICK_ORDER_PACKAGES.map((pkg, index) => (
                <div key={pkg.id} className="bg-gradient-to-br from-white to-blue-50 rounded-lg border border-blue-200 overflow-hidden shadow-md package-card hover:shadow-lg transition-shadow relative group">
                  {/* Order count badges */}
                  <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-blue-800 text-xs py-1 px-2 rounded-full z-10 flex items-center">
                    <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>{Math.floor(Math.random() * 60) + 12}</span> besteld deze week
                  </div>
                
                  <div className="h-36 bg-gray-100 relative">
                    <img 
                      src={pkg.image} 
                      alt={pkg.name} 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded">
                      {pkg.badge}
            </div>
          </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-700">€{pkg.price}</div>
                        <div className="text-xs text-green-600 font-bold">Bespaar €{pkg.savings}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                    
                    {/* Toon geuren lijst voor het Starterspakket */}
                    {pkg.id === 'starter-package' && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-100">
                        <p className="text-xs font-medium text-blue-800 mb-1">Bevat 10 stuks van elke geur:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {pkg.products.map((product: PackageProduct) => {
                              // Vind de volledige productnaam op basis van de SKU
                              const fullProduct = products.find(p => p.sku === product.sku);
                              return (
                                <div key={product.sku} className="text-xs text-blue-700 flex items-center">
                                  <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>{fullProduct?.name || product.sku}</span>
                                </div>
                              );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Authority/Social proof element */}
                    <div className="mb-3 flex items-center text-xs text-blue-800 bg-blue-50 p-1.5 rounded">
                      <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Aanbevolen door onze productexperts</span>
      </div>
                    
                    <button
                      data-package-id={pkg.id}
                      onClick={() => addPackageToCart(pkg)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 group-hover:animate-pulse"
                    >
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Direct Bestellen
                    </button>
                  </div>
                  
                  {/* Package low stock indicator */}
                  {index === 1 && (
                    <div className="bg-red-100 text-red-800 text-xs text-center py-1 font-medium border-t border-red-200">
                      Nog maar 3 pakketten beschikbaar!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      
        {/* Speciale sectie: Aanbevolen voor uw winkel */}
        {!searchQuery && !activeCategory && featuredProducts.length > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg overflow-hidden shadow-lg border border-amber-200">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-amber-800 flex items-center">
                    <svg className="w-6 h-6 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
                    Exclusief aanbevolen voor {retailerName || 'uw winkel'}
                  </h2>
                  <div className="hidden sm:flex items-center space-x-1">
                    <div className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
                      Topverkopers
          </div>
                    <div className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">
                      Beperkte voorraad
                    </div>
                  </div>
                </div>
                
                {/* Social proof for this section */}
                <div className="bg-white rounded-lg p-3 mb-4 flex items-center">
                  <div className="flex -space-x-2 mr-3">
                    <img className="w-8 h-8 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" />
                    <img className="w-8 h-8 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" />
                    <img className="w-8 h-8 rounded-full border-2 border-white" src="https://randomuser.me/api/portraits/men/51.jpg" alt="User" />
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-500 flex items-center justify-center text-xs text-white font-bold">+8</div>
                  </div>
                  <p className="text-sm text-amber-800">
                    <span className="font-bold">11 retailers in uw regio</span> hebben deze winkelboosterpakketten al toegevoegd aan hun assortiment.
                  </p>
          </div>
                
                <p className="text-amber-800 mb-6 max-w-3xl">
                  Deze speciaal geselecteerde producten zijn bewezen omzetverhogers voor {retailerName || 'winkels zoals de uwe'}. Ze bieden tot <span className="font-bold underline">300% hogere marges</span> en stimuleren herhalingsaankopen.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredProducts.map(product => (
              <ProductItem 
                key={product.id}
                product={product}
                addToCart={addToCart}
                inCart={Boolean(cart[product.id])}
                inCartQuantity={cart[product.id]?.quantity || 0}
              />
            ))}
      </div>
      
                <div className="mt-8 p-4 bg-white rounded-lg border border-amber-200 shadow-inner">
                  <h3 className="text-amber-800 font-medium mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-amber-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
                    <span>Exclusieve strategie voor {retailerName || 'uw winkel'}</span>
                  </h3>
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/3">
                      <p className="text-sm text-slate-700 mb-2">
                        <span className="font-bold text-amber-800">Geheim van topverkopers:</span> Retailers die deze producten strategisch bij de kassa plaatsen zien een <span className="font-bold">15-20% omzetstijging</span> op hun hele assortiment door impulsaankopen én een hogere klantloyaliteit.
                      </p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Verhoog gemiddelde orderwaarde met 35%</span>
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>92% van klanten komt terug voor meer</span>
                        </li>
                        <li className="flex items-center">
                          <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Perfect voor feestdagen (beperkte seizoensvoorraad)</span>
                        </li>
                      </ul>
                    </div>
                    <div className="md:w-1/3 mt-3 md:mt-0 flex justify-center items-center">
                      <button 
                        onClick={() => {
                          featuredProducts.forEach(product => addToCart(product, 3));
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-md shadow-md text-sm font-medium animate-pulse"
                      >
                        Voeg beide toe (3 stuks elk)
                      </button>
                    </div>
                  </div>
              </div>
              </div>
                </div>
              </div>
            )}
            
        {/* Zoek- en filterbalk */}
        <div className="mb-6">
          <CatalogSearchFilter 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            categories={categories}
                />
              </div>
            
        <div className="bg-white shadow rounded-lg mb-6">
          {productsLoading ? (
              <div>
              <div className="p-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ProductItemSkeleton key={index} />
                  ))}
            </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-center">
              {searchQuery ? (
                <p className="text-gray-500">Geen producten gevonden voor "{searchQuery}". Probeer een andere zoekterm.</p>
              ) : (
                <p className="text-gray-500">Er zijn momenteel geen producten beschikbaar.</p>
              )}
                  </div>
          ) : (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-700">{activeCategory ? activeCategory : 'Alle producten'}</h2>
                </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
                {filteredProducts.map((product) => (
                  <ProductItem 
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    inCart={Boolean(cart[product.id])}
                    inCartQuantity={cart[product.id]?.quantity || 0}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
        
        {/* Winkelwagen sidebar */}
        <ShoppingCartSidebar
          cart={cart}
          cartItemCount={cartItemCount}
          cartSubtotal={cartSubtotal}
          cartTotal={cartTotal}
          applicableDiscount={applicableDiscount}
          volumeDiscountAmount={volumeDiscountAmount}
          specialDiscountAmount={specialDiscountAmount}
          specialDiscountActive={specialDiscountActive}
          isMinimumOrderMet={isMinimumOrderMet}
          MINIMUM_ORDER_AMOUNT={MINIMUM_ORDER_AMOUNT}
          progressPercentage={progressPercentage}
          nextDiscountTier={nextDiscountTier}
          nextTierProgressPercentage={nextTierProgressPercentage}
          amountToNextTier={amountToNextTier}
          orderLoading={orderLoading}
          updateCartQuantity={updateCartQuantity}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          handlePlaceOrder={handlePlaceOrder}
        />
    </div>
    </main>
  );
} 