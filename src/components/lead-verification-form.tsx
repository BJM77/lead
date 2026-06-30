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
import { Wand2, Clock } from 'lucide-react';

const formSchema = z.object({
  companyName: z.string().min(1, 'Company name is required.'),
  name: z.string().optional().or(z.literal('')),
  title: z.string().optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL.').optional().or(z.literal('')),
  details: z.string().optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

type LeadVerificationFormProps = {
  initialData: ExtractedLeadData | null;
  onSubmit: (data: Omit<NewLead, 'userId' | 'createdAt'>) => Promise<void>;
  isSaving: boolean;
  analysisMessage: string | null;
  isDisabled: boolean;
  sourceType: NewLead['source'];
  autoSubmitAfterSeconds?: number;
};

export function LeadVerificationForm({
  initialData,
  onSubmit,
  isSaving,
  analysisMessage,
  isDisabled,
  sourceType,
  autoSubmitAfterSeconds,
}: LeadVerificationFormProps) {
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
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
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  const { isDirty } = form.formState;

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
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        postalCode: initialData.postalCode || '',
        country: initialData.country || '',
      });

      if (autoSubmitAfterSeconds) {
        setSecondsLeft(autoSubmitAfterSeconds);
      }
    }
  }, [initialData, form, autoSubmitAfterSeconds]);

  // Handle countdown interval
  React.useEffect(() => {
    if (secondsLeft === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (secondsLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      form.handleSubmit(handleFormSubmit)();
      setSecondsLeft(null);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [secondsLeft]);

  // Cancel autosave if user starts editing the form
  React.useEffect(() => {
    if (isDirty && secondsLeft !== null) {
      setSecondsLeft(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isDirty, secondsLeft]);

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    const newLead: Omit<NewLead, 'userId' | 'createdAt'> = {
      name: values.name || '',
      title: values.title,
      company: { 
        name: values.companyName, 
        techStack: initialData?.detectedTech || [],
        address: {
          street: values.address,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country,
          formatted: [values.address, values.city, values.state, values.postalCode, values.country].filter(Boolean).join(', ')
        }
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
            {secondsLeft !== null && (
              <Alert className="border-primary bg-primary/5 text-primary flex justify-between items-center py-2 px-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-pulse shrink-0 text-primary" />
                  <div className="flex flex-col">
                    <AlertTitle className="text-xs font-semibold leading-normal">Auto-saving Lead</AlertTitle>
                    <AlertDescription className="text-[11px] text-muted-foreground leading-normal">
                      Saving automatically in <span className="font-bold text-primary">{secondsLeft}s</span>. Editing fields will cancel this countdown.
                    </AlertDescription>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSecondsLeft(null)}
                  className="h-7 text-[10px] border-primary/30 hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                >
                  Cancel Auto-Save
                </Button>
              </Alert>
            )}

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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Sydney" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="NSW" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Australia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
