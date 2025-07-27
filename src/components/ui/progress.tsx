'use client';

// =====================================================
// PROGRESS COMPONENT - Professional UI Component
// Compatible progress bar voor commercial workflow testing
// =====================================================

import React from 'react';

export interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
}

// Helper functie voor kleur classes
const getColorClasses = (color: string = 'blue', animated: boolean = false) => {
  const baseClasses = animated ? 'transition-all duration-300 ease-in-out' : '';
  
  switch (color) {
    case 'green':
      return `bg-green-600 ${baseClasses}`;
    case 'red':
      return `bg-red-600 ${baseClasses}`;
    case 'yellow':
      return `bg-yellow-500 ${baseClasses}`;
    case 'purple':
      return `bg-purple-600 ${baseClasses}`;
    case 'gray':
      return `bg-gray-600 ${baseClasses}`;
    case 'blue':
    default:
      return `bg-blue-600 ${baseClasses}`;
  }
};

// Helper functie voor size classes
const getSizeClasses = (size: string = 'md') => {
  switch (size) {
    case 'sm':
      return 'h-2';
    case 'lg':
      return 'h-4';
    case 'md':
    default:
      return 'h-3';
  }
};

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  className = '',
  color = 'blue',
  size = 'md',
  showValue = false,
  animated = true
}) => {
  // Valideer en normaliseer waarden
  const normalizedValue = Math.max(0, Math.min(value, max));
  const percentage = max > 0 ? (normalizedValue / max) * 100 : 0;
  
  // CSS classes samenstellen
  const containerClasses = `
    w-full bg-gray-200 rounded-full overflow-hidden
    ${getSizeClasses(size)}
    ${className}
  `.trim();
  
  const barClasses = `
    h-full rounded-full
    ${getColorClasses(color, animated)}
  `.trim();

  return (
    <div className="w-full">
      {showValue && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-900">Progress</span>
          <span className="text-sm font-medium text-gray-900">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={containerClasses}>
        <div 
          className={barClasses}
          style={{ 
            width: `${percentage}%`,
            transition: animated ? 'width 0.3s ease-in-out' : 'none'
          }}
        />
      </div>
      
      {!showValue && percentage > 0 && (
        <div className="mt-1 text-right">
          <span className="text-xs text-gray-600">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Utilities voor eenvoudig gebruik
export const ProgressBar = Progress;

// Default export
export default Progress; 