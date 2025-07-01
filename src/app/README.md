# App Directory (`app`)

This directory contains all the Next.js pages and API routes using the App Router pattern.

## Directory Structure

- **api/**: Server-side API routes for handling backend functionality
  - **auth/**: Authentication-related endpoints
  - **email/**: Email configuration and sending endpoints
  - **postcode/**: Postcode validation API endpoints
  - **setup/**: Database and service initialization endpoints
  - **stripe/**: Payment processing endpoints
  - **upload/**: File upload handling endpoints
  - **retailers/**: Retailer management endpoints
  - **settings/**: Application settings endpoints

- **dashboard/**: Admin dashboard pages
  - **products/**: Product management pages
  - **retailers/**: Retailer management pages 
  - **settings/**: Admin settings pages

- **login/**: User authentication page
- **register/**: Retailer registration page
- **retailer-dashboard/**: Retailer-specific dashboard
- **contact/**: Contact form page
- **registratie-ontvangen/**: Registration confirmation page
- **postcode-test/**: Utility page for testing postcode functionality
- **retailer-activate/**: Retailer account activation page

## Key Files

- **layout.tsx**: Root layout component that wraps all pages
- **page.tsx**: Homepage component
- **globals.css**: Global CSS styles
- **favicon.ico**: Site favicon

## Page Organization

The app structure follows Next.js App Router conventions:
- Each folder represents a route segment
- `page.tsx` files define the UI for a route
- Nested folders create nested routes
- `api` directory contains server-side API endpoint handlers
- `layout.tsx` files define shared layouts for nested routes

## Purpose

This directory handles all page rendering and server-side API functionality. It separates concerns between:
- Public-facing pages (homepage, registration, contact)
- Admin functionality (dashboard)
- Retailer-specific features (retailer dashboard)
- API endpoints that provide backend services

The structure follows the Next.js 13+ App Router pattern, enabling both client and server components within the same directory structure. 