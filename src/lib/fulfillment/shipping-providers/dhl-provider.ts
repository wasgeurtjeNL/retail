// =====================================================
// DHL PROVIDER - International Shipping Integration
// Official DHL Express API implementation
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

interface DHLRateRequest {
  plannedShippingDateAndTime: string;
  pickup: {
    postalCode: string;
    cityName: string;
    countryCode: string;
  };
  delivery: {
    postalCode: string;
    cityName: string;
    countryCode: string;
  };
  packages: Array<{
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  }>;
  productCode?: string;
}

interface DHLShipmentRequest {
  plannedShippingDateAndTime: string;
  pickup: {
    address: {
      countryCode: string;
      postalCode: string;
      cityName: string;
      addressLine1: string;
    };
    contactInformation: {
      contactPerson: string;
      phone: string;
      email: string;
    };
  };
  delivery: {
    address: {
      countryCode: string;
      postalCode: string;
      cityName: string;
      addressLine1: string;
    };
    contactInformation: {
      contactPerson: string;
      phone?: string;
      email?: string;
    };
  };
  shipmentDetails: {
    productCode: string;
    localProductCode?: string;
    packages: Array<{
      weight: number;
      dimensions: {
        length: number;
        width: number;
        height: number;
      };
    }>;
    isCustomsDeclarationRequired: boolean;
    unitOfMeasurement: string;
    description: string;
    incoterm?: string;
    invoice?: {
      totalValue: number;
      currencyCode: string;
    };
  };
}

interface DHLTrackingResponse {
  shipments: Array<{
    id: string;
    service: string;
    origin: {
      address: {
        countryCode: string;
        postalCode: string;
        addressLocality: string;
      };
    };
    destination: {
      address: {
        countryCode: string;
        postalCode: string;
        addressLocality: string;
      };
    };
    status: {
      statusCode: string;
      status: string;
      description: string;
      timestamp: string;
    };
    estimatedTimeOfDelivery?: string;
    estimatedTimeOfDeliveryRemark?: string;
    proofOfDelivery?: {
      timestamp: string;
      signatory: string;
    };
    events: Array<{
      timestamp: string;
      statusCode: string;
      status: string;
      description: string;
      location?: {
        address: {
          countryCode: string;
          postalCode: string;
          addressLocality: string;
        };
      };
    }>;
  }>;
}

export class DHLProvider extends BaseShippingProvider {
  private accountNumber: string;

  constructor(config: any) {
    super({
      api_key: config.api_key,
      api_endpoint: config.test_mode 
        ? 'https://express.api.dhl.com/mydhlapi/test'
        : 'https://express.api.dhl.com/mydhlapi',
      test_mode: config.test_mode || false,
      timeout_ms: 30000,
      retry_attempts: 3
    });

    this.accountNumber = config.account_number;
  }

  getProviderName(): string {
    return 'DHL Express';
  }

  getProviderCode(): string {
    return 'dhl';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supports_tracking: true,
      supports_insurance: true,
      supports_cod: false,
      supports_pickup: true,
      supports_delivery_confirmation: true,
      max_weight_grams: 70000, // 70kg
      max_dimensions_cm: {
        length: 300,
        width: 300,
        height: 300
      },
      supported_countries: [
        'NL', 'BE', 'DE', 'FR', 'GB', 'US', 'CA', 'AU', 'JP', 'CN', 'IN', 'BR',
        'IT', 'ES', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO'
      ],
      supported_services: [
        'express',           // DHL Express Worldwide
        'express_9',         // Express 9:00
        'express_10_30',     // Express 10:30
        'express_12',        // Express 12:00
        'economy',           // Economy Select
        'document'           // Express Documents
      ]
    };
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      console.log(`[DHL] Creating shipment for ${request.recipient.name}`);

      // Validate request
      const validation = await this.validateShipmentRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Build DHL shipment request
      const dhlRequest = this.buildShipmentRequest(request);

