'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, RefreshCw, SaveAll } from 'lucide-react';
import { createLeadFromFormAction, extractMultipleLeadsFromUrlAction } from '@/app/actions';
import type { NewLead, ExtractedLeadData } from '@/types';
import { logger } from '@/lib/logger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { auth } from '@/lib/firebase';


export default function BulkCapturePage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLeadData[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!url) {
      toast({ title: 'No URL Entered', description: 'Please enter a URL to analyze.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setExtractedLeads([]);
    setSelectedLeads({});
    try {
      const response = await extractMultipleLeadsFromUrlAction({ url });
      if (response && 'error' in response) {
        toast({ title: 'Analysis Failed', description: response.error, variant: 'destructive' });
        return;
      }
      if (response.leads && response.leads.length > 0) {
        setExtractedLeads(response.leads);
        // Initially select all found leads
        const initialSelection = response.leads.reduce((acc, _, index) => {
          acc[index] = true;
          return acc;
        }, {} as Record<number, boolean>);
        setSelectedLeads(initialSelection);
        toast({ title: 'Analysis Complete', description: `Found ${response.leads.length} potential leads. Review and save them below.` });
      } else {
        toast({ title: 'Analysis Finished', description: response.message || 'No distinct leads were found on the page.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Analysis Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLead = (index: number) => {
    setSelectedLeads(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const handleToggleSelectAll = (checked: boolean) => {
    const newSelection = extractedLeads.reduce((acc, _, index) => {
      acc[index] = checked;
      return acc;
    }, {} as Record<number, boolean>);
    setSelectedLeads(newSelection);
  };

  const handleSaveSelectedLeads = async () => {
    setIsSaving(true);
    const leadsToSave = extractedLeads.filter((_, index) => selectedLeads[index]);
    logger.info(`[Bulk Save] Starting to save ${leadsToSave.length} selected leads.`);
    toast({ title: 'Saving Leads...', description: `Started saving ${leadsToSave.length} leads. See debug logs for progress.` });

    const userId = auth.currentUser?.uid;
    if (!userId) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save leads.', variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const lead of leadsToSave) {
      try {
        const isValidEmail = (e: any) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
        const safeEmail = isValidEmail(lead.email) ? lead.email : `no-email-${Date.now()}@example.com`;
        
        const newLead = {
          name: lead.name && lead.name !== 'null' ? lead.name : 'N/A',
          title: lead.title && lead.title !== 'null' ? lead.title : 'N/A',
          company: { 
            name: (lead.companyName && lead.companyName !== 'null' ? lead.companyName : null) || (lead.name && lead.name !== 'null' ? lead.name : 'N/A'), 
            website: lead.website 
          },
          email: safeEmail as string,
          phone: lead.phone && lead.phone !== 'null' ? lead.phone : 'N/A',
          status: 'New' as const,
          quality: 0, // Calculated on backend
          source: 'Bulk URL Capture' as const,
          sourceUrl: lead.website || url, // Store specific lead URL if available
          details: `${lead.details && lead.details !== 'null' ? lead.details : ''}\nWebsite: ${lead.website || 'N/A'}\nSource URL: ${url}`,
        };
        const result = await createLeadFromFormAction(newLead);
        if (result && 'error' in result) {
          throw new Error(result.error);
        }
        await (await import('@/lib/db')).createLead(result.enrichedLead, userId);
        successCount++;
      } catch (error: any) {
        failCount++;
        logger.error(`[Bulk Save] Failed to save lead "${lead.name}": ${error.message}`);
      }
    }
    
    setIsSaving(false);
    toast({
      title: 'Bulk Save Complete',
      description: `Successfully saved ${successCount} leads. ${failCount} failed.`,
    });
    
    // Reset state after saving
    handleReset();
  };
  
  const handleReset = () => {
      setUrl('');
      setExtractedLeads([]);
      setSelectedLeads({});
      setIsLoading(false);
      setIsSaving(false);
  };

  const selectedCount = Object.values(selectedLeads).filter(Boolean).length;
  const isAllSelected = extractedLeads.length > 0 && selectedCount === extractedLeads.length;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="mx-auto grid w-full max-w-4xl gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bulk Capture from URL</h1>
        <p className="text-muted-foreground">
          Enter a URL with multiple companies (like a partner or portfolio page) to extract them all as leads.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Analyze URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/partners"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={isLoading || extractedLeads.length > 0}
              />
              <Button onClick={handleAnalyze} disabled={isLoading || !url || extractedLeads.length > 0}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />} Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {extractedLeads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Review & Save Leads</CardTitle>
              <CardDescription>
                The AI found {extractedLeads.length} potential leads. Uncheck any you don't want to save.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2 pb-4">
                    <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={(checked) => handleToggleSelectAll(Boolean(checked))} />
                    <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Select All
                    </label>
                </div>
              <ScrollArea className="h-[40vh] rounded-md border">
                <div className="p-4 space-y-4">
                    {extractedLeads.map((lead, index) => (
                        <div key={index} className="flex items-start gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50">
                            <Checkbox 
                                className="mt-1"
                                checked={!!selectedLeads[index]}
                                onCheckedChange={() => handleToggleLead(index)}
                                id={`lead-${index}`}
                            />
                            <div className="grid gap-1 text-sm">
                                <label htmlFor={`lead-${index}`} className="font-semibold cursor-pointer">{lead.companyName || lead.name || 'Unnamed Lead'}</label>
                                <p className="text-muted-foreground">{lead.details || 'No details extracted.'}</p>
                                {lead.website && <Badge variant="secondary" className="w-fit">{lead.website}</Badge>}
                            </div>
                        </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-2">
              <Button onClick={handleSaveSelectedLeads} disabled={isSaving || selectedCount === 0} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="animate-spin" /> : <SaveAll />} Save {selectedCount} Selected Leads
              </Button>
              <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                <RefreshCw /> Start Over
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
