# Retailer Orders Module

Deze directory bevat alle functionaliteiten gerelateerd aan bestellingen in het retailer dashboard, inclusief bestellingsgeschiedenis, besteldetails, en het afronden van bestellingen.

## Functionaliteiten

- **Bestellingengeschiedenis** (`page.tsx`): Overzicht van alle bestellingen door de retailer
- **Besteldetails** (`OrderDetail.tsx`): Component voor het tonen van besteldetails
- **Checkout flow**: Complete checkout-flow met adres, betaalmethode selectie, en orderbevestiging
- **Orderbevestiging** (`confirmation/page.tsx`): Pagina na succesvolle bestelling met statustracking
- **Nabetaling** (`page.tsx`): Functionaliteit om eerder geplaatste bestellingen alsnog te betalen via Stripe
- **Tracking-code synchronisatie**: Automatische synchronisatie van tracking codes tussen admin- en retailerweergave

## Betaling en Status Management

### Betaling Initiëren vanuit Ordergeschiedenis (`handlePayNow`)

De nieuwe `handlePayNow` functie biedt retailers de mogelijkheid om rechtstreeks vanuit de ordergeschiedenispagina te betalen voor eerder geplaatste bestellingen met een openstaande betaling:

```typescript
// Initieert een Stripe-betaling voor een eerder geplaatste bestelling
const handlePayNow = async (order: Order) => {
  // Bereid de order data voor voor Stripe
  const stripeOrder = {
    id: order.id,
    totalAmount: order.total,
    items: order.items.map(item => ({
      id: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.price
    })),
    // ...
  };
  
  // Sla de order op in localStorage voor gebruik door Stripe
  localStorage.setItem('stripeOrder', JSON.stringify(stripeOrder));
  
  // Start de Stripe checkout process via API
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      items,
      orderId: order.id
    }),
  });
  
  // Redirect naar Stripe checkout na succesvolle response
  const data = await response.json();
  if (data.success && data.url) {
    window.location.href = data.url;
  }
};
```

### Betaalstatus Tracking

Het systeem biedt uitgebreide visuele representatie van betaalstatussen:

1. **Statusberekening**: De `getPaymentStatus` functie bepaalt de actuele status van een betaling:
   ```typescript
   const getPaymentStatus = (order: Order) => {
     // Controleer eerst expliciete betaalstatus
     if (order.paymentStatus) {
       return order.paymentStatus;
     }
     
     // Check op basis van order status
     if (order.status === 'betaald' || order.status === 'verzonden' || order.status === 'geleverd') {
       return 'paid';
     }
     
     // Voor facturen: check vervaldatum
     if (order.paymentMethod === 'invoice' && order.paymentDueDate) {
       const dueDate = new Date(order.paymentDueDate);
       if (dueDate < new Date()) {
         return 'expired';
       }
       return 'pending';
     }
     
     return 'pending';
   };
   ```

2. **Vervaldatum Countdown**: Voor factuurbetalingen wordt een countdown timer getoond:
   ```typescript
   const calculateDaysRemaining = (dueDateString?: string) => {
     if (!dueDateString) return null;
     
     const dueDate = new Date(dueDateString);
     const today = new Date();
     
     // Reset time voor accurate dagberekening
     today.setHours(0, 0, 0, 0);
     dueDate.setHours(0, 0, 0, 0);
     
     const diffTime = dueDate.getTime() - today.getTime();
     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     
     return diffDays;
   };
   ```

3. **Visuele Statusindicatoren**: Statusbadges met kleurcodering:
   - Groen: Betaald
   - Geel: In afwachting
   - Rood: Verlopen of mislukt

## Tracking Code Synchronisatie

De OrdersPage implementeert automatische synchronisatie van tracking codes tussen admin- en retailerweergave:

```typescript
// Synchroniseer tracking codes van admin naar retailer orders
if (adminOrder && adminOrder.tracking_code && !order.tracking_code) {
  // Pas tracking code toe op retailer order
  order.tracking_code = adminOrder.tracking_code;
  console.log(`DEBUG: Tracking code gesynchroniseerd naar order ${order.id}: ${order.tracking_code}`);
}
```

## Orderbevestiging Functionaliteit

De orderbevestigingspagina (`confirmation/page.tsx`) is ontworpen om retailers duidelijke feedback te geven na een succesvolle bestelling. De belangrijkste functies zijn:

