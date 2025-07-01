'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export default function LogoutButton({
  className = '',
  variant = 'primary',
  size = 'md',
  iconOnly = false,
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Generate button styles based on variant and size
  const getBaseStyles = () => {
    let styles = 'font-medium rounded-md focus:outline-none transition-colors duration-150 flex items-center justify-center ';
    
    // Size styles
    if (size === 'sm') {
      styles += iconOnly ? 'p-1 ' : 'px-3 py-1 text-xs ';
    } else if (size === 'lg') {
      styles += iconOnly ? 'p-3 ' : 'px-6 py-3 text-base ';
    } else { // Medium (default)
      styles += iconOnly ? 'p-2 ' : 'px-4 py-2 text-sm ';
    }
    
    // Variant styles
    if (variant === 'secondary') {
      styles += 'text-white bg-pink-700 hover:bg-pink-800 border border-pink-800 hover:text-yellow-100 focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ';
    } else if (variant === 'danger') {
      styles += 'text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ';
    } else { // Primary (default)
      styles += 'text-white bg-pink-600 hover:bg-pink-700 focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ';
    }
    
    return styles;
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Error during logout:', error);
      // Reset the button state even if there's an error
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`${getBaseStyles()} ${className} ${isLoggingOut ? 'opacity-75 cursor-wait' : ''}`}
      aria-label="Uitloggen"
    >
      {/* Logout icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${iconOnly ? 'h-5 w-5' : 'h-4 w-4 mr-2'}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
        />
      </svg>
      
      {!iconOnly && (
        <span>{isLoggingOut ? 'Uitloggen...' : 'Uitloggen'}</span>
      )}
    </button>
  );
} 