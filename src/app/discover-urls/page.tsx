'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ExternalLink, ScanSearch, Info, AlertTriangle, CheckCircle, SlidersHorizontal, Sparkles, HelpCircle } from 'lucide-react';
import { discoverUrlsAction } from '@/app/actions';
import { type DiscoveredUrl } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { getLeads } from '@/lib/db';
import { Label } from '@/components/ui/label';

const PRESETS = [
  {
    name: 'Shipping & Delivery',
    description: 'Find shipping/delivery policies',
    query: '(inurl:shipping OR inurl:"shipping-policy" OR intitle:"shipping information" OR intitle:"delivery information")',
    inUrl: 'shipping, shipping-policy',
    inTitle: 'shipping information, delivery information',
    site: ''
  },
  {
    name: 'Contact & Support',
    description: 'Find contact-us or support links',
    query: '(inurl:contact OR inurl:"contact-us" OR intitle:"contact us" OR intitle:"get in touch")',
    inUrl: 'contact, contact-us',
    inTitle: 'contact us, get in touch',
    site: ''
  },
  {
    name: 'About Company',
    description: 'Find about-us or team pages',
    query: '(inurl:about OR inurl:"about-us" OR intitle:"about us" OR intitle:"our story")',
    inUrl: 'about, about-us',
    inTitle: 'about us, our story',
    site: ''
  },
  {
    name: 'Returns & Refunds',
    description: 'Find refund or return policy pages',
    query: '(inurl:refund OR inurl:returns OR intitle:"refund policy" OR intitle:"returns policy")',
    inUrl: 'refund, returns',
    inTitle: 'refund policy, returns policy',
    site: ''
  },
  {
    name: 'FAQ & Help Center',
    description: 'Find FAQ or support documents',
    query: '(inurl:faq OR inurl:faqs OR intitle:faq OR intitle:faqs OR intitle:"frequently asked questions")',
    inUrl: 'faq, faqs',
    inTitle: 'faq, faqs, frequently asked questions',
    site: ''
  }
];

