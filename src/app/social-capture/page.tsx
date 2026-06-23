'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ImageUp, Link as LinkIcon, Loader2, Wand2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { createLeadFromFormAction, analyzeImageForLeadAction, extractLeadFromUrlAction } from '@/app/actions';
import { LeadVerificationForm } from '@/components/lead-verification-form';
import type { NewLead, ExtractedLeadData } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CaptureMode = 'image' | 'url';

export default function SocialCapturePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedLeadData | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async (mode: CaptureMode) => {
    setIsLoading(true);
    setExtractedData(null);
    setAnalysisMessage(null);

    try {
      let response;
      if (mode === 'image') {
        if (!previewUrl) {
          toast({ title: 'No Image Selected', description: 'Please choose an image file to analyze.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        response = await analyzeImageForLeadAction({ photoDataUri: previewUrl });
      } else { // mode === 'url'
        if (!url) {
          toast({ title: 'No URL Entered', description: 'Please enter a URL to analyze.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        response = await extractLeadFromUrlAction({ url });
      }

      setAnalysisMessage(response.message);

      if (response.extractedData) {
        setExtractedData(response.extractedData);
        toast({ title: 'Analysis Complete', description: 'Review the extracted data below.' });
      } else {
        toast({ title: 'Analysis Failed', description: response.message, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error(`Error analyzing ${mode}:`, error);
      toast({ title: 'Analysis Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
      setFile(null);
      setPreviewUrl(null);
      setUrl('');
      setExtractedData(null);
      setAnalysisMessage(null);
  };

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
            details: `${formData.details || ''}\n\nSocial URL: ${url}`,
            source: "Social Media Capture" as const,
            sourceUrl: url,
        }
        const result = await createLeadFromFormAction(finalFormData);
        await (await import('@/lib/db')).createLead(result.enrichedLead, userId);
        toast({ title: 'Lead Saved!', description: result.message });
        handleReset();
    } catch (error: any) {
        console.error('Error saving lead:', error);
        toast({ title: 'Failed to Save Lead', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="mx-auto grid w-full max-w-4xl gap-2">
           <h1 className="text-3xl font-bold tracking-tight">Social Media Capture</h1>
            <p className="text-muted-foreground">
                Capture leads from social media posts using a screenshot or a website URL.
            </p>
        </div>
        
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Step 1: Capture Content</CardTitle>
                <CardDescription>
                    Choose a method to capture lead information.
                </CardDescription>
              </CardHeader>
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image"><ImageUp className="mr-2 h-4 w-4"/>Screenshot</TabsTrigger>
                  <TabsTrigger value="url"><LinkIcon className="mr-2 h-4 w-4"/>Website URL</TabsTrigger>
                </TabsList>
                <TabsContent value="image">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 text-center">
                      {previewUrl ? (
                        <Image src={previewUrl} alt="Image preview" width={400} height={300} className="rounded-md object-contain" data-ai-hint="social media post"/>
                      ) : (
                        <>
                          <ImageUp className="h-12 w-12 text-muted-foreground" />
                          <p className="mt-4 text-sm text-muted-foreground">Upload a screenshot</p>
                        </>
                      )}
                       <Input id="picture" type="file" className="mt-4" onChange={handleFileChange} accept="image/*" disabled={!!extractedData} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4">
                     <Button onClick={() => handleAnalyze('image')} disabled={isLoading || !file || !!extractedData} className="w-full">
                      {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />} Analyze Image
                    </Button>
                  </CardFooter>
                </TabsContent>
                <TabsContent value="url">
                   <CardContent className="pt-6 space-y-4">
                     <p className="text-sm text-muted-foreground">Enter a website URL found in the social media post (e.g., a Shopify, Instagram, or personal site link).</p>
                    <Input placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} disabled={!!extractedData} />
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => handleAnalyze('url')} disabled={isLoading || !url || !!extractedData} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />} Analyze URL
                    </Button>
                  </CardFooter>
                </TabsContent>
              </Tabs>
              { (previewUrl || url || extractedData) && 
                  <CardFooter>
                    <Button variant="outline" onClick={handleReset} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" /> Start Over
                    </Button>
                  </CardFooter>
                }
            </Card>

            <LeadVerificationForm 
              initialData={extractedData}
              onSubmit={handleSaveLead}
              isSaving={isSaving}
              analysisMessage={analysisMessage}
              isDisabled={!extractedData}
              sourceType="Social Media Capture"
            />
        </div>
    </div>
  );
}
