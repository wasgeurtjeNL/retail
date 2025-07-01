'use client';

import { ReactNode } from 'react';

// Vereenvoudigde layout - geeft alleen children door, zonder styling
export default function CheckoutLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
} 