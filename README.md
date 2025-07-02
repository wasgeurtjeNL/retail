# Wasgeurtje Retail Platform

A Next.js application for managing retailer relationships and products for Wasgeurtje, a company selling scented laundry products.

## Project Overview

This application provides:
- A public-facing website with retailer information
- A retailer registration and onboarding flow
- An admin dashboard for managing retailers and products
- A retailer dashboard for partners to manage their account
- API endpoints for various functionalities

## Technology Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS 4
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Email**: Mailchimp/Mandrill Transactional Email
- **Payments**: Stripe
- **APIs**: Postcode.nl for address validation

## Latest Updates

### Verbeterde tekstleesbaarheid in Social Media Omzet Booster
- Verhoogd kleurcontrast in tabelweergave voor betere leesbaarheid
- Donkerdere tekstkleuren voor alle elementen om optimale zichtbaarheid te garanderen
- Consistente kleuraanduidingen voor ROI-indicatoren
- Toegevoegde contrastregels aan de .cursorrules om toekomstige leesbaarheidsfouten te voorkomen

### Nieuwe UI/UX Standaarden
- Toegevoegd: minimale contrastverhouding voor tekst (minimaal text-gray-700 op lichte achtergronden)
- Toegevoegd: gestandaardiseerde stijling voor tabelkoppen met verhoogd contrast
- Belangrijk: Gebruik geen lichte grijstinten (gray-400/500) voor tekst op lichte achtergronden

### Shipping Provider Selectie
- PostNL en DHL als verzendopties toegevoegd bij checkout
- Automatische tracking URL generatie bij verzending
- DHL API integratie voor directe verwerking
- Verbeterde error handling en gebruikersfeedback

### Social Media Guide Component 
- Omzet-gedreven sjablonen die direct tot verkoop leiden
- 7-daags content plan met voorspelbare ROI 
- Kopieerbare templates met bewezen conversiepercentages
- Specifieke sociale media strategieën voor retail distributeurs

### Business Growth Strategies Component
- Gedetailleerde B2B groeistrategie
- Social media templates voor direct resultaat
- Klantacquisitie optimalisatie
- Samenwerking met micro-influencers

## Directory Structure

