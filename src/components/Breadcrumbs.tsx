"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, HomeIcon } from "./Icons";

type BreadcrumbItem = {
  label: string;
  href: string;
  isCurrent?: boolean;
};

// Map van URL paden naar leesbare labels
const pathToLabel: Record<string, string> = {
  dashboard: "Dashboard",
  retailers: "Retailers",
  products: "Producten",
  settings: "Instellingen",
  "retailer-dashboard": "Retailer Dashboard",
  orders: "Bestellingen",
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  // Als er geen pathname is, toon geen breadcrumbs
  if (!pathname) return null;
  
  // Splits het pad in onderdelen
  const pathSegments = pathname.split("/").filter(Boolean);
  
  // Als we op de homepage zijn, toon geen breadcrumbs
  if (pathSegments.length === 0) return null;
  
  const breadcrumbItems: BreadcrumbItem[] = [];
  
  // Voeg altijd 'Home' toe als eerste item
  breadcrumbItems.push({
    label: "Home",
    href: "/",
  });
  
  // Bouw de breadcrumbs op basis van de padsegmenten
  let currentPath = "";
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    breadcrumbItems.push({
      label: pathToLabel[segment] || segment,
      href: currentPath,
      isCurrent: isLast,
    });
  });
  
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mx-1" />
            )}
            
            {item.isCurrent ? (
              <span className="text-sm font-medium text-gray-500" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm font-medium text-pink-600 hover:text-pink-700"
              >
                {index === 0 ? (
                  <span className="flex items-center">
                    <HomeIcon className="flex-shrink-0 h-4 w-4 mr-1" />
                    <span className="sr-only">{item.label}</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 