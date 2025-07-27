import React from 'react';

interface ApiStatusCardProps {
  name: string;
  description: string;
  isConfigured: boolean;
  isLoading?: boolean;
}

export default function ApiStatusCard({ name, description, isConfigured, isLoading = false }: ApiStatusCardProps) {
  const statusInfo = {
    color: isConfigured ? 'bg-green-500' : 'bg-red-500',
    bgColor: isConfigured ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300',
    textColor: isConfigured ? 'text-green-900' : 'text-red-900',
    descColor: isConfigured ? 'text-green-800' : 'text-red-800',
    statusColor: isConfigured ? 'text-green-800' : 'text-red-800',
    text: isConfigured ? '✓ Connected' : '✗ Not Configured'
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-100 border-gray-300 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-800">{name}</span>
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
        </div>
        <p className="text-sm text-gray-700">{description}</p>
        <p className="text-xs text-gray-600 mt-1 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 border-2 rounded-lg ${statusInfo.bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold ${statusInfo.textColor}`}>{name}</span>
        <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
      </div>
      <p className={`text-sm font-medium ${statusInfo.descColor}`}>{description}</p>
      <p className={`text-xs mt-1 font-bold ${statusInfo.statusColor}`}>{statusInfo.text}</p>
    </div>
  );
} 