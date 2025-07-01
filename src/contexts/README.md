# Contexts Directory (`contexts`)

This directory contains React Context providers for global state management in the Wasgeurtje Retail application.

## Current Contexts

- **AuthContext.tsx**: Authentication and user state management
  - User authentication state (logged in, admin, retailer)
  - Login and logout functions
  - User role checks and permissions
  - Route protection logic

## Purpose

The contexts in this directory provide a way to share state across components without prop drilling. They are particularly useful for:

- Authentication state that needs to be accessible throughout the application
- User role and permission checks
- Global UI state management

## Usage

To use a context in a component:

```tsx
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileComponent() {
  const { user, isAdmin, logout } = useAuth();

  if (!user) {
    return <div>Please log in to view your profile</div>;
  }

  return (
    <div>
      <h1>Welcome {user.email}</h1>
      {isAdmin && <div>Admin controls are visible</div>}
      <button onClick={logout}>Log Out</button>
    </div>
  );
}
```

To provide context to your application, wrap your components with the provider in `layout.tsx` or another high-level component:

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Design Principles

- Contexts should be focused on specific concerns (e.g., authentication)
- Context providers should handle all the state management for their domain
- Context values and functions should be memoized to prevent unnecessary re-renders
- Context state changes should be consistent and predictable

## Potential Future Contexts

As the application grows, consider adding additional contexts for:

- Shopping cart state
- Site configuration/settings
- Theme/UI preferences
- Feature flags

Organize new contexts in this directory following the same patterns as the existing contexts. 