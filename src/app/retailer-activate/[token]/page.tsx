// Server Component (default export)
import { Suspense } from 'react';
import RetailerActivateClient from './RetailerActivateClient';

// Dit is de Server Component die direct toegang heeft tot de route parameters
export default function RetailerActivatePage({ params }: { params: { token: string } }) {
  // In Server Components kunnen we params direct gebruiken zonder React.use()
  const token = params.token;
  
  return (
    <Suspense fallback={<div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
    </div>}>
      <RetailerActivateClient token={token} />
    </Suspense>
  );
} 