import type { Metadata } from 'next'
import './amoeri-styles.css'

export const metadata: Metadata = {
  title: 'Amoeri - Premium Wasparfum | Van Wasgeurtje.nl naar Internationale Luxe',
  description: 'Ontdek Amoeri: de evolutie van Wasgeurtje.nl naar een premium internationaal merk. Meer dan 100.000 tevreden klanten. Word retailpartner en profiteer van exclusieve B2B-voordelen.',
  keywords: 'Amoeri, wasparfum, premium, luxe, B2B, retailpartner, Nederland, België, Duitsland, internationale groei',
  authors: [{ name: 'Amoeri' }],
  openGraph: {
    title: 'Amoeri - Premium Wasparfum | Internationale Luxe',
    description: 'Van Wasgeurtje.nl naar Amoeri – De evolutie van geur, luxe en vertrouwen. Meer dan 100.000 tevreden klanten.',
    type: 'website',
    locale: 'nl_NL',
    alternateLocale: ['en_US', 'de_DE', 'ar_SA'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function AmoeriLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="amoeri-section font-sans">
      {children}
    </div>
  )
} 