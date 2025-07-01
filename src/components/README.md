# Components Directory (`components`)

This directory contains all reusable UI components used throughout the Wasgeurtje Retail application.

## Component Categories

### Layout Components
- **Navbar.tsx**: Main navigation bar with responsive design and authentication state handling
- **Footer.tsx**: Page footer with links and company information
- **Breadcrumbs.tsx**: Navigation breadcrumbs for page hierarchy display
- **BackButton.tsx**: Navigation button for returning to previous pages

### Homepage & Marketing Components
- **Hero.tsx**: Homepage hero section with main messaging and CTA
- **Features.tsx**: Product features showcase section
- **CTA.tsx**: Call-to-action component for conversions
- **RetailerDirectory.tsx**: Interactive map showing retailer locations with search functionality
- **RetailerPackageInfo.tsx**: Information about retailer packages and offerings
- **RetailerTimeline.tsx**: Visual timeline of retailer onboarding process
- **SocialProofSection.tsx**: Social proof and testimonials section
- **RegistrationCTA.tsx**: Specialized CTA for retailer registration

### Form Components
- **RegistrationForm.tsx**: Complete retailer registration form
- **PostcodeCheck.tsx**: Postcode validation form with address lookup
- **PostcodeTest.tsx**: Component for testing postcode validation functionality
- **ProductEditor.tsx**: Form for creating/editing products
- **ImageUploader.tsx**: Drag-and-drop image upload component
- **LogoUploader.tsx**: Specialized component for uploading retailer logos

### Admin & Dashboard Components
- **EmailTemplateEditor.tsx**: Rich editor for email templates
- **EmailTemplateList.tsx**: List view for managing email templates
- **TemplatePreview.tsx**: Preview component for email templates
- **EmailDiagnostics.tsx**: Diagnostic tools for email system troubleshooting
- **BrandingSettings.tsx**: Form for managing branding and visual settings
- **ProductShowcase.tsx**: Display component for product cards in admin view

### Utility Components
- **Icons.tsx**: SVG icon components used throughout the application

## Component Design Principles

- Components are designed for reusability across multiple pages
- Most components accept props for customization
- Components maintain consistent styling using Tailwind CSS
- Interactive components handle their own state when appropriate
- Larger components may fetch their own data or receive it via props

## Usage

Import components as needed in page files or other components:

```tsx
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";

export default function HomePage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}
```

## Component Organization

Components are organized as standalone files in a flat structure. For larger applications, consider organizing by feature or component type as the application grows.

## Styling Guidelines

### Form Inputs

All form inputs should follow these styling guidelines to ensure consistency and proper visibility:

#### Text Visibility in Inputs

Always use `text-gray-900` class for all form inputs to ensure text is clearly visible against any background:

```tsx
// ✅ CORRECT: Text will be clearly visible
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="mt-1 border border-gray-300 rounded-md shadow-sm text-gray-900"
/>

// ❌ INCORRECT: Text may be invisible on some browser themes
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="mt-1 border border-gray-300 rounded-md shadow-sm"
/>
```

#### Apply to All Input Types

This rule applies to all form elements:

- Text inputs: `<input type="text">`
- Password inputs: `<input type="password">`
- Email inputs: `<input type="email">`
- Textareas: `<textarea>`
- Select dropdowns: `<select>`

#### Components with Form Fields

These components contain form inputs and should follow the text visibility rule:

- **BrandingSettings**: Color and typography settings
- **EmailTemplateEditor**: Email template editing
- **AccountSettings**: User profile settings
- **NotificationSettings**: User notification preferences
- **RegistrationForm**: Retailer registration

## Interactive Components

### RetailerDirectory

The RetailerDirectory component provides an interactive map of retailer locations:

- Uses SVG map of the Netherlands
- Shows retailer locations with tooltips
- Supports filtering and searching
- Displays a modal with full retailer list

Maintain existing styling and interactive elements when updating this component.

### Form Components

Several specialized form components are available:

- **PostcodeCheck**: Validates Dutch postcodes with external API
- **ImageUploader**: Drag-and-drop image upload with preview
- **LogoUploader**: Specialized for logo image uploading

### Layout Components

- **Navbar**: Main navigation header
- **Footer**: Site footer with links and credits
- **Breadcrumbs**: Navigation breadcrumbs
- **BackButton**: Navigation back button

### Dashboard Components

- **ProductEditor**: Complete product editing interface
- **EmailDiagnostics**: Email system diagnostic tools
- **BrandingStudio**: Enhanced branding with live previews

## Component Structure

Components should follow these best practices:

1. Import statements at the top
2. Type definitions (with TypeScript interfaces/types)
3. Component function with JSX return
4. Helper functions inside the component
5. Export statement

Example:

```tsx
import React, { useState } from 'react';

type ExampleProps = {
  label: string;
  onChange: (value: string) => void;
};

export default function Example({ label, onChange }: ExampleProps) {
  const [value, setValue] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-900"
      />
    </div>
  );
}
```

## Troubleshooting

Common component issues and solutions:

- **Text not visible in inputs**: Add `text-gray-900` class to the input element
- **Styling inconsistencies**: Follow TailwindCSS class naming conventions
- **Browser compatibility**: Test in Chrome, Firefox, and Safari
- **Form validation errors**: Use proper error states and messages 