### 1. Order Recovery System

Als een gebruiker de pagina herlaadt of vanuit Stripe terugkeert, kan het systeem de ordergegevens herstellen via:

```typescript
// Herstel order vanuit localStorage of ordergeschiedenis
tryToRecoverFromOrderHistory(sessionId);
```

### 2. Betaalstatusmanagement

Het systeem houdt betaalstatussen bij en toont deze gebruiksvriendelijk:

- **Stripe betalingen**: Automatische statusupdates (processing → paid)
- **Factuurbetalingen**: Standaard status "pending" met vervaldatum van 14 dagen

### 3. localStorage Integratie

Orders worden opgeslagen in localStorage voor persistentie:

```typescript
// Slaat een bestelling op in localStorage
const saveOrderToHistory = (order: OrderDetails) => {
  // ...
  localStorage.setItem('retailerOrders', JSON.stringify(existingOrders));
};
```

### 4. Visuele Ordertracking

De UI bevat een visuele ordertracker die de status laat zien:
- Bestelling geplaatst
- Betaling (status-afhankelijk)
- Verwerking
- Verzending

## Belangrijke Richtlijnen & Regels

1. **Order Recovery Logica**: Altijd eerst proberen een bestaande order te vinden in localStorage voordat een fallback order wordt aangemaakt.

2. **Betaalmethode Consistentie**: Wanneer een order wordt bijgewerkt met een sessionId, moet de betaalmethode worden bijgewerkt naar 'stripe' en de status naar 'paid'.

3. **Statusweergave**: Gebruik de kleurgecodeerde statusindicatoren om duidelijke feedback te geven:
   - Groen: Betaald
   - Blauw: In verwerking
   - Geel: In afwachting
   - Oranje: Actie vereist
   - Rood: Niet voltooid

4. **Animaties**: Behoud de vloeiende animaties die de gebruikservaring verbeteren:
   ```jsx
   className={`... transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} transition-all duration-700 ease-out`}
   ```

5. **Responsive Design**: De bestelbevestigingspagina moet responsive zijn en goed werken op zowel desktop als mobiel.

6. **Nabetaling Flow**: Gebruik de `handlePayNow` functie voor eerder geplaatste bestellingen in plaats van een nieuwe bestelling aan te maken.

7. **Admin-Retailer Synchronisatie**: Zorg ervoor dat tracking codes en orderstatussen altijd worden gesynchroniseerd tussen admin- en retailerweergave.

## Technische Details

### TypeScript Interface

De `OrderDetails` interface definieert de structuur van een bestelling:

```typescript
interface OrderDetails {
  id: string;
  totalAmount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    image_url?: string;
  }[];
  date: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    houseNumber?: string;
    houseNumberAddition?: string;
    postcode?: string;
  };
  paymentMethod?: 'invoice' | 'stripe';
  paymentStatus?: 'processing' | 'requires_action' | 'succeeded' | 'canceled' | 'failed' | 'pending' | 'paid' | 'expired' | 'requires_payment_method';
  paymentDueDate?: string; 
  paymentIntentId?: string;
  stripeSessionId?: string;
}
```

### Belangrijke Functies

1. **updateOrderInHistory**: Werkt een bestaande bestelling bij in de geschiedenis
2. **saveOrderToHistory**: Slaat een nieuwe bestelling op in de geschiedenis
3. **tryToRecoverFromOrderHistory**: Probeert een bestelling te vinden op basis van Stripe sessie ID
4. **createFallbackOrder**: Maakt een tijdelijke bestelling aan als er geen echte gevonden kan worden
5. **handlePayNow**: Initieert een Stripe-betaling voor een bestaande bestelling vanuit de ordergeschiedenis
6. **getPaymentStatus**: Bepaalt de actuele betalingsstatus van een bestelling
7. **calculateDaysRemaining**: Berekent het aantal dagen tot een betaling vervalt
8. **getPaymentStatusBadge**: Genereert visuele representatie van de betaalstatus met kleurcodering

## Development vs. Productie

In een productieomgeving worden bestellingen opgeslagen in de database, maar voor development doeleinden worden ze tijdelijk in localStorage bewaard. Dit geeft een volledige user experience zonder database-afhankelijkheid voor ontwikkelaars. 