import React from 'react';

interface EmailTemplateWasstripsProps {
  retailerName: string;
  inviteLink: string;
  daysLeft: number;
}

export default function EmailTemplateWasstrips({ 
  retailerName, 
  inviteLink,
  daysLeft = 14
}: EmailTemplateWasstripsProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: '#06b6d4', 
          color: 'white', 
          padding: '24px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>EXCLUSIEVE UITNODIGING</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '16px' }}>Alleen voor officiële Wasgeurtje retailers</p>
        </div>
        
        {/* Hero Banner */}
        <div style={{ 
          backgroundImage: 'linear-gradient(to right, #0891b2, #06b6d4)',
          padding: '36px 24px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '28px', marginBottom: '16px' }}>
            Wasstrips - Onze Nieuwste Innovatie
          </h2>
          <p style={{ fontSize: '18px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            <strong>Al 25.000+ klanten in de eerste maand!</strong>
          </p>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            padding: '8px 16px',
            margin: '0 auto',
            maxWidth: '400px'
          }}>
            <p style={{ margin: '0', fontWeight: 'bold' }}>
              ⚠️ Aanmeldperiode sluit over {daysLeft} dagen ⚠️
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
            Beste {retailerName},
          </p>
          
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
            Als waardevolle retailer partner nodigen we u uit voor <strong>exclusieve toegang</strong> tot ons nieuwste product: <strong>Wasstrips</strong>. Dit revolutionaire product heeft in zijn eerste maand al meer dan 25.000 klanten bereikt en biedt u als retailer een uitzonderlijke marge van <strong>60-70%</strong>.
          </p>
          
          <div style={{ 
            backgroundColor: '#fff7e6', 
            border: '1px solid #f59e0b', 
            borderRadius: '8px',
            padding: '16px',
            margin: '24px 0'
          }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e', margin: '0 0 8px 0' }}>
              Waarom Wasstrips een gamechanger is:
            </p>
            <ul style={{ 
              color: '#4b5563',
              paddingLeft: '24px',
              margin: '0',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              <li>Hoogste marge in ons assortiment (60-70%)</li>
              <li>Retailers rapporteren gemiddeld 35% omzetstijging</li>
              <li>Uniek product - exclusief verkrijgbaar via geselecteerde retailers</li>
              <li>Sterke herbezoekcijfers: klanten komen terug voor navullingen</li>
            </ul>
          </div>
          
          <div style={{ 
            backgroundColor: '#f1f5f9', 
            borderRadius: '8px',
            padding: '16px',
            margin: '24px 0'
          }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>
              Belangrijke voorwaarden:
            </p>
            <ul style={{ 
              color: '#4b5563',
              paddingLeft: '24px',
              margin: '0',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              <li>Minimumbestelling: <strong>€300</strong></li>
              <li>10% aanbetaling vereist bij aanmelding</li>
              <li>Levertijd: eerder bestellen = eerder leveren (first come, first served)</li>
              <li>Aanmeldperiode sluit over <strong>{daysLeft} dagen</strong></li>
            </ul>
          </div>
          
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
            Deze exclusieve uitnodiging is alleen verstuurd naar onze officiële retail partners. Wees er snel bij, want de Wasstrips vliegen letterlijk de deur uit!
          </p>
          
          <div style={{ textAlign: 'center', margin: '32px 0' }}>
            <a href={inviteLink} style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              display: 'inline-block',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: '2px solid transparent',
            }}>
              Schrijf nu in
            </a>
          </div>
          
          <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#6b7280', textAlign: 'center' }}>
            Als u vragen heeft, aarzel dan niet om contact met ons op te nemen.
          </p>
        </div>
        
        {/* Footer */}
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '24px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#4b5563' }}>
            &copy; 2023 Wasgeurtje.nl | <a href="#" style={{ color: '#06b6d4', textDecoration: 'none' }}>Privacy Policy</a> | <a href="#" style={{ color: '#06b6d4', textDecoration: 'none' }}>Terms of Service</a>
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
            U ontvangt deze e-mail omdat u een geregistreerde retail partner bent van Wasgeurtje.nl.
          </p>
        </div>
      </div>
    </div>
  );
} 