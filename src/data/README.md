# Data Directory (`data`)

This directory contains data models and static data used in the Wasgeurtje Retail application.

## Current Data Files

- **retailers.ts**: Retailer data model and static data
  - Defines the structure of retailer information
  - Contains sample retailer data used in development/demonstration
  - Provides utility functions for working with retailer data

## Purpose

The data directory serves several purposes:
- Provides centralized storage for static or seed data
- Defines data models and TypeScript interfaces
- Contains utility functions for data manipulation specific to entity types
- Acts as a mock data source for development when not connected to a database

## Usage

Import data models and static data as needed in components or server code:

```tsx
import { retailers, Retailer, findRetailerByPostcode } from '@/data/retailers';

// Example usage in a component
export default function RetailerList() {
  return (
    <div>
      <h1>Our Retailers</h1>
      <ul>
        {retailers.map((retailer: Retailer) => (
          <li key={retailer.id}>
            {retailer.name} - {retailer.city}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example usage in a utility function
export function getNearestRetailers(postcode: string) {
  return findRetailerByPostcode(postcode, 5); // Find 5 nearest retailers
}
```

## Data Model Guidelines

When adding new data models to this directory:

1. Define clear TypeScript interfaces for each entity type
2. Use meaningful field names that match database column names when applicable
3. Add descriptive comments for complex fields or relationships
4. Consider adding validation functions where appropriate
5. Keep static data consistent with schema definitions
6. Avoid putting sensitive data in these files

## Potential Future Data Models

As the application grows, consider adding models for:

- Products and product categories
- Orders and order items
- Customer profiles
- Marketing content
- Configuration settings

When adding these models, follow the established patterns to maintain consistency across the codebase. 