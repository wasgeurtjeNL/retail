# Public Directory (`public`)

This directory contains static assets that are served directly by the web server without processing by Next.js.

## Directory Structure

- **images/**: Main product and marketing images
- **assets/**: Miscellaneous assets including icons, logos, and UI elements

## Static Files

- **vercel.svg**: Vercel logo
- **next.svg**: Next.js logo
- **globe.svg**: Globe icon used in location indicators
- **window.svg**: Window icon used in UI elements
- **file.svg**: File icon used in document references

## Usage

Static assets in the public directory are available at the root URL of your application. For example, an image at `public/images/product.jpg` is accessible at `/images/product.jpg` in your application.

```tsx
// Example usage in a component
export default function ProductImage() {
  return (
    <div>
      <img 
        src="/images/product.jpg" 
        alt="Product" 
        width={300} 
        height={200} 
      />
    </div>
  );
}
```

For Next.js optimized images, consider using the `next/image` component:

```tsx
import Image from 'next/image';

export default function OptimizedProductImage() {
  return (
    <div>
      <Image 
        src="/images/product.jpg" 
        alt="Product" 
        width={300} 
        height={200} 
        priority
      />
    </div>
  );
}
```

## Asset Management Guidelines

When adding new assets to this directory:

1. Use descriptive filenames that indicate the asset's purpose
2. Organize assets into subdirectories by type or feature
3. Optimize images for web use (compress and resize appropriately)
4. Consider using SVG for icons and logos when possible
5. Include proper attribution for third-party assets
6. Remove unused assets regularly to keep the directory clean

## Important Notes

- The `public` directory is ideal for:
  - Robots.txt and sitemap.xml files
  - Favicons and app icons
  - Static images and PDFs
  - Fonts (though consider using a font loading strategy instead)
  - Static JSON data files (though consider using API routes for dynamic data)

- For assets that need processing (like CSS or JavaScript), place them in the appropriate directories within `src` instead of `public`. 