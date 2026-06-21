'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ExternalLink, ScanSearch, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { discoverUrlsAction } from '@/app/actions';
import { type DiscoveredUrl, type Lead } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { getLeads } from '@/lib/db';

export default function DiscoverUrlsPage() {
  const [query, setQuery] = useState('(inurl:shipping OR inurl:"shipping-policy" OR intitle:"shipping information" OR intitle:"delivery information")');
  const [isLoading, setIsLoading] = useState(false);
  const [urls, setUrls] = useState<DiscoveredUrl[]>([]);
  const [existingLeadUrls, setExistingLeadUrls] = useState<Set<string>>(new Set());
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

  const handleSearch = async () => {
    if (!query) {
      toast({ title: 'No Query', description: 'Please enter a search query.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await discoverUrlsAction({ 
        query, 
        limit: 30, 
        excludeUrls: Array.from(existingLeadUrls) 
      });
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
    <div className="flex flex-1 flex-col gap-4">
      <div className="mx-auto grid w-full max-w-5xl gap-2">
        <h1 className="text-3xl font-bold tracking-tight">URL Intelligence Discovery</h1>
        <p className="text-muted-foreground">
          Identify target pages using advanced query patterns. Duplicates from your current Lead pool are automatically identified.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Discovery Parameters</CardTitle>
            <CardDescription>Enter your search query below. Collision detection is active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. shipping policy"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 font-mono text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Search />} Run Discovery
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded border border-dashed">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <p>Collision detection compares results against {existingLeadUrls.size} existing leads.</p>
            </div>
          </CardContent>
        </Card>

        {urls.length > 0 && (
          <Card className="flex-1">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <CardTitle>Identified Targets ({urls.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                <div className="divide-y">
                  {urls.map((item, index) => {
                    const isDuplicate = existingLeadUrls.has(normalizeUrl(item.url));
                    return (
                      <div key={index} className={`p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-4 ${isDuplicate ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{item.title}</span>
                              <Badge variant="secondary" className="text-[10px] h-4">
                                  Score: {item.relevanceScore}%
                              </Badge>
                              {isDuplicate && (
                                <Badge variant="destructive" className="text-[10px] h-4 bg-orange-500 hover:bg-orange-600 flex items-center gap-1">
                                  <AlertTriangle className="h-2 w-2" /> Already in Leads
                                </Badge>
                              )}
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
                            variant={isDuplicate ? "secondary" : "default"}
                            className="w-full text-[11px] h-8" 
                            onClick={() => handleCapture(item.url)}
                          >
                              {isDuplicate ? (
                                <><CheckCircle className="mr-1 h-3 w-3" /> Update Existing</>
                              ) : (
                                <><ScanSearch className="mr-1 h-3 w-3" /> Analyze & Capture</>
                              )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
