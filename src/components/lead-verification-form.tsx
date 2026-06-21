'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import type { ExtractedLeadData, NewLead } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wand2 } from 'lucide-react';

const formSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  name: z.string().min(1, 'Contact name is required.'),
  title: z.string().optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL.').optional().or(z.literal('')),
  details: z.string().optional(),
});

type LeadVerificationFormProps = {
  initialData: ExtractedLeadData | null;
  onSubmit: (data: Omit<NewLead, 'userId' | 'createdAt'>) => Promise<void>;
  isSaving: boolean;
  analysisMessage: string | null;
  isDisabled: boolean;
  sourceType: NewLead['source'];
};

export function LeadVerificationForm({
  initialData,
  onSubmit,
  isSaving,
  analysisMessage,
  isDisabled,
  sourceType,
}: LeadVerificationFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      name: '',
      title: '',
      email: '',
      phone: '',
      website: '',
      details: '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        companyName: initialData.companyName || '',
        name: initialData.name || '',
        title: initialData.title || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        website: initialData.website || '',
        details: initialData.details || '',
      });
    }
  }, [initialData, form]);

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    const newLead: Omit<NewLead, 'userId' | 'createdAt'> = {
      name: values.name,
      title: values.title,
      company: { 
        name: values.companyName, 
        techStack: initialData?.detectedTech || [] 
      },
      email: values.email || `no-email-${Date.now()}@example.com`,
      phone: values.phone,
      status: 'New',
      quality: 0,
      source: sourceType,
      details: values.details || '',
      intentEvidence: initialData?.evidence || {},
    };
    onSubmit(newLead);
  };

  return (
    <Card className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
      <CardHeader>
        <CardTitle>Step 2: Verify & Save Lead</CardTitle>
        <CardDescription>
          Review extracted intelligence. Technical fingerprints: {initialData?.detectedTech?.join(', ') || 'None'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="grid gap-4">
            {analysisMessage && (
               <Alert>
                  <Wand2 className="h-4 w-4" />
                  <AlertTitle>Intelligence Report</AlertTitle>
                  <AlertDescription>
                    {analysisMessage}
                  </AlertDescription>
                </Alert>
            )}

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="CEO, Founder, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intelligence Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes from technical fingerprints and intent signals..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Intelligent Lead
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
