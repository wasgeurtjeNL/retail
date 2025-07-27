import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DynamicSegmentLandingPage from './DynamicSegmentLandingPage';

// Valid segments for landing pages
const VALID_SEGMENTS = [
  'cleaning-service',
  'beauty-salon', 
  'hair-salon',
  'restaurant',
  'hotel-bnb',
  'wellness-spa'
];

interface PageProps {
  params: {
    segment: string;
  };
  searchParams: {
    prospect?: string;
    name?: string;
    tracking?: string;
    utm_source?: string;
    utm_campaign?: string;
    utm_medium?: string;
  };
}

// Convert URL segment to database segment format
function urlSegmentToDbSegment(urlSegment: string): string {
  return urlSegment.replace('-', '_');
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segment } = params;
  
  if (!VALID_SEGMENTS.includes(segment)) {
    return {
      title: 'Page Not Found'
    };
  }

  const segmentNames: Record<string, string> = {
    'cleaning-service': 'Schoonmaakdiensten',
    'beauty-salon': 'Schoonheidssalons',
    'hair-salon': 'Kapperszaken', 
    'restaurant': 'Restaurants',
    'hotel-bnb': 'Hotels & B&B',
    'wellness-spa': 'Wellness & Spa'
  };

  const segmentName = segmentNames[segment] || 'Business';

  return {
    title: `Exclusief Partnership voor ${segmentName} - Wasgeurtje`,
    description: `Verhoog uw service kwaliteit met premium wasproducten speciaal ontwikkeld voor ${segmentName.toLowerCase()}. Claim nu uw gratis proefpakket.`,
    keywords: `${segmentName}, partnership, wasproducten, premium, gratis proefpakket, service kwaliteit`,
    robots: 'index, follow',
    openGraph: {
      title: `Premium Partnership - ${segmentName}`,
      description: `Exclusieve kans voor ${segmentName} om service kwaliteit te verhogen`,
      type: 'website',
      locale: 'nl_NL'
    }
  };
}

// Generate static paths for valid segments
export async function generateStaticParams() {
  return VALID_SEGMENTS.map((segment) => ({
    segment: segment
  }));
}

export default async function SegmentPartnerPage({ params, searchParams }: PageProps) {
  const { segment } = params;
  
  // Check if segment is valid
  if (!VALID_SEGMENTS.includes(segment)) {
    notFound();
  }

  // Convert URL segment to database format
  const dbSegment = urlSegmentToDbSegment(segment);
  
  // Extract prospect information from URL parameters
  const prospectInfo = {
    prospectId: searchParams.prospect || null,
    businessName: searchParams.name ? decodeURIComponent(searchParams.name) : null,
    trackingEnabled: searchParams.tracking === 'enabled',
    utmSource: searchParams.utm_source || null,
    utmCampaign: searchParams.utm_campaign || null,
    utmMedium: searchParams.utm_medium || null
  };

  return (
    <DynamicSegmentLandingPage 
      segment={dbSegment}
      urlSegment={segment}
      prospectInfo={prospectInfo}
    />
  );
} 