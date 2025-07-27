// =====================================================
// BASE SHIPPING PROVIDER - Abstract Implementation
// Foundation for PostNL, DHL, UPS integrations
// =====================================================

export interface ShippingAddress {
  name: string;
  company?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShipmentPackage {
  weight_grams: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  value_euros?: number;
  description?: string;
}

export interface ShipmentRequest {
  sender: ShippingAddress;
  recipient: ShippingAddress;
  packages: ShipmentPackage[];
  service_type: string;
  reference?: string;
  insurance_value_euros?: number;
  delivery_instructions?: string;
  requested_delivery_date?: Date;
}

export interface ShipmentResponse {
  success: boolean;
  shipment_id?: string;
  tracking_number?: string;
  label_url?: string;
  estimated_delivery_date?: Date;
  cost_euros?: number;
  error?: string;
  raw_response?: any;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location?: string;
  event_code?: string;
}

export interface TrackingInfo {
  tracking_number: string;
  status: 'created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  estimated_delivery: Date | null;
  actual_delivery: Date | null;
  events: TrackingEvent[];
  last_updated: Date;
}

export interface RateRequest {
  sender: ShippingAddress;
  recipient: ShippingAddress;
  packages: ShipmentPackage[];
  service_types?: string[];
}

export interface RateOption {
  service_type: string;
  service_name: string;
  cost_euros: number;
  estimated_delivery_days: number;
  estimated_delivery_date: Date;
  currency: string;
}

export interface ProviderConfig {
  api_key: string;
  api_secret?: string;
  api_endpoint: string;
  test_mode: boolean;
  timeout_ms: number;
  retry_attempts: number;
}

export interface ProviderCapabilities {
  supports_tracking: boolean;
  supports_insurance: boolean;
  supports_cod: boolean; // Cash on delivery
  supports_pickup: boolean;
  supports_delivery_confirmation: boolean;
  max_weight_grams: number;
  max_dimensions_cm: {
    length: number;
    width: number;
    height: number;
  };
  supported_countries: string[];
  supported_services: string[];
}

export abstract class BaseShippingProvider {
  protected config: ProviderConfig;
  protected capabilities: ProviderCapabilities;
  
  constructor(config: ProviderConfig) {
    this.config = config;
    this.capabilities = this.getCapabilities();
    console.log(`[${this.getProviderName()}] Provider initialized`);
  }

  // Abstract methods that must be implemented by providers
  abstract getProviderName(): string;
  abstract getProviderCode(): string;
  abstract getCapabilities(): ProviderCapabilities;
  abstract createShipment(request: ShipmentRequest): Promise<ShipmentResponse>;
  abstract getTracking(trackingNumber: string): Promise<TrackingInfo>;
  abstract getRates(request: RateRequest): Promise<RateOption[]>;
  abstract cancelShipment(shipmentId: string): Promise<boolean>;

  // Optional methods with default implementations
  async validateAddress(address: ShippingAddress): Promise<{ valid: boolean; suggestions?: ShippingAddress[]; errors?: string[] }> {
    // Basic validation - providers can override for more advanced validation
    const errors: string[] = [];
    
    if (!address.name) errors.push('Name is required');
    if (!address.address_line1) errors.push('Address line 1 is required');
    if (!address.city) errors.push('City is required');
    if (!address.postal_code) errors.push('Postal code is required');
    if (!address.country) errors.push('Country is required');
    
    // Basic postal code format validation for Netherlands
    if (address.country === 'NL') {
      const nlPostalPattern = /^\d{4}\s?[A-Z]{2}$/i;
      if (!nlPostalPattern.test(address.postal_code)) {
        errors.push('Invalid Dutch postal code format (should be 1234 AB)');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[${this.getProviderName()}] Testing connection...`);
      
      // Try to get rates for a test shipment
      const testRequest: RateRequest = {
        sender: {
          name: 'Test Sender',
          address_line1: 'Teststraat 1',
          city: 'Amsterdam',
          postal_code: '1012 AB',
          country: 'NL'
        },
        recipient: {
          name: 'Test Recipient',
          address_line1: 'Testlaan 2',
          city: 'Rotterdam',
          postal_code: '3012 BC',
          country: 'NL'
        },
        packages: [{
          weight_grams: 500,
          length_cm: 20,
          width_cm: 15,
          height_cm: 10
        }]
      };
      
      await this.getRates(testRequest);
      
      console.log(`[${this.getProviderName()}] Connection test successful`);
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${this.getProviderName()}] Connection test failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Utility methods
  protected async makeApiRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.config.api_endpoint}${endpoint}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: AbortSignal.timeout(this.config.timeout_ms)
    };
    
    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }
    
    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 1; attempt <= this.config.retry_attempts; attempt++) {
      try {
        console.log(`[${this.getProviderName()}] API Request (attempt ${attempt}): ${method} ${url}`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`[${this.getProviderName()}] API Request successful`);
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[${this.getProviderName()}] API Request failed (attempt ${attempt}):`, lastError.message);
        
        if (attempt < this.config.retry_attempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[${this.getProviderName()}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('API request failed after all retry attempts');
  }

  protected formatWeight(weightGrams: number): number {
    // Convert grams to kilograms, round to 2 decimal places
    return Math.round((weightGrams / 1000) * 100) / 100;
  }

  protected formatDimensions(cm: number): number {
    // Ensure dimensions are positive and rounded
    return Math.max(1, Math.round(cm));
  }

  protected parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  protected isCountrySupported(country: string): boolean {
    return this.capabilities.supported_countries.includes(country);
  }

  protected isServiceSupported(serviceType: string): boolean {
    return this.capabilities.supported_services.includes(serviceType);
  }

  protected validatePackageConstraints(packages: ShipmentPackage[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const pkg of packages) {
      // Weight check
      if (pkg.weight_grams > this.capabilities.max_weight_grams) {
        errors.push(`Package weight ${pkg.weight_grams}g exceeds maximum ${this.capabilities.max_weight_grams}g`);
      }
      
      // Dimension checks
      if (pkg.length_cm && pkg.length_cm > this.capabilities.max_dimensions_cm.length) {
        errors.push(`Package length ${pkg.length_cm}cm exceeds maximum ${this.capabilities.max_dimensions_cm.length}cm`);
      }
      if (pkg.width_cm && pkg.width_cm > this.capabilities.max_dimensions_cm.width) {
        errors.push(`Package width ${pkg.width_cm}cm exceeds maximum ${this.capabilities.max_dimensions_cm.width}cm`);
      }
      if (pkg.height_cm && pkg.height_cm > this.capabilities.max_dimensions_cm.height) {
        errors.push(`Package height ${pkg.height_cm}cm exceeds maximum ${this.capabilities.max_dimensions_cm.height}cm`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Provider information
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  getCapabilities_(): ProviderCapabilities {
    return { ...this.capabilities };
  }

  isTestMode(): boolean {
    return this.config.test_mode;
  }

  // Service type helpers
  getAvailableServices(): string[] {
    return [...this.capabilities.supported_services];
  }

  getDefaultService(): string {
    return this.capabilities.supported_services[0] || 'standard';
  }
} 