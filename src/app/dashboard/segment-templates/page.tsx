'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import SegmentTemplateVariantManager from '@/components/SegmentTemplateVariantManager';
import TemplateVariantAnalyticsDashboard from '@/components/TemplateVariantAnalyticsDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, ArrowLeft, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';

export default function SegmentTemplatesPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex justify-center items-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-red-600">Toegang Geweigerd</CardTitle>
              <CardDescription>
                Je hebt geen toegang tot deze pagina. Alleen administrators kunnen segment templates beheren.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar Dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-4">
              <Breadcrumbs />
            </div>

            {/* Page Header */}
            <div className="pb-5 border-b border-gray-200 flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Palette className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold leading-6 text-gray-900">
                      Segment Template Variants
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      Beheer meerdere template varianten per segment met A/B testing en auto-optimization
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Link 
                  href="/dashboard/commercial-acquisition"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Commercial Dashboard
                </Link>
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Dashboard
                </Link>
              </div>
            </div>

            {/* Enhanced Info Card */}
            <Card className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-900">
                  <Palette className="h-5 w-5" />
                  <span>Advanced Template Variant Management</span>
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Geavanceerd template management systeem met meerdere varianten per segment, A/B testing, 
                  conversion tracking en automatische optimalisatie.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg">
                    <strong className="text-purple-900">🎯 Multiple Variants:</strong>
                    <p className="text-gray-600">Meerdere email & landing page varianten per segment</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <strong className="text-purple-900">📊 A/B Testing:</strong>
                    <p className="text-gray-600">Automatische A/B tests met statistische validatie</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <strong className="text-purple-900">🤖 Auto-Optimization:</strong>
                    <p className="text-gray-600">Automatische template switching op basis van performance</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <strong className="text-purple-900">📈 Funnel Analytics:</strong>
                    <p className="text-gray-600">Complete funnel tracking en conversion analytics</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="management" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="management" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Template Variant Management</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics & Funnel Tracking</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="management" className="space-y-6">
                <SegmentTemplateVariantManager />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <TemplateVariantAnalyticsDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 