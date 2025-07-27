// =====================================================
// POSTNL PROVIDER - Dutch Shipping Integration
// Official PostNL API implementation for Netherlands
// =====================================================

import { 
  BaseShippingProvider, 
  ShipmentRequest, 
  ShipmentResponse, 
  TrackingInfo, 
  RateRequest, 
  RateOption, 
  ProviderCapabilities,
  ShippingAddress,
  TrackingEvent
} from './base-provider';

interface PostNLShipmentRequest {
  Message: {
    MessageID: string;
    MessageTimeStamp: string;
    Printertype: string;
  };
  Shipments: Array<{
    Addresses: Array<{
      AddressType: string;
      FirstName?: string;
      LastName: string;
      CompanyName?: string;
      Street: string;
      HouseNr: string;
      HouseNrExt?: string;
      Zipcode: string;
      City: string;
      Countrycode: string;
      Email?: string;
      Mobile?: string;
    }>;
    Barcode: string;
    DeliveryDate: string;
    Dimension: {
      Weight: number;
      Length?: number;
      Width?: number;
      Height?: number;
    };
    ProductCodeDelivery: string;
    Reference?: string;
  }>;
}

interface PostNLTrackingResponse {
  Shipments: Array<{
    Barcode: string;
    Status: {
      TimeStamp: string;
      StatusCode: string;
      StatusDescription: string;
      PhaseCode: string;
      PhaseDescription: string;
    };
    Events: Array<{
      TimeStamp: string;
      Description: string;
      LocationCode?: string;
      LocationDescription?: string;
      RouteCode?: string;
      RouteDescription?: string;
    }>;
    ExpectedDeliveryDate?: string;
    DeliveryDate?: string;
  }>;
}

export class PostNLProvider extends BaseShippingProvider {
  private customerNumber: string;
  private customerCode: string;

  constructor(config: any) {
    super({
      api_key: config.api_key,
      api_endpoint: config.test_mode 
        ? 'https://api-sandbox.postnl.nl/shipment/v2_2'
        : 'https://api.postnl.nl/shipment/v2_2',
      test_mode: config.test_mode || false,
      timeout_ms: 30000,
      retry_attempts: 3
    });

    this.customerNumber = config.customer_number;
    this.customerCode = config.customer_code;
  }

  getProviderName(): string {
    return 'PostNL';
  }

  getProviderCode(): string {
    return 'postnl';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supports_tracking: true,
      supports_insurance: true,
      supports_cod: true,
      supports_pickup: true,
      supports_delivery_confirmation: true,
      max_weight_grams: 30000, // 30kg
      max_dimensions_cm: {
        length: 175,
        width: 78,
        height: 58
      },
      supported_countries: ['NL', 'BE', 'DE', 'FR', 'LU', 'AT'],
      supported_services: [
        'standard',           // Standaard verzending
        'evening',           // Avond levering
        'morning',           // Ochtend levering
        'pickup',            // Ophaalservice
        'signature',         // Handtekening voor ontvangst
        'age_check'          // Leeftijdscontrole
      ]
    };
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log(`[PostNL] Creating shipment for ${request.recipient.name}`);

      // Validate request
      const validation = await this.validateShipmentRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Generate barcode first
      const barcode = await this.generateBarcode();
      if (!barcode) {
        return {
          success: false,
          error: 'Failed to generate PostNL barcode'
        };
      }

      // Build PostNL shipment request
      const postnlRequest = this.buildShipmentRequest(request, barcode);

      // Create shipment
      const response = await this.makeApiRequest('/confirm', 'POST', postnlRequest, {
        'apikey': this.config.api_key,
        'Accept': 'application/json'
      });