- **src/app/**: Next.js App Router pages and API routes
- **src/components/**: Reusable UI components
- **src/contexts/**: React context providers for state management
- **src/data/**: Data models and static data
- **src/lib/**: Utility functions and service clients
- **src/services/**: External API integrations
- **public/**: Static assets

Each directory contains a README.md file explaining its purpose and contents in more detail.

## Development Features and Logic

### Mock Data in Development Mode

The application has a robust development mode that works without a database connection:

- **Automatic Detection**: When Supabase connection fails, the app falls back to mock data mode
- **Configurable**: Set `useMockData = true` in `supabase.ts` to force development mode
- **Persistent Storage**: All changes to mock data are persisted in localStorage between sessions
- **How it works**:
  1. Initial mock data is defined in `supabase.ts` as `initialMockRetailers`
  2. On app start, it checks localStorage for saved mock retailers with `initializeMockRetailers()`
  3. Changes to retailer status (approve/reject) are saved back to localStorage with `saveMockRetailersToLocalStorage()`
  4. Mock data can be reset to initial values with `resetMockRetailers()`
  5. All CRUD operations on retailers are intercepted to update the localStorage

```typescript
// Example of how localStorage persistence works
// From supabase.ts
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
```

### UI Styling Consistency

To ensure consistent UI and proper visibility:

- **Form Input Text Visibility**: All form fields use `text-gray-900` class to ensure text is visible
- **Input Types**: Text inputs, textareas, and select dropdowns all follow consistent styling
- **Affected Components**: 
  - Settings pages (`src/app/dashboard/settings/page.tsx`)
  - Branding settings (`src/components/BrandingSettings.tsx`)
  - Email template editor (`src/components/EmailTemplateEditor.tsx`)
  - Account settings (`src/components/AccountSettings.tsx`)
  - Notification settings (`src/components/NotificationSettings.tsx`)

```tsx
// Example of proper form input styling
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="mt-1 focus:ring-pink-500 focus:border-pink-500 block w-full border-gray-300 rounded-md text-gray-900"
/>
```

### Retailer Management

The retailer management system has these key features:

- **Registration Flow**: Public registration form → Admin approval → Activation email → Retailer access
- **Admin Dashboard**: View pending applications, approve or reject retailers
- **Status Management**: Retailers can be in 'pending', 'approved', or 'rejected' status
- **Email Notifications**: Automated emails for status changes
- **Development Specific**: 
  - In dev mode, status changes are persisted to localStorage
  - Retailers stay in the correct tab (pending/approved) after page refresh

### Email Template System

The app has a flexible email template system:

- **Template Storage**: Templates are stored in the database or in development memory
- **Variables Support**: Templates use Handlebars-style `{{variable}}` syntax
- **Preview**: Live preview with placeholder data while editing
- **Test Sending**: Send test emails to any address from the admin panel
- **Types of Templates**: 
  - Welcome emails
  - Retailer status notification
  - Password reset
  - Order confirmations

### Retailer Support Components

The app includes several components to help retailers succeed:

- **RetailerTips**: Visual collection of best practices for selling Wasgeurtje products
- **SocialMediaGuide**: Detailed guide for creating effective social media content
- **BusinessGrowthStrategies**: Structured approaches to increase sales and customer loyalty

### Supabase Integration with Fallback

How the Supabase connection works with fallback to development mode:

- **Connection Validation**: App tests connection at startup
- **Graceful Degradation**: Falls back to mock data if connection fails
- **API Interception**: All database calls intercepted in dev mode with `supabase.ts`
- **Debug Flags**: Easy flags to control behavior (`isUsingValidCredentials`, `connectionValidated`)

```typescript
// From supabase.ts
export const getRetailers = async (status?: 'pending' | 'approved' | 'rejected') => {
  if (supabase === undefined || !isUsingValidCredentials || !connectionValidated) {
    console.debug('[DEBUG] Using mock retailers in development mode');
    // Return mock data with filtering by status
    return mockRetailersResponse(status);
  }
  
  // Actual Supabase query if connection is valid
  try {
    const query = supabase.from('retailers').select('*');
    if (status) {
      query.eq('status', status);
    }
    const { data, error } = await query;
    // Process data and return
  } catch (error) {
    // Handle errors
  }
}
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (or local Supabase setup)
- Mailchimp/Mandrill API key
- Stripe API keys
- Postcode.nl API access

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/wasgeurtje-retail.git
cd wasgeurtje-retail
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

MANDRILL_API_KEY=your-mandrill-api-key

# Stripe Keys (test en live)
STRIPE_TEST_SECRET_KEY=your-stripe-test-secret-key
STRIPE_LIVE_SECRET_KEY=your-stripe-live-secret-key
NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY=your-stripe-test-publishable-key
NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY=your-stripe-live-publishable-key

POSTCODE_API_KEY=your-postcode-api-key
POSTCODE_API_SECRET=your-postcode-api-secret
```

4. Run the development server
```bash
# Important: Use the provided startup script for proper environment setup
# For Windows:
./start-app.ps1

# Alternative:
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Key Features

### Public Website
- Homepage with product showcase and retailer information
- Interactive retailer location map
- Retailer registration form
- Contact form

### Admin Dashboard
- Retailer management and approval workflow
- Product management
- Email template configuration
- System settings
- Order management with shipping provider selection (DHL/PostNL)

### Retailer Dashboard
- Profile management
- Order history
- Product catalog
- Marketing and growth resources
- Social media publishing guidelines

### Order Management System
- **Comprehensive Order Tracking**: Visual order progress tracker with real-time status updates
- **Multi-Payment Support**: Handling both Stripe payments and invoice-based transactions
- **Order Recovery System**: Smart recovery of order details from localStorage or session IDs
- **Persistent Order History**: All orders saved to localStorage in development mode for testing
- **Responsive Confirmation Page**: User-friendly confirmation page with animated transitions
- **Automatic Payment Status Updates**: When returning from Stripe, payment status is automatically updated
- **Shipping Provider Selection**: Choose between DHL and PostNL with appropriate tracking links
- **Status Management**:
  ```typescript
  // Example of status updating logic
  if (sessionId) {
    parsedOrder.paymentMethod = 'stripe';
    parsedOrder.paymentStatus = 'paid';
    parsedOrder.stripeSessionId = sessionId;
  }
  ```

## Troubleshooting

### Common Issues

- **Text not visible in forms**: Make sure all inputs have `text-gray-900` class
- **Retailer status not persisting**: Check if localStorage is enabled in your browser
- **Mock data not loading**: Try resetting mock data with `resetMockRetailers()`
- **Multiple startup errors**: Make sure to use `start-app.ps1` instead of directly running `npm run dev`
- **DHL tracking links not working**: Verify shipping_provider is correctly set in the order object

## License

This project is proprietary and confidential.

## Contact

For questions or support, contact your project manager. 