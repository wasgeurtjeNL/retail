import React from 'react';

interface CatalogSearchFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  categories: string[];
}

// Dit component bevat de zoek- en filterfunctionaliteit voor de catalogus.
const CatalogSearchFilter: React.FC<CatalogSearchFilterProps> = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="sm:flex sm:justify-between sm:items-center">
        <div className="mb-4 sm:mb-0 sm:flex-1 sm:pr-4">
          <label htmlFor="search" className="sr-only">
            Zoeken
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="search"
              id="search"
              className="focus:ring-pink-500 focus:border-pink-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500"
              placeholder="Zoek producten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="category" className="sr-only">
            Categorie
          </label>
          <select
            id="category"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md text-gray-900"
            value={activeCategory || ''}
            onChange={(e) => setActiveCategory(e.target.value || null)}
          >
            <option value="">Alle categorieën</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CatalogSearchFilter; 