export default function DiscoverUrlsPage() {
  const [query, setQuery] = useState('(inurl:shipping OR inurl:"shipping-policy" OR intitle:"shipping information" OR intitle:"delivery information")');
  const [limit, setLimit] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [urls, setUrls] = useState<DiscoveredUrl[]>([]);
  const [existingLeadUrls, setExistingLeadUrls] = useState<Set<string>>(new Set());
  
  // Custom query builder fields
  const [inUrlInput, setInUrlInput] = useState('shipping, shipping-policy');
  const [inTitleInput, setInTitleInput] = useState('shipping information, delivery information');
  const [siteInput, setSiteInput] = useState('');
  const [generalKeywords, setGeneralKeywords] = useState('');

  const { toast } = useToast();
  const router = useRouter();

  // Normalize URL for reliable duplicate checking
  const normalizeUrl = (url: string): string => {
    try {
      const u = new URL(url);
      return (u.origin + u.pathname).replace(/\/$/, '').toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  };

  // Fetch existing leads on mount to identify duplicates
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const leads = await getLeads();
        const urlSet = new Set(leads.map(l => normalizeUrl(l.sourceUrl || l.company.website || '')));
        setExistingLeadUrls(urlSet);
      } catch (e) {
        console.error("Failed to fetch existing leads for deduplication", e);
      }
    };
    fetchExisting();
  }, []);

  // Update query automatically when builder fields change
  useEffect(() => {
    const parts: string[] = [];

    // Parse inurl parts
    if (inUrlInput.trim()) {
      const uParts = inUrlInput.split(',').map(s => s.trim()).filter(Boolean);
      if (uParts.length > 0) {
        const inner = uParts.map(p => `inurl:${p.includes(' ') ? `"${p}"` : p}`).join(' OR ');
        parts.push(uParts.length > 1 ? `(${inner})` : inner);
      }
    }

    // Parse intitle parts
    if (inTitleInput.trim()) {
      const tParts = inTitleInput.split(',').map(s => s.trim()).filter(Boolean);
      if (tParts.length > 0) {
        const inner = tParts.map(p => `intitle:${p.includes(' ') ? `"${p}"` : p}`).join(' OR ');
        parts.push(tParts.length > 1 ? `(${inner})` : inner);
      }
    }

    // Parse site constraint
    if (siteInput.trim()) {
      parts.push(`site:${siteInput.trim()}`);
    }

    // Parse general keywords
    if (generalKeywords.trim()) {
      parts.push(generalKeywords.trim());
    }

    if (parts.length > 0) {
      setQuery(parts.join(' OR '));
    }
  }, [inUrlInput, inTitleInput, siteInput, generalKeywords]);

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setInUrlInput(preset.inUrl);
    setInTitleInput(preset.inTitle);
    setSiteInput(preset.site);
    setGeneralKeywords('');
    setQuery(preset.query);
    toast({
      title: 'Preset Loaded',
      description: `Loaded templates for ${preset.name}`
    });
  };

  const handleSearch = async () => {
    if (!query) {
      toast({ title: 'No Query', description: 'Please enter a search query.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await discoverUrlsAction({ 
        query, 
        limit, 
        excludeUrls: Array.from(existingLeadUrls) 
      });
      if (response && 'error' in response) {
        toast({ title: 'Search Failed', description: response.error, variant: 'destructive' });
        return;
      }
      setUrls(response.urls);
      toast({ title: 'Discovery Complete', description: `Identified ${response.urls.length} target URLs.` });
    } catch (error: any) {
      toast({ title: 'Search Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = (url: string) => {
    router.push(`/capture?url=${encodeURIComponent(url)}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="mx-auto grid w-full max-w-7xl gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">URL Intelligence Discovery</h1>
        </div>
        <p className="text-muted-foreground">
          Identify target pages using advanced query patterns. Duplicates from your current Lead pool are automatically excluded from the results.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Parameters Editor */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-md">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <CardTitle>Discovery Parameters</CardTitle>
              </div>
              <CardDescription>
                Configure the rules below to craft the target search.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presets & Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p, idx) => (
                    <Button 
                      key={idx} 
                      variant="outline" 
                      size="sm"
                      onClick={() => loadPreset(p)}
                      className="text-xs hover:border-primary/50 transition-all"
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>

              <hr className="border-dashed" />

              {/* Operator Builder */}
              <div className="space-y-4">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Query Operator Builder
                  <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="inurl-builder" className="text-xs font-medium">In URL Keywords</Label>
                  <Input
                    id="inurl-builder"
                    placeholder="Comma separated: e.g. shipping, delivery"
                    value={inUrlInput}
                    onChange={(e) => setInUrlInput(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Checks if these terms appear in the page URL.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intitle-builder" className="text-xs font-medium">In Title Keywords</Label>
                  <Input
                    id="intitle-builder"
                    placeholder="Comma separated: e.g. shipping policy, deliver info"
                    value={inTitleInput}
                    onChange={(e) => setInTitleInput(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Checks if these terms appear in the webpage header title.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site-builder" className="text-xs font-medium">Domain / Site Match</Label>
                  <Input
                    id="site-builder"
                    placeholder="e.g. .com.au, gov.au, myshopify.com"
                    value={siteInput}
                    onChange={(e) => setSiteInput(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Optionally restrict results to a specific domain extension or service.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="general-keywords" className="text-xs font-medium">General Keywords</Label>
                  <Input
                    id="general-keywords"
                    placeholder="e.g. e-commerce apparel"
                    value={generalKeywords}
                    onChange={(e) => setGeneralKeywords(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Additional search terms to narrow down relevance.</p>
                </div>
              </div>

              <hr className="border-dashed" />

              {/* Limit Selector */}
              <div className="space-y-2">
                <Label htmlFor="limit-selector" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Number of Targets</Label>
                <div className="flex items-center gap-4">
                  <select
                    id="limit-selector"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={10}>10 Targets</option>
                    <option value={20}>20 Targets</option>
                    <option value={30}>30 Targets</option>
                    <option value={50}>50 Targets</option>
                  </select>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column - Compiled Query & Results */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Active Search Pattern</span>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">Compiled</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Query pattern compiles here..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 font-mono text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading} className="px-5">
                  {isLoading ? <Loader2 className="animate-spin mr-1 h-4 w-4" /> : <Search className="mr-1 h-4 w-4" />} Run Discovery
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/25 p-3 rounded">
                <Info className="h-4 w-4 text-amber-500 shrink-0" />
                <p>
                  Collision detection compares results against <strong>{existingLeadUrls.size}</strong> existing leads. Duplicate domains are ignored automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results list */}
          {urls.length > 0 && (
            <Card className="shadow-md overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Identified Targets</span>
                  <Badge>{urls.length} Found</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  <div className="divide-y divide-border">
                    {urls.map((item, index) => (
                      <div key={index} className="p-4 hover:bg-muted/20 transition-colors flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{item.title}</span>
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Score: {item.relevanceScore}%
                            </Badge>
                          </div>
                          <p className="text-xs text-primary truncate max-w-md font-mono">{item.url}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.snippet}</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="w-full text-[11px] h-8">
                              <ExternalLink className="mr-1 h-3 w-3" /> View Page
                            </Button>
                          </a>
                          <Button 
                            size="sm" 
                            variant="default"
                            className="w-full text-[11px] h-8" 
                            onClick={() => handleCapture(item.url)}
                          >
                            <ScanSearch className="mr-1 h-3 w-3" /> Analyze & Capture
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
