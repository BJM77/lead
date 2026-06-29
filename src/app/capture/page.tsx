'use client';

import { useState, useEffect, Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  createLeadFromFormAction, 
  extractLeadFromUrlAction, 
  createJobAction, 
  getJobProgressAction 
} from '@/app/actions';
import type { NewLead, ExtractedLeadData } from '@/types';
import { LeadVerificationForm } from '@/components/lead-verification-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';

function CaptureContent() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedLeadData | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrl(decodeURIComponent(urlParam));
    }
  }, [searchParams]);

  const handleCapture = async () => {
    if (!url) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setExtractedData(null);
    setAnalysisMessage(null);
    setProgressMessage('Initializing...');

    let intervalId: any = null;
    try {
      // 1. Create in-memory job via server action
      const jobId = await createJobAction();
      if (jobId && typeof jobId === 'object' && 'error' in jobId) {
        throw new Error((jobId as any).error);
      }

      // 2. Poll progress state every 1.5 seconds
      intervalId = setInterval(async () => {
        try {
          const progress = await getJobProgressAction(jobId);
          if (progress && 'message' in progress) {
            setProgressMessage(progress.message);
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 1500);

      // 3. Trigger extraction server action with the jobId
      const result = await extractLeadFromUrlAction({ url, jobId });
      if (result && 'error' in result) {
        toast({ title: 'Analysis Failed', description: result.error, variant: 'destructive' });
        return;
      }

      setAnalysisMessage(result.message);
      
      if (result.extractedData) {
        setExtractedData(result.extractedData);
        toast({
          title: 'Analysis Successful',
          description: 'Review the extracted data below.',
        });
      } else {
         toast({
          title: 'Analysis Failed',
          description: result.message,
          variant: 'destructive'
        });
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      if (intervalId) {
        clearInterval(intervalId);
      }
      setIsLoading(false);
      setProgressMessage(null);
    }
  };
  
  const handleReset = () => {
      setUrl('');
      setExtractedData(null);
      setAnalysisMessage(null);
  }

  const handleSaveLead = async (formData: Omit<NewLead, 'userId' | 'createdAt'>) => {
    setIsSaving(true);
    const userId = (await import('@/lib/firebase')).auth.currentUser?.uid;
    if (!userId) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to save leads.', variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    try {
        const finalFormData = {
            ...formData,
            details: `${formData.details || ''}\n\nSource URL: ${url}`,
            source: "Web Page Capture" as const,
            sourceUrl: url, // Track source URL for duplicate management
        }
        const result = await createLeadFromFormAction(finalFormData);
        if (result && 'error' in result) {
          toast({ title: 'Failed to Save Lead', description: result.error, variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        await (await import('@/lib/db')).createLead(result.enrichedLead, userId);
        toast({
            title: "Lead Saved!",
            description: result.message,
        });
        handleReset(); 
    } catch (error: any) {
        console.error("Error saving lead:", error);
        toast({
            title: "Failed to Save Lead",
            description: error.message || "An unknown error occurred.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="mx-auto grid w-full max-w-4xl gap-2">
           <h1 className="text-3xl font-bold tracking-tight">Capture Lead from Web Page</h1>
            <p className="text-muted-foreground">
                Enter a URL and the AI will analyze it, then you can verify and save the lead.
            </p>
        </div>
        
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Step 1: Analyze URL</CardTitle>
                <CardDescription>
                    Enter a website URL for the AI to analyze.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="flex gap-2">
                    <Input
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                        disabled={!!extractedData}
                    />
                </div>
                {progressMessage && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted p-3 text-sm text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>{progressMessage}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-4">
                 <Button 
                    onClick={handleCapture} 
                    disabled={isLoading || !url || !!extractedData}
                    className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Analyze URL
                </Button>
                
                { (url || extractedData) && 
                  <Button variant="outline" onClick={handleReset} className="w-full">
                      <RefreshCw className="mr-2 h-4 w-4" /> Start Over
                  </Button>
                }
              </CardFooter>
            </Card>

            <LeadVerificationForm 
              initialData={extractedData}
              onSubmit={handleSaveLead}
              isSaving={isSaving}
              analysisMessage={analysisMessage}
              isDisabled={!extractedData}
              sourceType="Web Page Capture"
            />
        </div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
      <CaptureContent />
    </Suspense>
  );
}
