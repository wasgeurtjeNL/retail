'use client';

// =====================================================
// PUPPETEER SCRAPING DASHBOARD - Advanced Web Scraping Control
// Interface for Google Maps, Yelp, Facebook Business scraping
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  ExternalLink,
  Play,
  Pause,
  Download,
  Settings,
  TestTube,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ScrapingTarget {
  platform: 'google_maps' | 'yelp' | 'facebook_business' | 'yellow_pages';
  query: string;
  location: string;
  maxResults: number;
  filters?: {
    rating?: number;
    reviewCount?: number;
    businessType?: string[];
  };
}

interface ScrapedBusiness {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  website_url: string;
  rating?: number;
  review_count?: number;
  category?: string;
  platform_source: string;
  potential_score: number;
}

interface ScrapingStats {
  totalProspectsFound: number;
  sourceBreakdown: {
    google_maps: number;
    yelp: number;
    facebook: number;
    yellow_pages: number;
  };
  capabilities: {
    platforms: string[];
    features: string[];
  };
}

export default function PuppeteerScrapingDashboard() {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ScrapingStats | null>(null);
  const [scrapedBusinesses, setScrapedBusinesses] = useState<ScrapedBusiness[]>([]);
  const [activeTab, setActiveTab] = useState('single');
  
  // Single scraping form
  const [singleTarget, setSingleTarget] = useState<ScrapingTarget>({
    platform: 'google_maps',
    query: '',
    location: '',
    maxResults: 20
  });

  // Batch scraping form
  const [batchTargets, setBatchTargets] = useState<ScrapingTarget[]>([]);
  const [newBatchTarget, setNewBatchTarget] = useState<ScrapingTarget>({
    platform: 'google_maps',
    query: '',
    location: '',
    maxResults: 20
  });

  // Load statistics on component mount
  useEffect(() => {
    loadStats();
  }, []);

  /**
   * Load scraping statistics
   */
  const loadStats = async () => {
    try {
      const response = await fetch('/api/commercial/discovery/puppeteer');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        console.error('Failed to load stats:', result.error);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  /**
   * Test scraper functionality
   */
  const testScraper = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/commercial/discovery/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Scraper test succesvol! ${result.data.results?.businessesFound || 0} businesses gevonden`);
      } else {
        toast.error(`Scraper test gefaald: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error tijdens scraper test');
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute single platform scraping
   */
  const executeSingleScraping = async () => {
    if (!singleTarget.query || !singleTarget.location) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/commercial/discovery/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape',
          target: singleTarget,
          saveToDatabase: true
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setScrapedBusinesses(result.data.businesses || []);
        toast.success(`${result.data.businessesFound} businesses gevonden, ${result.data.businessesSaved} opgeslagen`);
        loadStats(); // Refresh stats
      } else {
        toast.error(`Scraping gefaald: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error tijdens scraping');
      console.error('Scraping error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute batch scraping
   */
  const executeBatchScraping = async () => {
    if (batchTargets.length === 0) {
      toast.error('Voeg ten minste één scraping target toe');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/commercial/discovery/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_scrape',
          targets: batchTargets,
          saveToDatabase: true
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Batch scraping voltooid: ${result.data.totalBusinessesFound} businesses gevonden, ${result.data.totalBusinessesSaved} opgeslagen`);
        loadStats(); // Refresh stats
      } else {
        toast.error(`Batch scraping gefaald: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error tijdens batch scraping');
      console.error('Batch scraping error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add target to batch list
   */
  const addToBatch = () => {
    if (!newBatchTarget.query || !newBatchTarget.location) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    setBatchTargets([...batchTargets, { ...newBatchTarget }]);
    setNewBatchTarget({
      platform: 'google_maps',
      query: '',
      location: '',
      maxResults: 20
    });
    toast.success('Target toegevoegd aan batch');
  };

  /**
   * Remove target from batch list
   */
  const removeFromBatch = (index: number) => {
    setBatchTargets(batchTargets.filter((_, i) => i !== index));
    toast.success('Target verwijderd uit batch');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Puppeteer Web Scraping</h2>
          <p className="text-gray-600">Geavanceerde business discovery via Google Maps, Yelp en andere platforms</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={testScraper} 
            disabled={isLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <TestTube className="w-4 h-4" />
            <span>Test Scraper</span>
          </Button>
          <Button 
            onClick={loadStats}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Refresh Stats</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProspectsFound}</div>
              <p className="text-xs text-gray-600">Via Puppeteer scraping</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Google Maps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sourceBreakdown.google_maps}</div>
              <p className="text-xs text-gray-600">Businesses gevonden</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Yelp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sourceBreakdown.yelp}</div>
              <p className="text-xs text-gray-600">Businesses gevonden</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Andere Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.sourceBreakdown.facebook + stats.sourceBreakdown.yellow_pages}
              </div>
              <p className="text-xs text-gray-600">Facebook + Yellow Pages</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Enkele Scraping</TabsTrigger>
          <TabsTrigger value="batch">Batch Scraping</TabsTrigger>
          <TabsTrigger value="results">Resultaten</TabsTrigger>
        </TabsList>

        {/* Single Scraping */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enkele Platform Scraping</CardTitle>
              <CardDescription>
                Scrape één platform voor specifieke business informatie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select 
                    value={singleTarget.platform} 
                    onValueChange={(value: any) => setSingleTarget({...singleTarget, platform: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_maps">Google Maps</SelectItem>
                      <SelectItem value="yelp">Yelp</SelectItem>
                      <SelectItem value="facebook_business">Facebook Business</SelectItem>
                      <SelectItem value="yellow_pages">Yellow Pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Resultaten</label>
                  <Input
                    type="number"
                    value={singleTarget.maxResults}
                    onChange={(e) => setSingleTarget({...singleTarget, maxResults: parseInt(e.target.value)})}
                    min="1"
                    max="100"
                    className="text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoekterm</label>
                  <Input
                    value={singleTarget.query}
                    onChange={(e) => setSingleTarget({...singleTarget, query: e.target.value})}
                    placeholder="b.v. restaurant, tandarts, kappers"
                    className="text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Locatie</label>
                  <Input
                    value={singleTarget.location}
                    onChange={(e) => setSingleTarget({...singleTarget, location: e.target.value})}
                    placeholder="b.v. Amsterdam, Rotterdam"
                    className="text-gray-900"
                  />
                </div>
              </div>

              <Button 
                onClick={executeSingleScraping} 
                disabled={isLoading}
                className="w-full flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>Start Scraping</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Scraping */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Scraping</CardTitle>
              <CardDescription>
                Voeg meerdere scraping targets toe voor bulk discovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new batch target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select 
                    value={newBatchTarget.platform} 
                    onValueChange={(value: any) => setNewBatchTarget({...newBatchTarget, platform: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_maps">Google Maps</SelectItem>
                      <SelectItem value="yelp">Yelp</SelectItem>
                      <SelectItem value="facebook_business">Facebook Business</SelectItem>
                      <SelectItem value="yellow_pages">Yellow Pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Resultaten</label>
                  <Input
                    type="number"
                    value={newBatchTarget.maxResults}
                    onChange={(e) => setNewBatchTarget({...newBatchTarget, maxResults: parseInt(e.target.value)})}
                    min="1"
                    max="100"
                    className="text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoekterm</label>
                  <Input
                    value={newBatchTarget.query}
                    onChange={(e) => setNewBatchTarget({...newBatchTarget, query: e.target.value})}
                    placeholder="b.v. restaurant, tandarts"
                    className="text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Locatie</label>
                  <Input
                    value={newBatchTarget.location}
                    onChange={(e) => setNewBatchTarget({...newBatchTarget, location: e.target.value})}
                    placeholder="b.v. Amsterdam"
                    className="text-gray-900"
                  />
                </div>

                <div className="col-span-full">
                  <Button onClick={addToBatch} className="w-full">
                    Target Toevoegen
                  </Button>
                </div>
              </div>

              {/* Batch targets list */}
              {batchTargets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Batch Targets ({batchTargets.length})</h4>
                  <div className="space-y-2">
                    {batchTargets.map((target, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">{target.platform}</Badge>
                          <span className="font-medium">{target.query}</span>
                          <span className="text-gray-600">in {target.location}</span>
                          <span className="text-sm text-gray-500">({target.maxResults} max)</span>
                        </div>
                        <Button 
                          onClick={() => removeFromBatch(index)}
                          variant="outline"
                          size="sm"
                        >
                          Verwijder
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={executeBatchScraping} 
                    disabled={isLoading}
                    className="w-full flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>Start Batch Scraping</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scraped Businesses ({scrapedBusinesses.length})</CardTitle>
              <CardDescription>
                Resultaten van de laatste scraping operatie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scrapedBusinesses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Geen resultaten gevonden. Start een scraping operatie om businesses te vinden.
                </div>
              ) : (
                <div className="space-y-4">
                  {scrapedBusinesses.map((business, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{business.business_name}</h4>
                            <Badge variant="outline">{business.platform_source}</Badge>
                            {business.rating && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm">{business.rating}</span>
                                {business.review_count && (
                                  <span className="text-sm text-gray-500">({business.review_count})</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            {business.business_address && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{business.business_address}</span>
                              </div>
                            )}
                            {business.business_phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-4 h-4" />
                                <span>{business.business_phone}</span>
                              </div>
                            )}
                            {business.business_email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4" />
                                <span>{business.business_email}</span>
                              </div>
                            )}
                            {business.website_url && (
                              <div className="flex items-center space-x-1">
                                <ExternalLink className="w-4 h-4" />
                                <a 
                                  href={business.website_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  Website
                                </a>
                              </div>
                            )}
                          </div>

                          {business.category && (
                            <div className="text-sm">
                              <strong>Categorie:</strong> {business.category}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Potential Score: {business.potential_score}/100
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Capabilities Info */}
      {stats?.capabilities && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Scraping Capabilities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Ondersteunde Platforms</h4>
                <div className="space-y-1">
                  {stats.capabilities.platforms.map((platform, index) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <ul className="space-y-1 text-sm">
                  {stats.capabilities.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 