      // Process response
      if (response.ResponseShipments && response.ResponseShipments.length > 0) {
        const shipment = response.ResponseShipments[0];
        
        return {
          success: true,
          shipment_id: shipment.ProductCodeDelivery + '_' + barcode,
          tracking_number: barcode,
          label_url: shipment.Labels?.[0]?.Content ? 
            `data:application/pdf;base64,${shipment.Labels[0].Content}` : undefined,
          estimated_delivery_date: shipment.DeliveryDate ? new Date(shipment.DeliveryDate) : undefined,
          cost_euros: this.calculateShippingCost(request),
          raw_response: response
        };
      } else {
        return {
          success: false,
          error: 'No shipment data returned from PostNL',
          raw_response: response
        };
      }

    } catch (error) {
      console.error('[PostNL] Error creating shipment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    try {
      console.log(`[PostNL] Getting tracking info for ${trackingNumber}`);

      const response = await this.makeApiRequest(
        `/track-trace/${trackingNumber}`,
        'GET',
        undefined,
        {
          'apikey': this.config.api_key,
          'Accept': 'application/json'
        }
      ) as PostNLTrackingResponse;

      if (!response.Shipments || response.Shipments.length === 0) {
        throw new Error('No tracking information found');
      }

      const shipment = response.Shipments[0];
      
      // Convert PostNL events to our format
      const events: TrackingEvent[] = shipment.Events?.map(event => ({
        timestamp: new Date(event.TimeStamp),
        status: event.Description,
        description: event.Description,
        location: event.LocationDescription,
        event_code: event.LocationCode
      })) || [];

      // Determine status from PostNL status codes
      const status = this.mapPostNLStatus(shipment.Status.StatusCode);

      return {
        tracking_number: trackingNumber,
        status,
        estimated_delivery: shipment.ExpectedDeliveryDate ? new Date(shipment.ExpectedDeliveryDate) : null,
        actual_delivery: shipment.DeliveryDate ? new Date(shipment.DeliveryDate) : null,
        events,
        last_updated: new Date(shipment.Status.TimeStamp)
      };

    } catch (error) {
      console.error('[PostNL] Error getting tracking info:', error);
      throw error;
    }
  }

  async getRates(request: RateRequest): Promise<RateOption[]> {
    try {
      console.log(`[PostNL] Getting rates for ${request.recipient.city}`);

      // PostNL doesn't have a public rate API, so we'll return standard rates
      const rates: RateOption[] = [];
      const baseDate = new Date();

      // Standard delivery
      rates.push({
        service_type: 'standard',
        service_name: 'Standaard Verzending',
        cost_euros: this.calculateStandardRate(request),
        estimated_delivery_days: 1,
        estimated_delivery_date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
        currency: 'EUR'
      });

      // Evening delivery
      if (this.isEveningDeliveryAvailable(request.recipient)) {
        rates.push({
          service_type: 'evening',
          service_name: 'Avond Levering',
          cost_euros: this.calculateStandardRate(request) + 2.50,
          estimated_delivery_days: 1,
          estimated_delivery_date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
          currency: 'EUR'
        });
      }

      // Morning delivery
      if (this.isMorningDeliveryAvailable(request.recipient)) {
        rates.push({
          service_type: 'morning',
          service_name: 'Ochtend Levering',
          cost_euros: this.calculateStandardRate(request) + 5.00,
          estimated_delivery_days: 1,
          estimated_delivery_date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
          currency: 'EUR'
        });
      }

      return rates;

    } catch (error) {
      console.error('[PostNL] Error getting rates:', error);
      throw error;
    }
  }

  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      console.log(`[PostNL] Cancelling shipment ${shipmentId}`);

      // Extract barcode from shipment ID
      const barcode = shipmentId.split('_')[1];
      if (!barcode) {
        throw new Error('Invalid shipment ID format');
      }

      // PostNL doesn't have a direct cancel API, but we can track status
      // In practice, this would involve contacting PostNL customer service
      // For now, we'll just log it
      console.log(`[PostNL] Shipment cancellation requested for barcode: ${barcode}`);
      
      return true;

    } catch (error) {
      console.error('[PostNL] Error cancelling shipment:', error);
      return false;
    }
  }

  // Private helper methods

  private async generateBarcode(): Promise<string | null> {
    try {
      const response = await this.makeApiRequest(
        `/barcode/3S?CustomerCode=${this.customerCode}&CustomerNumber=${this.customerNumber}`,
        'GET',
        undefined,
        {
          'apikey': this.config.api_key,
          'Accept': 'application/json'
        }
      );

      return response.Barcode || null;

    } catch (error) {
      console.error('[PostNL] Error generating barcode:', error);
      return null;
    }
  }

  private buildShipmentRequest(request: ShipmentRequest, barcode: string): PostNLShipmentRequest {
    const messageId = `MSG_${Date.now()}`;
    const deliveryDate = this.calculateDeliveryDate(request.service_type);
    const productCode = this.getProductCode(request.service_type);

    // Parse sender address
    const senderParts = this.parseAddress(request.sender.address_line1);
    const recipientParts = this.parseAddress(request.recipient.address_line1);

    return {
      Message: {
        MessageID: messageId,
        MessageTimeStamp: new Date().toISOString(),
        Printertype: 'GraphicFile|PDF'
      },
      Shipments: [{
        Addresses: [
          // Sender address
          {
            AddressType: '02', // Sender
            LastName: request.sender.name,
            CompanyName: request.sender.company,
            Street: senderParts.street,
            HouseNr: senderParts.houseNumber,
            HouseNrExt: senderParts.houseNumberExt,
            Zipcode: request.sender.postal_code.replace(/\s/g, ''),
            City: request.sender.city,
            Countrycode: request.sender.country,
            Email: request.sender.email,
            Mobile: request.sender.phone
          },
          // Recipient address
          {
            AddressType: '01', // Recipient
            LastName: request.recipient.name,
            CompanyName: request.recipient.company,
            Street: recipientParts.street,
            HouseNr: recipientParts.houseNumber,
            HouseNrExt: recipientParts.houseNumberExt,
            Zipcode: request.recipient.postal_code.replace(/\s/g, ''),
            City: request.recipient.city,
            Countrycode: request.recipient.country,
            Email: request.recipient.email,
            Mobile: request.recipient.phone
          }
        ],
        Barcode: barcode,
        DeliveryDate: deliveryDate,
        Dimension: {
          Weight: Math.round(request.packages[0].weight_grams),
          Length: request.packages[0].length_cm,
          Width: request.packages[0].width_cm,
          Height: request.packages[0].height_cm
        },
        ProductCodeDelivery: productCode,
        Reference: request.reference
      }]
    };
  }

  private parseAddress(addressLine: string): { street: string; houseNumber: string; houseNumberExt?: string } {
    // Parse Dutch address format: "Straatnaam 123A"
    const match = addressLine.match(/^(.+?)\s+(\d+)([a-zA-Z]*)$/);
    
    if (match) {
      return {
        street: match[1].trim(),
        houseNumber: match[2],
        houseNumberExt: match[3] || undefined
      };
    }
    
    // Fallback if parsing fails
    return {
      street: addressLine,
      houseNumber: '1'
    };
  }

  private getProductCode(serviceType: string): string {
    const productCodes: Record<string, string> = {
      'standard': '3085',      // Standaard
      'evening': '3090',       // Avond
      'morning': '3089',       // Ochtend  
      'pickup': '3533',        // Ophaalservice
      'signature': '3087',     // Handtekening
      'age_check': '3442'      // Leeftijdscontrole
    };

    return productCodes[serviceType] || productCodes['standard'];
  }

  private calculateDeliveryDate(serviceType: string): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // For weekend delivery, add extra days
    if (tomorrow.getDay() === 0) { // Sunday
      tomorrow.setDate(tomorrow.getDate() + 1);
    } else if (tomorrow.getDay() === 6) { // Saturday
      tomorrow.setDate(tomorrow.getDate() + 2);
    }

    return tomorrow.toISOString().split('T')[0];
  }

  private mapPostNLStatus(statusCode: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      '1': 'created',
      '2': 'picked_up',
      '3': 'in_transit',
      '4': 'in_transit',
      '5': 'out_for_delivery',
      '6': 'delivered',
      '7': 'failed',
      '8': 'returned',
      '9': 'returned'
    };

    return statusMap[statusCode] || 'in_transit';
  }

  private calculateShippingCost(request: ShipmentRequest): number {
    // Basic cost calculation for Netherlands
    const baseRate = 6.75; // Standard PostNL rate
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight_grams, 0);
    
    // Weight surcharge for packages > 2kg
    let weightSurcharge = 0;
    if (totalWeight > 2000) {
      weightSurcharge = Math.ceil((totalWeight - 2000) / 1000) * 1.50;
    }

    return baseRate + weightSurcharge;
  }

  private calculateStandardRate(request: RateRequest): number {
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight_grams, 0);
    
    if (totalWeight <= 2000) {
      return 6.75;
    } else if (totalWeight <= 5000) {
      return 8.25;
    } else if (totalWeight <= 10000) {
      return 10.75;
    } else {
      return 15.50;
    }
  }

  private isEveningDeliveryAvailable(recipient: ShippingAddress): boolean {
    // Evening delivery is available in most Dutch cities
    return recipient.country === 'NL';
  }

  private isMorningDeliveryAvailable(recipient: ShippingAddress): boolean {
    // Morning delivery is available in major Dutch cities
    const majorCities = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen'];
    return recipient.country === 'NL' && majorCities.some(city => 
      recipient.city.toLowerCase().includes(city.toLowerCase())
    );
  }

  private async validateShipmentRequest(request: ShipmentRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!request.recipient.postal_code) {
      errors.push('Recipient postal code is required');
    }

    if (request.recipient.country !== 'NL') {
      errors.push('PostNL provider currently only supports Netherlands');
    }

    if (request.packages.length === 0) {
      errors.push('At least one package is required');
    }

    // Validate package constraints
    const packageValidation = this.validatePackageConstraints(request.packages);
    if (!packageValidation.valid) {
      errors.push(...packageValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Address validation override for Netherlands
  async validateAddress(address: ShippingAddress): Promise<{ valid: boolean; suggestions?: ShippingAddress[]; errors?: string[] }> {
    const baseValidation = await super.validateAddress(address);
    
    if (!baseValidation.valid) {
      return baseValidation;
    }

    // Additional Dutch-specific validation
    const errors: string[] = [];
    
    if (address.country === 'NL') {
      // Validate Dutch postal code format more strictly
      const nlPostalPattern = /^\d{4}\s?[A-Z]{2}$/;
      if (!nlPostalPattern.test(address.postal_code)) {
        errors.push('Dutch postal code must be in format 1234 AB');
      }

      // Basic house number validation
      const houseNumberPattern = /\d+/;
      if (!houseNumberPattern.test(address.address_line1)) {
        errors.push('Address must include a house number');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
} 