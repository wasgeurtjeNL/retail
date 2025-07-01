import React, { useState, useEffect } from 'react';

type Template = {
  name: string;
  description: string;
  subject: string;
};

type EmailTemplateListProps = {
  onSelect: (templateKey: string) => void;
  selectedTemplateKey: string | null;
};

export default function EmailTemplateList({ onSelect, selectedTemplateKey }: EmailTemplateListProps) {
  const [templates, setTemplates] = useState<Record<string, Template>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/email/templates');
        const data = await response.json();
        
        if (response.ok && data.templates) {
          setTemplates(data.templates);
        } else {
          setError(data.error || 'Kon de templates niet laden');
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        setError('Er is een fout opgetreden bij het laden van de templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <svg className="animate-spin h-10 w-10 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Fout bij laden templates</h3>
        <p className="text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  const templateKeys = Object.keys(templates);
  
  if (templateKeys.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-yellow-800 font-medium">Geen templates gevonden</h3>
        <p className="text-yellow-700 mt-1">Er zijn nog geen e-mail templates beschikbaar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {templateKeys.map((key) => {
          const template = templates[key];
          return (
            <li key={key} className="relative">
              <button
                onClick={() => onSelect(key)}
                className={`w-full px-6 py-5 flex items-start hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition ease-in-out duration-150 ${
                  selectedTemplateKey === key ? 'bg-pink-50' : ''
                }`}
              >
                {selectedTemplateKey === key && (
                  <span className="absolute inset-y-0 left-0 w-1 bg-pink-600" aria-hidden="true"></span>
                )}
                
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                  <p className="mt-1 text-xs text-gray-400 italic truncate">Onderwerp: {template.subject}</p>
                </div>
                
                <span className="ml-4 inline-flex items-center">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 