      // Create shipment
      const response = await this.makeApiRequest('/shipments', 'POST', dhlRequest, {
        'Authorization': `Basic ${Buffer.from(`${this.config.api_key}:`).toString('base64')}`,
        'Accept': 'application/json'
      });

      // Process response
      if (response.shipmentTrackingNumber) {
        return {
          success: true,
          shipment_id: response.shipmentTrackingNumber,
          tracking_number: response.shipmentTrackingNumber,
          label_url: response.documents?.[0]?.content ? 
            `data:application/pdf;base64,${response.documents[0].content}` : undefined,
          estimated_delivery_date: response.estimatedDeliveryDate ? 
            new Date(response.estimatedDeliveryDate) : undefined,
          cost_euros: response.shipmentCharges?.[0]?.price,
          raw_response: response
        };
      } else {
        return {
          success: false,
          error: 'No tracking number returned from DHL',
          raw_response: response
        };
      }

    } catch (error) {
      console.error('[DHL] Error creating shipment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    try {
      console.log(`[DHL] Getting tracking info for ${trackingNumber}`);

      const response = await this.makeApiRequest(
        `/tracking?trackingNumber=${trackingNumber}`,
        'GET',
        undefined,
        {
          'DHL-API-Key': this.config.api_key,
          'Accept': 'application/json'
        }
      ) as DHLTrackingResponse;

      if (!response.shipments || response.shipments.length === 0) {
        throw new Error('No tracking information found');
      }

      const shipment = response.shipments[0];
      
      // Convert DHL events to our format
      const events: TrackingEvent[] = shipment.events?.map(event => ({
        timestamp: new Date(event.timestamp),
        status: event.status,
        description: event.description,
        location: event.location?.address ? 
          `${event.location.address.addressLocality}, ${event.location.address.countryCode}` : undefined,
        event_code: event.statusCode
      })) || [];

      // Determine status from DHL status codes
      const status = this.mapDHLStatus(shipment.status.statusCode);

      return {
        tracking_number: trackingNumber,
        status,
        estimated_delivery: shipment.estimatedTimeOfDelivery ? 
          new Date(shipment.estimatedTimeOfDelivery) : null,
        actual_delivery: shipment.proofOfDelivery ? 
          new Date(shipment.proofOfDelivery.timestamp) : null,
        events,
        last_updated: new Date(shipment.status.timestamp)
      };

    } catch (error) {
      console.error('[DHL] Error getting tracking info:', error);
      throw error;
    }
  }

  async getRates(request: RateRequest): Promise<RateOption[]> {
    try {
      console.log(`[DHL] Getting rates for ${request.recipient.city}, ${request.recipient.country}`);

      // Build DHL rate request
      const dhlRequest = this.buildRateRequest(request);

      const response = await this.makeApiRequest('/rates', 'POST', dhlRequest, {
        'Authorization': `Basic ${Buffer.from(`${this.config.api_key}:`).toString('base64')}`,
        'Accept': 'application/json'
      });

      const rates: RateOption[] = [];

      if (response.products) {
        for (const product of response.products) {
          const serviceType = this.mapDHLProductCode(product.productCode);
          const serviceName = this.getServiceName(serviceType);

          rates.push({
            service_type: serviceType,
            service_name: serviceName,
            cost_euros: product.totalPrice?.[0]?.price || 0,
            estimated_delivery_days: product.deliveryCapabilities?.deliveryTime || 3,
            estimated_delivery_date: product.deliveryCapabilities?.estimatedDeliveryDateAndTime ? 
              new Date(product.deliveryCapabilities.estimatedDeliveryDateAndTime) : 
              new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            currency: product.totalPrice?.[0]?.currencyType || 'EUR'
          });
        }
      }

      return rates;

    } catch (error) {
      console.error('[DHL] Error getting rates:', error);
      throw error;
    }
  }

  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      console.log(`[DHL] Cancelling shipment ${shipmentId}`);

      const response = await this.makeApiRequest(`/shipments/${shipmentId}`, 'DELETE', undefined, {
        'Authorization': `Basic ${Buffer.from(`${this.config.api_key}:`).toString('base64')}`,
        'Accept': 'application/json'
      });

      return response.message?.includes('cancelled') || response.message?.includes('deleted');

    } catch (error) {
      console.error('[DHL] Error cancelling shipment:', error);
      return false;
    }
  }

  // Private helper methods

  private buildShipmentRequest(request: ShipmentRequest): DHLShipmentRequest {
    const plannedDate = new Date();
    plannedDate.setDate(plannedDate.getDate() + 1); // Tomorrow

    const isInternational = request.sender.country !== request.recipient.country;
    const productCode = this.getProductCode(request.service_type, isInternational);

    return {
      plannedShippingDateAndTime: plannedDate.toISOString(),
      pickup: {
        address: {
          countryCode: request.sender.country,
          postalCode: request.sender.postal_code,
          cityName: request.sender.city,
          addressLine1: request.sender.address_line1
        },
        contactInformation: {
          contactPerson: request.sender.name,
          phone: request.sender.phone || '+31201234567',
          email: request.sender.email || 'noreply@wasgeurtje.nl'
        }
      },
      delivery: {
        address: {
          countryCode: request.recipient.country,
          postalCode: request.recipient.postal_code,
          cityName: request.recipient.city,
          addressLine1: request.recipient.address_line1
        },
        contactInformation: {
          contactPerson: request.recipient.name,
          phone: request.recipient.phone,
          email: request.recipient.email
        }
      },
      shipmentDetails: {
        productCode,
        packages: request.packages.map(pkg => ({
          weight: this.formatWeight(pkg.weight_grams),
          dimensions: {
            length: this.formatDimensions(pkg.length_cm || 20),
            width: this.formatDimensions(pkg.width_cm || 15),
            height: this.formatDimensions(pkg.height_cm || 10)
          }
        })),
        isCustomsDeclarationRequired: isInternational,
        unitOfMeasurement: 'metric',
        description: 'Wasgeurtje Proefpakket - Laundry Fragrance Sample',
        incoterm: isInternational ? 'DAP' : undefined,
        invoice: isInternational ? {
          totalValue: request.packages.reduce((sum, pkg) => sum + (pkg.value_euros || 15), 0),
          currencyCode: 'EUR'
        } : undefined
      }
    };
  }

  private buildRateRequest(request: RateRequest): DHLRateRequest {
    const plannedDate = new Date();
    plannedDate.setDate(plannedDate.getDate() + 1); // Tomorrow

    return {
      plannedShippingDateAndTime: plannedDate.toISOString(),
      pickup: {
        postalCode: request.sender.postal_code,
        cityName: request.sender.city,
        countryCode: request.sender.country
      },
      delivery: {
        postalCode: request.recipient.postal_code,
        cityName: request.recipient.city,
        countryCode: request.recipient.country
      },
      packages: request.packages.map(pkg => ({
        weight: this.formatWeight(pkg.weight_grams),
        dimensions: {
          length: this.formatDimensions(pkg.length_cm || 20),
          width: this.formatDimensions(pkg.width_cm || 15),
          height: this.formatDimensions(pkg.height_cm || 10)
        }
      }))
    };
  }

  private getProductCode(serviceType: string, isInternational: boolean): string {
    const productCodes: Record<string, string> = {
      'express': isInternational ? 'P' : 'N',
      'express_9': '9',
      'express_10_30': 'X',
      'express_12': 'T',
      'economy': 'W',
      'document': 'D'
    };

    return productCodes[serviceType] || (isInternational ? 'P' : 'N');
  }

  private mapDHLProductCode(productCode: string): string {
    const productMap: Record<string, string> = {
      'P': 'express',
      'N': 'express',
      '9': 'express_9',
      'X': 'express_10_30',
      'T': 'express_12',
      'W': 'economy',
      'D': 'document'
    };

    return productMap[productCode] || 'express';
  }

  private getServiceName(serviceType: string): string {
    const serviceNames: Record<string, string> = {
      'express': 'DHL Express Worldwide',
      'express_9': 'DHL Express 9:00',
      'express_10_30': 'DHL Express 10:30',
      'express_12': 'DHL Express 12:00',
      'economy': 'DHL Economy Select',
      'document': 'DHL Express Documents'
    };

    return serviceNames[serviceType] || 'DHL Express';
  }

  private mapDHLStatus(statusCode: string): TrackingInfo['status'] {
    const statusMap: Record<string, TrackingInfo['status']> = {
      'PU': 'picked_up',        // Picked up
      'CC': 'in_transit',       // Customer clearance
      'WC': 'in_transit',       // With delivery courier
      'OD': 'out_for_delivery', // Out for delivery
      'OK': 'delivered',        // Delivered
      'DF': 'failed',          // Delivery failed
      'RT': 'returned',        // Returned to shipper
      'CM': 'created',         // Clearance message
      'MC': 'created'          // Message created
    };

    return statusMap[statusCode] || 'in_transit';
  }

  private async validateShipmentRequest(request: ShipmentRequest): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!request.recipient.postal_code) {
      errors.push('Recipient postal code is required');
    }

    if (!this.isCountrySupported(request.recipient.country)) {
      errors.push(`DHL does not support deliveries to ${request.recipient.country}`);
    }

    if (request.packages.length === 0) {
      errors.push('At least one package is required');
    }

    // International shipment validation
    const isInternational = request.sender.country !== request.recipient.country;
    if (isInternational) {
      if (!request.packages.every(pkg => pkg.value_euros && pkg.value_euros > 0)) {
        errors.push('Package value is required for international shipments');
      }
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

  // Enhanced address validation for international addresses
  async validateAddress(address: ShippingAddress): Promise<{ valid: boolean; suggestions?: ShippingAddress[]; errors?: string[] }> {
    const baseValidation = await super.validateAddress(address);
    
    if (!baseValidation.valid) {
      return baseValidation;
    }

    const errors: string[] = [];
    
    // Country-specific validations
    switch (address.country) {
      case 'US':
        // US ZIP code validation
        const usZipPattern = /^\d{5}(-\d{4})?$/;
        if (!usZipPattern.test(address.postal_code)) {
          errors.push('US ZIP code must be in format 12345 or 12345-1234');
        }
        break;
        
      case 'GB':
        // UK postal code validation
        const ukPostalPattern = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
        if (!ukPostalPattern.test(address.postal_code)) {
          errors.push('UK postal code format is invalid');
        }
        break;
        
      case 'DE':
        // German postal code validation
        const dePostalPattern = /^\d{5}$/;
        if (!dePostalPattern.test(address.postal_code)) {
          errors.push('German postal code must be 5 digits');
        }
        break;
        
      case 'FR':
        // French postal code validation
        const frPostalPattern = /^\d{5}$/;
        if (!frPostalPattern.test(address.postal_code)) {
          errors.push('French postal code must be 5 digits');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Calculate shipping costs for different services
  private calculateShippingCost(request: ShipmentRequest): number {
    const isInternational = request.sender.country !== request.recipient.country;
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight_grams, 0);
    
    let baseRate: number;
    
    if (isInternational) {
      // International rates
      if (totalWeight <= 500) {
        baseRate = 25.00;
      } else if (totalWeight <= 1000) {
        baseRate = 35.00;
      } else if (totalWeight <= 2000) {
        baseRate = 50.00;
      } else {
        baseRate = 75.00;
      }
    } else {
      // Domestic rates (within EU)
      if (totalWeight <= 500) {
        baseRate = 15.00;
      } else if (totalWeight <= 1000) {
        baseRate = 20.00;
      } else if (totalWeight <= 2000) {
        baseRate = 30.00;
      } else {
        baseRate = 45.00;
      }
    }

    // Service type surcharge
    const serviceSurcharges: Record<string, number> = {
      'express_9': 15.00,
      'express_10_30': 10.00,
      'express_12': 5.00,
      'express': 0.00,
      'economy': -5.00,
      'document': -10.00
    };

    const surcharge = serviceSurcharges[request.service_type] || 0;
    
    return baseRate + surcharge;
  }
} 