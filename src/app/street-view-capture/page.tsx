'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, RefreshCw, SaveAll, MapPin } from 'lucide-react';
import { createLeadFromFormAction } from '@/app/actions';
import type { NewLead } from '@/types';
import { logger } from '@/lib/logger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { prospectFromStreetViewAction } from '@/app/actions';
import type { ProspectFromStreetViewOutput } from '@/ai/flows/prospect-from-street-view';

type ProspecetedBusiness = NonNullable<ProspectFromStreetViewOutput['businesses']>[0];

export default function StreetViewCapturePage() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedLeads, setExtractedLeads] = useState<ProspecetedBusiness[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!address) {
      toast({ title: 'No Address Entered', description: 'Please enter a street address to search.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setExtractedLeads([]);
    setSelectedLeads({});
    try {
      const response = await prospectFromStreetViewAction({ address });
      if (response.businesses && response.businesses.length > 0) {
        setExtractedLeads(response.businesses);
        const initialSelection = response.businesses.reduce((acc, lead) => {
          acc[lead.placeId] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setSelectedLeads(initialSelection);
        toast({ title: 'Prospecting Complete', description: `Found ${response.businesses.length} potential leads. Review and save them below.` });
      } else {
        toast({ title: 'No businesses found', description: response.message || 'No businesses were found at that location.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Analysis Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLead = (placeId: string) => {
    setSelectedLeads(prev => ({ ...prev, [placeId]: !prev[placeId] }));
  };

  const handleSaveSelectedLeads = async () => {
    setIsSaving(true);
    const leadsToSave = extractedLeads.filter(lead => selectedLeads[lead.placeId]);
    logger.info(`[Street View Save] Starting to save ${leadsToSave.length} selected leads.`);
    toast({ title: 'Saving Leads...', description: `Started saving ${leadsToSave.length} leads. See debug logs for progress.` });

    let successCount = 0;
    let failCount = 0;

    const userId = (await import('@/lib/firebase')).auth.currentUser?.uid;
    if (!userId) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save leads.', variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    for (const lead of leadsToSave) {
      try {
        const newLead: NewLead = {
          name: lead.name,
          title: 'N/A',
          company: { name: lead.name },
          email: `no-email-${Date.now()}@example.com`,
          phone: lead.phone || 'N/A',
          status: 'New',
          quality: 0,
          source: 'Street View Prospecting',
          details: `Address: ${lead.address}\nTypes: ${lead.types?.join(', ') || 'N/A'}\nPlace ID: ${lead.placeId}`,
        };
        const result = await createLeadFromFormAction(newLead);
        await (await import('@/lib/db')).createLead(result.enrichedLead, userId);
        successCount++;
      } catch (error: any) {
        failCount++;
        logger.error(`[Street View Save] Failed to save lead "${lead.name}": ${error.message}`);
      }
    }
    
    setIsSaving(false);
    toast({
      title: 'Bulk Save Complete',
      description: `Successfully saved ${successCount} leads. ${failCount > 0 ? `${failCount} failed.` : ''}`,
    });
    handleReset();
  };
  
  const handleReset = () => {
      setAddress('');
      setExtractedLeads([]);
      setSelectedLeads({});
      setIsLoading(false);
      setIsSaving(false);
  };

  const selectedCount = Object.values(selectedLeads).filter(Boolean).length;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="mx-auto grid w-full max-w-4xl gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Prospect from Street View</h1>
        <p className="text-muted-foreground">
          Enter an address to find nearby businesses, verified with Street View imagery.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Enter Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 1600 Amphitheatre Parkway, Mountain View, CA"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={isLoading || extractedLeads.length > 0}
              />
              <Button onClick={handleAnalyze} disabled={isLoading || !address || extractedLeads.length > 0}>
                {isLoading ? <Loader2 className="animate-spin" /> : <MapPin />} Find Businesses
              </Button>
            </div>
          </CardContent>
        </Card>

        {extractedLeads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Review & Save Leads</CardTitle>
              <CardDescription>
                The AI found {extractedLeads.length} businesses. Uncheck any you don't want to save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh] rounded-md border">
                <div className="p-4 grid gap-4 md:grid-cols-2">
                    {extractedLeads.map((lead) => (
                        <div key={lead.placeId} className="flex items-start gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50">
                            <Checkbox 
                                className="mt-1 shrink-0"
                                checked={!!selectedLeads[lead.placeId]}
                                onCheckedChange={() => handleToggleLead(lead.placeId)}
                                id={lead.placeId}
                            />
                            <div className="grid gap-2 text-sm">
                                <label htmlFor={lead.placeId} className="font-semibold cursor-pointer">{lead.name}</label>
                                <p className="text-muted-foreground">{lead.address}</p>
                                <div className="relative w-full h-40 rounded-md overflow-hidden mt-2">
                                  <Image src={lead.streetViewImageUrl} alt={`Street View of ${lead.name}`} fill className="object-cover" data-ai-hint="street view business"/>
                                </div>
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
