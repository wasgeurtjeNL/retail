// Hulpbestand om orders te creëren voor development

// Deze functie controleert of er orders in localStorage zitten
// Als ze er niet zijn, worden standaard orders aangemaakt
export const ensureMockOrdersExist = () => {
  if (typeof window !== 'undefined') {
    try {
      const savedOrders = localStorage.getItem('mockOrders');
      
      // Als er geen orders zijn, maak dan standaard mock orders aan
      if (!savedOrders || savedOrders === '[]' || JSON.parse(savedOrders).length === 0) {
        console.log('Geen orders gevonden in localStorage, standaard orders maken...');
        
        // Standaard mock orders
        const defaultOrders = [
          {
            id: 'ORD-1744501427193',
            retailer_id: '4',
            created_at: new Date().toISOString(),
            status: 'nieuw',
            payment_status: 'pending',
            payment_method: 'invoice',
            total: 124.95,
            total_amount: 124.95,
            items: [
              {
                id: 'item-1',
                name: 'Wasparfum proefpakket',
                quantity: 2,
                price: 12.95,
                image_url: '/assets/images/wasparfum-proefpakket-display.jpg'
              },
              {
                id: 'item-2',
                name: 'Morning Vapor',
                quantity: 3,
                price: 14.95,
                image_url: '/assets/images/morning-vapor-wasparfum.png'
              }
            ],
            fulfillment_status: 'pending',
            date: new Date().toISOString(),
            retailer_business_name: 'Wasparfum Express'
          },
          {
            id: 'ORD-1744499724010',
            retailer_id: '4',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'betaald',
            payment_status: 'paid',
            payment_method: 'stripe',
            total: 349.95,
            total_amount: 349.95,
            items: [
              {
                id: 'item-3',
                name: 'Blossom Drip',
                quantity: 5,
                price: 13.95,
                image_url: '/assets/images/blossom-drip.jpg'
              },
              {
                id: 'item-4',
                name: 'Cadeauset wasparfum',
                quantity: 4,
                price: 39.95,
                image_url: '/assets/images/cadeauset.jpg'
              }
            ],
            fulfillment_status: 'shipped',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            tracking_code: '3skaba22939933',
            retailer_business_name: 'Wasparfum Express'
          }
        ];
        
        // Sla op in localStorage
        localStorage.setItem('mockOrders', JSON.stringify(defaultOrders));
        
        // Ook retailerOrders opslaan voor de retailer dashboard
        const retailerOrders = defaultOrders.map(order => ({
          ...order,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method
        }));
        localStorage.setItem('retailerOrders', JSON.stringify(retailerOrders));
        
        console.log('Standaard mock orders aangemaakt en opgeslagen');
        return defaultOrders;
      } else {
        console.log('Orders gevonden in localStorage:', JSON.parse(savedOrders).length);
        return JSON.parse(savedOrders);
      }
    } catch (error) {
      console.error('Fout bij controleren van mockOrders:', error);
    }
  }
  return null;
}; 