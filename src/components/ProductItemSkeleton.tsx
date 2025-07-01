export default function ProductItemSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse">
      <div className="bg-gray-300 h-48 w-full rounded-t-lg"></div>
      <div className="p-4">
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-gray-300 rounded w-full"></div>
      </div>
    </div>
  );
} 