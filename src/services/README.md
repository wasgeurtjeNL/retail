# Services Directory (`services`)

This directory contains external API service integrations for the Wasgeurtje Retail application.

## Current Services

- **postcodeApi.ts**: Integration with the Postcode.nl API
  - Address validation and lookup by postcode and house number
  - Error handling and response formatting
  - Rate limiting and caching considerations

## Purpose

The services directory is dedicated to external API integrations that:
- Require specialized configuration
- Have specific error handling needs
- May need rate limiting or request optimization
- Would benefit from separation from the main application logic

These services act as adapters between external APIs and the application, providing a consistent interface regardless of the underlying API implementation.

## Usage

Import and use services in components, API routes, or other parts of the application:

```tsx
import { validateAddress } from '@/services/postcodeApi';

// Example usage in an API route
export async function POST(req: Request) {
  const { postcode, houseNumber } = await req.json();
  
  try {
    const validationResult = await validateAddress(postcode, houseNumber);
    
    return Response.json({ 
      success: true, 
      data: validationResult 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 400 });
  }
}
```

## Service Implementation Guidelines

When adding new services to this directory:

1. Each service should be in its own file with a descriptive name
2. Include proper error handling and timeout mechanisms
3. Consider adding retry logic for unreliable APIs
4. Provide clear documentation on usage and configuration
5. Add environment variable support for API keys and endpoints
6. Include TypeScript interfaces for request and response types

## Potential Future Services

As the application grows, consider adding services for:

- Payment gateways beyond Stripe
- Shipping and logistics APIs
- Marketing automation tools
- Analytics integrations
- Social media APIs

When adding these services, follow the established patterns to maintain consistency across the codebase. 