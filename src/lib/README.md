# Utility Libraries

This directory contains utility functions, service clients, and configuration files used throughout the application.

## Core Services

### Supabase Integration (`supabase.ts`)

The Supabase client provides database access and authentication. Key features:

#### localStorage vs. Mock Data Strategy

We've made a strategic decision to use **localStorage** as our primary development data store instead of hardcoded mock arrays. This approach provides several benefits:

- **Session persistence**: Data remains between page refreshes and browser sessions
- **Parallel development**: Multiple app instances (on different ports) can have independent data stores
- **Better testing**: Complete user journeys can be tested without database setup
- **Smoother migration path**: The code structure remains similar between development and production

#### Fallback Mechanism for Development

The Supabase client includes a sophisticated fallback system for development:

1. **Connection Validation**:
   - On startup, the app tests if Supabase connection is valid
   - Sets `connectionValidated` flag based on result
   - Sets `isUsingValidCredentials` based on API key validity

2. **Mock Data Mode**:
   - Automatically activates when Supabase connection fails
   - Uses localStorage for persistence instead of hardcoded arrays
   - Provides consistent data structure matching production

3. **LocalStorage Persistence**:
   - Mock data is stored in browser's localStorage
   - Changes (approving/rejecting retailers) persist between sessions
   - Implemented with these key functions:

```typescript
// Initialize data from localStorage or use defaults
const initializeMockRetailers = () => {
  if (typeof window !== 'undefined') {
    try {
      const savedRetailers = localStorage.getItem('mockRetailers');
      if (savedRetailers) {
        return JSON.parse(savedRetailers) as Retailer[];
      }
    } catch (error) {
      console.error('Error loading mockRetailers from localStorage:', error);
    }
  }
  return initialMockRetailers;
};

// Save to localStorage after changes
const saveMockRetailersToLocalStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('mockRetailers', JSON.stringify(mockRetailers));
    } catch (error) {
      console.error('Error saving mockRetailers to localStorage:', error);
    }
  }
};

// Reset to initial state if needed
export const resetMockRetailers = () => {
  mockRetailers = [...initialMockRetailers];
  saveMockRetailersToLocalStorage();
  return { success: true };
};
```

4. **Database Operations**:
   - All CRUD functions check if in mock mode
   - Functions like `getRetailers()`, `getPendingRetailers()`, `getProducts()` have mock versions
   - Status updates work with localStorage for persistence

#### Recommended Patterns

When working with localStorage in this app:

1. **Use the helper functions** in `supabase.ts` instead of direct localStorage access:
   ```typescript
   // To load data
   const { retailers } = await getRetailers('pending');
   
   // To save data
   await updateRetailerStatus(id, 'approved');
   ```

2. **Avoid hardcoded mock arrays** like this:
   ```typescript
   // DON'T DO THIS
   const pendingMockRetailers = [
     { id: '1', name: 'Test Shop', status: 'pending' },
     // more items...
   ];
   ```

3. **Use the debugging tools** available on the `window.wasgeurtje` object:
   ```javascript
   // In browser console
   window.wasgeurtje.showMockRetailers()  // Show all mock retailers
   window.wasgeurtje.resetData()          // Reset to initial state
   window.wasgeurtje.addTestAccount()     // Add a test retailer
   ```

#### Database Functions

The file provides these main database interface functions:

- **Retailer Management**:
  - `getRetailers(status?)`: Get retailers with optional status filter
  - `registerRetailer(data)`: Register a new retailer
  - `updateRetailerStatus(id, status)`: Approve or reject a retailer
  - `getPendingRetailers()`: Get retailers awaiting approval
  - `activateRetailer(token)`: Activate a retailer account with token

- **Product Management**:
  - `getProducts()`: Get all products
  - `getProduct(id)`: Get a specific product
  - `saveProduct(product)`: Create or update a product
  - `deleteProduct(id)`: Delete a product

- **Settings Management**:
  - `getSetting(key)`: Get a setting value
  - `saveSetting(key, value)`: Save a setting value

### Email Service (`mail-service.ts`)

Email sending functionality using Mandrill API. Features:

- Template-based emails
- Test mode in development
- Automatic fallback to log output when Mandrill is not configured

### Settings Service (`settings-service.ts`)

Application settings management:

- Caching for performance
- Error recovery with default values
- Interface for UI configuration

### Stripe Integration (`stripe.ts` and `stripe-server.ts`)

Stripe payment processing:

- Client-side interface for customer interactions
- Server-side functions for secure operations
- Development mode with test transactions

## File Overview

- **email-debug.ts**: Utilities for debugging email sending
- **email-templates.ts**: Email template definitions and rendering functions
- **init-services.ts**: Service initialization for database and external APIs
- **mail-service.ts**: Email sending functionality (Mandrill/Mailchimp)
- **settings-service.ts**: Application settings with error handling
- **stripe.ts**: Client-side Stripe integration
- **stripe-server.ts**: Server-side Stripe implementation
- **supabase.ts**: Supabase client with localStorage fallback

## Usage Guidelines

### Working with Mock Data

When developing without a Supabase connection:

1. Data is automatically persisted in localStorage
2. Changes to retailer status will be saved between sessions
3. To reset mock data: call `resetMockRetailers()` function or use the debug tools
4. Debug logs with prefix `[DEBUG]` show what mode is active

### Handling Form Input Styling

For consistent form styling and visibility:

1. All form inputs should include the class `text-gray-900` 
2. Example:
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="mt-1 border border-gray-300 rounded-md text-gray-900"
/>
```

## Troubleshooting

Common issues and solutions:

- **Data not persisting**: Check if localStorage is enabled in browser
- **Connection errors**: Verify Supabase credentials in environment variables
- **Inconsistent data**: Try calling `window.wasgeurtje.resetData()` to reset mock data
- **Form inputs not visible**: Add `text-gray-900` class to the input component

## Migration to Production

When ready to migrate to production:

1. Ensure all components use the abstracted data methods, not direct localStorage access
2. Set up your Supabase credentials in `.env.local`
3. Test the application with both modes:
   - Development (with localStorage fallback)
   - Production-only (disable fallback logic) 