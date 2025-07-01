'use client';

import DevLoginHelper from '@/components/DevLoginHelper';

export default function DevTestPage() {
  return (
    <div className="p-8">
      <DevLoginHelper />
      <h1 className="text-2xl font-bold mb-4">Ontwikkel Test Pagina</h1>
      <p className="mb-4">
        Deze pagina configureert de applicatie om in te loggen als retailer. 
        Na het configureren kun je doorgaan naar:
      </p>
      <div className="flex flex-col space-y-2">
        <a 
          href="/retailer-dashboard" 
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Retailer Dashboard
        </a>
        <a 
          href="/dashboard" 
          className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Admin Dashboard
        </a>
        <a 
          href="/" 
          className="inline-block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Homepage
        </a>
      </div>
    </div>
  );
} 