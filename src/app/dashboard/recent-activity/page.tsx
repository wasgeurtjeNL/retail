"use client";

import { useState, useEffect, useCallback } from "react";
import { getProducts, getPendingRetailers } from "@/lib/supabase";
import Link from 'next/link';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import BackButton from "@/components/BackButton";

// Mock data, vervang later door echte API calls
const fetchWasstripsApplications = async () => 0; 
const fetchPendingOrders = async () => 0;

const RecentActivityPage = () => {
  const [pendingRetailersCount, setPendingRetailersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [wasstripsApplicationsCount, setWasstripsApplicationsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        retailers,
        products,
        wasstrips,
        orders,
      ] = await Promise.all([
        getPendingRetailers(),
        getProducts(),
        fetchWasstripsApplications(),
        fetchPendingOrders(),
      ]);
      setPendingRetailersCount(retailers.length);
      setProductsCount(products.length);
      setWasstripsApplicationsCount(wasstrips);
      setPendingOrdersCount(orders);
    } catch (error) {
      console.error("Failed to load activity data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow flex items-center justify-center">
                <div className="p-6">
                    <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-64 mb-6"></div>
                    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                    </div>
                </div>
            </main>
            <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 sm:px-0">
                    <div className="mb-4 flex justify-between items-center">
                        <Breadcrumbs />
                        <BackButton />
                    </div>
                    <div className="border-b border-gray-200 pb-5 mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Recente Activiteit</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Een overzicht van de meest recente gebeurtenissen op het platform.
                        </p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h3 className="text-xl font-semibold text-gray-900 mb-5">Activiteitenoverzicht</h3>
                        <ul className="space-y-4">
                            {/* Retailer aanvragen */}
                            <li className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-purple-100 rounded-lg mr-4">
                                        <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Retailer aanvragen</p>
                                        <p className="text-sm text-gray-500">{pendingRetailersCount > 0 ? `${pendingRetailersCount} nieuwe aanvragen` : 'Geen openstaande aanvragen'}</p>
                                    </div>
                                </div>
                                <Link href="/dashboard/retailers" className="text-sm font-medium text-pink-600 hover:text-pink-500">Beheren →</Link>
                            </li>
                            {/* Wasstrips aanvragen */}
                            <li className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-cyan-100 rounded-lg mr-4">
                                    <svg className="h-6 w-6 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <div>
                                        <p className="text-sm font-medium text-gray-900">Wasstrips aanvragen</p>
                                        <p className="text-sm text-gray-500">{wasstripsApplicationsCount > 0 ? `${wasstripsApplicationsCount} aanvragen in behandeling` : 'Geen Wasstrips aanvragen'}</p>
                                </div>
                                </div>
                                <Link href="/dashboard/wasstrips-applications" className="text-sm font-medium text-pink-600 hover:text-pink-500">Beheren →</Link>
                            </li>
                            {/* Te verzenden bestellingen */}
                            <li className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-green-100 rounded-lg mr-4">
                                        <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Te verzenden bestellingen</p>
                                        <p className="text-sm text-gray-500">{pendingOrdersCount > 0 ? `${pendingOrdersCount} bestellingen wachten` : 'Geen te verzenden bestellingen'}</p>
                                    </div>
                                </div>
                                <Link href="/dashboard/orders" className="text-sm font-medium text-pink-600 hover:text-pink-500">Beheren →</Link>
                            </li>
                            {/* Producten in catalogus */}
                            <li className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-pink-100 rounded-lg mr-4">
                                        <svg className="h-6 w-6 text-pink-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Producten in catalogus</p>
                                        <p className="text-sm text-gray-500">{productsCount > 0 ? `${productsCount} producten beschikbaar` : 'Geen producten'}</p>
                                    </div>
                                </div>
                                <Link href="/dashboard/products" className="text-sm font-medium text-pink-600 hover:text-pink-500">Beheren →</Link>
                            </li>
                            {/* Laatste retailer login */}
                            <li className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-lg mr-4">
                                    <svg className="h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Laatste retailer login</p>
                                        <p className="text-sm text-gray-500">3-7-2025, 09:58:24</p>
                                    </div>
                                </div>
                                <span className="text-gray-400 text-xs">Voorbeeld</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
        <Footer />
    </div>
  );
};

export default RecentActivityPage; 