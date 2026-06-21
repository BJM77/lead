'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ImageUp, Loader2, Wand2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { LeadVerificationForm } from '@/components/lead-verification-form';
import { createLeadFromFormAction, analyzeAdForLeadAction } from '@/app/actions';
import type { NewLead, ExtractedLeadData } from '@/types';


export default function ImageCapturePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedLeadData | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setAnalysisMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!previewUrl) {
      toast({
        title: 'No Image Selected',
        description: 'Please choose an image file to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setExtractedData(null);
    setAnalysisMessage(null);

    try {
      // Use the new, more powerful flow
      const response = await analyzeAdForLeadAction({ photoDataUri: previewUrl });
      setAnalysisMessage(response.message);

      if (response.extractedData) {
        setExtractedData(response.extractedData);
        toast({
          title: 'Analysis Complete',
          description: "Review the extracted data below and complete the form.",
        });
      } else {
        toast({
          title: 'Analysis Failed',
          description: response.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error("Error analyzing ad image:", error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReset = () => {
      setFile(null);
      setPreviewUrl(null);
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
            userId,
            source: "Image Upload" as const,
        }
        const result = await createLeadFromFormAction(finalFormData);
        toast({
            title: "Lead Saved!",
            description: result.message,
        });
        handleReset(); // Clear the form and image on success
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
        <h1 className="text-3xl font-bold tracking-tight">Capture Lead from Ad Screenshot</h1>
        <p className="text-muted-foreground">
            Upload a screenshot of an ad (e.g., from Google or Facebook). The AI will find the website and extract details.
        </p>
      </div>
      
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Step 1: Upload Ad Screenshot</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 text-center">
                {previewUrl ? (
                  <div className="relative w-full max-w-md">
                      <Image 
                          src={previewUrl} 
                          alt="Image preview" 
                          width={400} 
                          height={300} 
                          className="rounded-md object-contain"
                          data-ai-hint="advertisement screenshot"
                      />
                  </div>
                ) : (
                  <>
                    <ImageUp className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                  </>
                )}
                <Input
                      id="picture"
                      type="file"
                      className="mt-4"
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/webp"
                      disabled={!!extractedData}
                  />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button 
                  onClick={handleAnalyze} 
                  disabled={isLoading || !file || !!extractedData}
                  className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Analyze Ad
              </Button>
              { (previewUrl || extractedData) && 
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
            sourceType="Image Upload"
          />
      </div>
    </div>
  );
}
