"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "./Icons";

type BackButtonProps = {
  label?: string;
  className?: string;
  route?: string;
};

export default function BackButton({ 
  label = "Terug", 
  className = "", 
  route 
}: BackButtonProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (route) {
      router.push(route);
    } else {
      router.back();
    }
  };
  
  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-pink-600 focus:outline-none ${className}`}
      aria-label="Terug naar vorige pagina"
    >
      <BackIcon className="h-4 w-4 mr-1" />
      {label}
    </button>
  );
} 