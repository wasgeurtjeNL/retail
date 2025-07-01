import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import initServices from '@/lib/init-services';
import ClientToaster from '@/components/ClientToaster';

// Initialize services on server
// We can't await this directly in a React component, so we call it here
// and let it execute in the background
initServices().catch(error => {
  console.error('Error initializing services:', error);
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wasgeurtje B2B Platform",
  description: "Word een Wasgeurtje retailer en verkoop premium wasgeuren in uw winkel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <ClientToaster />
      </body>
    </html>
  );
}
