# Source Directory (`src`)

This directory contains all the source code for the Wasgeurtje Retail application.

## Directory Structure

- **app/**: Contains all the Next.js pages and API routes using the App Router pattern
- **components/**: Reusable UI components used throughout the application
- **contexts/**: React context providers for state management
- **data/**: Data models and static data
- **lib/**: Utility functions, service integrations, and client configurations
- **services/**: External API service integrations

## Key Files

There are no standalone files in this directory; all code is organized in the subdirectories.

## Purpose

The `src` directory follows a standard Next.js project structure, separating concerns between:
- Page components (in `app/`)
- Reusable UI components (in `components/`)
- Business logic and utilities (in `lib/` and `services/`)
- State management (in `contexts/`)

This organization makes it easier to maintain the codebase and understand the relationships between different parts of the application. 