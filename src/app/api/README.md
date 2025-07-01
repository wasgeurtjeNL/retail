# API Directory (`api`)

This directory contains server-side API routes for the Wasgeurtje Retail application using Next.js App Router API Routes.

## API Structure

- **auth/**: Authentication-related endpoints
  - User login, logout, and session management

- **email/**: Email functionality endpoints
  - **config/**: Email service configuration
  - **templates/**: Email template management
  - **test-template/**: Endpoints for testing email templates

- **postcode/**: Postcode validation API
  - Address lookup and validation

- **retailers/**: Retailer management endpoints
  - Create, read, update, and delete operations for retailers
  - Approval workflows and status updates

- **settings/**: Application settings endpoints
  - System configuration management
  - Branding and appearance settings

- **setup/**: Application initialization endpoints
  - Database setup and migrations
  - Initial data seeding

- **stripe/**: Payment processing endpoints
  - **config/**: Stripe API configuration
  - **create-checkout/**: Checkout session creation
  - **sync-product/**: Product synchronization between database and Stripe

- **upload/**: File upload handling endpoints
  - Image and document uploads
  - File processing and validation

## API Implementation

Each API route follows the Next.js App Router convention with a `route.ts` (or `route.js`) file that exports HTTP method handlers:

```typescript
// Example route.ts file
export async function GET(req: Request) {
  // Handle GET request
  return Response.json({ message: 'Success' });
}

export async function POST(req: Request) {
  // Handle POST request
  const data = await req.json();
  // Process data...
  return Response.json({ success: true });
}
```

## API Design Principles

- RESTful endpoints that follow standard HTTP conventions
- Clear separation of concerns by feature area
- Consistent error handling and response formats
- Authentication middleware where appropriate
- Rate limiting for public-facing endpoints
- Proper validation of request inputs

## Response Format

API responses follow a consistent format:

```json
// Success response
{
  "success": true,
  "data": {
    // Response data here
  }
}

// Error response
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE"
  }
}
```

## Authentication

Protected API routes should validate the user session and permissions:

```typescript
import { getCurrentUser } from '@/lib/supabase';

export async function GET(req: Request) {
  // Check authentication
  const { user, error } = await getCurrentUser();
  
  if (error || !user) {
    return Response.json(
      { success: false, error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }
  
  // Proceed with authenticated request...
}
```

## Usage Notes

- Use environment variables for sensitive configuration
- Implement proper error handling and logging
- Consider adding API documentation using comments or external tools
- For more complex API structures, consider implementing middleware
- Test all API endpoints thoroughly with various inputs 