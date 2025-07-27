'use client';

// =====================================================
// ALERT COMPONENT - Professional UI Component
// Multi-type alert component voor commercial workflow testing
// =====================================================

import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export interface AlertProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
  className?: string;
  icon?: boolean;
}

// Helper functie voor variant styling
const getVariantClasses = (variant: string = 'default') => {
  switch (variant) {
    case 'success':
      return {
        container: 'bg-green-50 border-green-200 text-green-800',
        title: 'text-green-900',
        icon: 'text-green-600',
        closeButton: 'text-green-500 hover:text-green-700'
      };
    case 'error':
      return {
        container: 'bg-red-50 border-red-200 text-red-800',
        title: 'text-red-900',
        icon: 'text-red-600',
        closeButton: 'text-red-500 hover:text-red-700'
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        title: 'text-yellow-900',
        icon: 'text-yellow-600',
        closeButton: 'text-yellow-500 hover:text-yellow-700'
      };
    case 'info':
      return {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        title: 'text-blue-900',
        icon: 'text-blue-600',
        closeButton: 'text-blue-500 hover:text-blue-700'
      };
    case 'default':
    default:
      return {
        container: 'bg-gray-50 border-gray-200 text-gray-800',
        title: 'text-gray-900',
        icon: 'text-gray-600',
        closeButton: 'text-gray-500 hover:text-gray-700'
      };
  }
};

// Helper functie voor icoon selectie
const getVariantIcon = (variant: string = 'default') => {
  switch (variant) {
    case 'success':
      return CheckCircle;
    case 'error':
      return XCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'default':
    default:
      return Info;
  }
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  title,
  description,
  children,
  onClose,
  dismissible = false,
  className = '',
  icon = true
}) => {
  const styles = getVariantClasses(variant);
  const IconComponent = getVariantIcon(variant);
  
  const containerClasses = `
    relative w-full rounded-lg border p-4
    ${styles.container}
    ${className}
  `.trim();

  return (
    <div className={containerClasses} role="alert">
      <div className="flex">
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0">
            <IconComponent className={`h-5 w-5 ${styles.icon}`} />
          </div>
        )}
        
        {/* Content */}
        <div className={`${icon ? 'ml-3' : ''} flex-1`}>
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {title}
            </h3>
          )}
          
          {description && (
            <div className={`${title ? 'mt-2' : ''} text-sm`}>
              {description}
            </div>
          )}
          
          {children && (
            <div className={`${title || description ? 'mt-2' : ''} text-sm`}>
              {children}
            </div>
          )}
        </div>
        
        {/* Close button */}
        {(dismissible || onClose) && (
          <div className="flex-shrink-0 ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`
                  inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${styles.closeButton}
                `}
                onClick={onClose}
                aria-label="Sluiten"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Specifieke alert types voor eenvoudig gebruik
export const AlertSuccess: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="success" />
);

export const AlertError: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="error" />
);

export const AlertWarning: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="warning" />
);

export const AlertInfo: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert {...props} variant="info" />
);

// Alert Description component
export const AlertDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`text-sm ${className}`}>
    {children}
  </div>
);

// Alert Title component  
export const AlertTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>
    {children}
  </h5>
);

// Default export
export default Alert; 