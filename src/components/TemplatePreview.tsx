import React from 'react';

type TemplatePreviewProps = {
  html: string;
  className?: string;
};

/**
 * Toont een preview van de HTML met gehighlighte variabelen
 */
export default function TemplatePreview({ html, className = '' }: TemplatePreviewProps) {
  // Highlight de variabelen in de HTML
  const highlightedHtml = html
    // Highlighten van variabelen: {{variabel}}
    .replace(/\{\{([^}#\/]+)\}\}/g, '<span class="bg-pink-100 text-pink-700 rounded px-1 font-bold">{{$1}}</span>')
    // Highlighten van if statements: {{#if variabel}}...{{/if}}
    .replace(/\{\{#if ([^}]+)\}\}/g, '<span class="bg-blue-100 text-blue-700 rounded px-1 font-bold">{{#if $1}}</span>')
    .replace(/\{\{\/if\}\}/g, '<span class="bg-blue-100 text-blue-700 rounded px-1 font-bold">{{/if}}</span>')
    // Highlighten van each statements: {{#each items}}...{{/each}}
    .replace(/\{\{#each ([^}]+)\}\}/g, '<span class="bg-green-100 text-green-700 rounded px-1 font-bold">{{#each $1}}</span>')
    .replace(/\{\{\/each\}\}/g, '<span class="bg-green-100 text-green-700 rounded px-1 font-bold">{{/each}}</span>');

  return (
    <div 
      className={`bg-white border border-gray-300 rounded-md p-4 overflow-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
    />
  );
} 